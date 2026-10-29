from playwright.sync_api import sync_playwright
from pathlib import Path
from collections import deque
import os,math
base=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8032');out=Path(__file__).resolve().parents[1]/'docs'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':1200,'height':1100},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/adventure.html?v=adventure-7');page.wait_for_function("document.querySelector('#loading').hidden",timeout=60000)
 # An existing completed chapter must gain the new quests without losing its ending.
 page.evaluate("localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({accepted:true,complete:true,guardian:true,gate:true,charms:['rose','honey','sky'],x:7,z:8}))")
 page.reload();page.wait_for_function("document.querySelector('#loading').hidden")
 maps=page.evaluate("async()=>{return (await import('./adventure-state.js?v=adventure-7')).MAPS}")
 def state():return page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'))")
 def move_to(x,z):
  s=state();rows=maps[s['map']]['rows'];q=deque([(s['x'],s['z'],[])]);seen={(s['x'],s['z'])};path=None
  while q:
   a,d,route=q.popleft()
   if (a,d)==(x,z):path=route;break
   for key,dx,dz in [('ArrowUp',0,-1),('ArrowDown',0,1),('ArrowLeft',-1,0),('ArrowRight',1,0)]:
    nx,nz=a+dx,d+dz
    if nz<0 or nz>=len(rows) or nx<0 or nx>=len(rows[nz]) or (nx,nz) in seen:continue
    tile=rows[nz][nx]
    if tile not in '.DERB' and not(tile=='G' and s['gate']):continue
    if tile in 'DE' and(nx,nz)!=(x,z):continue
    seen.add((nx,nz));q.append((nx,nz,route+[(key,nx,nz)]))
  assert path is not None,(s,x,z)
  for key,nx,nz in path:
   page.keyboard.press(key)
   if rows[nz][nx] in 'DE':page.wait_for_function("m=>JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).map!==m",arg=s['map'])
   else:page.wait_for_function("p=>{const s=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return s.x===p[0]&&s.z===p[1]}",arg=[nx,nz])
  page.wait_for_function("!document.querySelector('#interact').disabled")
 page.locator('#bag').click();page.locator('#inventoryTab-quest').click();assert page.locator('.quest-card').count()==4
 page.locator('[data-quest=ribbons] button').click();page.locator('#backToWorld').click();assert 'ribbons' in page.locator('#quest').inner_text()
 for x,z in [(5,3),(12,9),(4,5)]:move_to(x,z)
 page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).ribbons.length===3")
 move_to(5,6);page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).ribbonReturned")
 page.locator('#bag').click();page.locator('#inventoryTab-clothes').click();page.get_by_role('button',name='Berry sweetheart',exact=True).click();page.locator('#backToWorld').click()
 move_to(12,2)
 for x,z in [(3,10),(11,10)]:move_to(x,z)
 page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).berries.length===2")
 for x,z in [(3,4),(11,4)]:move_to(x,z)
 page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).litLanterns.length===2")
 move_to(7,3);page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).lanternsBlessed")
 page.locator('#bag').click();page.locator('#inventoryTab-items').click();page.get_by_role('button',name='Sweet strawberry',exact=True).click();page.locator('#backToWorld').click()
 move_to(7,12);move_to(5,6);page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).picnicDelivered")
 page.locator('#bag').click();page.locator('#inventoryTab-quest').click();assert page.locator('.quest-done').count()==4;page.screenshot(path=str(out/'nancy-quest-journal.png'),full_page=True)
 progress=state();page.reload();page.wait_for_function("document.querySelector('#loading').hidden");assert state()==progress
 page.goto(base+'/?v=adventure-7');page.wait_for_function("!document.querySelector('#wave').disabled",timeout=60000)
 page.wait_for_function("document.querySelector('#stage canvas').dataset.keepsakes==='picnic,lantern'")
 page.screenshot(path=str(out/'nancy-adventure-keepsakes-room.png'),full_page=True)
 page.locator('#openWardrobe').click();assert page.locator('#equipmentPreview').get_attribute('data-outfit')=='berry';page.locator('#backToWorld').click()
 page.wait_for_function("document.activeElement.id==='openWardrobe'")
 canvas=page.locator('#stage canvas');canvas.focus();last=float(canvas.get_attribute('data-view-angle'));travel=0
 for i in range(32):
  page.keyboard.press('ArrowRight');page.wait_for_function("old=>Math.abs(Number(document.querySelector('#stage canvas').dataset.viewAngle)-old)>.01",arg=last);a=float(canvas.get_attribute('data-view-angle'));delta=(a-last+math.pi)%(2*math.pi)-math.pi;travel+=delta;last=a
  if i==11:page.screenshot(path=str(out/'nancy-room-360-back.png'),full_page=True)
 assert travel>2*math.pi,(travel,last)
 page.locator('#resetCamera').click()
 for kind in ['hug','highfive','tickle','kiss']:
  page.locator('#startHunt').click();page.locator('#tab-gifts').click();page.locator('[data-together='+kind+']').click();assert page.locator('#toast').inner_text();page.wait_for_timeout(750)
 assert not errors,errors;page.close()
 phone=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');m=phone.new_page();m.on('pageerror',lambda e:errors.append(str(e)))
 m.goto(base+'/?v=adventure-7');m.wait_for_function("!document.querySelector('#wave').disabled",timeout=60000);m.wait_for_function("document.querySelector('#stage canvas').dataset.viewAngle")
 box=m.locator('#stage canvas').bounding_box();before=float(m.locator('#stage canvas').get_attribute('data-view-angle'));cdp=phone.new_cdp_session(m)
 y=box['y']+box['height']*.6;start=box['x']+box['width']-35;end=box['x']+35
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':start,'y':y}]})
 for i in range(1,9):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':start+(end-start)*i/8,'y':y}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});m.wait_for_function("v=>Math.abs(Number(document.querySelector('#stage canvas').dataset.viewAngle)-v)>.1",arg=before)
 m.locator('#resetCamera').tap();m.locator('#startHunt').tap();m.locator('#tab-gifts').tap();m.locator('[data-together=tickle]').tap();assert 'tickles' in m.locator('#toast').inner_text()
 m.locator('#openWardrobe').tap();m.locator('#inventoryTab-quest').tap();assert m.locator('.quest-card').count()==4;assert m.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 print('PASS: legacy ending migration, three complete automatic quests, tracking, earned outfit, room keepsakes, reload, a full 360 camera turn and four touch activities')
 b.close()
