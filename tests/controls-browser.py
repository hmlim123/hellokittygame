"""Check real keyboard and touch steering against the production preview."""
import json
import os
from playwright.sync_api import sync_playwright

BASE = os.environ.get('KITTY_BASE_URL', 'http://127.0.0.1:8053').rstrip('/')
with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
        headless=True,
        args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    )
    errors = []

    def setup(mobile=False, x=7, z=8):
        page = browser.new_page(
            viewport={'width': 390 if mobile else 1000, 'height': 844 if mobile else 1000},
            is_mobile=mobile, has_touch=mobile, reduced_motion='reduce',
        )
        page.on('pageerror', lambda e: errors.append(str(e)))
        seed = json.dumps(json.dumps({'map': 'village', 'accepted': True, 'x': x, 'z': z}))
        page.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1'," + seed + ");")
        page.goto(BASE + '/adventure.html')
        page.wait_for_function("!document.querySelector('#openWardrobe').disabled", timeout=60000)
        return page

    def stopped(page, x, z):
        page.wait_for_function("([x,z])=>{const a=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return a.x===x&&a.z===z&&document.querySelector('#world canvas').dataset.moving==='false'}", arg=[x, z], timeout=15000)

    def taps(page, keys):
        # Dispatch within one event-loop task: even a very quick press must not disappear.
        page.evaluate("keys=>{for(const key of keys)for(const type of ['keydown','keyup'])dispatchEvent(new KeyboardEvent(type,{key,bubbles:true}))}", keys)

    page = setup()
    taps(page, ['ArrowRight', 'ArrowUp'])
    stopped(page, 8, 7)
    page.reload()
    page.wait_for_function("!document.querySelector('#openWardrobe').disabled", timeout=60000)
    stopped(page, 8, 7)
    print('PASS rapid turn taps are preserved, stop after the buffered step, and survive reload', flush=True)
    page.close()

    page = setup()
    taps(page, ['ArrowRight', 'ArrowRight'])
    stopped(page, 9, 8)
    print('PASS a rapid second same-direction tap is preserved', flush=True)
    page.close()

    page = setup()
    page.keyboard.down('Shift')
    page.keyboard.press('W')
    page.keyboard.up('Shift')
    stopped(page, 7, 7)
    page.keyboard.down('w')
    page.keyboard.down('d')
    page.keyboard.up('d')
    page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).z<=5", timeout=15000)
    page.keyboard.up('w')
    page.wait_for_function("document.querySelector('#world canvas').dataset.moving==='false'", timeout=5000)
    print('PASS uppercase WASD and restoring a still-held key after a temporary turn', flush=True)
    page.close()

    page = setup()
    page.evaluate("""()=>{
      dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
      dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
      dispatchEvent(new Event('blur'));
      dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowUp',bubbles:true}));
    }""")
    stopped(page, 8, 8)
    page.wait_for_timeout(400)
    stopped(page, 8, 8)
    print('PASS losing focus clears held keys and pending turns', flush=True)
    page.close()

    phone = setup(True, 4, 8)
    pad = phone.locator('.dpad')
    pad.scroll_into_view_if_needed()
    left = phone.get_by_role('button', name='Walk left', exact=True).bounding_box()
    up = phone.get_by_role('button', name='Walk up', exact=True).bounding_box()
    assert left['width'] >= 48 and left['height'] >= 48
    cdp = phone.context.new_cdp_session(phone)

    def touch(kind, box=None):
        points = [] if box is None else [{'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2, 'id': 1}]
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})

    touch('touchStart', left)
    phone.wait_for_function("Number(document.querySelector('#world canvas').dataset.physicsContacts)>0", timeout=5000)
    touch('touchMove', up)
    phone.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).z<8", timeout=15000)
    touch('touchEnd')
    phone.wait_for_function("document.querySelector('#world canvas').dataset.moving==='false'", timeout=5000)
    end = phone.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).z")
    phone.wait_for_timeout(400)
    assert phone.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).z") == end
    for width in [320, 390]:
        phone.set_viewport_size({'width': width, 'height': 844})
        assert phone.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    print('PASS touch slide changes direction without lifting, recovers from walls, releases cleanly, and fits small phones', flush=True)
    assert not errors, errors
    browser.close()
