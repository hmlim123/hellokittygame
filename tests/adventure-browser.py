from playwright.sync_api import sync_playwright
from pathlib import Path
from collections import deque
import os,json
base=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8032')
out=Path(__file__).resolve().parents[1]/'docs'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1200,'height':1120});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 # An old cached module URL must never be used by the updated entry page.
 stale=[]
 def stale_module(route):
  stale.append(route.request.url);route.fulfill(status=200,content_type='text/javascript',body='throw new Error("Old adventure script used");')
 for name in ['adventure.js','adventure-state.js']:page.route('**/'+name,stale_module)
 page.goto(base+'/adventure.html?v=dungeon-3');page.wait_for_function("document.querySelector('#loading').hidden",timeout=60000)
 assert page.locator('html').get_attribute('data-release')=='dungeon-3' and not stale
 assert page.locator('#error').is_hidden()
 maps=page.evaluate("async()=>{const {MAPS}=await import('./adventure-state.js?v=dungeon-3');return MAPS;}")
 def state():return page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'))")
 keys={'up':'ArrowUp','down':'ArrowDown','left':'ArrowLeft','right':'ArrowRight'}
 def move_to(x,z,touch=False):
  s=state();rows=maps[s['map']]['rows'];q=deque([(s['x'],s['z'],[])]);seen={(s['x'],s['z'])};path=None
  while q:
   a,c,route=q.popleft()
   if (a,c)==(x,z):path=route;break
   for d,dx,dz in [('up',0,-1),('down',0,1),('left',-1,0),('right',1,0)]:
    nx,nz=a+dx,c+dz
    if nz<0 or nz>=len(rows) or nx<0 or nx>=len(rows[nz]) or (nx,nz) in seen:continue
    tile=rows[nz][nx]
    if tile not in '.DE' and not (tile=='G' and s['gate']):continue
    if tile in 'DE' and (nx,nz)!=(x,z):continue
    seen.add((nx,nz));q.append((nx,nz,route+[(d,nx,nz)]))
  assert path is not None,(s,x,z)
  for d,nx,nz in path:
   if touch:page.locator('[data-direction="'+d+'"]').tap()
   else:page.keyboard.press(keys[d])
   if rows[nz][nx] in 'DE':page.wait_for_function("arg=>JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).map!==arg",arg=s['map'])
   else:page.wait_for_function("p=>{const s=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return s.x===p[0]&&s.z===p[1]}",arg=[nx,nz])
  page.wait_for_function("!document.querySelector('#interact').disabled")
 def face(d):page.keyboard.press(keys[d]);page.wait_for_timeout(100)
 def talk():page.locator('#interact').click();page.wait_for_function("document.querySelector('#story').open")
 def close():page.locator('#closeStory').click()
 page.screenshot(path=str(out/'nancy-adventure-village.png'),full_page=True)
 move_to(5,6);talk();page.get_by_role('button',name='Let’s help!').click();assert state()['accepted'];close()
 assert 'Dungeon entrance' in page.locator('#wayfinder').inner_text()
 move_to(12,3);assert 'press Enter dungeon' in page.locator('#wayfinder').inner_text()
 page.get_by_role('button',name='Enter dungeon',exact=True).click();assert state()['map']=='garden'
 assert page.locator('#wayfinder').is_hidden() and page.locator('#story').is_hidden()
 page.screenshot(path=str(out/'nancy-adventure-garden.png'),full_page=True)
 for x,z in [(3,8),(11,8),(4,11)]:move_to(x,z);face('up');talk();close()
 assert len(state()['charms'])==3
 page.reload();page.wait_for_function("document.querySelector('#loading').hidden");assert len(state()['charms'])==3
 move_to(7,6);face('right');talk()
 page.get_by_role('button',name='Listen',exact=True).click();page.get_by_role('button',name='Tell a story',exact=True).click();page.get_by_role('button',name='Wave hello',exact=True).click();assert state()['guardian'];close()
 face('up');talk();assert state()['gate'];close();move_to(7,3);face('up');talk()
 assert state()['complete']
 room=page.evaluate("JSON.parse(localStorage.getItem('kitty-room-3d-v1'))");assert room['adventureRewarded'] and len(room['owned'])==2
 page.screenshot(path=str(out/'nancy-adventure-ending.png'),full_page=True)
 close();talk();assert page.evaluate("JSON.parse(localStorage.getItem('kitty-room-3d-v1')).owned")==room['owned'];close()
 page.reload();page.wait_for_function("document.querySelector('#loading').hidden");assert state()['complete']
 page.locator('#bag').click();assert page.locator('#charms .missing').count()==0;page.locator('#backToWorld').click()
 page.goto(base);page.wait_for_function("!document.querySelector('#wave').disabled");assert page.locator('#collectionCount').inner_text()=='2 of 6 friends'
 assert not errors,errors;page.close()
 phone=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');m=phone.new_page();m.on('pageerror',lambda e:errors.append(str(e)))
 m.goto(base+'/adventure.html');m.wait_for_function("document.querySelector('#loading').hidden",timeout=60000);assert m.locator('#error').is_hidden()
 m.locator('[data-direction="left"]').tap();m.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===6")
 assert m.evaluate('document.documentElement.scrollWidth<=innerWidth');m.screenshot(path=str(out/'nancy-adventure-mobile.png'),full_page=True)
 m.locator('#bag').tap();assert m.locator('#inventory').is_visible();m.locator('#backToWorld').tap();assert not errors,errors
 page=m
 move_to(12,3,touch=True);assert not state()['accepted']
 m.get_by_role('button',name='Enter dungeon',exact=True).tap();assert state()['map']=='garden' and state()['accepted']
 move_to(7,11,touch=True);m.get_by_role('button',name='Back to village',exact=True).tap();assert state()['map']=='village'
 m.get_by_role('button',name='Enter dungeon ↗',exact=True).tap();assert state()['map']=='garden'
 move_to(7,11,touch=True);m.get_by_role('button',name='Back to village',exact=True).tap()
 arch=m.get_by_role('button',name='Enter dungeon ↗',exact=True).bounding_box()
 m.touchscreen.tap(arch['x']+arch['width']/2,arch['y']+arch['height']+15)
 assert state()['map']=='garden','Tapping the arch geometry should enter, too'
 assert m.locator('#story').is_hidden() and not errors,errors
 print('PASS: keyboard and touch dungeon entry, direction hints, village dialogue, all dungeon chests, reload, guardian turns, gate, shrine, one reward, room integration and bag')
 b.close()
