"""Two independent phone-sized logins use the actual Kitty/Melody Blender models."""
import json, os, socket, subprocess, tempfile, time
from pathlib import Path
from urllib.parse import urlsplit, quote
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
with socket.socket() as probe:
    probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
SERVICE=f'http://127.0.0.1:{port}'
origin=urlsplit(BASE).scheme+'://'+urlsplit(BASE).netloc
results=ROOT/'test-results';results.mkdir(exist_ok=True)
# Local fixture credentials never leave this temporary test service.
setup_key='local-only-browser-account-fixture-32-characters'
with tempfile.TemporaryDirectory(prefix='kitty-accounts-') as data, (results/'accounts-service.log').open('w') as log:
    server=subprocess.Popen(['node','multiplayer/local-test-server.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'ALLOWED_ORIGINS':origin,'PRIVATE_ACCOUNTS':'true','ACCOUNT_SETUP_KEY':setup_key,'ACCOUNT_STORE_FILE':data+'/accounts.json','VISIT_STORE_FILE':data+'/rooms.json','FREE_VISITS_DATA':data+'/sqlite'},stdout=log,stderr=subprocess.STDOUT)
    try:
        for _ in range(200):
            try:
                with urlopen(SERVICE+'/health',timeout=1) as r:
                    if r.status==200:break
            except OSError:pass
            if server.poll() is not None:raise RuntimeError('Account service did not start')
            time.sleep(.1)
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            host_context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
            guest_context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
            host=host_context.new_page();guest=guest_context.new_page();errors=[]
            sent=[]
            def on_socket(ws):
                def record(payload):
                    try:
                        message=json.loads(payload)
                        if message.get('type')=='move':sent.append((time.monotonic(),message))
                    except (TypeError,ValueError):pass
                ws.on('framesent',record)
            for page in [host,guest]:
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('websocket',on_socket)
            def ready(page):page.wait_for_function("document.querySelector('#world canvas')?.dataset.village==='true'&&!document.querySelector('#openWardrobe').disabled",timeout=90000)
            def visits(page):page.get_by_role('button',name='Private visits ♡',exact=True).click()
            def back(page):page.get_by_role('button',name='Back to the village ♡',exact=True).click()
            def personal(page):return page.evaluate("Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('kitty-')&&!k.includes('visits')).sort().map(k=>[k,localStorage.getItem(k)]))")
            host.goto(BASE+'/adventure.html?visits='+quote(SERVICE,safe=''));ready(host);visits(host)
            host.get_by_label('Service setup key',exact=True).fill(setup_key)
            host.get_by_label('Password',exact=True).fill('Nancy test password')
            host.get_by_label('Confirm password',exact=True).fill('Nancy test password')
            host.get_by_role('button',name='Create Nancy’s account',exact=True).click()
            host.get_by_text('Signed in as Nancy · Hello Kitty ♡',exact=True).wait_for(timeout=25000)
            host.get_by_role('button',name='Open my village ♡',exact=True).click()
            host.get_by_text('Your village is open. Send your invitation to your friend.',exact=True).wait_for(timeout=25000)
            host.get_by_role('button',name='Create My Melody’s account invitation',exact=True).click()
            account_link=host.locator('#account-invitation');account_link.wait_for(timeout=15000)
            invite=account_link.input_value()
            assert 'password' not in invite
            guest.goto(invite);ready(guest)
            guest.get_by_label('Password',exact=True).fill('Melody test password')
            guest.get_by_label('Confirm password',exact=True).fill('Melody test password')
            guest.get_by_role('button',name='Create My Melody’s account',exact=True).click()
            guest.get_by_text('Signed in as My Melody · My Melody ♡',exact=True).wait_for(timeout=25000)
            before=personal(guest)
            guest.get_by_role('button',name='Join Nancy’s village ♡',exact=True).click()
            host.get_by_text('My Melody is visiting with you. ♡',exact=True).wait_for(timeout=25000)
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=25000)
            village_link=host.locator('#village-invitation').input_value()
            back(host);back(guest)
            host.wait_for_function("document.querySelector('#world canvas').dataset.remoteModel==='melody'",timeout=60000)
            guest.wait_for_function("document.querySelector('#world canvas').dataset.playerCharacter==='melody'",timeout=60000)
            host.wait_for_function("document.querySelector('#world canvas').dataset.playerCharacter==='kitty'",timeout=15000)
            assert guest.get_by_role('button',name='← Her room',exact=True).count()==0
            assert guest.get_by_role('button',name='Our visit ♡',exact=True).count()==1
            assert guest.evaluate('document.documentElement.scrollWidth<=innerWidth')
            guest.wait_for_function("document.querySelector('#world canvas').dataset.remoteModel!=='melody'&&document.querySelector('.visitor-name.host')?.textContent.includes('Nancy')",timeout=30000)
            assert host_context.request.get(SERVICE+'/health').json()['provider']=='cloudflare'
            print('PASS the free Cloudflare runtime hosts two real Blender avatars with separate logins on phone-sized screens',flush=True)
            idle_start=time.monotonic();host.wait_for_timeout(2100)
            assert len([row for row in sent if row[0]>=idle_start])<=2,'Idle avatars must not send ten packets per second'
            print('PASS idle connection traffic stays quiet while movement and final stops remain immediate',flush=True)
            visits(guest)
            guest.get_by_label('Message to your visitor',exact=True).fill('I’m here with you ♡')
            guest.get_by_role('button',name='Send ♡',exact=True).click()
            visits(host)
            host.get_by_text('I’m here with you ♡',exact=True).wait_for(timeout=15000)
            guest.get_by_role('button',name='Happy dance ♫',exact=True).click()
            back(host);back(guest)
            host.wait_for_function("document.querySelector('#world canvas').dataset.remoteExpression==='dance'",timeout=15000)
            host.screenshot(path=str(results/'accounts-together-mobile.png'))
            guest.keyboard.down('ArrowRight')
            guest.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageSpeed)>.5",timeout=20000)
            guest.keyboard.up('ArrowRight')
            guest.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageSpeed)<.02",timeout=15000)
            assert personal(guest)==before, 'Visiting must not overwrite personal progress'
            print('PASS private chat, synchronized authored dance, responsive movement and visitor save isolation',flush=True)
            visits(guest)
            guest.get_by_role('button',name='Sign out',exact=True).click()
            guest.get_by_role('button',name='You · My Melody',exact=True).click()
            guest.get_by_label('Password',exact=True).fill('wrong password')
            guest.get_by_role('button',name='Sign in ♡',exact=True).click()
            guest.get_by_text('That account or password did not match.',exact=True).wait_for(timeout=20000)
            guest.get_by_label('Password',exact=True).fill('Melody test password')
            guest.get_by_role('button',name='Sign in ♡',exact=True).click()
            guest.get_by_text('Signed in as My Melody · My Melody ♡',exact=True).wait_for(timeout=20000)
            guest.get_by_label('Nancy’s private invitation',exact=True).fill(village_link)
            guest.get_by_role('button',name='Join Nancy’s village ♡',exact=True).click()
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=25000)
            guest.reload();ready(guest)
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=30000)
            guest.get_by_text('Signed in as My Melody · My Melody ♡',exact=True).wait_for(timeout=30000)
            assert not errors, errors
            print('PASS refresh reconnect, server sign-out, wrong-password feedback and a new authenticated visit',flush=True)
            browser.close()
    finally:
        server.terminate()
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:server.kill();server.wait()
