"""Two independent phone-sized logins use the actual Kitty/Melody Blender models."""
import json, os, socket, subprocess, tempfile, time
from pathlib import Path
from urllib.parse import urlsplit, quote
from urllib.request import urlopen
from playwright.sync_api import expect, sync_playwright


def play_minigames(host, guest, ready, back, results):
    def open_activity(page, name):
        page.bring_to_front()
        for title in ['Activities', name]:
            summary = page.get_by_text(title, exact=True)
            if not summary.locator('..').evaluate('details => details.open'):
                summary.tap()
        return page.get_by_text(name, exact=True).locator('..')

    def reload_guest():
        guest.bring_to_front()
        guest.reload()
        ready(guest)
        guest.get_by_text('Nancy is visiting with you. ♡', exact=True).wait_for(timeout=30000)
        back(guest)

    trail_name = 'Village clue trail'
    host_trail = open_activity(host, trail_name)
    host_trail.get_by_role('button', name='Start clue trail', exact=True).tap()
    guest_trail = open_activity(guest, trail_name)
    guest_trail.get_by_text('Your clue', exact=True).wait_for()
    assert guest_trail.get_by_text('Your partner’s clue', exact=True).count() == 0
    assert host_trail.get_by_text('Your partner’s clue', exact=True).count() == 0
    host.bring_to_front()
    host_trail.get_by_role('button', name='Share my clue', exact=True).tap()
    reload_guest()
    guest.get_by_role('button', name='Read your partner’s clue', exact=True).tap()
    guest_trail = open_activity(guest, trail_name)
    guest_trail.get_by_text('Your partner’s clue', exact=True).wait_for()
    assert guest_trail.get_by_role('group', name='Clue trail landmarks').count() == 0
    guest_trail.get_by_role('button', name='Share my clue', exact=True).tap()
    host_trail.get_by_text('Your partner’s clue', exact=True).wait_for()

    host_clue = host_trail.get_by_text('Your clue', exact=True).locator('..').inner_text()
    guest_clue = guest_trail.get_by_text('Your clue', exact=True).locator('..').inner_text()
    places = ['Little plaza', 'Momo’s café', 'Pip’s garden', 'Picnic table']
    matching = [name for name in places if
                ('no apostrophe' in host_clue) == ('’' not in name) and
                ('starts with P' in guest_clue) == name.startswith('P')]
    assert len(matching) == 1, (host_clue, guest_clue)
    place = matching[0]
    wrong = next(name for name in places if name != place)
    for choice in [wrong, place]:
        for page, trail in [(host, host_trail), (guest, guest_trail)]:
            page.bring_to_front()
            trail.get_by_role('group', name='Clue trail landmarks').get_by_role('button', name=choice, exact=True).tap()
        if choice == wrong:
            for trail in [host_trail, guest_trail]:
                trail.get_by_text('Try another place that fits both clues.', exact=True).wait_for()
    for page, trail in [(host, host_trail), (guest, guest_trail)]:
        page.bring_to_front()
        trail.get_by_text(f'You solved it! Meet at {place} and find one ribbon each.', exact=True).wait_for()
        page.get_by_text('Activities', exact=True).tap()
        walk = page.get_by_role('button', name=f'Walk to {place} for the clue trail', exact=True)
        if walk.count():
            walk.tap()
    for page in [host, guest]:
        page.get_by_role('button', name='Find my ribbon', exact=True).wait_for(timeout=65000)
        page.wait_for_function("document.querySelector('#world canvas').dataset.clueRibbons === '2'")
    host.bring_to_front()
    host.screenshot(path=str(results/'accounts-clue-ribbons.png'))
    host.get_by_role('button', name='Find my ribbon', exact=True).tap()
    guest.wait_for_function("document.querySelector('#world canvas').dataset.clueRibbons === '1'")
    guest.bring_to_front()
    guest.get_by_role('button', name='Find my ribbon', exact=True).tap()
    for page in [host, guest]:
        open_activity(page, trail_name).get_by_text('You found both ribbons together. ♡', exact=True).wait_for()
        page.wait_for_function("document.querySelector('#world canvas').dataset.clueRibbons === '0'")
        page.get_by_text(trail_name, exact=True).tap()
    print('PASS private clues, refresh, revised guesses, the shared walk and two visible ribbons',flush=True)

    match_name = 'Petal match'
    host_match = open_activity(host, match_name)
    host_match.get_by_role('button', name='Play petal match', exact=True).tap()
    host_match.get_by_role('button', name='Rose', exact=True).tap()
    reload_guest()
    guest.get_by_role('button', name='Pick your petal', exact=True).tap()
    guest_match = open_activity(guest, match_name)
    guest_match.get_by_text('Your partner has picked. Now choose your flower.', exact=True).wait_for()
    assert guest_match.get_by_text('You matched', exact=False).count() == 0
    guest_match.get_by_role('button', name='Rose', exact=True).tap()
    for match in [host_match, guest_match]:
        match.get_by_text('You matched on rose! ♡', exact=True).wait_for()
        match.get_by_text('1 match in 1 round together', exact=True).wait_for()
    guest_match.get_by_role('button', name='Play another round', exact=True).tap()
    guest_match.get_by_role('button', name='Lavender', exact=True).tap()
    host.bring_to_front()
    host_match.get_by_role('button', name='Daisy', exact=True).tap()
    host_match.get_by_text('You picked daisy. Your partner picked lavender.', exact=True).wait_for()
    guest_match.get_by_text('You picked lavender. Your partner picked daisy.', exact=True).wait_for()
    for page in [host, guest]:
        page.bring_to_front()
        page.get_by_text('1 match in 2 rounds together', exact=True).wait_for()
        page.get_by_text('Activities', exact=True).tap()
    print('PASS secret flower choices after refresh, a match and a replay with different choices',flush=True)


