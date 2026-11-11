"""Play the mobile home: real touch movement, camera, Blender tea and a village visit."""
import json,os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
with sync_playwright()as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
 def ready(pg):pg.wait_for_function("document.querySelector('#stage canvas')?.dataset.homeCamera==='follow'&&!document.querySelector('#openWardrobe').disabled",timeout=90000)
 def data(pg):return pg.locator('#stage canvas').evaluate('c=>({...c.dataset})')
 def check_camera(pg):
  pg.wait_for_function("(()=>{const d=document.querySelector('#stage canvas').dataset;return Number(d.headX)>.1&&Number(d.headX)<.9&&Number(d.headY)>.1&&Number(d.headY)<.85})()",timeout=20000)
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
 for width,height in [(390,844),(320,568),(844,390)]:
  page=b.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='no-preference'if width==390 else'reduce');page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE+'/');ready(page);check_camera(page)
  assert page.locator('.action-bar>button').count()==3
  page.screenshot(path=f'/tmp/nancy-home-follow-{width}.png',full_page=True)
  d=data(page);visible_height=float(d['homeKittyFoot'])-(1-float(d['modelTop']))/2
  assert .14<visible_height<.48,(width,height,visible_height)
  dismiss=page.get_by_role('button',name='Dismiss message',exact=True)
  dismiss.wait_for(state='hidden',timeout=12000)
  # A real captured touch steers immediately and stops on blur/cancellation.
  thumb=page.get_by_role('group',name='Thumb control for walking at home',exact=True);thumb.scroll_into_view_if_needed();r=thumb.bounding_box();cdp=page.context.new_cdp_session(page);x=float(data(page)['homeX']);z=float(data(page)['homeZ'])
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':r['x']+r['width']*.8,'y':r['y']+r['height']*.5,'id':1}]})
  page.wait_for_function("x=>Number(document.querySelector('#stage canvas').dataset.homeX)>x+.25",arg=x,timeout=15000)
  page.evaluate("dispatchEvent(new Event('blur'))");cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  page.wait_for_timeout(350);stopped=float(data(page)['homeX']);page.wait_for_timeout(250);assert abs(float(data(page)['homeX'])-stopped)<.02
  check_camera(page)
  # A tiny flick is retained even when both touch events occur between frames.
  r=thumb.bounding_box();before_flick=float(data(page)['homeX']);page.touchscreen.tap(r['x']+r['width']*.8,r['y']+r['height']*.5)
  page.wait_for_function("x=>Number(document.querySelector('#stage canvas').dataset.homeX)>x+.08",arg=before_flick,timeout=15000)
  page.wait_for_function("document.querySelector('#stage canvas').dataset.homeRoute==='0'",timeout=15000)
  assert float(data(page)['homeX'])-before_flick<.4
  # Follow view has a two-finger closer look; pinching must not start walking.
  canvas=page.locator('#stage canvas');canvas.scroll_into_view_if_needed();r=canvas.bounding_box();cx=r['x']+r['width']*.5;cy=r['y']+r['height']*.4;zoom=float(data(page)['homeZoom']);before=(float(data(page)['homeX']),float(data(page)['homeZ']))
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx-20,'y':cy,'id':1},{'x':cx+20,'y':cy,'id':2}]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':cx-55,'y':cy,'id':1},{'x':cx+55,'y':cy,'id':2}]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  page.wait_for_function("z=>Number(document.querySelector('#stage canvas').dataset.homeZoom)>z*1.12",arg=zoom,timeout=20000)
  assert abs(float(data(page)['homeX'])-before[0])<.02 and abs(float(data(page)['homeZ'])-before[1])<.02
  page.get_by_role('button',name='Reset view ↺',exact=True).tap();ready(page)
  # The contextual tea action walks to the real chair, then uses authored clips.
  tea=page.get_by_role('button',name='A little tea ☕',exact=True)
  if not tea.is_visible():
   # Nearby furniture has a context action; its actual chair is selectable in overview.
   page.get_by_role('button',name='Whole house ⌂',exact=True).tap();page.wait_for_function("document.querySelector('#stage canvas').dataset.homeView==='dollhouse'")
   d=data(page);corners=json.loads(d['homeFloor']);u=(2.05+5.8)/11.6;v=(1.15+5)/10;point=[corners[0][i]+u*(corners[1][i]-corners[0][i])+v*(corners[3][i]-corners[0][i])for i in [0,1]];r=canvas.bounding_box();page.mouse.click(r['x']+point[0]*r['width'],r['y']+point[1]*r['height']);page.get_by_role('button',name='Sit for a little tea',exact=True).wait_for(timeout=25000);page.get_by_role('button',name='Sit for a little tea',exact=True).tap()
  else:tea.tap()
  page.wait_for_function("document.querySelector('#stage canvas').dataset.homePhase==='seated'",timeout=45000)
  assert not page.get_by_role('group',name='Thumb control for walking at home',exact=True).is_visible()
  page.get_by_role('button',name='Pick up the teacup ☕',exact=True).tap();page.wait_for_function("document.querySelector('#stage canvas').dataset.homePhase==='seated'&&document.querySelector('#stage canvas').dataset.homeCup==='true'",timeout=25000)
  assert float(data(page)['homeCupGap'])<.03
  page.screenshot(path=f'/tmp/nancy-home-tea-{width}.png',full_page=True)
  page.get_by_role('button',name='Take a little sip ☕',exact=True).tap();page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).home.teaMoments===1",timeout=25000)
  page.get_by_role('button',name='Put back & stand up',exact=True).tap();page.wait_for_function("document.querySelector('#stage canvas').dataset.homePhase==='idle'&&document.querySelector('#stage canvas').dataset.homeCup==='false'",timeout=25000);check_camera(page)
  page.reload();ready(page);assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).home.teaMoments")==1;assert float(data(page)['homeX'])>1.7
  for control in page.locator('.scene-tools button,.home-context button,.action-bar>button').all():
   box=control.bounding_box();assert box['height']>=44,(width,control.inner_text(),box)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width==390:
   page.get_by_role('button',name='Sit for a little tea',exact=True).tap();page.wait_for_function("document.querySelector('#stage canvas').dataset.homePhase==='seated'",timeout=30000)
   page.get_by_role('button',name='Play together ↗',exact=True).tap();page.get_by_role('button',name='Gently pet Kitty ♡',exact=True).tap()
   page.get_by_role('button',name='Done petting ♡',exact=True).wait_for(timeout=30000);page.wait_for_function("document.querySelector('#stage canvas').dataset.homePhase==='idle'",timeout=30000);page.get_by_role('button',name='Done petting ♡',exact=True).tap()
   page.get_by_role('button',name='Visit the village',exact=True).tap();page.wait_for_function("document.querySelector('#world canvas')?.dataset.village==='true'&&!document.querySelector('#openWardrobe').disabled",timeout=90000)
   page.screenshot(path='/tmp/nancy-home-life-village.png',full_page=True)
   page.get_by_role('button',name='← Her room',exact=True).tap();ready(page);page.wait_for_function("Number(document.querySelector('#stage canvas').dataset.homeZ)>4",timeout=20000);assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).home.teaMoments")==1
  print('PASS actual touch movement/cancel, stable follow camera/pinch, real Blender chair/cup/standing, saved tea and phone controls:',width,height,flush=True);page.close()
 # A valid saved location behind the wardrobe must stay visible on reopening.
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script("localStorage.setItem('kitty-nancy-cozy-v1',JSON.stringify({home:{x:4.8,z:1.1,yaw:0,teaMoments:2}}));");page.goto(BASE+'/');ready(page);page.wait_for_function("Number(document.querySelector('#stage canvas').dataset.homeOccluders)>0",timeout=20000);check_camera(page);page.screenshot(path='/tmp/nancy-home-camera-wardrobe.png',full_page=True)
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).home.teaMoments")==2
 assert not errors,errors;b.close();print('PASS foreground furniture fades; remembered position stays visible; no page errors. Physical phone/Safari review remains pending.',flush=True)
