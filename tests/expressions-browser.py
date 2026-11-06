"""Exercise authored faces, empty/held paws and save compatibility in real WebGL."""
import os,json
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
STYLES=[('classic','Original Kitty'),('cloud','Strawberry Cloud'),('witch','Moonlight Witch'),('baby','Baby Blossom'),('kitten','Rose Kitten'),('bunny','Silver Bunny')]
FACES=[('sleepy','Sleepy'),('surprised','Surprised'),('softHappy','Happy squint'),('shy','Bashful'),('curious','Curious')]
with sync_playwright()as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='no-preference',accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def ready(pg=page):pg.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def face(kind,selector='.outfit-preview canvas',pg=page):pg.wait_for_function("p=>document.querySelector(p[0])?.dataset.expression===p[1]",arg=[selector,kind],timeout=30000)
 def rest(value,selector='.outfit-preview canvas',pg=page):pg.wait_for_function("p=>Math.abs(Number(document.querySelector(p[0])?.dataset.emptyPawWeight)-p[1])<.01",arg=[selector,value],timeout=15000)
 page.goto(BASE+'/');ready();assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).item")== 'none'
 page.locator('#openWardrobe').click();page.locator('.plush-picker summary').click();page.locator('.expression-picker summary').click()
 for style,name in STYLES:
  page.get_by_role('button',name='Choose '+name,exact=True).click();page.wait_for_function("s=>document.querySelector('.outfit-preview canvas')?.dataset.plush===s",arg=style,timeout=60000)
  for kind,label in FACES:
   page.get_by_role('button',name=label,exact=True).click();face(kind);rest(1)
   if kind=='shy':page.locator('.outfit-preview').screenshot(path='/tmp/nancy-expression-'+style+'.png')
  face('open');rest(1)
  print('PASS '+name+' performs five distinct Blender faces and returns to relaxed empty paws',flush=True)
 page.get_by_role('tab',name='Items',exact=True).click();page.get_by_role('button',name='Little flowers',exact=True).click();rest(0)
 page.get_by_role('button',name='Back to Kitty',exact=True).click();page.reload();ready();assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).item")== 'flowers'
 page.locator('#openWardrobe').click();page.get_by_role('tab',name='Items',exact=True).click();page.get_by_role('button',name='Empty paws',exact=True).click();rest(1)
 page.get_by_role('button',name='Photo corner ↗',exact=True).click();page.locator('.photo-preview canvas').wait_for()
 page.get_by_role('button',name='Bashful',exact=True).click();face('shy','.photo-preview canvas');rest(1,'.photo-preview canvas');page.locator('.photo-preview').screenshot(path='/tmp/nancy-expression-postcard.png')
 with page.expect_download()as download:page.get_by_role('button',name='Save postcard PNG ♡',exact=True).click()
 assert download.value.suggested_filename=='For-Nancy-Hello-Kitty.png';page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).postcards.at(-1).pose==='shy'")
 page.get_by_role('button',name='Sweet & still',exact=True).click();face('open','.photo-preview canvas');rest(1,'.photo-preview canvas')
 print('PASS selected flowers keep their grip and survive reload; empty paws and a bashful postcard work',flush=True)
 page.close()
 phone=b.new_page(viewport={'width':320,'height':568},is_mobile=True,has_touch=True,reduced_motion='reduce');phone.on('pageerror',lambda e:errors.append(str(e)))
 phone.goto(BASE+'/');ready(phone);phone.get_by_role('button',name='Play together ↗',exact=True).tap();phone.locator('.expression-picker summary').tap();phone.get_by_role('button',name='Sleepy',exact=True).tap();face('sleepy','#stage canvas',phone);face('open','#stage canvas',phone);rest(1,'#stage canvas',phone)
 assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 print('PASS 320px touch and static reduced-motion face; zero page errors. Physical Safari unverified.',flush=True)
 b.close()
