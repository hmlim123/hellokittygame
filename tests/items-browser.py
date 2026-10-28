from playwright.sync_api import sync_playwright
from pathlib import Path
import os
base=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8028')
out=Path(__file__).resolve().parents[1]/'docs'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1200,'height':1060});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base);page.wait_for_function("!document.querySelector('#wave').disabled",timeout=60000)
 def choose(gift):
  page.locator('#startHunt').click();page.locator('#tab-gifts').click();page.locator('[data-gift="'+gift+'"]').click();page.locator('#playGift').click()
 choose('teddy');assert 'teddy cuddle' in page.locator('#toast').inner_text();page.wait_for_timeout(500);page.screenshot(path=str(out/'nancy-cuddle.png'),full_page=True);page.wait_for_timeout(1100)
 choose('strawberry');assert '1 of 3' in page.locator('#toast').inner_text();page.wait_for_timeout(1600)
 point=page.evaluate('''async()=>{const T=await import('./vendor/three.module.js');const {loadBlenderKitty,makeBlenderKitty}=await import('./blender-kitty.js');const {setHeldGift}=await import('./gifts.js');const h=makeBlenderKitty(await loadBlenderKitty());h.position.set(-.12,.08,.65);h.rotation.y=.3;h.scale.setScalar(1.25);setHeldGift(h,'strawberry');h.updateMatrixWorld(true);const r=document.querySelector('canvas').getBoundingClientRect(),c=new T.PerspectiveCamera(37,r.width/r.height,.1,80);c.position.set(2.1,2.8,6.5);c.lookAt(-.12,1.35,.65);c.updateMatrixWorld(true);const v=new T.Box3().setFromObject(h.userData.blender.gifts.cache.get('strawberry')).getCenter(new T.Vector3()).project(c);return {x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height};}''')
 page.mouse.click(point['x'],point['y']);assert '2 of 3' in page.locator('#toast').inner_text();page.mouse.move(0,0);page.wait_for_timeout(1600)
 page.mouse.click(point['x'],point['y']);assert 'All gone' in page.locator('#toast').inner_text();page.mouse.move(0,0);page.wait_for_timeout(1600)
 choose('letter');assert page.locator('#letterCover').is_visible();assert page.locator('#letterPaper').is_hidden()
 page.locator('#unsealLetter').click();assert page.locator('#letterPaper').is_visible();assert page.locator('#unsealLetter').get_attribute('aria-expanded')=='true'
 page.screenshot(path=str(out/'nancy-open-letter.png'),full_page=True)
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-room-preferences-v1')).letterOpened")
 page.locator('#unsealLetter').click();assert page.locator('#letterCover').is_visible();page.locator('#closeLetter').click()
 page.locator('#startHunt').click();page.locator('[data-mission="picnic"]').click()
 page.locator('[data-picnic-item="teddy"]').press('Enter');page.locator('[data-picnic-slot="plate"]').press('Enter')
 assert 'cozy blanket' in page.locator('[data-picnic-status]').inner_text()
 page.locator('[data-picnic-slot="blanket"]').press('Enter');assert page.locator('[data-picnic-item="teddy"]').is_disabled()
 # Real pointer drag, not a synthetic placement callback.
 source=page.locator('[data-picnic-item="strawberry"]').bounding_box();dest=page.locator('[data-picnic-slot="plate"]').bounding_box()
 page.mouse.move(source['x']+source['width']/2,source['y']+source['height']/2);page.mouse.down();page.mouse.move(dest['x']+dest['width']/2,dest['y']+dest['height']/2,steps=12);page.mouse.up()
 assert page.locator('[data-picnic-slot="plate"]').get_attribute('class')=='placed'
 page.screenshot(path=str(out/'nancy-picnic.png'),full_page=True)
 for item,spot in [('flowers','vase'),('letter','heart')]:page.locator('[data-picnic-item="'+item+'"]').click();page.locator('[data-picnic-slot="'+spot+'"]').click()
 page.wait_for_function("document.querySelector('#rewardModal').open",timeout=60000)
 assert page.locator('#collectionCount').inner_text()=='2 of 6 friends'
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-missions-v1')).completed.picnic")==1
 page.locator('#rewardDone').click();page.reload();page.wait_for_function("!document.querySelector('#wave').disabled")
 page.locator('#startHunt').click();page.locator('[data-mission="picnic"]').click();assert page.locator('.picnic-tray button:disabled').count()==0
 page.locator('#closePicnic').click();page.locator('#rewardDone').click();assert page.locator('#collectionCount').inner_text()=='2 of 6 friends'
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-missions-v1')).completed.picnic")==1
 page.close()
 phone=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 m=phone.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(base);m.wait_for_function("!document.querySelector('#wave').disabled",timeout=60000)
 m.locator('#startHunt').tap();m.locator('[data-mission="picnic"]').tap()
 for item,spot in [('teddy','blanket'),('strawberry','plate'),('flowers','vase'),('letter','heart')]:m.locator('[data-picnic-item="'+item+'"]').tap();m.locator('[data-picnic-slot="'+spot+'"]').tap()
 m.wait_for_function("document.querySelector('#rewardModal').open");assert m.locator('#collectionCount').inner_text()=='2 of 6 friends'
 assert m.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 print('PASS: real cuddle, three feed taps, sealed/foldable letter, keyboard and pointer picnic, saved reward once, reset/cancel, mobile touch and reduced motion')
 b.close()
