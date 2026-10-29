"""Production React/R3F smoke + real Rapier adventure playthrough.
Run npm run build, npm run preview -- --port 8053, then this file.
Requires Python Playwright and an installed Chromium.
"""
import os,json
from collections import deque
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
# Read shipped map definitions using Node rather than duplicating map data.
import subprocess
MAPS=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {MAPS} from './dist/adventure-state.js';console.log(JSON.stringify(MAPS));"],text=True))
KEYS={'up':'ArrowUp','down':'ArrowDown','left':'ArrowLeft','right':'ArrowRight'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=browser.new_page(viewport={'width':1100,'height':1060},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def saved(key='kitty-nancy-adventure-v1'):return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
 def ready():page.wait_for_function("document.querySelector('canvas[data-renderer=\"react-three-fiber\"]') && !document.querySelector('#openWardrobe').disabled",timeout=60000)
 def dismiss():
  if page.get_by_role('button',name='Keep exploring',exact=True).is_visible():page.get_by_role('button',name='Keep exploring',exact=True).click()
 def walk(x,z):
  s=saved();rows=MAPS[s['map']]['rows'];start=(s['x'],s['z']);queue=deque([(start,[])]);seen={start};path=None
  while queue:
   (cx,cz),route=queue.popleft()
   if (cx,cz)==(x,z):path=route;break
   for direction,dx,dz in [('up',0,-1),('down',0,1),('left',-1,0),('right',1,0)]:
    nx,nz=cx+dx,cz+dz
    if nz<0 or nz>=len(rows) or nx<0 or nx>=len(rows[nz]):continue
    tile=rows[nz][nx]
    if (nx,nz) not in seen and (tile in '.DERB' or tile=='G' and s['gate']):seen.add((nx,nz));queue.append(((nx,nz),route+[(direction,nx,nz)]))
  assert path is not None,(s,x,z)
  for direction,nx,nz in path:
   dismiss();page.keyboard.press(KEYS[direction])
   if rows[nz][nx] in 'DE':
    page.wait_for_function("map=>JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).map!==map",arg=s['map'],timeout=15000)
   else:
    try:page.wait_for_function("p=>{const s=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return s.x===p[0]&&s.z===p[1]}",arg=[nx,nz],timeout=15000)
    except Exception:
     page.screenshot(path='/tmp/react-route-failure.png',full_page=True);print('ROUTE FAILED',direction,nx,nz,saved(),flush=True);raise
  print('WALK',s['map'],x,z,flush=True)
 def inventory():page.get_by_role('button',name='Inventory ♡',exact=True).click()
 def close_inventory():page.get_by_role('button',name='Back to Kitty',exact=True).click()
 page.goto(BASE+'/');ready();assert page.locator('.action-bar>button').count()==3
 # Same-mode home navigation must not disable a loaded scene.
 page.get_by_role('button',name='Hello Kitty home',exact=True).click();assert page.get_by_role('button',name='Wave hello').is_enabled()
 canvas=page.locator('#stage canvas');canvas.focus();angle=float(canvas.get_attribute('data-view-angle'));page.keyboard.press('ArrowRight');page.wait_for_function("a=>Math.abs(Number(document.querySelector('#stage canvas').dataset.viewAngle)-a)>.1",arg=angle)
 page.get_by_role('button',name='Reset view ↺').click();page.wait_for_timeout(150)
 page.get_by_role('button',name='Game settings',exact=True).click();page.get_by_role('button',name='Mint tea',exact=True).click();page.get_by_label('Relaxed hunts, without a timer').check();page.keyboard.press('Escape');assert saved('kitty-room-3d-v1')['theme']=='mint'
 inventory();page.get_by_role('button',name='Sky sailor',exact=True).click();page.wait_for_selector('.outfit-preview canvas');page.wait_for_function("document.querySelector('.outfit-preview canvas').getAttribute('aria-label')?.startsWith('Sky sailor')")
 assert page.get_by_role('button',name='Moonlight dress',exact=True).is_disabled();page.get_by_role('tab',name='Items',exact=True).click();page.get_by_role('button',name='Cuddle teddy',exact=True).click();close_inventory()
 page.get_by_role('button',name='Play together ↗',exact=True).click();page.get_by_label('Message to Kitty').fill('dance please');page.get_by_role('button',name='Send ♡').click();assert page.locator('.chat-list p').count()==2;page.keyboard.press('Escape')
 print('ROOM UI PASS',flush=True);page.get_by_role('button',name='Play a mission').click();page.locator('[data-mission="bows"]').click()
 for _ in range(8):page.get_by_role('button',name='Collect bow 1',exact=True).click()
 page.get_by_role('button',name='Back to Kitty',exact=True).wait_for(timeout=15000);assert len(saved('kitty-room-3d-v1')['owned'])==2;page.get_by_role('button',name='Back to Kitty',exact=True).click()
 # Picnic must reset its placed gifts when replayed.
 for run in range(2):
  page.get_by_role('button',name='Play a mission').click();page.locator('[data-mission="picnic"]').click()
  for item,spot in [('teddy','blanket'),('strawberry','plate'),('flowers','vase'),('letter','heart')]:
   page.locator(f'[data-picnic-item="{item}"]').click();page.locator(f'[data-picnic-slot="{spot}"]').click()
  page.get_by_role('button',name='Back to Kitty',exact=True).wait_for(timeout=15000);page.get_by_role('button',name='Back to Kitty',exact=True).click()
 page.screenshot(path='/tmp/react-room-verified.png',full_page=True)
 page.get_by_role('button',name='Play a mission').click();page.locator('.adventure-link:not(.glade-link)').click();ready();assert page.url.endswith('adventure.html');assert saved('kitty-nancy-equipment-v1')['outfit']=='sailor'
 # Actual blocked-wall movement, not a logical-only collision assertion.
 walk(4,8);page.keyboard.press('ArrowLeft');page.wait_for_function("Number(document.querySelector('#world canvas').dataset.physicsContacts)>0",timeout=15000);assert saved()['x']==4
 for x,z in [(5,3),(12,9),(4,5)]:walk(x,z)
 assert len(saved()['ribbons'])==3;walk(5,6);assert saved()['ribbonReturned'];dismiss()
 walk(12,2);page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).map==='garden'")
 for x,z in [(3,8),(11,8),(4,11)]:walk(x,z)
 assert len(saved()['charms'])==3
 # Reload mid-quest keeps progress and shared wardrobe.
 page.reload();ready();assert len(saved()['charms'])==3
 for x,z in [(3,10),(11,10)]:walk(x,z)
 assert len(saved()['berries'])==2
 walk(7,6)
 for name in ['Listen','Tell a story','Wave hello']:page.get_by_role('button',name=name,exact=True).click()
 dismiss();assert saved()['gate'];walk(7,3);assert saved()['complete'];dismiss()
 for x,z in [(3,4),(11,4)]:walk(x,z)
 walk(7,3);assert saved()['lanternsBlessed'];dismiss();page.screenshot(path='/tmp/react-adventure-verified.png',full_page=True)
 walk(7,12);page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).map==='village'")
 inventory();page.get_by_role('button',name='Berry sweetheart',exact=True).click();page.get_by_role('tab',name='Items',exact=True).click();page.get_by_role('button',name='Sweet strawberry',exact=True).click();close_inventory();walk(5,6);assert saved()['picnicDelivered'];dismiss()
 count=len(saved('kitty-room-3d-v1')['owned']);page.get_by_role('button',name='← Her room').click();ready();assert canvas.get_attribute('data-outfit')=='berry';page.reload();ready();assert len(saved('kitty-room-3d-v1')['owned'])==count
 page.screenshot(path='/tmp/react-earned-room.png',full_page=True)
 # Phone touch controls and native inventory modal; no horizontal overflow.
 mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.goto(BASE+'/adventure.html');mobile.wait_for_function("!document.querySelector('.dpad button').disabled",timeout=60000);mobile.get_by_role('button',name='Walk left',exact=True).tap();mobile.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===6",timeout=15000);mobile.get_by_role('button',name='Inventory ♡',exact=True).tap();mobile.get_by_role('tab',name='Quest',exact=True).tap();assert mobile.locator('.quest-card').count()==5;assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth');mobile.screenshot(path='/tmp/react-mobile-verified.png',full_page=True)
 assert not errors,errors
 print('PASS React room, 360 controls, settings, chat, wardrobe, mission rewards, picnic replay, Rapier collision, all four adventure quests, reload, shared room rewards, mobile touch; zero page errors.',flush=True)
 browser.close()
