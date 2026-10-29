"""Readable storybook presentation at desktop and phone sizes."""
import json,os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
CONTRAST="""selectors=>{
 const rgb=s=>(s.match(/[\\d.]+/g)||[]).slice(0,3).map(Number);
 const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
 return selectors.map(selector=>{const el=document.querySelector(selector);if(!el)return {selector,missing:true};let bg=el;while(bg.parentElement&&getComputedStyle(bg).backgroundColor==='rgba(0, 0, 0, 0)')bg=bg.parentElement;const f=lum(rgb(getComputedStyle(el).color)),b=lum(rgb(getComputedStyle(bg).backgroundColor));return {selector,ratio:(Math.max(f,b)+.05)/(Math.min(f,b)+.05)}})
}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
 for phone in [False,True]:
  page=b.new_page(viewport={'width':390 if phone else 1100,'height':844 if phone else 1060},is_mobile=phone,has_touch=phone,reduced_motion='reduce');page.on('pageerror',lambda e:errors.append(str(e)))
  seed={'map':'glade','trackedQuest':'glade','x':5,'z':6,'chapter':{'butterflyStep':3,'flowersRevived':True}}
  page.add_init_script("localStorage.setItem('kitty-nancy-adventure-v1',"+json.dumps(json.dumps(seed))+");localStorage.setItem('kitty-nancy-equipment-v1',JSON.stringify({outfit:'blossom',item:'none'}));")
  page.goto(BASE+'/adventure.html');page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.wait_for_function("Number(document.querySelector('#world canvas').dataset.cutawayWalls)>0")
  for c in page.evaluate(CONTRAST,['.quest-guide h2','.quest-guide p','.quest-guide .eyebrow']):assert not c.get('missing') and c['ratio']>=4.5,c
  page.screenshot(path='/tmp/nancy-guide-'+('phone' if phone else 'desktop')+'.png',full_page=True)
  page.get_by_role('button',name='Inventory ♡',exact=True).click();page.get_by_role('button',name='Blossom keepsake',exact=True).wait_for()
  page.screenshot(path='/tmp/nancy-inventory-'+('phone' if phone else 'desktop')+'.png',full_page=True)
  page.keyboard.press('Escape');page.get_by_role('button',name='← Her room',exact=True).click();page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
  assert page.locator('.action-bar>button').count()==3
  for c in page.evaluate(CONTRAST,['#startHunt','.intro p','.eyebrow']):assert not c.get('missing') and c['ratio']>=4.5,c
  page.screenshot(path='/tmp/nancy-room-'+('phone' if phone else 'desktop')+'.png',full_page=True)
  page.get_by_role('button',name='Game settings',exact=True).click()
  for c in page.evaluate(CONTRAST,['.small-note','dialog h2']):assert not c.get('missing') and c['ratio']>=4.5,c
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  print('PASS readable pastel goals, room and settings; shared wardrobe presentation; three main buttons:', 'phone' if phone else 'desktop',flush=True);page.close()
 assert not errors,errors;b.close()