def play_bench_tea(host, guest, ready, back, results):
    def sit(page):
        page.bring_to_front()
        activities = page.get_by_text('Activities', exact=True)
        if not activities.locator('..').evaluate('el => el.open'):
            activities.tap()
        bench = page.get_by_text('Bench tea', exact=True)
        if not bench.locator('..').evaluate('el => el.open'):
            bench.tap()
        walk = page.get_by_role('button',name='Walk to my bench seat',exact=True)
        if walk.count():
            walk.tap()
        chair = page.get_by_role('button',name='Sit at the tea bench',exact=True)
        chair.wait_for(timeout=65000)
        chair.tap()
        controls = page.get_by_role('group',name='At the tea bench',exact=True)
        controls.wait_for(timeout=20000)
        return controls

    host_bench = sit(host)
    assert host_bench.get_by_role('button',name='Ready to toast',exact=True).is_disabled()
    guest_bench = sit(guest)
    for page in [host,guest]:
        page.wait_for_function("""() => {
            const d = document.querySelector('#world canvas').dataset;
            return d.hostBench === 'seated' && d.guestBench === 'seated' && d.remoteHolding === 'cup';
        }""",timeout=35000)
    host.bring_to_front()
    host.screenshot(path=str(results/'accounts-bench-tea.png'))
    host_bench.get_by_role('button',name='Ready to toast',exact=True).tap()
    host_bench.get_by_text('You’re ready. Waiting for your partner.',exact=True).wait_for()
    guest.bring_to_front()
    guest.reload()
    ready(guest)
    guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=30000)
    back(guest)
    guest_bench = guest.get_by_role('group',name='At the tea bench',exact=True)
    guest_bench.wait_for(timeout=25000)
    host_bench.get_by_text('You’re ready. Waiting for your partner.',exact=True).wait_for()
    for page in [host,guest]:
        page.wait_for_function("document.querySelector('#world canvas').dataset.guestBench === 'seated'",timeout=25000)
        page.evaluate("""() => {
            window.benchFrames = [];
            const canvas = document.querySelector('#world canvas');
            const observer = new MutationObserver(() => {
                const d = canvas.dataset;
                if (d.hostBench === 'toast' && d.guestBench === 'toast') {
                    benchFrames.push([Date.now(), Number(d.hostBenchPhase), Number(d.guestBenchPhase)]);
                }
            });
            observer.observe(canvas, {attributes:true, attributeFilter:['data-guest-bench-phase']});
        }""")
    guest.bring_to_front()
    guest_bench.get_by_role('button',name='Ready to toast',exact=True).tap()
    for page in [host,guest]:
        page.wait_for_function('benchFrames.length > 0',timeout=10000)
        frames = page.evaluate('benchFrames')
        assert all(abs(kitty-melody) < 0.1 for _,kitty,melody in frames), frames[:3]
        page.wait_for_function("document.querySelector('#world canvas').dataset.hostBench === 'seated'")
    starts = [page.evaluate('benchFrames[0][0] - 1000 * benchFrames[0][1]') for page in [host,guest]]
    assert abs(starts[0]-starts[1]) < 200, starts
    guest_bench.get_by_role('button',name='Stand up',exact=True).tap()
    host_bench.get_by_text('There’s a seat for your partner.',exact=True).wait_for()
    host.bring_to_front()
    host_bench.get_by_role('button',name='Stand up',exact=True).tap()
    expect(host.get_by_role('button',name='Dance together',exact=True)).to_be_enabled(timeout=15000)
    print('PASS separate seated tea poses, readiness across refresh, synchronized cup raise and standing up',flush=True)


