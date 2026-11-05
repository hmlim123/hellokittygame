"""A failed or interrupted cosmetic download must not replace Nancy's current Kitty."""
import os,json
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 errors=[];requests=[];page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='reduce')
 page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 def ready():page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def model(style,selector='.outfit-preview canvas'):page.wait_for_function("p=>document.querySelector(p[0])?.dataset.plush===p[1]",arg=[selector,style],timeout=60000)
 def open():page.locator('#openWardrobe').click();page.locator('.plush-picker summary').click()
 page.route('**/assets/plush/cloud.glb*',lambda route:route.abort())
 page.goto(BASE+'/');ready();open();page.get_by_role('button',name='Choose Strawberry Cloud',exact=True).click()
 page.wait_for_function("document.querySelector('.plush-picker [role=status]').textContent.includes('Try that style again')",timeout=30000)
 model('classic','#stage canvas');assert not page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).plush || null")
 page.unroute('**/assets/plush/cloud.glb*');page.get_by_role('button',name='Choose Strawberry Cloud',exact=True).click();model('cloud')
 print('PASS failed cosmetic load retains original Kitty and progress; explicit retry loads the actual model',flush=True)
 page.get_by_role('button',name='Choose Original Kitty',exact=True).click();model('classic')
 held=[];page.route('**/assets/plush/witch.glb*',lambda route:held.append(route))
 with page.expect_request('**/assets/plush/witch.glb*'):page.get_by_role('button',name='Choose Moonlight Witch',exact=True).click()
 assert held;page.get_by_role('button',name='Back to Kitty',exact=True).click();page.get_by_role('dialog',name='Kitty’s inventory').wait_for(state='hidden')
 with page.expect_event('requestfinished',predicate=lambda r:'/assets/plush/witch.glb' in r.url,timeout=30000):held[0].continue_()
 # Wait for the completed GLB parse too, so a stale success callback has time to run.
 page.wait_for_timeout(1200);model('classic','#stage canvas');assert not page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).plush || null")
 print('PASS leaving the wardrobe cancels selection; a late model response cannot change the room',flush=True)
 open();page.get_by_role('button',name='Choose Strawberry Cloud',exact=True).click();model('cloud');page.get_by_role('button',name='Back to Kitty',exact=True).click()
 requests.clear();page.goto(BASE+'/classic/');page.wait_for_function("!document.querySelector('#wave').disabled",timeout=60000)
 assert any('/classic/assets/plush/cloud.glb' in u for u in requests),requests
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).plush")=='cloud'
 assert page.locator('#webglError').is_hidden();assert not errors,errors
 page.screenshot(path='/tmp/nancy-plush-classic.png')
 print('PASS classic fallback loads the selected Blender edition and preserves shared equipment; zero page errors',flush=True)
 b.close()
