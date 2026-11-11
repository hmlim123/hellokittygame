"""Play the six-second authored dance, occupied-paw take and reduced motion."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
with sync_playwright()as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
 page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='no-preference');page.on('pageerror',lambda e:errors.append(e.stack or str(e)))
 def ready(pg=page):pg.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def play(take):
  page.evaluate("window.danceSamples=[];window.recordDance=true;function sampleDance(){const d=document.querySelector('#stage canvas')?.dataset;if(d) danceSamples.push({x:Number(d.danceX),y:Number(d.danceY),paw:Number(d.pawTurn),face:d.expression,action:d.blenderAction,take:d.danceTake,time:Number(d.motionTime),scale:Number(d.characterScale||1)});if(recordDance)requestAnimationFrame(sampleDance)}requestAnimationFrame(sampleDance)")
  page.locator('#dance').click();page.wait_for_function("p=>{const d=document.querySelector('#stage canvas').dataset;return d.blenderAction==='dance'&&d.danceTake===p&&Number(d.danceDuration)>5.9}",arg=take,timeout=15000)
  page.wait_for_function("document.querySelector('#stage canvas').dataset.blenderAction==='idle'",timeout=35000);page.evaluate('recordDance=false')
  samples=page.evaluate('danceSamples.filter(s=>s.action===\"dance\"&&Number.isFinite(s.x)&&Number.isFinite(s.y))');assert len(samples)>8
  # Keep the same body-relative criteria as the earlier 1.25-scale display model.
  # The playable model is 0.9-scale so it fits the actual Blender furniture.
  scale=samples[0]['scale']
  assert (max(s['x']for s in samples)-min(s['x']for s in samples))/scale>.20/1.25
  span_y=(max(s['y']for s in samples)-min(s['y']for s in samples))/scale
  assert span_y>.08/1.25,{'take':take,'hop_span':span_y,'samples':len(samples),'times':[round(s['time'],2)for s in samples]}
  assert any(s['face']=='softHappy'for s in samples),'dance must show happy eyes'
  if take=='empty':assert max(s['paw']for s in samples)>.45,'paws should swing broadly'
  else:assert max(s['paw']for s in samples)<.02,'held item must retain its grip'
 page.goto(BASE+'/');ready();assert page.locator('.action-bar>button').count()==3;play('empty')
 page.wait_for_function("Number(document.querySelector('#stage canvas').dataset.emptyPawLeft)>.99&&Number(document.querySelector('#stage canvas').dataset.emptyPawRight)>.99",timeout=15000)
 print('PASS six-second happy dance has visible steps, hops, broad paws and happy eyes; returns to relaxed empty paws',flush=True)
 page.locator('#openWardrobe').click();page.get_by_role('tab',name='Items',exact=True).click();page.get_by_role('button',name='Little flowers',exact=True).click();page.get_by_role('button',name='Back to Kitty',exact=True).click();play('holding')
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).item")=='flowers'
 page.reload();ready();assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).item")=='flowers'
 print('PASS occupied-paw dance retains the same footwork and happy face, keeps its grip and preserves the selected item on reload',flush=True)
 page.close()
 phone=b.new_page(viewport={'width':320,'height':568},is_mobile=True,has_touch=True,reduced_motion='reduce');phone.on('pageerror',lambda e:errors.append(e.stack or str(e)));phone.goto(BASE+'/');ready(phone);phone.locator('#dance').tap()
 phone.wait_for_function("document.querySelector('#stage canvas').dataset.expression==='softHappy'",timeout=15000)
 assert phone.locator('#stage canvas').get_attribute('data-blender-action')=='idle';assert float(phone.locator('#stage canvas').get_attribute('data-paw-turn'))<.001
 phone.wait_for_function("document.querySelector('#stage canvas').dataset.expression==='open'",timeout=15000);assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
 print('PASS 320px touch and static happy eyes for reduced motion, no layout overflow or browser errors; physical Safari untested',flush=True);b.close()