def play_market(host, guest, ready, back, results):
    def workbench(page):
        return page.get_by_role('region', name='Little Village Market', exact=True)

    def open_market(page):
        page.bring_to_front()
        if workbench(page).is_visible():
            return workbench(page)
        nearby = page.get_by_role('button', name='Open market stall', exact=True)
        if nearby.is_visible():
            nearby.tap()
        else:
            activities = page.get_by_text('Activities', exact=True)
            if not activities.locator('..').evaluate('el => el.open'):
                activities.tap()
            page.get_by_role('button', name='Little Village Market', exact=True).tap()
        return workbench(page)

    def hand_over(market, choice):
        item = market.get_by_role('button', name=choice, exact=True)
        item.tap()
        item.and_(market.locator('[aria-pressed=true]')).wait_for()
        market.get_by_role('button', name='Hand over my parcel', exact=True).tap()

    def watch_parcels(page):
        page.evaluate("""() => {
            const canvas = document.querySelector('#world canvas');
            window.marketParcelPhases = new Set();
            new MutationObserver(() => {
                marketParcelPhases.add(canvas.dataset.hostMarketParcel);
                marketParcelPhases.add(canvas.dataset.guestMarketParcel);
            }).observe(canvas, {attributes:true, attributeFilter:['data-host-market-parcel', 'data-guest-market-parcel']});
        }""")

    host_market = open_market(host)
    guest_market = workbench(guest)
    assert host_market.get_by_role('button', name='Open the stall', exact=True).is_disabled()
    invite = host_market.get_by_role('button', name='Invite to the market', exact=True)
    invite.tap()
    host_market.get_by_text('Market invitation sent to My Melody.', exact=True).wait_for()
    guest.bring_to_front()
    invitation = guest.get_by_role('group', name='Market invitation', exact=True)
    invitation.get_by_text('Nancy invited you to the market.', exact=True).wait_for()
    invitation.get_by_role('button', name='Not now', exact=True).tap()
    invitation.wait_for(state='hidden')
    host.bring_to_front()
    invite.tap()
    guest.bring_to_front()
    invitation.get_by_text('Nancy invited you to the market.', exact=True).wait_for()
    guest.reload()
    ready(guest)
    guest.get_by_text('Nancy is visiting with you. ♡', exact=True).wait_for(timeout=30000)
    back(guest)
    invitation.get_by_role('button', name='Join the market', exact=True).tap()
    guest_market.wait_for(timeout=65000)
    assert guest_market.get_attribute('data-at-stall') == 'true'
    host.bring_to_front()
    host_market.get_by_role('button', name='Walk to my stall spot', exact=True).tap()
    host_market.and_(host.locator('[data-at-stall=true]')).wait_for(timeout=65000)
    assert host.get_by_role('dialog', name='Little Village Market').count() == 0
    assert host.locator('#world canvas').is_visible()
    for page in [host, guest]:
        page.wait_for_function("document.querySelector('#world canvas').dataset.marketFocus === 'true'")
        watch_parcels(page)
    host.screenshot(path=str(results/'accounts-market-stall.png'))
    print('PASS invitations survive a refresh, can be declined or accepted, and open the workbench on arrival',flush=True)
    host_market.get_by_role('button', name='Open the stall', exact=True).tap()
    host_market.get_by_role('region', name='Your order ticket').get_by_text('peach tea', exact=True).wait_for()
    guest_market.get_by_role('heading', name='Your stock shelf').wait_for()
    assert guest_market.get_by_role('region', name='Your order ticket').count() == 0
    host_market.get_by_role('button', name='Tell partner which drink to wrap').tap()
    guest_market.get_by_role('log').get_by_text('Could you wrap the peach tea?', exact=False).wait_for()
    hand_over(host_market, 'Strawberry shortcake')
    guest.bring_to_front()
    hand_over(guest_market, 'Lavender lemonade')
    for market in [host_market, guest_market]:
        market.get_by_text('Something was different from the order.', exact=False).wait_for()
        assert market.get_by_text('0 of 3 orders served', exact=True).is_visible()

    host.bring_to_front()
    hand_over(host_market, 'Strawberry shortcake')
    host_market.get_by_text('Your parcel is on the counter.', exact=False).wait_for()
    guest.bring_to_front()
    guest.reload()
    ready(guest)
    guest.get_by_text('Nancy is visiting with you. ♡', exact=True).wait_for(timeout=30000)
    back(guest)
    guest_market = open_market(guest)
    guest_market.get_by_text('Your partner’s parcel is on the counter.', exact=True).wait_for()
    guest.wait_for_function("document.querySelector('#world canvas').dataset.hostMarketParcel === 'counter'")
    watch_parcels(guest)
    hand_over(guest_market, 'Peach tea')
    host_market.get_by_text('1 of 3 orders served', exact=True).wait_for()
    guest.wait_for_function("marketParcelPhases.has('collected')",timeout=15000)
    guest_market.get_by_role('button', name='Next customer', exact=True).tap()
    guest_market.get_by_role('region', name='Your order ticket').get_by_text('lavender lemonade', exact=True).wait_for()
    host_market.get_by_role('heading', name='Your stock shelf').wait_for()
    guest_market.get_by_role('button', name='Stall chat', exact=True).tap()
    guest_market.get_by_role('textbox', name='Message at the market').fill('Lavender lemonade, please!')
    guest_market.get_by_role('button', name='Send', exact=True).tap()
    host_market.get_by_role('log').get_by_text('Lavender lemonade, please!', exact=False).wait_for()
    hand_over(guest_market, 'Honey bun')
    host.bring_to_front()
    hand_over(host_market, 'Lavender lemonade')
    host_market.get_by_text('2 of 3 orders served', exact=True).wait_for()
    host_market.get_by_role('button', name='Next customer', exact=True).tap()
    special = host_market.get_by_role('region', name='Your order ticket')
    special.get_by_text('Market special', exact=True).wait_for()
    guest_market.get_by_role('region', name='Your stock shelf').get_by_text('Market special', exact=True).wait_for()
    treat, drink = [text.capitalize() for text in special.locator('strong').all_inner_texts()]
    host.screenshot(path=str(results/'accounts-market-ticket.png'))
    hand_over(host_market, treat)
    guest.bring_to_front()
    hand_over(guest_market, drink)
    images = []
    for page, market in [(host, host_market), (guest, guest_market)]:
        page.bring_to_front()
        market.get_by_text('3 of 3 orders served', exact=True).wait_for()
        with page.expect_download() as result:
            market.get_by_role('link', name='Download market keepsake').tap()
        download = result.value
        assert download.suggested_filename == 'little-village-market-1.png'
        images.append(Path(download.path()).read_bytes())
    assert images[0] == images[1] and images[0].startswith(b'\x89PNG')
    guest_market.get_by_role('button', name='Start another shift', exact=True).tap()
    guest_market.get_by_role('region', name='Your order ticket').get_by_text('warm cocoa', exact=True).wait_for()
    assert host_market.get_by_role('link', name='Download market keepsake').is_visible()
    for page, market in [(host, host_market), (guest, guest_market)]:
        page.bring_to_front()
        market.get_by_role('button', name='Close Little Village Market', exact=True).tap()
    print('PASS three market orders, private ticket and stock, chat, correction, refresh, job swaps and both keepsake downloads',flush=True)
    print('PASS the stall view showed the parcel on the counter after a refresh and the customer collecting it',flush=True)


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
            launch=dict(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            host_browser=p.chromium.launch(**launch)
            guest_browser=p.chromium.launch(**launch)
            host_context=host_browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
            guest_context=guest_browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
            host=host_context.new_page();guest=guest_context.new_page();errors=[]
            sent=[]; together_received=[]; corrections=[]; dance_starts={}
            def on_socket(ws, page):
                def record(payload):
                    try:
                        message=json.loads(payload)
                        if message.get('type')=='move':sent.append((time.monotonic(),message))
                    except (TypeError,ValueError):pass
                ws.on('framesent',record)
                def receive(payload):
                    try:
                        message=json.loads(payload)
                        if message.get('type')=='correction':corrections.append(message)
                        moment=message.get('together')
                        if moment or message['type']=='error':
                            together_received.append(moment or message)
                        if moment and moment['action']=='celebrate':
                            dance_starts.setdefault(page, moment['at'])
                    except (TypeError, ValueError):pass
                ws.on('framereceived',receive)
            for page in [host,guest]:
                page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGE ERROR',str(e),flush=True)))
                page.on('websocket',lambda ws, page=page: on_socket(ws, page))
                page.add_init_script("""window.watchVillage = () => {
                    const canvas = document.querySelector('#world canvas');
                    const size = [canvas.width, canvas.height];
                    const issues = [];
                    const check = () => {
                        if (document.querySelector('#world canvas') !== canvas) issues.push('canvas replaced');
                        if (document.querySelectorAll('canvas').length !== 1) issues.push('second canvas');
                        if (canvas.width !== size[0] || canvas.height !== size[1]) issues.push('back buffer resized');
                    };
                    const observer = new MutationObserver(records => {
                        if (records.some(record => record.target === canvas && record.type === 'attributes'))
                            issues.push('back buffer reset');
                        check();
                    });
                    observer.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['width', 'height']});
                    const lost = () => issues.push('WebGL context lost');
                    canvas.addEventListener('webglcontextlost', lost);
                    check();
                    return () => {
                        observer.disconnect();
                        canvas.removeEventListener('webglcontextlost', lost);
                        return [...new Set(issues)];
                    };
                };""")
            def ready(page):page.wait_for_function("document.querySelector('#world canvas')?.dataset.village==='true'&&!document.querySelector('#openWardrobe').disabled",timeout=90000)
            def visits(page):
                page.bring_to_front()
                page.get_by_role('button',name='Private visits ♡',exact=True).click()
            def back(page):
                page.bring_to_front()
                print('Returning to village', 'Nancy' if page==host else 'Melody',flush=True)
                page.get_by_role('button',name='Back to the village ♡',exact=True).click()
                print('Village controls returned',flush=True)
            def personal(page):return page.evaluate("Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('kitty-')&&!k.includes('visits')).sort().map(k=>[k,localStorage.getItem(k)]))")
            host.add_init_script("""if (!localStorage.getItem('kitty-world-v2')) {
                localStorage.setItem('kitty-nancy-cozy-v1', JSON.stringify({
                    village:{greeted:['momo'], flowers:[true,false,false], placed:{welcome:'nook'}},
                    cookie:{stage:'served', packed:true},
                }));
                localStorage.setItem('kitty-nancy-equipment-v1', JSON.stringify({version:1,outfit:'sailor',item:'letter'}));
            }""")
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
            for page in [host, guest]:
                assert page.locator('canvas').count() == 1, 'The account panel must share the village renderer'
                back(page)
                page.evaluate('window.finishVillageWatch = watchVillage()')
            host.wait_for_function("document.querySelector('#world canvas').dataset.remoteModel==='melody'",timeout=60000)
            guest.wait_for_function("document.querySelector('#world canvas').dataset.playerCharacter==='melody'",timeout=60000)
            host.wait_for_function("document.querySelector('#world canvas').dataset.playerCharacter==='kitty'",timeout=15000)
            assert guest.get_by_role('button',name='← Her room',exact=True).count()==0
            assert guest.get_by_role('button',name='Our visit ♡',exact=True).count()==1
            assert host.get_by_role('button',name='Walk to My Melody',exact=True).is_visible()
            assert guest.get_by_role('button',name='Walk to Nancy',exact=True).is_visible()
            assert guest.evaluate('document.documentElement.scrollWidth<=innerWidth')
            guest.wait_for_function("document.querySelector('#world canvas').dataset.remoteModel!=='melody'&&document.querySelector('.visitor-name.host')?.textContent.includes('Nancy')",timeout=30000)
            assert host_context.request.get(SERVICE+'/health').json()['provider']=='cloudflare'
            print('PASS the free Cloudflare runtime hosts two real Blender avatars with separate logins on phone-sized screens',flush=True)
            idle_start=time.monotonic();host.wait_for_timeout(2100)
            assert len([row for row in sent if row[0]>=idle_start])<=2,'Idle avatars must not send ten packets per second'
            print('PASS idle connection traffic stays quiet while movement and final stops remain immediate',flush=True)
            # Walk over after measuring the quiet connection.
            visits(guest)
            guest.get_by_role('button',name='Walk to Nancy ↗',exact=True).click()
            guest.wait_for_function("""() => {
                const d = document.querySelector('#world canvas').dataset;
                return d.villageRoute === '0' && Math.hypot(d.villageX-d.remoteX, d.villageZ-d.remoteZ) < 1.8;
            }""",timeout=45000)
            def bubble(page, role):
                return page.locator(f'[data-speaker={role}] .village-bubble')
            for sender, recipient, role, message in [
                (guest,host,'guest','I’m here with you ♡ <b>hi</b>'),
                (host,guest,'host','Hello Melody ♡'),
            ]:
                sender.bring_to_front()
                sender.get_by_role('button',name='Chat',exact=True).tap()
                sender.get_by_label('Message to your visitor',exact=True).fill(message)
                sender.get_by_role('button',name='Send',exact=True).tap()
                for page in [sender,recipient]:
                    bubble(page,role).get_by_text(message,exact=True).wait_for(timeout=15000)
                    assert bubble(page,role).locator('b').count()==0
            host.bring_to_front()
            host.screenshot(path=str(results/'accounts-together-mobile.png'))
            bubble(host,'host').wait_for(state='hidden',timeout=10000)
            host.get_by_role('button',name='Smile',exact=True).tap()
            guest.wait_for_function("document.querySelector('#world canvas').dataset.remoteExpression==='softHappy'",timeout=15000)
            guest.bring_to_front()
            guest.get_by_role('button',name='Wave',exact=True).tap()
            host.wait_for_function("document.querySelector('#world canvas').dataset.remoteExpression==='wave'",timeout=15000)
            print('PASS chat bubbles on both actual avatars, a wave and a shared facial expression',flush=True)

            for page in [host, guest]:
                page.evaluate("""() => {
                    window.danceFrames = [];
                    const canvas = document.querySelector('#world canvas');
                    const observer = new MutationObserver(() => {
                        const d = canvas.dataset;
                        if (d.hostTogether === 'dance' && d.guestTogether === 'dance') {
                            danceFrames.push([Date.now(), +d.hostTogetherPhase, +d.guestTogetherPhase]);
                        }
                    });
                    observer.observe(canvas, {attributes: true, attributeFilter: ['data-guest-together-phase']});
                }""")
            host.bring_to_front()
            host.get_by_role('button',name='Dance together',exact=True).tap()
            try:
                for page in [host, guest]:
                    page.wait_for_function("""danceFrames.some(frame =>
                        frame[1] > 1 && frame[1] - danceFrames[0][1] >= .3
                    )""",timeout=12000)
            except Exception:
                print('Dance diagnostics', together_received[-8:])
                for page in [host, guest]:
                    print(page.evaluate("({frames: danceFrames.slice(-5), scene: {...document.querySelector('#world canvas').dataset}})"))
                raise
            assert dance_starts[host] == dance_starts[guest], dance_starts
            for page in [host, guest]:
                frames=page.evaluate('danceFrames')
                assert all(abs(kitty-melody)<.1 for _,kitty,melody in frames), frames[-4:]
                first=frames[0]
                rendered_start=first[0]-1000*first[1]
                assert abs(rendered_start-dance_starts[page])<200, (first,dance_starts[page])
            host.wait_for_function("!document.querySelector('#world canvas').dataset.hostTogether",timeout=12000)
            for page in [host,guest]:
                assert page.evaluate('finishVillageWatch()') == [], 'Village renderer must remain stable throughout the visit'
            print('PASS synchronized Blender dance on Kitty and Melody and one stable mobile WebGL canvas throughout',flush=True)

            def open_picnic(page):
                page.bring_to_front()
                controls=page.get_by_role('group',name='With your visitor',exact=True)
                button=controls.get_by_role('button',name='Picnic',exact=True)
                button.tap()
                picnic=page.get_by_role('dialog',name='A picnic in the village',exact=True)
                picnic.wait_for(timeout=60000)
                return picnic

            host.evaluate("""() => {
                const send = WebSocket.prototype.send;
                window.picnicStepsWithheld = 0;
                window.picnicCorrectionInjected = false;
                WebSocket.prototype.send = function(data) {
                    const move = JSON.parse(data);
                    if (move.type === 'move' && !window.picnicCorrectionInjected) {
                        window.requestPicnicCorrection = () => {
                            window.picnicCorrectionInjected = true;
                            send.call(this, JSON.stringify({...move, x: 999}));
                        };
                        if (Math.hypot(move.x + 6.45, move.z - 4.2) < .85) {
                            window.picnicStepsWithheld++;
                            return;
                        }
                    }
                    return send.call(this, data);
                };
            }""")
            host_picnic=open_picnic(host)
            host.wait_for_function('window.picnicStepsWithheld > 0',timeout=15000)
            previous_corrections=len(corrections)
            host.evaluate('window.requestPicnicCorrection()')
            guest_picnic=open_picnic(guest)
            assert len(corrections)>previous_corrections
            host.bring_to_front()
            host_picnic.get_by_role('button',name='Lay the cloth').tap()
            guest_picnic.get_by_role('button',name='✓ Lay the cloth',exact=True).wait_for()

            guest.bring_to_front()
            guest.reload();ready(guest)
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=30000)
            back(guest)
            guest_picnic=open_picnic(guest)
            assert guest_picnic.get_by_role('button',name='✓ Lay the cloth',exact=True).get_attribute('aria-pressed')=='true'
            guest_picnic.get_by_role('button',name='Bring the cookies').tap()
            host_picnic.get_by_role('button',name='✓ Bring the cookies',exact=True).wait_for()
            host.bring_to_front()
            host_picnic.get_by_role('button',name='Pour the tea').tap()
            for picnic in [host_picnic, guest_picnic]:
                picnic.get_by_role('heading',name='A little picnic, made together ♡').wait_for()
            for page, picnic in [(host, host_picnic), (guest, guest_picnic)]:
                page.bring_to_front()
                picnic.get_by_role('button',name='Enjoy the picnic',exact=True).tap()
                assert page.get_by_role('group',name='At the picnic table',exact=True).is_visible()
            guest.wait_for_function("document.querySelector('#world canvas').dataset.playerHolding === 'cup'")
            host.wait_for_function("document.querySelector('#world canvas').dataset.remoteHolding === 'cup'")
            guest.wait_for_function("document.querySelector('#world canvas').dataset.remoteHolding === 'cup'")
            for page, x in [(host, -6.45), (guest, -4.55)]:
                page.wait_for_function("""x => {
                    const d = document.querySelector('#world canvas').dataset;
                    return Math.hypot(d.villageX-x, d.villageZ-4.2) <= .2;
                }""",arg=x,timeout=30000)
            assert host.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).cookie.packed")
            guest.get_by_role('button',name='Raise your cup',exact=True).tap()
            host.wait_for_function("document.querySelector('#world canvas').dataset.remoteExpression === 'sip'")
            host.bring_to_front()
            host.screenshot(path=str(results/'accounts-tea-together.png'))
            host.get_by_role('button',name='Leave the table',exact=True).tap()
            guest.wait_for_function("document.querySelector('#world canvas').dataset.remoteHolding === 'parcel'")
            guest.bring_to_front()
            guest.get_by_role('button',name='Table setup',exact=True).tap()
            guest.get_by_role('heading',name='A little picnic, made together ♡').wait_for()
            back(guest)
            print('PASS direct picnic controls, a mid-picnic refresh and sharing tea in the village scene',flush=True)

            for page, garden_x in [(host, 5.5), (guest, 6.5)]:
                page.bring_to_front()
                if page == guest:
                    activities = guest.get_by_text('Activities',exact=True)
                    activities.tap()
                    guest.get_by_text('A photo together',exact=True).tap()
                    shutter = guest.get_by_role('button',name='Take our photo',exact=True)
                    assert shutter.is_disabled(), 'Both players need to be in frame'
                    guest.get_by_role('button',name='Walk to Nancy for the photo',exact=True).tap()
                    guest.wait_for_function("""() => [...document.querySelectorAll('button')]
                        .some(button => button.textContent.trim() === 'Take our photo' && !button.disabled)
                    """,timeout=60000)
                    guest.get_by_text('A photo together',exact=True).tap()
                    activities.tap()
                page.get_by_role('button',name='Garden',exact=True).tap()
                page.wait_for_function("""x => {
                    const d = document.querySelector('#world canvas').dataset;
                    return d.villageRoute === '0' && Math.hypot(d.villageX-x, d.villageZ-3.7) < .15;
                }""",arg=garden_x,timeout=60000)
                page.get_by_text('1 of 3 flower beds blooming. Tap a dry bed to water it.',exact=True).wait_for()
            host.bring_to_front()
            host.get_by_role('button',name='Water flower bed 2',exact=True).tap()
            for page in [host, guest]:
                page.get_by_text('2 of 3 flower beds blooming. Tap a dry bed to water it.',exact=True).wait_for()
            guest.bring_to_front()
            guest.get_by_role('button',name='Water flower bed 3',exact=True).tap()
            for page in [host, guest]:
                page.get_by_text('All three flower beds are blooming.',exact=True).wait_for()
            assert host.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).village.flowers") == [True, True, True]
            print('PASS both players walk to Pip’s garden, water different beds and see the same blooms',flush=True)

            host.get_by_text('Activities',exact=True).tap()
            host.get_by_role('button',name='High-five ♡',exact=True).tap()
            guest.wait_for_function("document.querySelector('#world canvas').dataset.guestTogether==='highfive'",timeout=12000)
            host.get_by_text('Bake together',exact=True).tap()
            host.get_by_role('button',name='Nancy mixes',exact=True).click()
            guest.bring_to_front()
            guest.get_by_role('button',name='Decorate cookies',exact=True).click(timeout=20000)
            host.bring_to_front()
            host.get_by_role('button',name='Present cookies',exact=True).click(timeout=20000)
            host.get_by_text('A photo together',exact=True).tap()
            host.get_by_label('Our pose',exact=True).select_option('lean')
            host.get_by_label('Our atmosphere',exact=True).select_option('sunset')
            host.wait_for_function("[...document.querySelectorAll('select')].some(s=>s.value==='sunset')")
            host.get_by_role('button',name='Take our photo',exact=True).click(timeout=20000)
            host.get_by_role('link',name='Download our photo PNG',exact=True).wait_for(timeout=20000)
            with host.expect_download() as download:
                host.get_by_role('link',name='Download our photo PNG',exact=True).tap()
            photo_path=results/'Nancy-and-Melody.png';download.value.save_as(photo_path)
            from PIL import Image
            with Image.open(photo_path) as photo:
                assert photo.format=='PNG' and photo.size==(800,960), 'Download must be the framed postcard PNG'
            host.get_by_label('Our pose',exact=True).select_option('wave')
            host.get_by_label('Our atmosphere',exact=True).select_option('rain')
            guest.wait_for_function("[...document.querySelectorAll('select')].some(s=>s.value==='rain')")
            keep=host.get_by_role('button',name='Keep on Nancy’s wall',exact=True)
            keep.click()
            host.get_by_text('Kept on Nancy’s wall ♡',exact=True).wait_for()
            assert not keep.is_enabled()
            assert host.evaluate("""() => {
                const [postcard] = JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).postcards;
                return postcard.background === 'sunset' && postcard.pose === 'lean';
            }""")
            guest.bring_to_front()
            guest.get_by_text('Activities',exact=True).tap()
            guest.get_by_text('A photo together',exact=True).tap()
            with guest.expect_download() as download:
                guest.get_by_role('link',name='Download our photo PNG',exact=True).tap(timeout=20000)
            with Image.open(download.value.path()) as photo:
                assert photo.format=='PNG' and photo.size==(800,960)
            assert guest.get_by_role('button',name='Keep on Nancy’s wall',exact=True).count()==0
            for page in [host,guest]:
                page.get_by_text('Activities',exact=True).tap()
            for width, height in [(320, 568), (844, 390)]:
                host.set_viewport_size({'width':width,'height':height})
                assert host.evaluate('document.documentElement.scrollWidth<=innerWidth')
                for name in ['Picnic', 'Garden', 'Dance together']:
                    button = host.get_by_role('button',name=name,exact=True)
                    button.wait_for(state='visible')
                    box = button.bounding_box()
                    assert box and box['height'] >= 44 and box['width'] >= 44
                    assert box['x'] >= 0 and box['x'] + box['width'] <= width + 1
                activities = host.get_by_text('Activities',exact=True)
                activities.tap()
                weather = host.get_by_label('Our atmosphere',exact=True)
                weather.scroll_into_view_if_needed()
                assert weather.evaluate("""control => {
                    const rect = control.getBoundingClientRect();
                    return control.contains(document.elementFromPoint(
                        (rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2,
                    ));
                }"""), 'The activity controls must sit above the walk controls'
                activities.tap()
                host.screenshot(path=str(results/f'accounts-village-{width}.png'))
            host.set_viewport_size({'width':390,'height':844})
            print('PASS paired gestures, role-specific baking handoff, both photos, once-only wall save and capture metadata',flush=True)
            for page, stop in [(host, 'Pip’s garden'), (guest, 'Little plaza')]:
                page.bring_to_front()
                page.get_by_text('Activities',exact=True).tap()
                page.get_by_text('Postcard walk',exact=True).tap()
                page.get_by_role('group',name='Your postcard stop').get_by_role('button',name=stop,exact=True).tap()
                page.get_by_text('Activities',exact=True).tap()
            host.bring_to_front()
            host.get_by_role('button',name='Add stamp 1 of 2',exact=True).tap()

            guest.bring_to_front()
            guest.reload();ready(guest)
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=30000)
            back(guest)
            for page in [host, guest]:
                page.bring_to_front()
                page.get_by_role('button',name='Walk to Little plaza',exact=True).tap()
                try:
                    page.wait_for_function("""() => {
                        const d = document.querySelector('#world canvas').dataset;
                        return Math.hypot(Number(d.villageX)+1.8, Number(d.villageZ)-1.6) < 2.2;
                    }""",timeout=60000)
                except Exception:
                    print('Postcard route', 'Nancy' if page == host else 'Melody',
                        page.locator('#world canvas').evaluate('(canvas) => ({...canvas.dataset})'),
                        flush=True)
                    raise
            guest.get_by_role('button',name='Add stamp 2 of 2',exact=True).tap()
            for page in [host, guest]:
                page.bring_to_front()
                page.get_by_text('Activities',exact=True).tap()
                trail = page.get_by_text('Postcard walk',exact=True)
                if trail.evaluate('(el) => !el.parentElement.open'):
                    trail.tap()
                page.get_by_text('Your two-stamp postcard is ready.',exact=True).wait_for()
            with guest.expect_download() as download:
                guest.get_by_role('link',name='Download village postcard',exact=True).tap()
            assert download.value.suggested_filename == 'Nancy-and-Melody-village-walk.png'
            with Image.open(download.value.path()) as postcard:
                assert postcard.format == 'PNG' and postcard.size == (800,960)
            host.bring_to_front()
            host.get_by_role('button',name='Keep walk postcard',exact=True).tap()
            assert host.get_by_role('button',name='Walk postcard kept',exact=True).is_disabled()
            assert guest.get_by_role('button',name='Keep walk postcard',exact=True).count()==0
            for page in [host, guest]:
                page.get_by_text('Activities',exact=True).tap()
            print('PASS two chosen landmarks, shared stamps across refresh, a postcard download and Nancy’s wall save',flush=True)

            for page, color in [(host, 'Rose'), (guest, 'Lavender')]:
                page.bring_to_front()
                page.get_by_text('Activities',exact=True).tap()
                page.get_by_text('Lantern evening',exact=True).tap()
                page.get_by_role('group',name='Your lantern color').get_by_role('button',name=color,exact=True).tap()
            host.bring_to_front()
            host.get_by_role('button',name='Light my lantern',exact=True).tap()
            guest.wait_for_function("""() => {
                const d = document.querySelector('#world canvas').dataset;
                return d.hostLantern === 'rose-lit' && d.guestLantern === 'lavender-paper';
            }""")
            guest.bring_to_front()
            guest.get_by_role('button',name='Light my lantern',exact=True).tap()
            for page in [host, guest]:
                page.get_by_text('Both lanterns are glowing at sunset.',exact=True).wait_for()
                page.wait_for_function("""() => {
                    const d = document.querySelector('#world canvas').dataset;
                    return d.hostLantern === 'rose-lit' && d.guestLantern === 'lavender-lit';
                }""")
                assert page.get_by_label('Our atmosphere',exact=True).input_value() == 'sunset'
                page.get_by_text('Activities',exact=True).tap()
            host.bring_to_front()
            host.screenshot(path=str(results/'accounts-lantern-evening.png'))
            print('PASS each partner lights their chosen lantern, both render and share the same sunset',flush=True)
            play_minigames(host, guest, ready, back, results)
            play_bench_tea(host, guest, ready, back, results)
            play_market(host, guest, ready, back, results)
            guest.keyboard.down('ArrowRight')
            guest.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageSpeed)>.5",timeout=20000)
            guest.keyboard.up('ArrowRight')
            guest.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageSpeed)<.02",timeout=15000)
            assert personal(guest)==before, 'Visiting must not overwrite personal progress'
            saved = host.evaluate("""() => ({
                cozy: JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')),
                equipment: JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1'))
            })""")
            assert saved['cozy']['village']['placed']['welcome']=='nook'
            assert saved['cozy']['village']['greeted']==['momo']
            assert saved['equipment']['outfit']=='sailor' and saved['equipment']['item']=='letter'

            print('PASS responsive movement and both personal saves, including Nancy’s outfit and equipped letter',flush=True)
            visits(guest)
            guest.get_by_role('button',name='Sign out',exact=True).click()
            guest.get_by_role('button',name='You · My Melody',exact=True).click()
            guest.get_by_label('Password',exact=True).fill('wrong password')
            guest.get_by_role('button',name='Sign in ♡',exact=True).click()
            guest.get_by_text('That account or password did not match.',exact=True).wait_for(timeout=20000)
            guest.get_by_label('Password',exact=True).fill('Melody test password')
            guest.get_by_role('button',name='Sign in ♡',exact=True).click()
            guest.get_by_text('Signed in as My Melody · My Melody ♡',exact=True).wait_for(timeout=20000)
            guest.get_by_role('button',name='Meet together ♡',exact=True).click()
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=25000)
            guest.reload();ready(guest)
            guest.get_by_text('Nancy is visiting with you. ♡',exact=True).wait_for(timeout=30000)
            guest.get_by_text('Signed in as My Melody · My Melody ♡',exact=True).wait_for(timeout=30000)
            assert not errors, errors
            print('PASS refresh reconnect, server sign-out, wrong-password feedback and a new authenticated visit',flush=True)
            host_browser.close();guest_browser.close()
    finally:
        server.terminate()
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:server.kill();server.wait()
