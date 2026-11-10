"""The house is a usable full-room view, with readable games and saved decorations."""
import json, os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    errors=[]
    for width,height in [(1100,1060),(320,568),(390,844),(844,390)]:
        phone=width<500 or height<500
        page=browser.new_page(viewport={'width':width,'height':height},is_mobile=phone,has_touch=phone,reduced_motion='reduce')
        page.on('pageerror',lambda e:errors.append(str(e)))
        seed={'village':{'greeted':['momo'],'flowers':[True,True,True],'gifts':{'momo':1,'pip':0},'placed':{'welcome':'nook','flowers':'window','cafe':'table'}}}
        page.add_init_script("if(!localStorage.getItem('kitty-world-v2')) localStorage.setItem('kitty-nancy-cozy-v1',"+json.dumps(json.dumps(seed))+");")
        page.goto(BASE+'/')
        def ready():
            page.wait_for_function("document.querySelector('#stage canvas')?.dataset.homeView==='dollhouse'&&!document.querySelector('#openWardrobe').disabled",timeout=90000)
        def data():return page.locator('#stage canvas').evaluate('(c)=>({...c.dataset})')
        def frame():
            page.wait_for_function("(()=>{let c=document.querySelector('#stage canvas'),d=c?.dataset;if(!d?.homeFloor)return false;return JSON.parse(d.homeFloor).every(p=>p.every(v=>v>.02&&v<.98))})()",timeout=15000)
            d=data();ratio=float(d['homeKittyFoot'])-(1-float(d['modelTop']))/2
            assert .07<ratio<.43,(width,height,ratio)
        ready();frame()
        assert page.locator('.action-bar>button').count()==3
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        before=page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).village.placed")
        if page.get_by_role('button',name='Dismiss message',exact=True).is_visible():page.get_by_role('button',name='Dismiss message',exact=True).click()
        canvas=page.locator('#stage canvas');canvas.scroll_into_view_if_needed()
        zoom=float(data()['homeZoom'])
        r=canvas.bounding_box();cx=r['x']+r['width']/2;cy=r['y']+r['height']/2
        if not phone:
            page.mouse.move(cx,cy)
            for _ in range(3):
                page.mouse.wheel(0,-150);page.wait_for_timeout(100)
        elif width==390:
            cdp=page.context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx-22,'y':cy,'id':1},{'x':cx+22,'y':cy,'id':2}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx-60,'y':cy,'id':1},{'x':cx+60,'y':cy,'id':2}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        if not phone or width==390:
            page.wait_for_function("z=>Number(document.querySelector('#stage canvas').dataset.homeZoom)>z*1.1",arg=zoom,timeout=15000)
        page.get_by_role('button',name='Reset view ↺',exact=True).click()
        page.wait_for_function("z=>Math.abs(Number(document.querySelector('#stage canvas').dataset.homeZoom)-z)<.01",arg=zoom)
        canvas.focus();angle=float(data()['viewAngle']);page.keyboard.press('ArrowRight')
        page.wait_for_function("a=>Math.abs(Number(document.querySelector('#stage canvas').dataset.viewAngle)-a)>.1",arg=angle)
        page.get_by_role('button',name='Reset view ↺',exact=True).click();frame()
        canvas.scroll_into_view_if_needed();r=canvas.bounding_box();point=json.loads(data()['homeOven'])
        page.mouse.click(r['x']+point[0]*r['width'],r['y']+point[1]*r['height'])
        page.get_by_role('dialog',name='Bake cookies with Kitty',exact=True).wait_for(timeout=15000)
        page.get_by_role('button',name='Close Bake cookies with Kitty',exact=True).click()
        ready()
        page.screenshot(path=f'/tmp/nancy-home-{width}.png',full_page=True)
        page.get_by_role('button',name='Go out to the village',exact=True).click()
        page.wait_for_function("document.querySelector('#world canvas')?.dataset.village==='true'&&!document.querySelector('#openWardrobe').disabled",timeout=90000)
        page.get_by_role('button',name='← Her room',exact=True).click();ready();frame()
        assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).village.placed")==before
        if width==1100:
            for name,style in [('Moonlight Witch','witch'),('Silver Bunny','bunny')]:
                page.get_by_role('button',name='Inventory ♡',exact=True).click();page.locator('.plush-picker summary').click()
                page.get_by_role('button',name='Choose '+name,exact=True).click()
                page.get_by_role('button',name='Back to Kitty',exact=True).click();ready()
                page.wait_for_function("s=>document.querySelector('#stage canvas').dataset.plush===s&&Number(document.querySelector('#stage canvas').dataset.modelTop)<.93",arg=style,timeout=90000)
                frame()
            page.get_by_role('button',name='Little activities',exact=True).click();page.locator('[data-mission="bows"]').click()
            page.wait_for_function("document.querySelector('#stage canvas').dataset.homeView==='play'",timeout=15000)
            buttons=page.get_by_role('button',name='Collect bow 1',exact=True)
            buttons.click()
            page.get_by_role('button',name='Finish early',exact=True).click()
            ready();frame()
        print('PASS whole house framing, rotation/reset, closer look, oven, front doorstep and remembered decorations:',width,height,flush=True)
        page.close()
    assert not errors,errors
    browser.close()
