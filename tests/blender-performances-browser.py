"""Exercise real Blender performances through the normal game interface."""
import os,json
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
 page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='no-preference');page.on('pageerror',lambda e:errors.append(str(e)))
 def ready():page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def pose(kind,holding):
  page.wait_for_function("p=>{const c=document.querySelector('.baking-preview canvas');return c?.dataset.blenderAction===p[0]&&c.dataset.holding===p[1]&&Number(c.dataset.pawTurn)>.01}",arg=[kind,holding],timeout=30000)
 page.goto(BASE+'/');ready();assert page.locator('.action-bar>button').count()==3
 page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Bake cookies with Kitty').click();pose('stir','spoon')
 page.get_by_role('button',name='Bake & decorate →',exact=True).click();pose('cut','cutter')
 page.get_by_role('button',name='Add a heart ♥',exact=True).click();page.get_by_role('button',name='Ready to give →',exact=True).click();pose('present','tray')
 page.locator('.baking-performance').screenshot(path='/tmp/nancy-blender-baking.png')
 page.get_by_role('button',name='Give cookie to Momo ♡',exact=True).click();page.wait_for_function("document.querySelector('.baking-preview canvas').dataset.blenderAction==='bow'",timeout=30000)
 assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).cookiesGiven") == 1
 page.emulate_media(reduced_motion='reduce');page.get_by_role('button',name='Watch Kitty again ♡',exact=True).click()
 page.wait_for_function("document.querySelector('.baking-preview canvas').dataset.blenderAction==='idle'&&Number(document.querySelector('.baking-preview canvas').dataset.pawTurn)<.0001")
 page.get_by_role('button',name='Back to Kitty',exact=True).click();page.reload();ready();assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).cookiesGiven")==1
 print('PASS actual Blender stir, cutter press, live-cookie tray, thank-you bow, replay and static reduced-motion pose; earned cookie survives reload',flush=True)
 page.emulate_media(reduced_motion='no-preference');page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Moonflower Adventure').click();ready()
 for x in [6,5]:
  page.keyboard.press('ArrowLeft');page.wait_for_function("x=>JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===x",arg=x,timeout=15000)
 page.get_by_role('button',name='Talk to Momo',exact=True).click();page.wait_for_function("document.querySelector('#world canvas').dataset.momoGreeting==='true'",timeout=15000)
 page.get_by_role('button',name='Let’s help!',exact=True).click();page.get_by_role('button',name='Keep exploring',exact=True).click();page.close()
 # A returning, awake Pip greets Nancy as she starts a conversation.
 pip=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='no-preference');pip.on('pageerror',lambda e:errors.append(str(e)))
 adventure={'map':'glade','accepted':True,'x':10,'z':7,'chapter':{'butterflyStep':3,'flowersRevived':True,'bridgeFixed':True,'stars':['moon','flower','heart'],'friendAwake':True}}
 pip.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',"+json.dumps(json.dumps(adventure))+");")
 pip.goto(BASE+'/adventure.html');pip.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 pip.get_by_role('button',name='Talk to Pip',exact=True).click();pip.wait_for_function("document.querySelector('#world canvas').dataset.pipGreeting==='true'",timeout=15000)
 assert not errors,errors
 print('PASS Momo waves and awake Pip wiggles her ears at conversation start; zero page errors. Physical Safari remains unverified.',flush=True);b.close()
