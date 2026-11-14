"""Two real browser contexts join, move, chat, help the garden and share a picnic."""
import json, os, socket, subprocess, time
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
with (results/'visits-service.log').open('w') as log:
    server=subprocess.Popen(['node','server/index.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'ALLOWED_ORIGINS':origin},stdout=log,stderr=subprocess.STDOUT)
    try:
        deadline=time.monotonic()+20
        while True:
            try:
                with urlopen(SERVICE+'/health',timeout=1) as r:
                    if r.status==200:break
            except OSError:pass
            if server.poll() is not None or time.monotonic()>deadline:raise RuntimeError('Visit service did not start')
            time.sleep(.1)
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            errors=[]
            owner=browser.new_context(viewport={'width':1100,'height':1000},reduced_motion='no-preference')
            visitor=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
            host=owner.new_page();guest=visitor.new_page()
            guest.add_init_script("""window.visitFocusEvents=[];
                addEventListener('blur',()=>visitFocusEvents.push(['blur',Date.now()]));
                document.addEventListener('visibilitychange',()=>visitFocusEvents.push([document.visibilityState,Date.now()]));""")
            corrections=[]
            def record_frame(payload):
                try:
                    message=json.loads(payload)
                    if message.get('type')=='correction':corrections.append(message)
                except (TypeError,ValueError):pass
            for page in [host,guest]:
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.on('websocket',lambda ws:ws.on('framereceived',record_frame))
            seed={'village':{'greeted':['momo'],'flowers':[True,False,False],'placed':{'welcome':'nook'}}}
            host.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-cozy-v1',"+json.dumps(json.dumps(seed))+");")
            def ready(page):page.wait_for_function("document.querySelector('#world canvas')?.dataset.village==='true'&&!document.querySelector('#openWardrobe').disabled",timeout=90000)
            def snapshot(page):return page.evaluate("({cozy:JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')),story:JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')),equipment:JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1'))})")
            def visits(page):
                page.bring_to_front()
                page.get_by_role('button',name='Private visits ♡',exact=True).click()
            def back(page):page.get_by_role('button',name='Back to the village ♡',exact=True).click()

            host.goto(BASE+'/adventure.html?visits='+quote(SERVICE,safe=''))
            ready(host);before=snapshot(host)
            visits(host)
            host.get_by_text('Connect the village service',exact=True).click()
            assert host.get_by_label('Village service address',exact=True).input_value()==SERVICE
            host.get_by_role('button',name='Connect service',exact=True).click()
            host.get_by_role('button',name='Open my village ♡',exact=True).click()
            host.locator('#village-invitation').wait_for(timeout=25000)
            invitation=host.locator('#village-invitation').input_value()
            ticket=host.evaluate("JSON.parse(sessionStorage.getItem('kitty-private-visit-v1'))")
            assert ticket['token'] not in invitation
            assert urlsplit(invitation).path.endswith('/adventure.html')
            assert not urlsplit(invitation).query
            guest.goto(invitation);ready(guest)
            guest.get_by_label('Your name',exact=True).fill('Visitor')
            guest.get_by_role('button',name='Join the village ♡',exact=True).click()
            host.get_by_text('Visitor is visiting with you. ♡',exact=True).wait_for(timeout=25000)
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=25000)
            back(host);back(guest)
            host.locator('.visitor-name').get_by_text('Visitor ♡',exact=True).wait_for(timeout=35000)
            guest.locator('.visitor-name').get_by_text('Nancy ♡',exact=True).wait_for(timeout=35000)
            print('PASS private invitation, separate host/visitor tickets and two actual Blender avatars in independent browser contexts',flush=True)

            guest.get_by_role('button',name='Inventory ♡',exact=True).click()
            guest.get_by_role('button',name='Sky sailor',exact=True).click()
            guest.get_by_role('button',name='Back to Kitty',exact=True).click()
            host.wait_for_function("document.querySelector('#world canvas').dataset.remoteOutfit==='sailor'",timeout=20000)
            assert snapshot(host)['equipment']['outfit']=='classic'
            start=float(guest.locator('#world canvas').get_attribute('data-village-x'))
            guest.keyboard.down('ArrowRight')
            guest.wait_for_function("x=>Number(document.querySelector('#world canvas').dataset.villageX)>x+.25",arg=start,timeout=20000)
            guest.keyboard.up('ArrowRight')
            guest.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageSpeed)<.02",timeout=15000)
            host.wait_for_function("x=>Number(document.querySelector('#world canvas').dataset.remoteX)>x+.15",arg=start,timeout=15000)
            visits(host);visits(guest)
            message='Hi Nancy ♡ <b>hello</b>'
            guest.get_by_label('Message to your visitor',exact=True).fill(message)
            guest.get_by_role('button',name='Send ♡',exact=True).click()
            host.get_by_role('log',name='Visit messages').get_by_text(message,exact=True).wait_for(timeout=15000)
            assert host.locator('.visit-chat b').count()==0
            guest.get_by_role('button',name='Wave hello ♡',exact=True).click()
            host.wait_for_function("document.querySelector('#world canvas').dataset.remoteExpression==='wink'",timeout=25000)
            back(guest)
            print('PASS synchronized movement, independent wardrobe, plain-text chat and the real Blender wave/wink',flush=True)

            guest.get_by_role('button',name='Places & memories',exact=True).tap()
            guest.get_by_role('button',name='Pip’s garden Walk here',exact=True).tap()
            guest.wait_for_function("Math.abs(Number(document.querySelector('#world canvas').dataset.villageX)-6)<.15&&Math.abs(Number(document.querySelector('#world canvas').dataset.villageZ)-3.7)<.15",timeout=45000)
            assert guest.get_by_role('button',name='Water flower bed 1',exact=True).count()==0,'host garden must already be blooming for the visitor'
            guest.get_by_role('button',name='Water flower bed 2',exact=True).tap()
            host.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).village.flowers[1]",timeout=35000)
            after=snapshot(host)
            assert after['cozy']['village']['placed']==before['cozy']['village']['placed']
            assert after['story']==before['story']
            assert after['cozy']['cookiesGiven']==before['cozy']['cookiesGiven']
            print('PASS one shared garden, a nearby visitor’s validated watering and preservation of Nancy’s home/story progress',flush=True)

            host.get_by_role('button',name='Walk to the picnic table ↗',exact=True).click()
            host.get_by_role('dialog',name='A picnic in the village',exact=True).wait_for(timeout=45000)
            visits(guest)
            # Exercise a real server correction during the tap-to-walk route.
            # One rejected movement packet must not strand the invited player.
            guest.evaluate("""() => {
                const send = WebSocket.prototype.send;
                window.visitCorrectionInjected = false;
                WebSocket.prototype.send = function(data) {
                    const m = JSON.parse(data);
                    if (!window.visitCorrectionInjected && m.type === 'move' &&
                        Number(document.querySelector('#world canvas')?.dataset.villageSpeed) > 1) {
                        window.visitCorrectionInjected = true;
                        data = JSON.stringify({...m, x: 999});
                    }
                    return send.call(this, data);
                };
            }""")
            # This context represents the foreground phone. Check the visible
            # hit target, then send an actual touch instead of waiting for
            # Playwright's RAF stability probe on an idle, demand-rendered tab.
            target=guest.get_by_role('button',name='Walk to the picnic table ↗',exact=True)
            assert target.is_visible()
            rect=target.bounding_box()
            assert rect and rect['height']>=44 and rect['y']>=0 and rect['y']+rect['height']<=844
            guest.touchscreen.tap(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
            try:
                arrival=guest.get_by_role('dialog',name='A picnic in the village',exact=True)
                try:
                    arrival.wait_for(timeout=45000)
                except Exception:
                    motion=guest.locator('#world canvas').evaluate('(c)=>({...c.dataset})')
                    if int(motion.get('villageRoute','0'))<1 or float(motion.get('villageSpeed','0'))<.1:
                        raise
                    print('SLOW SOFTWARE RENDERER: visitor is still walking',json.dumps(motion),flush=True)
                    arrival.wait_for(timeout=45000)
            except Exception:
                guest.screenshot(path='/tmp/kitty-village-visitor-route-failure.png',full_page=True)
                detail=json.dumps({'canvas':guest.locator('#world canvas').evaluate('(c)=>({...c.dataset})'),'corrections':corrections,'focus':guest.evaluate('window.visitFocusEvents')})
                print('::error title=Visitor route diagnostics::'+detail.replace('%','%25').replace('\n','%0A'),flush=True)
                raise
            assert guest.evaluate('window.visitCorrectionInjected') and corrections, 'the rejected packet must exercise correction recovery'
            host.get_by_role('button',name='Lay the cloth',exact=True).click()
            guest.get_by_role('button',name='Bring the cookies',exact=True).tap()
            host.get_by_role('button',name='Pour the tea',exact=True).click()
            for page in [host,guest]:page.get_by_text('A little picnic, made together ♡',exact=True).wait_for(timeout=20000)
            back(host);back(guest)
            host.wait_for_function("Math.abs(Number(document.querySelector('#world canvas').dataset.villageYaw))<.15",timeout=10000)
            host.screenshot(path='/tmp/kitty-village-two-player-picnic.png',full_page=True)
            hx=float(host.locator('#world canvas').get_attribute('data-village-x'));gx=float(guest.locator('#world canvas').get_attribute('data-village-x'))
            assert abs(hx-gx)>1,'friends should take separate places at the table'
            guest.reload();ready(guest)
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=25000)
            back(guest)
            host.locator('.visitor-name').get_by_text('Visitor ♡',exact=True).wait_for(timeout=25000)
            assert snapshot(host)['cozy']['village']['placed']==before['cozy']['village']['placed']
            visits(host);host.get_by_role('button',name='Close this private visit',exact=True).click()
            guest.get_by_text('This private visit has ended. Your own home and memories are safe. ♡',exact=True).wait_for(timeout=15000)
            assert not errors,errors
            assert guest.evaluate('document.documentElement.scrollWidth<=innerWidth')
            print('PASS shared picnic, separate seats, server-correction route recovery, reload/reconnection, host closure and mobile visitor UI; zero page errors, physical Safari untested',flush=True)
            browser.close()
    finally:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
