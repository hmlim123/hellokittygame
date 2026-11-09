"""A fresh village day: café gift, garden, home memories and phone controls."""
import os, re
from playwright.sync_api import sync_playwright

BASE = os.environ.get('KITTY_BASE_URL', 'http://127.0.0.1:8081').rstrip('/')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True,
        args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    errors = []
    page = browser.new_page(viewport={'width': 1100, 'height': 1000}, reduced_motion='no-preference')
    page.on('pageerror', lambda e: errors.append(str(e)))
    def ready(pg=page):
        pg.wait_for_function("!document.querySelector('#openWardrobe').disabled", timeout=90000)
    def village(pg=page):
        pg.wait_for_function("document.querySelector('#world canvas')?.dataset.village==='true'&&!document.querySelector('#openWardrobe').disabled", timeout=90000)
    def saved(pg=page):
        return pg.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).village")
    def place(name):
        page.get_by_role('button', name='Places & memories', exact=True).click()
        page.get_by_role('dialog', name='Your village', exact=True).get_by_role('button', name=re.compile(name)).first.click()

    page.goto(BASE + '/')
    ready()
    before = page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'))")
    assert page.locator('.action-bar>button').count() == 3
    page.get_by_role('button', name='Visit the village', exact=True).click()
    village()
    assert page.url.endswith('adventure.html')
    page.get_by_role('button', name='Walk to Momo', exact=False).click()
    page.get_by_role('dialog', name='Momo', exact=True).wait_for(timeout=35000)
    assert 'welcome cushion' in page.get_by_role('dialog', name='Momo', exact=True).inner_text()
    assert saved()['greeted'] == ['momo']
    page.get_by_role('button', name='Let’s visit the café ☕', exact=True).click()
    page.get_by_role('dialog', name='Bake cookies with Kitty', exact=True).wait_for(timeout=35000)
    page.get_by_role('button', name='Bake & decorate →', exact=True).click()
    page.get_by_role('button', name='Add a heart ♥', exact=True).click()
    page.get_by_role('button', name='Ready to give →', exact=True).click()
    page.get_by_role('button', name='Wrap for a village friend ♡', exact=True).click()
    page.wait_for_function("document.querySelector('#world canvas').dataset.holding==='parcel'", timeout=20000)
    page.get_by_role('button', name='Momo ♡', exact=True).click()
    page.get_by_role('dialog', name='Momo', exact=True).wait_for(timeout=35000)
    page.get_by_role('button', name='Give your wrapped cookie ♡', exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).village.gifts.momo===1")
    assert not page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).cookie.packed")
    print('PASS default village, guided walk to Momo, real café baking, carried parcel and one-time gift', flush=True)

    place('Pip’s garden')
    page.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageRoute)===0", timeout=35000)
    for index in [2, 1, 3]:
        page.get_by_role('button', name='Water flower bed ' + str(index), exact=True).click()
        page.wait_for_function("i=>JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).village.flowers[i]", arg=index - 1, timeout=35000)
    assert all(saved()['flowers'])
    page.screenshot(path='/tmp/kitty-village-garden.png', full_page=True)
    place('Nancy’s home')
    page.get_by_role('dialog', name='Your village', exact=True).wait_for(timeout=35000)
    ready()
    assert page.locator('.action-bar>button').count() == 3
    for item, spot in [('welcome', 'Reading nook'), ('flowers', 'Windowsill'), ('cafe', 'Little table')]:
        page.locator('[data-village-keepsake=' + item + ']').get_by_role('button', name=spot, exact=True).click()
    expected = {'welcome': 'nook', 'flowers': 'window', 'cafe': 'table'}
    assert saved()['placed'] == expected
    page.get_by_role('button', name='Go to Nancy’s room ♡', exact=True).click()
    ready()
    page.screenshot(path='/tmp/kitty-village-home-keepsakes.png', full_page=True)
    page.reload()
    ready()
    assert saved()['returned'] and saved()['placed'] == expected
    assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'))") == before
    page.get_by_role('button',name='Visit the village',exact=True).click()
    village()
    place('Momo’s café')
    page.get_by_role('dialog',name='Bake cookies with Kitty',exact=True).wait_for(timeout=35000)
    page.get_by_text(re.compile('Your recipe cards')).click()
    assert page.locator('[data-recipe=strawberry]').get_by_role('button').is_enabled()
    assert page.locator('[data-recipe=moon]').get_by_role('button').is_enabled()
    print('PASS three blooming beds, earned keepsakes in the actual room, return/reload and earlier story preservation', flush=True)
    page.close()

    for width, height in [(320, 568), (390, 844), (844, 390)]:
        phone = browser.new_page(viewport={'width': width, 'height': height}, is_mobile=True, has_touch=True, reduced_motion='reduce')
        phone.on('pageerror', lambda e: errors.append(str(e)))
        phone.goto(BASE + '/adventure.html')
        village(phone)
        assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
        pad = phone.locator('.village-thumb')
        pad.scroll_into_view_if_needed()
        rect = pad.bounding_box()
        x, y = rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2
        cdp = phone.context.new_cdp_session(phone)
        def touch(kind, tx=None, ty=None):
            points=[] if tx is None else [{'x':tx,'y':ty,'id':1}]
            cdp.send('Input.dispatchTouchEvent', {'type':kind,'touchPoints':points})
        touch('touchStart', x, y)
        touch('touchMove', x - 30, y + 20)
        phone.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageSpeed)>1", timeout=10000)
        touch('touchEnd')
        phone.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageSpeed)<.02", timeout=10000)
        start = phone.evaluate("[Number(document.querySelector('#world canvas').dataset.villageX),Number(document.querySelector('#world canvas').dataset.villageZ)]")
        phone.wait_for_timeout(350)
        end = phone.evaluate("[Number(document.querySelector('#world canvas').dataset.villageX),Number(document.querySelector('#world canvas').dataset.villageZ)]")
        assert abs(start[0] - end[0]) + abs(start[1] - end[1]) < .02
        touch('touchStart', x, y)
        touch('touchMove', x - 25, y)
        phone.evaluate("dispatchEvent(new Event('blur'))")
        touch('touchEnd')
        phone.wait_for_function("Number(document.querySelector('#world canvas').dataset.villageSpeed)<.02", timeout=10000)
        phone.get_by_role('button', name='Places & memories', exact=True).tap()
        assert phone.get_by_role('dialog', name='Your village', exact=True).is_visible()
        phone.get_by_role('button', name='Close Your village', exact=True).tap()
        phone.screenshot(path=f'/tmp/kitty-village-touch-{width}.png', full_page=True)
        phone.close()
    assert not errors, errors
    print('PASS 320px, 390px and landscape touch, diagonal steering, release/blur stops and menus; physical Safari untested', flush=True)
    browser.close()
