from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import os
out=Path(__file__).resolve().parents[1]/'docs'
base=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8012')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':1120},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    with page.expect_response('**/assets/hello-kitty.glb') as model_response:
        page.goto(base)
    assert model_response.value.status==200
    page.wait_for_function("!document.querySelector('#wave').disabled",timeout=60000)
    page.wait_for_timeout(2000)
    print('WEBGL',page.evaluate("!!document.querySelector('canvas').getContext('webgl2')"))
    page.screenshot(path=str(out/'simple-room-desktop.png'),full_page=True)
    assert page.locator('#sound').get_attribute('aria-pressed')=='false'
    page.locator('#sound').click();page.wait_for_function("document.querySelector('#sound').getAttribute('aria-pressed')==='true'")
    page.locator('#sound').click()
    # Project the actual model's touch targets into the live camera, then tap them.
    targets=page.evaluate('''async()=>{
      const T=await import('./vendor/three.module.js');const {loadBlenderKitty,makeBlenderKitty}=await import('./blender-kitty.js');
      const hero=makeBlenderKitty(await loadBlenderKitty());hero.position.set(-.12,.08,.65);hero.rotation.y=.3;hero.scale.setScalar(1.25);hero.updateMatrixWorld(true);
      const rect=document.querySelector('canvas').getBoundingClientRect();const c=new T.PerspectiveCamera(37,rect.width/rect.height,.1,80);c.position.set(2.1,2.8,6.5);c.lookAt(-.12,1.35,.65);c.updateMatrixWorld(true);
      return ['Bow_center_knot','Pink_daisy_golden_center','Head'].map(n=>{const p=new T.Box3().setFromObject(hero.userData.blender.model.getObjectByName(n)).getCenter(new T.Vector3()).project(c);return {x:rect.left+(p.x*.5+.5)*rect.width,y:rect.top+(-p.y*.5+.5)*rect.height};});
    }''')
    for point,expected in zip(targets,['A bow','A little bouquet','A gentle head pat']):
        page.mouse.click(point['x'],point['y']);page.wait_for_timeout(200)
        assert page.locator('#toast').inner_text().startswith(expected),page.locator('#toast').inner_text()
        page.mouse.move(0,0);page.wait_for_timeout(1400)
    page.locator('#wave').click();page.wait_for_timeout(1000)
    page.screenshot(path=str(out/'simple-room-wink.png'),full_page=True)
    page.locator('#dance').click();page.wait_for_timeout(500)
    assert page.locator('#toast').inner_text().startswith('A tiny dance')
    page.locator('#shelfPanel summary').click()
    assert page.locator('[data-doll]').count()==6
    print('START',page.locator('#collectionCount').inner_text())
    page.locator('#startHunt').click()
    assert page.locator('#huntHud').is_visible()
    page.locator('#pause').click();t=page.locator('#time').inner_text();page.wait_for_timeout(500)
    assert page.locator('#time').inner_text()==t
    page.locator('#resume').click()
    for i in range(8):
        bow=page.locator('.bow-target:visible').first
        bow.press("Enter")
        page.wait_for_timeout(300)
    # Ownership must be saved while the visible welcome is still playing.
    assert 1 in page.evaluate("JSON.parse(localStorage.getItem('kitty-room-3d-v1')).owned")
    assert page.locator('#startHunt').is_disabled()
    page.wait_for_timeout(1200)
    page.screenshot(path=str(out/'simple-room-arrival.png'),full_page=True)
    page.wait_for_function("document.querySelector('#rewardModal').open",timeout=60000)
    assert page.locator('#rewardTitle').inner_text()=='Hello, strawberry.'
    assert page.locator('#collectionCount').inner_text()=='2 of 6 friends'
    page.screenshot(path=str(out/'simple-room-result.png'),full_page=True)
    page.locator('#rewardDone').click()
    page.reload();page.wait_for_function("!document.querySelector('#wave').disabled")
    assert page.locator('#collectionCount').inner_text()=='2 of 6 friends'
    # Keep old wallet/care/milestone saves untouched; merge old room and picnic friends.
    page.evaluate("localStorage.setItem('kitty-picnic-v1',JSON.stringify({owned:[4]}));localStorage.setItem('kitty-care-v1','{\"hearts\":8}');localStorage.setItem('kitty-adventures-v1','{\"balance\":55}');")
    page.reload();page.wait_for_function("!document.querySelector('#wave').disabled")
    assert page.locator('#collectionCount').inner_text()=='3 of 6 friends'
    page.locator('#shelfPanel summary').click()
    page.locator('[data-doll="4"]').click()
    page.locator('[data-theme="mint"]').click()
    page.reload();page.wait_for_function("!document.querySelector('#wave').disabled")
    saved=page.evaluate("JSON.parse(localStorage.getItem('kitty-room-3d-v1'))")
    assert saved['selected']==4 and saved['theme']=='mint' and saved['owned']==[0,1,4]
    assert page.evaluate("localStorage.getItem('kitty-adventures-v1')")=='{"balance":55}'
    assert page.evaluate("localStorage.getItem('kitty-care-v1')")=='{"hearts":8}'
    # Relaxed mode persists and never shows a countdown.
    page.locator('#shelfPanel summary').click();page.locator('#relaxed').check()
    page.reload();page.wait_for_function("!document.querySelector('#wave').disabled")
    assert page.locator('#relaxed').is_checked()
    # A partial hunt never removes progress or creates a new doll.
    page.locator('#startHunt').click();page.wait_for_timeout(500)
    assert page.locator('#time').inner_text()=='No timer'
    page.locator('#startHunt').click();page.wait_for_function("document.querySelector('#rewardModal').open")
    assert page.locator('#collectionCount').inner_text()=='3 of 6 friends'
    assert not errors,errors
    # Fresh mobile view: no horizontal overflow, controls and optional shelf work.
    phone=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,reduced_motion='reduce')
    mobile=phone.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)))
    mobile.goto(base);mobile.wait_for_function("!document.querySelector('#wave').disabled",timeout=60000)
    assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
    mobile.screenshot(path=str(out/'simple-room-mobile.png'),full_page=True)
    mobile.locator('#wave').tap();mobile.locator('#shelfPanel summary').tap()
    assert mobile.locator('#collection').is_visible()
    assert page.locator('#chatPanel').count()==0
    assert page.locator('#adventureRewards').count()==0
    assert mobile.locator('#relaxed').is_visible()
    assert not errors,errors
    print('PASS: WebGL startup, wave/dance, bow hunt, pause, reward, replay/reload, legacy collections, save preservation, mobile and reduced-motion startup')
    browser.close()
