from playwright.sync_api import sync_playwright
from pathlib import Path
import os
base=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8024')
out=Path(__file__).resolve().parents[1]/'docs'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':1100},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base);page.wait_for_function("!document.querySelector('#wave').disabled",timeout=60000)
 assert page.locator('h1').inner_text().startswith('Nancy')
 page.locator('#startHunt').click();page.screenshot(path=str(out/'nancy-missions.png'),full_page=True)
 assert page.locator('[data-mission]').count()==3
 page.locator('#tab-missions').focus();page.keyboard.press('ArrowRight');assert page.locator('#tab-gifts').get_attribute('aria-selected')=='true'
 for gift in ['teddy','letter','strawberry','flowers','teddy']:
  page.locator('[data-gift="'+gift+'"]').click();assert page.locator('[data-gift="'+gift+'"]').get_attribute('aria-pressed')=='true'
 page.screenshot(path=str(out/'nancy-gifts.png'),full_page=True)
 page.locator('#backToKitty').click();page.screenshot(path=str(out/'nancy-teddy-room.png'),full_page=True)
 page.reload();page.wait_for_function("!document.querySelector('#wave').disabled")
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-room-preferences-v1')).heldGift")=='teddy'
 page.locator('#startHunt').click();page.locator('[data-mission="strawberries"]').click()
 assert page.locator('#missionGoal').inner_text()=='6';assert page.locator('#missionItem').inner_text()=='berries'
 for i in range(6):
  page.locator('.bow-target:visible').first.dispatch_event('click');page.wait_for_timeout(350)
  assert page.locator('#hits').inner_text()==str(i+1),('berry count',i,page.locator('#hits').inner_text())
 page.wait_for_function("document.querySelector('#rewardModal').open")
 assert page.locator('#collectionCount').inner_text()=='2 of 6 friends'
 page.locator('#rewardDone').click()
 def watch():
  page.evaluate('''()=>{window.shown=[];window.lastHeart=-1;new MutationObserver(()=>{const a=[...document.querySelectorAll('.bow-target')],i=a.findIndex(e=>e.classList.contains('memory-lit'));if(i!==window.lastHeart){if(i>=0)window.shown.push(i);window.lastHeart=i;}}).observe(document.querySelector('#bowTargets'),{attributes:true,subtree:true,attributeFilter:['class']});}''')
 def memory():
  watch();page.locator('#startHunt').click();page.locator('[data-mission="hearts"]').click()
  page.wait_for_function("document.querySelector('#time').textContent==='Your turn'",timeout=30000)
  sequence=page.evaluate('shown');assert len(sequence)==4,sequence
  return sequence
 seq=memory()
 page.locator('.bow-target').nth((seq[0]+1)%4).press('Enter')
 assert page.locator('#hits').inner_text()=='0'
 assert page.locator('#time').inner_text()=='Watch…'
 page.wait_for_function("document.querySelector('#time').textContent==='Your turn'",timeout=30000)
 for step,i in enumerate(seq):
  page.locator('.bow-target').nth(i).press('Enter');page.wait_for_timeout(350)
  assert page.locator('#hits').inner_text()==str(step+1),('memory',seq,step,page.locator('#hits').inner_text(),page.locator('#time').inner_text())
 page.wait_for_function("document.querySelector('#rewardModal').open")
 assert page.locator('#collectionCount').inner_text()=='3 of 6 friends'
 page.locator('#rewardDone').click();page.reload();page.wait_for_function("!document.querySelector('#wave').disabled")
 journal=page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-missions-v1'))")
 assert journal['completed']=={'bows':0,'strawberries':1,'hearts':1}
 page.locator('#startHunt').click();page.locator('#tab-nancy').click()
 assert page.locator('#keepsakes article:not(.locked)').count()==2
 assert page.locator('#keepsakes article').count()==3
 page.screenshot(path=str(out/'nancy-keepsakes.png'),full_page=True)
 page.locator('#closeAdventures').click();assert not errors,errors
 phone=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 m=phone.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(base);m.wait_for_function("!document.querySelector('#wave').disabled")
 m.locator('#startHunt').tap();m.locator('#tab-gifts').tap();m.locator('[data-gift="letter"]').tap()
 assert m.evaluate('document.documentElement.scrollWidth<=innerWidth')
 m.screenshot(path=str(out/'nancy-gifts-mobile.png'),full_page=True)
 m.locator('#backToKitty').tap();assert not errors,errors
 print('PASS: Nancy personalization, tab keyboard controls, four saved gifts, six-berry mission, memory cues/mistake/retry/win, keepsakes, reload and mobile layout')
 b.close()
