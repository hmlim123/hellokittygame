"""Exercise all five actual Blender editions through the existing game interface."""
import os,json,re
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
STYLES=[('cloud','Strawberry Cloud'),('witch','Moonlight Witch'),('baby','Baby Blossom'),('kitten','Rose Kitten'),('bunny','Silver Bunny')]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 errors=[];requests=[];page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='no-preference',accept_downloads=True)
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 def ready(pg=page):pg.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def model(selector,style,pg=page):pg.wait_for_function("p=>document.querySelector(p[0])?.dataset.plush===p[1]",arg=[selector,style],timeout=60000)
 def wardrobe(pg=page):pg.locator('#openWardrobe').click();pg.locator('.plush-picker summary').click()
 page.goto(BASE+'/');ready();assert page.locator('.action-bar>button').count()==3
 assert not any(re.search(r'/assets/plush/[^/]+\.glb',u)for u in requests),'unselected plush models were eagerly loaded'
 wardrobe()
 for style,name in STYLES:
  page.get_by_role('button',name='Choose '+name,exact=True).click();model('.outfit-preview canvas',style);model('#stage canvas',style)
  assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).plush")==style
  page.wait_for_function("Number(document.querySelector('.outfit-preview canvas').dataset.modelTop)<.95",timeout=15000)
  page.get_by_role('button',name='Preview a dance',exact=True).click()
  page.wait_for_function("document.querySelector('.outfit-preview canvas').dataset.blenderAction==='dance'&&Number(document.querySelector('.outfit-preview canvas').dataset.pawTurn)>.01",timeout=30000)
  page.locator('.outfit-preview').screenshot(path='/tmp/nancy-plush-'+style+'.png')
  page.get_by_role('button',name='Preview a wink',exact=True).click();page.wait_for_function("document.querySelector('.outfit-preview canvas').dataset.expression==='wink'",timeout=30000)
  page.get_by_role('button',name='Preview a happy face',exact=True).click();page.wait_for_function("document.querySelector('.outfit-preview canvas').dataset.expression==='happy'",timeout=30000)
  page.wait_for_function("document.querySelector('.outfit-preview canvas').dataset.expression==='open'&&document.querySelector('.outfit-preview canvas').dataset.blenderAction==='idle'",timeout=30000)
  print('PASS '+name+' loads its actual Blender mesh once, dances, winks and restores a happy face',flush=True)
 for style,_ in STYLES:assert sum('/assets/plush/'+style+'.glb' in u for u in requests)==1,(style,requests)
 page.get_by_role('button',name='Sky sailor',exact=True).click();assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).plush")== 'bunny'
 page.get_by_role('button',name='Photo corner ↗',exact=True).click();model('.photo-preview canvas','bunny')
 page.wait_for_function("Number(document.querySelector('.photo-preview canvas').dataset.modelTop)<.95",timeout=15000);page.get_by_role('button',name='Wink ♡',exact=True).click()
 with page.expect_download() as download:page.get_by_role('button',name='Save postcard PNG ♡',exact=True).click()
 assert download.value.suggested_filename=='For-Nancy-Hello-Kitty.png'
 page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).postcards.length===1")
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).postcards[0].plush")== 'bunny'
 page.get_by_role('button',name='Close Nancy’s photo corner',exact=True).click();page.locator('#dance').click()
 page.wait_for_function("document.querySelector('#stage canvas').dataset.blenderAction==='dance'",timeout=30000)
 page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Moonflower Adventure',exact=False).click();ready();model('#world canvas','bunny');page.wait_for_function("Number(document.querySelector('#world canvas').dataset.modelTop)<.98",timeout=15000)
 x=page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x");page.keyboard.press('ArrowRight');page.wait_for_function("x=>JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===x+1",arg=x,timeout=15000)
 page.reload();ready();model('#world canvas','bunny');assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).outfit")== 'sailor'
 page.goto(BASE+'/');ready();page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Bake cookies with Kitty').click();model('.baking-preview canvas','bunny')
 page.wait_for_function("Number(document.querySelector('.baking-preview canvas').dataset.modelTop)<.98",timeout=15000);page.get_by_role('button',name='Stir a little ↻',exact=True).click();page.wait_for_function("document.querySelector('.baking-preview canvas').dataset.blenderAction==='stir'",timeout=30000)
 page.locator('.baking-performance').screenshot(path='/tmp/nancy-plush-baking.png')
 print('PASS room dance, shared clothes, bunny postcard metadata, adventure walking/reload and tall-accessory baking all retain the selected plush',flush=True)
 page.close()
 phone=b.new_page(viewport={'width':320,'height':568},is_mobile=True,has_touch=True,reduced_motion='reduce');phone.on('pageerror',lambda e:errors.append(str(e)))
 phone.goto(BASE+'/');ready(phone);wardrobe(phone);phone.get_by_role('button',name='Choose Baby Blossom',exact=True).tap();model('.outfit-preview canvas','baby',phone)
 phone.get_by_role('button',name='Preview a dance',exact=True).tap();phone.wait_for_function("document.querySelector('.outfit-preview canvas').dataset.blenderAction==='idle'&&Number(document.querySelector('.outfit-preview canvas').dataset.pawTurn)<.001",timeout=30000)
 assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth')
 phone.get_by_role('button',name='Choose Original Kitty',exact=True).tap();model('.outfit-preview canvas','classic',phone);assert 'plush'not in phone.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1'))")
 assert not errors,errors
 print('PASS 320px touch selection, original-model return and static reduced motion; zero page errors. Physical Safari remains unverified.',flush=True)
 b.close()
