"""Check continuous camera/rendered movement, wall stops and touch holds.
Run against the production preview; KITTY_BASE_URL defaults to port 8053.
"""
import json,os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
 def setup(motion='no-preference',mobile=False,seed=None):
  page=b.new_page(viewport={'width':390 if mobile else 1000,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile,reduced_motion=motion);page.on('pageerror',lambda e:errors.append(str(e)));seed=seed or {'map':'village','accepted':True,'x':4,'z':8};page.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',"+json.dumps(json.dumps(seed))+");");page.goto(BASE+'/adventure.html');page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000);return page
 for motion in ['no-preference','reduce']:
  page=setup(motion);page.evaluate("""window.walkSamples=[];window.recordWalk=true;function sample(t){const d=document.querySelector('#world canvas')?.dataset;if(d)walkSamples.push({t,x:Number(d.renderX),cam:Number(d.cameraX),body:Number(d.bodyX)});if(recordWalk)requestAnimationFrame(sample)}requestAnimationFrame(sample)""")
  page.keyboard.down('ArrowRight');page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x>=9",timeout=15000);page.keyboard.up('ArrowRight');page.wait_for_function("document.querySelector('#world canvas').dataset.moving==='false'",timeout=5000);page.evaluate('recordWalk=false');samples=page.evaluate('walkSamples');usable=[s for s in samples if 4.2<s['x']<8.8];assert len(usable)>5,usable
  assert all(abs(s['cam']-s['x'])<.0001 for s in usable),'camera is following tiles rather than interpolated Kitty'
  for prev,now in zip(usable,usable[1:]):
   assert now['x']>=prev['x']-1e-5,'snap backwards'
   if now['t']-prev['t']>20:assert now['x']-prev['x']>.001,('pause at a tile boundary',motion,prev,now)
  end=page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x");page.wait_for_timeout(600);assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x")==end
  for x in range(end-1,3,-1):page.keyboard.press('ArrowLeft');page.wait_for_function("x=>JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===x",arg=x,timeout=15000)
  page.wait_for_function("Math.abs(Number(document.querySelector('#world canvas').dataset.renderX)-4)<.001");page.keyboard.press('ArrowLeft');page.wait_for_function("Number(document.querySelector('#world canvas').dataset.physicsContacts)>0",timeout=5000);page.wait_for_timeout(200);assert abs(float(page.locator('#world canvas').get_attribute('data-body-x'))-4)<.001;assert abs(float(page.locator('#world canvas').get_attribute('data-render-x'))-4)<.001
  print('PASS smooth held camera and object movement, release and stationary wall stop:',motion,flush=True);page.close()
 phone=setup('reduce',True);phone.locator('.dpad').scroll_into_view_if_needed();box=phone.get_by_role('button',name='Walk right',exact=True).bounding_box();cdp=phone.context.new_cdp_session(phone);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]});phone.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x>=7",timeout=15000);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});phone.wait_for_function("document.querySelector('#world canvas').dataset.moving==='false'");end=phone.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x");phone.wait_for_timeout(500);assert phone.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x")==end
 portal=setup('reduce',seed={'map':'garden','accepted':True,'x':13,'z':10});portal.keyboard.press('ArrowDown');portal.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).map==='glade'&&document.querySelector('#world canvas').dataset.tile==='2,10'",timeout=15000);portal.wait_for_function("Math.abs(Number(document.querySelector('#world canvas').dataset.renderX)-2)<.001");assert abs(float(portal.locator('#world canvas').get_attribute('data-camera-x'))-3)<.001
 assert not errors,errors;print('PASS phone touch hold/release, area transition, and zero browser errors',flush=True);b.close()
