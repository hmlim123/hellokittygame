"""Play ordered baking, interruption recovery, editable decoration and safe gifts."""
import os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
with sync_playwright()as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
 for width,height,reduced in [(390,844,False),(320,568,True)]:
  pg=b.new_page(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,reduced_motion='reduce'if reduced else'no-preference');pg.on('pageerror',lambda e:errors.append(str(e)))
  def cookie():return pg.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).cookie")
  def open_baking():
   pg.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=90000);pg.get_by_role('button',name='Little activities',exact=True).tap();pg.get_by_role('button',name='Bake cookies with Kitty').tap();pg.locator('.baking-preview canvas').wait_for()
  pg.goto(BASE+'/');open_baking();assert pg.locator('.cozy-steps li').count()==5
  pg.get_by_role('button',name='Star',exact=True).tap()
  for _ in range(2):pg.get_by_role('button',name='Stir a little ↻',exact=True).tap()
  pg.get_by_role('button',name='Press the cutter ↓',exact=True).tap();slider=pg.get_by_role('slider',name='Slide tray into the oven',exact=True);slider.wait_for()
  pg.get_by_role('button',name='Round',exact=True).tap();assert cookie()['prep']['stir']==1 and not cookie()['prep']['pressed']
  pg.get_by_role('button',name='Press the cutter ↓',exact=True).tap();slider.wait_for()
  if not reduced:
   slider.focus();pg.keyboard.press('End');pg.locator('.baking-preview[data-warming="true"]').wait_for(timeout=25000)
   assert cookie()['stage']=='shape' and cookie()['prep']['oven']==0
   pg.evaluate("dispatchEvent(new Event('blur'))");assert cookie()['stage']=='shape';pg.reload();open_baking();assert cookie()['prep']['pressed']
   slider=pg.get_by_role('slider',name='Slide tray into the oven',exact=True);slider.focus();pg.keyboard.press('End');pg.locator('.baking-preview[data-warming="true"]').wait_for(timeout=25000);pg.locator('.baking-performance').screenshot(path='/tmp/nancy-baking-warm-phone.png')
  else:
   slider.scroll_into_view_if_needed();r=slider.bounding_box();slider.tap(position={'x':r['width']-2,'y':r['height']/2})
  pg.get_by_role('button',name='Add a heart ♥',exact=True).wait_for(timeout=35000);assert cookie()['stage']=='decorate'
  assert 'Decorate' in pg.locator('.cozy-steps [aria-current="step"]').inner_text()
  pg.get_by_role('button',name='Lavender icing',exact=True).tap()
  for kind in ['Add a heart ♥','Add a star ★','Add a berry 🍓']:pg.get_by_role('button',name=kind,exact=True).tap()
  pg.get_by_role('button',name='Undo last sprinkle ↶',exact=True).tap();assert [x['kind']for x in cookie()['stamps']]==['heart','star']
  pg.reload();open_baking();assert cookie()['icing']=='lavender' and len(cookie()['stamps'])==2
  assert pg.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert pg.locator('.baking-dialog').evaluate('d=>d.scrollWidth<=d.clientWidth+1')
  pg.locator('.cookie-worktop').screenshot(path=f'/tmp/nancy-baking-design-{width}.png')
  pg.get_by_role('button',name='Ready to give →',exact=True).tap();pg.get_by_role('button',name='Give cookie to Momo ♡',exact=True).tap();assert pg.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).cookiesGiven")==1
  assert cookie()['friend']=='momo' and len(cookie()['stamps'])==2
  assert not pg.get_by_role('button',name='Undo last sprinkle ↶',exact=True).count()
  pg.get_by_role('button',name='Bake another cookie',exact=True).tap();assert cookie()['stage']=='shape' and len(cookie()['stamps'])==0
  print('PASS five clear steps, recut safety, oven recovery, saved icing/undo, one gift and fresh replay:',width,'reduced motion:',reduced,flush=True);pg.close()
 assert not errors,errors;b.close();print('PASS no browser errors. Physical phone/Safari review remains pending.',flush=True)
