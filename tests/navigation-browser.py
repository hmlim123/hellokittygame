"""Real-browser resume, walking-map and remembered-place navigation checks.
Build + preview on 8053; requires Python Playwright and Chromium.
"""
import os,json
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 initial={'map':'garden','accepted':True,'x':11,'z':8,'charms':['rose']}
 page.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',"+json.dumps(json.dumps(initial))+");")
 def saved():return page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'))")
 def ready():page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def at(area,x,z):page.wait_for_function("p=>{const s=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return s.map===p[0]&&s.x===p[1]&&s.z===p[2]&&document.querySelector('#world canvas')?.dataset.tile===p[1]+','+p[2]}",arg=[area,x,z],timeout=15000)
 def map_open():page.get_by_role('button',name='Open quest map',exact=True).click();page.wait_for_selector('.travel-map[open]');assert page.get_by_role('tab',name='Quest',exact=True).get_attribute('aria-selected')=='true'
 def choose(area):page.locator('.map-areas').get_by_role('button',name=area,exact=False).click()
 def go_room():page.get_by_role('button',name='← Her room',exact=True).click();ready()
 page.goto(BASE+'/');ready();assert page.locator('.action-bar>button').count()==3;page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Continue adventure',exact=True).click();ready();at('garden',11,8)
 map_open();assert page.locator('.quest-map-svg').count()==1;assert page.locator('.map-next').inner_text().startswith('Next · honey charm chest');page.locator('[data-quest="ribbons"]').get_by_role('button',name='Follow quest',exact=True).click();assert 'Village path' in page.locator('.map-next').inner_text();page.locator('.travel-map').scroll_into_view_if_needed();page.screenshot(path='/tmp/kitty-walking-map.png',full_page=True)
 choose('Rosemilk Village');page.get_by_role('button',name='Return to Rosemilk Village',exact=True).click();at('village',7,8);page.keyboard.press('ArrowLeft');at('village',6,8)
 map_open();choose('Moonflower Garden');page.get_by_role('button',name='Return to Moonflower Garden',exact=True).click();at('garden',11,8);assert saved()['charms']==['rose'];assert saved()['trackedQuest']=='ribbons'
 go_room();page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Continue adventure',exact=True).click();ready();at('garden',11,8)
 go_room();page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Butterfly Glade',exact=False).click();ready();at('glade',2,10);page.keyboard.press('ArrowUp');at('glade',2,9);page.get_by_role('button',name='Use butterfly lantern',exact=True).click();page.keyboard.press('ArrowRight');at('glade',3,9);page.keyboard.press('ArrowUp');at('glade',3,8)
 go_room();page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Continue adventure',exact=True).click();ready();at('glade',3,8)
 go_room();page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Butterfly Glade',exact=False).click();ready();at('glade',3,8)
 map_open();page.locator('[data-quest="ribbons"]').get_by_role('button',name='Follow quest',exact=True).click();assert 'Garden path' in page.locator('.map-next').inner_text();choose('Rosemilk Village');page.get_by_role('button',name='Return to Rosemilk Village',exact=True).click();at('village',6,8)
 page.reload();ready();at('village',6,8);assert saved()['journey']['stops']['glade']['x']==3;assert saved()['journey']['stops']['glade']['z']==8
 # Normal inventory keeps the map folded; the direction shortcut opens it.
 page.get_by_role('button',name='Inventory ♡',exact=True).click();page.get_by_role('tab',name='Quest',exact=True).click();assert page.locator('.travel-map').get_attribute('open') is None;page.keyboard.press('Escape');map_open();assert page.locator('.map-route').count()==1;page.keyboard.press('Escape')
 page.go_back();ready();assert page.locator('#stage canvas').count()==1;page.go_forward();ready();at('village',6,8)
 print('PASS exact resume, remembered places, cross-area quest routes, folded/expanded map, reload and browser history',flush=True)
 mobile=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');mobile.on('pageerror',lambda e:errors.append(str(e)));seed={'map':'glade','x':4,'z':6,'accepted':True,'chapter':{'butterflyStep':3},'trackedQuest':'glade'}
 mobile.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',"+json.dumps(json.dumps(seed))+");");mobile.goto(BASE+'/adventure.html');mobile.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000);mobile.get_by_role('button',name='Open quest map',exact=True).tap();assert mobile.locator('.travel-map[open]').count()==1;mobile.locator('.map-areas').get_by_role('button',name='Moonflower Garden',exact=False).tap();assert mobile.locator('.unvisited-map').is_visible();assert mobile.get_by_role('button',name='Return to Moonflower Garden',exact=True).count()==0;mobile.locator('.map-areas').get_by_role('button',name='Butterfly Glade',exact=False).tap();assert mobile.locator('.quest-map-svg').count()==1;assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth');mobile.screenshot(path='/tmp/kitty-phone-map.png',full_page=True);mobile.locator('dialog[open]').evaluate('(el)=>el.scrollTop=el.scrollHeight');close=mobile.get_by_role('button',name='Close Kitty’s inventory',exact=True);assert close.is_visible();close.tap();mobile.get_by_role('button',name='Open quest map',exact=True).tap();mobile.get_by_role('button',name='Back to this spot',exact=True).tap();mobile.wait_for_function("document.querySelector('#world canvas').dataset.tile==='4,6'")
 assert not errors,errors
 print('PASS phone map, unvisited-place hints, touch return, no horizontal overflow and zero page errors',flush=True);b.close()
