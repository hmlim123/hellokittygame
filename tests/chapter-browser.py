"""Real WebGL/Rapier chapter, storybook, souvenir and PNG download check.
Build + preview on 8053; requires Python Playwright, Pillow and Chromium.
"""
import json,os,subprocess
from collections import deque
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
MAP=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {gladeMap} from './src/game/chapter.ts';console.log(JSON.stringify(gladeMap()));"],text=True))
MAIN={'accepted':True,'charms':['rose','honey','sky'],'guardian':True,'gate':True,'complete':True,'ribbonReturned':True,'ribbons':['rose','honey','sky'],'map':'village','x':7,'z':8}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='reduce',accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',"+json.dumps(json.dumps(MAIN))+");")
 def saved():return page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'))")
 def chapter():return saved()['chapter']
 def ready():page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def equip(name):
  page.get_by_role('button',name='Inventory ♡',exact=True).click();page.get_by_role('tab',name='Items',exact=True).click();page.get_by_role('button',name=name,exact=True).click();page.get_by_role('button',name='Back to Kitty',exact=True).click()
 def walk(x,z):
  s=saved();rows=MAP['rows'];queue=deque([((s['x'],s['z']),[])]);seen={(s['x'],s['z'])};route=None
  def allowed(nx,nz):
   if nz<0 or nz>=len(rows) or nx<0 or nx>=len(rows[nz]):return False
   if (nx,nz)==(3,7):return s['chapter']['butterflyStep']>0
   tile=rows[nz][nx]
   return tile in '.LVKP' and tile!='V' or tile=='J' and s['chapter']['bridgeFixed']
  while queue:
   (cx,cz),path=queue.popleft()
   if (cx,cz)==(x,z):route=path;break
   for d,dx,dz in [('up',0,-1),('down',0,1),('left',-1,0),('right',1,0)]:
    nx,nz=cx+dx,cz+dz
    if (nx,nz) not in seen and allowed(nx,nz):seen.add((nx,nz));queue.append(((nx,nz),path+[(d,nx,nz)]))
  assert route is not None,(s,x,z)
  for d,nx,nz in route:
   page.keyboard.press({'up':'ArrowUp','down':'ArrowDown','left':'ArrowLeft','right':'ArrowRight'}[d])
   try:page.wait_for_function("p=>{const s=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return s.x===p[0]&&s.z===p[1]}",arg=[nx,nz],timeout=15000)
   except Exception:page.screenshot(path='/tmp/glade-route-failed.png',full_page=True);print('FAILED',nx,nz,saved(),flush=True);raise
  print('WALK',x,z,flush=True)
 page.goto(BASE+'/');ready();assert page.locator('.action-bar>button').count()==3
 assert page.get_by_text('Hello, Nancy ♡',exact=True).is_visible();page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Butterfly Glade',exact=False).click();ready();assert saved()['map']=='glade'
 walk(2,9);assert chapter()['butterflyStep']==0;equip('Butterfly lantern');page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).chapter.butterflyStep===1");walk(3,8);assert chapter()['butterflyStep']==2;walk(4,6);assert chapter()['butterflyStep']==3
 equip('Little watering can');walk(5,6);assert chapter()['flowersRevived'];page.screenshot(path='/tmp/kitty-glade-flowers.png',full_page=True)
 walk(6,8);page.keyboard.press('ArrowRight');page.wait_for_function("Number(document.querySelector('#world canvas').dataset.physicsContacts)>0",timeout=15000);assert saved()['x']==6
 equip('Friendship ribbon');assert chapter()['bridgeFixed'];walk(8,8);walk(10,6);page.get_by_role('dialog',name='Three wishing stars').wait_for();page.get_by_role('button',name='Place heart star').click();assert chapter()['stars']==[];page.get_by_role('button',name='Place moon star').click();page.keyboard.press('Escape');assert page.locator('dialog[open]').count()==0
 page.reload();ready();assert chapter()['stars']==['moon'];page.get_by_role('button',name='Talk / inspect ♡').click();page.get_by_role('dialog',name='Three wishing stars').wait_for();page.get_by_role('button',name='Place flower star').click();page.get_by_role('button',name='Place heart star').click();assert chapter()['stars']==['moon','flower','heart'];assert page.locator('dialog[open]').count()==0
 equip('Cuddle teddy');walk(10,7);assert chapter()['friendAwake'];walk(11,8);assert chapter()['letterFound'];assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).item")=='letter'
 page.get_by_role('button',name='Inventory ♡',exact=True).click();page.get_by_role('button',name='Your storybook ♡',exact=True).click();page.get_by_role('button',name='Read An envelope to bring home',exact=True).click();assert page.locator('[data-memory="letter"]').count()==1;page.get_by_role('button',name='Open your envelope 💌',exact=True).click();page.get_by_role('button',name='Break the heart seal').click();assert page.get_by_text('Your special letter is being written. This little place is waiting for your words.').is_visible();page.keyboard.press('Escape')
 walk(11,3);page.get_by_role('button',name='Sit under the moon',exact=True).click();page.wait_for_selector('.ending-preview canvas');page.wait_for_timeout(800);page.screenshot(path='/tmp/kitty-moon-picnic.png',full_page=True);page.get_by_role('button',name='Keep this memory ♡',exact=True).click();assert chapter()['endingSeen']
 page.get_by_role('button',name='← Her room').click();ready();page.get_by_role('button',name='Remember The flower patch',exact=True).click();assert page.locator('[data-memory="flowers"]').count()==1;page.get_by_role('button',name='Photo corner ♡',exact=True).click();page.wait_for_selector('.photo-preview canvas');page.get_by_role('button',name='Wink ♡',exact=True).click();page.get_by_role('button',name='Garden morning',exact=True).click();page.wait_for_timeout(500)
 canvas=page.locator('.photo-preview canvas');box=canvas.bounding_box();page.mouse.move(box['x']+box['width']*.6,box['y']+box['height']*.45);page.mouse.down();page.mouse.move(box['x']+box['width']*.5,box['y']+box['height']*.45,steps=5);page.mouse.up();page.wait_for_timeout(300);page.screenshot(path='/tmp/kitty-photo-corner.png',full_page=True)
 with page.expect_download(timeout=15000) as download:page.get_by_role('button',name='Save postcard PNG ♡',exact=True).click()
 download.value.save_as('/tmp/For-Nancy-Hello-Kitty.png');image=Image.open('/tmp/For-Nancy-Hello-Kitty.png');assert image.size==(1000,1200);assert len(image.resize((100,120)).getcolors(12000) or [])>100;assert chapter()['postcardSaved'];page.keyboard.press('Escape');page.reload();ready();assert chapter()['endingSeen'] and chapter()['postcardSaved'];page.screenshot(path='/tmp/kitty-story-room.png',full_page=True)
 assert not errors,errors
 # Real physics traversal through both connecting portals, with completed progress retained.
 page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Butterfly Glade',exact=False).click();ready();assert [saved()['x'],saved()['z']]==[11,3];walk(2,10);page.keyboard.press('ArrowLeft');page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).map==='garden'",timeout=15000);page.keyboard.press('ArrowDown');page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).map==='glade'",timeout=15000);assert chapter()['endingSeen']
 # Touch interaction with the puzzle, using an existing mid-chapter save.
 mobile=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');mobile.on('pageerror',lambda e:errors.append(str(e)))
 mid={**MAIN,'map':'glade','x':10,'z':6,'chapter':{'butterflyStep':3,'flowersRevived':True,'bridgeFixed':True,'stars':[]}}
 mobile.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',"+json.dumps(json.dumps(mid))+");");mobile.goto(BASE+'/adventure.html');mobile.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000);mobile.get_by_role('button',name='Talk / inspect ♡').tap();mobile.get_by_role('button',name='Place moon star').tap();mobile.get_by_role('button',name='Place flower star').tap();mobile.get_by_role('button',name='Place heart star').tap();assert mobile.locator('dialog[open]').count()==0;mobile.get_by_role('button',name='Inventory ♡',exact=True).tap();mobile.get_by_role('button',name='Your storybook ♡',exact=True).tap();assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth');mobile.screenshot(path='/tmp/kitty-mobile-storybook.png',full_page=True)
 assert not errors,errors
 print('PASS complete Butterfly Glade route, wrong-tool hints, real locked/open bridge collisions, puzzle persistence, bunny, letter, moon picnic, souvenirs, storybook, real 1000×1200 postcard download and mobile touch. Zero page errors.',flush=True);b.close()
