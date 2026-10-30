"""Touch, viewport edges/orientation, settings and bounded rendering detail."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
    for width,height in [(320,568),(390,844),(844,390)]:
        page=b.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=2,reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)))
        page.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({map:'glade',trackedQuest:'glade',accepted:true,x:2,z:10}));")
        page.goto(BASE+'/adventure.html');page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.wait_for_function("(()=>{const d=document.querySelector('#world canvas').dataset;return Number(d.playerScreenX)>.03&&Number(d.playerScreenX)<.97&&Number(d.playerScreenY)>.03&&Number(d.playerScreenY)<.97})()")
        for button in page.locator('.dpad button').all():
            box=button.bounding_box();assert box['width']>=48 and box['height']>=48
        page.get_by_role('button',name='Walk up',exact=True).tap()
        page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).z===9",timeout=15000)
        page.get_by_role('button',name='Game settings',exact=True).tap()
        quality=page.get_by_label('Game visual detail',exact=False);quality.select_option('gentle')
        assert float(quality.evaluate("e=>getComputedStyle(e).fontSize.replace('px','')"))>=16 if width<=680 else True
        page.keyboard.press('Escape');page.wait_for_function("Number(document.querySelector('#world canvas').dataset.pixelRatio)===1")
        page.get_by_role('button',name='Inventory ♡',exact=True).tap()
        page.get_by_role('button',name='Sky sailor',exact=True).tap()
        dialog=page.get_by_role('dialog',name='Kitty’s inventory');dialog.evaluate('e=>e.scrollTop=e.scrollHeight')
        close=page.get_by_role('button',name='Close Kitty’s inventory',exact=True);box=close.bounding_box()
        assert box['height']>=44 and box['y']>=0 and box['y']+box['height']<=height,(width,height,box)
        close.tap()
        page.set_viewport_size({'width':height,'height':width})
        page.wait_for_timeout(250)
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.wait_for_function("(()=>{const d=document.querySelector('#world canvas').dataset;return Number(d.playerScreenX)>0&&Number(d.playerScreenX)<1&&Number(d.playerScreenY)>0&&Number(d.playerScreenY)<1})()")
        page.reload();page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
        page.wait_for_function("document.querySelector('#world canvas').dataset.visualDetail==='gentle'&&Number(document.querySelector('#world canvas').dataset.pixelRatio)===1")
        assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).z")==9
        page.screenshot(path=f'/tmp/nancy-device-{width}x{height}.png',full_page=True)
        print('PASS viewport, visible Kitty, touch targets, outfit editing, reachable close, rotation, quality and reload:',width,height,flush=True);page.close()
    assert not errors,errors;b.close()
