"""Direct NPC talks and a recoverable fresh start before Nancy’s first visit."""
import json,os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
 page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='reduce',accept_downloads=True);page.on('pageerror',lambda e:errors.append(str(e)))
 def ready(pg=page):pg.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def saved(key,pg=page):return pg.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',key)
 def step(key,x,z):page.keyboard.press(key);page.wait_for_function("p=>{const a=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return a.x===p[0]&&a.z===p[1]}",arg=[x,z],timeout=15000)
 page.goto(BASE+'/?v=gift-19');ready();page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Moonflower Adventure').click();ready();step('ArrowLeft',6,8);step('ArrowLeft',5,8)
 assert not saved('kitty-nancy-adventure-v1')['accepted']
 talk=page.get_by_role('button',name='Talk to Momo',exact=True);assert talk.bounding_box()['height']>=44;talk.click();page.get_by_role('dialog',name='Momo',exact=True).wait_for();assert page.get_by_text('Nancy, the moonflower has lost its glow. Will you help me find its three moon charms?',exact=True).is_visible()
 page.get_by_role('button',name='Let’s help!',exact=True).click();assert saved('kitty-nancy-adventure-v1')['accepted'];assert page.get_by_role('dialog',name='Momo',exact=True).is_visible();page.get_by_role('button',name='Keep exploring',exact=True).click();page.keyboard.press('e');page.get_by_role('dialog',name='Momo',exact=True).wait_for();page.get_by_role('button',name='Close Momo',exact=True).click()
 page.screenshot(path='/tmp/nancy-easy-npc.png',full_page=True)
 print('PASS talk from three tiles away without facing Momo, readable persistent conversation, quest choice, close and keyboard reopen',flush=True)
 page.get_by_role('button',name='← Her room',exact=True).click();ready();page.get_by_role('button',name='Inventory ♡',exact=True).click();page.get_by_role('button',name='Sky sailor',exact=True).click();page.get_by_role('button',name='Back to Kitty',exact=True).click()
 page.get_by_role('button',name='Play a mission').click();page.get_by_role('button',name='Bake cookies with Kitty').click();page.get_by_role('button',name='Bake & decorate →',exact=True).click();page.get_by_role('button',name='Add a heart ♥',exact=True).click();page.get_by_role('button',name='Ready to give →',exact=True).click();page.get_by_role('button',name='Give cookie to Momo ♡',exact=True).click();page.get_by_role('button',name='Back to Kitty',exact=True).click()
 page.get_by_role('button',name='Game settings',exact=True).click();page.get_by_text('Keep your progress ♡',exact=True).click();page.get_by_text('Start fresh',exact=True).click()
 with page.expect_download() as download:page.get_by_role('button',name='Download backup & start fresh',exact=True).click()
 download.value.save_as('/tmp/Nancy-Kitty-Before-Reset.json');ready();assert page.url.endswith('/?v=gift-19');assert page.locator('.action-bar>button').count()==3
 assert saved('kitty-room-3d-v1')['owned']==[0];assert saved('kitty-nancy-equipment-v1')['outfit']=='classic';assert saved('kitty-nancy-cozy-v1')['cookiesGiven']==0;assert not saved('kitty-nancy-adventure-v1')['accepted'];assert not saved('kitty-nancy-adventure-v1')['chapter']['letterFound']
 old=json.load(open('/tmp/Nancy-Kitty-Before-Reset.json'));assert old['data']['equipment']['outfit']=='sailor' and old['data']['cozy']['cookiesGiven']==1
 page.get_by_role('button',name='Play together ↗',exact=True).click();page.get_by_role('button',name='Nancy’s letter 💌',exact=True).click();page.get_by_role('button',name='Break the heart seal',exact=True).click();assert page.get_by_text('I made this little world because I wanted to give you something that feels like a hug. A place you can visit whenever you need a smile.',exact=True).is_visible();page.keyboard.press('Escape')
 page.get_by_role('button',name='Inventory ♡',exact=True).click();page.get_by_role('button',name='Sky sailor',exact=True).click();page.get_by_role('button',name='Back to Kitty',exact=True).click();page.reload();ready();assert saved('kitty-nancy-equipment-v1')['outfit']=='sailor'
 print('PASS reset downloads the original cookie/outfit save, starts the room fresh, keeps Nancy’s actual letter, and the gift link does not reset on reload',flush=True)
 phone=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');phone.on('pageerror',lambda e:errors.append(str(e)));phone.goto(BASE+'/?v=gift-19');ready(phone);assert saved('kitty-nancy-equipment-v1',phone)['outfit']=='classic';assert not saved('kitty-nancy-adventure-v1',phone)['accepted']
 phone.get_by_role('button',name='Play a mission').tap();phone.get_by_role('button',name='Moonflower Adventure').tap();ready(phone)
 # Walk to the larger talk zone with real phone controls.
 phone.get_by_role('button',name='Walk left',exact=True).tap();phone.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===6",timeout=15000);phone.get_by_role('button',name='Walk left',exact=True).tap();phone.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===5",timeout=15000)
 phone.get_by_role('button',name='Talk to Momo',exact=True).tap();phone.get_by_role('dialog',name='Momo',exact=True).wait_for();phone.get_by_role('button',name='Let’s help!',exact=True).tap();phone.get_by_role('button',name='Close Momo',exact=True).tap();assert saved('kitty-nancy-adventure-v1',phone)['accepted'];assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth');phone.screenshot(path='/tmp/nancy-npc-phone.png',full_page=True)
 assert not errors,errors
 print('PASS a new phone starts fresh from the same share link; large NPC name button, tap/choices/close work with no page errors. Physical Safari remains unverified.',flush=True);b.close()
