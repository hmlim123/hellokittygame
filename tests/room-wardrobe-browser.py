from playwright.sync_api import sync_playwright
from pathlib import Path
import os
base=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8032')
out=Path(__file__).resolve().parents[1]/'docs'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':1200,'height':1060},reduced_motion='reduce');room=c.new_page();errors=[];room.on('pageerror',lambda e:errors.append(str(e)))
 room.goto(base+'/?v=wardrobe-6');room.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 room.locator('#openWardrobe').click();assert room.get_by_role('button',name='Honey picnic',exact=True).is_disabled();room.locator('#backToWorld').click()
 original=room.locator('#stage canvas').screenshot()
 adventure=c.new_page();adventure.on('pageerror',lambda e:errors.append(str(e)));adventure.goto(base+'/adventure.html?v=wardrobe-6');adventure.wait_for_function("document.querySelector('#loading').hidden",timeout=60000)
 adventure.evaluate("localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({accepted:true,map:'garden',x:11,z:9}))");adventure.reload();adventure.wait_for_function("document.querySelector('#loading').hidden");adventure.keyboard.press('ArrowUp');adventure.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).charms.includes('honey')")
 adventure.locator('#bag').click();adventure.get_by_role('button',name='Honey picnic',exact=True).click();adventure.locator('#inventoryTab-items').click();adventure.get_by_role('button',name='Empty paws',exact=True).click()
 room.bring_to_front();room.locator('#openWardrobe').click();room.wait_for_function("document.querySelector('#equipmentPreview').dataset.outfit==='picnic' && document.querySelector('#equipmentPreview').dataset.item==='none'")
 assert room.get_by_role('button',name='Honey picnic',exact=True).is_enabled();room.locator('#backToWorld').click();assert original!=room.locator('#stage canvas').screenshot(),'The room character must visibly wear the earned outfit'
 room.screenshot(path=str(out/'nancy-earned-outfit-room.png'),full_page=True)
 room.locator('#openWardrobe').click();room.screenshot(path=str(out/'nancy-room-inventory.png'),full_page=True);room.get_by_role('button',name='Sky sailor',exact=True).click()
 adventure.bring_to_front();adventure.wait_for_function("document.querySelector('#equipmentPreview').dataset.outfit==='sailor'")
 adventure.locator('#inventoryTab-items').click();adventure.get_by_role('button',name='Cuddle teddy',exact=True).click()
 room.bring_to_front();room.wait_for_function("document.querySelector('#equipmentPreview').dataset.item==='teddy'")
 room.locator('#backToWorld').click();room.locator('#startHunt').click();room.locator('#tab-gifts').click();room.locator('[data-gift=strawberry]').click()
 adventure.wait_for_function("document.querySelector('#equipmentPreview').dataset.item==='strawberry'")
 room.locator('#backToKitty').click();room.reload();room.wait_for_function("!document.querySelector('#openWardrobe').disabled");room.locator('#openWardrobe').click();assert room.locator('#equipmentPreview').get_attribute('data-outfit')=='sailor';assert room.locator('#equipmentPreview').get_attribute('data-item')=='strawberry'
 room.locator('#inventoryTab-quest').click();assert room.locator('#charms .missing').count()==2
 room.locator('#backToWorld').click();assert room.locator('#collectionCount').inner_text()=='1 of 6 friends';assert room.locator('.action-bar button').count()==3
 assert not errors,errors;room.close();adventure.close()
 phone=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');m=phone.new_page();m.on('pageerror',lambda e:errors.append(str(e)))
 m.goto(base+'/?v=wardrobe-6');m.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000);m.locator('#openWardrobe').tap();m.get_by_role('button',name='Sky sailor',exact=True).tap();m.locator('#inventoryTab-items').tap();m.get_by_role('button',name='Empty paws',exact=True).tap();m.locator('#backToWorld').tap()
 m.locator('#startHunt').tap();m.locator('#tab-gifts').tap();m.locator('#playGift').tap();assert m.locator('#inventoryPanel-items').is_visible()
 assert m.evaluate('document.documentElement.scrollWidth<=innerWidth');assert m.locator('#inventory').evaluate('(e)=>e.scrollWidth<=e.clientWidth');assert not errors,errors
 print('PASS: earn an outfit in adventure, wear it in room, wardrobe and items sync both ways across open tabs, gifts stay compatible, reload, quest view and mobile')
 b.close()
