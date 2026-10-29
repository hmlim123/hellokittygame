from playwright.sync_api import sync_playwright
import os
from pathlib import Path
base=os.environ.get("KITTY_BASE_URL","http://127.0.0.1:8032")
out=Path(__file__).resolve().parents[1]/"docs"
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1200,'height':1120});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({accepted:true,map:'garden',x:3,z:9}))")
 page.goto(base+'/adventure.html?v=inventory-5');page.wait_for_function("document.querySelector('#loading').hidden",timeout=60000)
 page.keyboard.press('ArrowUp');page.wait_for_selector('.floating-charm')
 page.wait_for_function("document.querySelector('.floating-charm')?.naturalWidth>0 && document.querySelector('#discoveryImage').naturalWidth>0")
 assert page.locator('#story').is_hidden()
 page.wait_for_timeout(350)
 page.screenshot(path=str(out/'nancy-treasure-discovery.png'),full_page=True)
 page.wait_for_function("document.querySelectorAll('.discovery-burst').length===0")
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).charms")==['rose']
 page.keyboard.press('ArrowDown');page.wait_for_timeout(300);page.keyboard.press('ArrowUp');page.wait_for_timeout(350)
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).charms")==['rose']
 assert page.locator('.discovery-burst').count()==0
 page.locator('#bag').click();page.locator('#inventoryTab-quest').click();page.wait_for_function("[...document.querySelectorAll('#charms img')].every(i=>i.naturalWidth>0)");page.screenshot(path=str(out/'nancy-quest-bag.png'),full_page=True)
 assert not errors,errors;page.close()
 c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 c.add_init_script("localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({accepted:true,map:'garden',x:3,z:9}));const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t.startsWith('webgl')?null:original.call(this,t,...a)}")
 m=c.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(base+'/adventure.html?v=inventory-5');m.wait_for_function("document.querySelector('#loading').hidden",timeout=60000)
 m.locator('[data-direction=up]').tap();m.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).charms.includes('rose')")
 m.wait_for_function("document.querySelector('#discoveryImage').naturalWidth>0");assert m.locator('.discovery-burst').count()==0
 assert m.locator('#story').is_hidden() and not errors,errors
 print('PASS: illustrated automatic discovery, rising charm and particles, cleanup, no repeated pickup, illustrated bag, reduced-motion mobile software renderer')
 b.close()
