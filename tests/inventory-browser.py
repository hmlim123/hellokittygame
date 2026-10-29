from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image
from io import BytesIO
import os
base=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8032')
out=Path(__file__).resolve().parents[1]/'docs'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1200,'height':1120},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def ready():
  page.wait_for_function("document.querySelector('#loading').hidden",timeout=60000);assert page.locator('#error').is_hidden()
 def gear():return page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1'))")
 def blue_pixels(data):
  rgb=Image.open(BytesIO(data)).convert('RGB').tobytes();return sum(blue>red+10 and blue>green for red,green,blue in zip(rgb[0::3],rgb[1::3],rgb[2::3]))
 page.goto(base+'/adventure.html?v=inventory-5');ready();world_before=page.locator('#world canvas').screenshot()
 page.get_by_role('button',name='Inventory ♡',exact=True).click();page.wait_for_selector('#equipmentPreview canvas')
 assert page.get_by_role('button',name='Honey picnic',exact=True).is_disabled();assert page.get_by_role('button',name='Moonlight dress',exact=True).is_disabled()
 before=page.locator('#equipmentPreview canvas').screenshot()
 page.get_by_role('button',name='Sky sailor',exact=True).click();after=page.locator('#equipmentPreview canvas').screenshot()
 assert blue_pixels(after)>blue_pixels(before)+100,'The actual rendered dress and bow should visibly turn blue'
 assert gear()['outfit']=='sailor' and page.get_by_role('button',name='Sky sailor',exact=True).get_attribute('aria-pressed')=='true'
 page.locator('#inventoryTab-items').click()
 for name,item in [('Cuddle teddy','teddy'),('Sweet strawberry','strawberry'),('Love letter','letter'),('Little flowers','flowers'),('Empty paws','none')]:
  previous=page.locator('#equipmentPreview canvas').screenshot();page.get_by_role('button',name=name,exact=True).click();assert gear()['item']==item
  assert previous!=page.locator('#equipmentPreview canvas').screenshot(),'Equipped props must visibly change'
 page.wait_for_function("[...document.querySelectorAll('.equipment-grid img')].every(i=>i.naturalWidth>0)")
 page.locator('#backToWorld').click();assert world_before!=page.locator('#world canvas').screenshot(),'The walking Kitty must change as well as the preview'
 page.reload();ready();page.locator('#bag').click();assert page.locator('#equipmentPreview').get_attribute('data-outfit')=='sailor';assert page.locator('#equipmentPreview').get_attribute('data-item')=='none'
 page.locator('#inventoryTab-clothes').focus();page.keyboard.press('ArrowRight');assert page.locator('#inventoryTab-items').get_attribute('aria-selected')=='true'
 page.keyboard.press('ArrowRight');assert page.locator('#inventoryTab-quest').get_attribute('aria-selected')=='true';assert page.locator('#charms').is_visible();page.locator('#backToWorld').click()
 page.evaluate("localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({accepted:true,map:'garden',x:11,z:9}))")
 page.reload();ready();page.keyboard.press('ArrowUp');page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).charms.includes('honey')")
 assert 'Honey picnic' in page.locator('#discoveryWords').inner_text();page.locator('#bag').click();assert page.get_by_role('button',name='Honey picnic',exact=True).is_enabled()
 page.get_by_role('button',name='Honey picnic',exact=True).click();assert gear()['outfit']=='picnic';page.screenshot(path=str(out/'nancy-inventory-clothes.png'),full_page=True)
 page.locator('#inventoryTab-items').click();page.get_by_role('button',name='Cuddle teddy',exact=True).click();page.screenshot(path=str(out/'nancy-inventory-items.png'),full_page=True)
 assert not errors,errors;page.close()
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 c.add_init_script("const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t.startsWith('webgl')?null:original.call(this,t,...a)}")
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(base+'/adventure.html?v=inventory-5');ready();page.locator('#bag').tap();page.get_by_role('button',name='Sky sailor',exact=True).tap()
 assert gear()['outfit']=='sailor';page.locator('#inventoryTab-items').tap();page.get_by_role('button',name='Empty paws',exact=True).tap();assert gear()['item']=='none'
 page.locator('#inventoryTab-clothes').tap();page.locator('#inventory').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(out/'nancy-inventory-mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.locator('#inventory').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
 page.locator('#backToWorld').tap();page.locator('[data-direction=left]').tap();page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===6")
 assert not errors,errors
 print('PASS: actual rendered clothes and held props, world character update, persistence, quest outfit unlock, accessible tabs, mobile software preview and return to movement')
 b.close()
