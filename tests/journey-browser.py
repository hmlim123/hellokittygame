"""Nancy's first complete journey, driven through the visible UI and real physics."""
import json, os, subprocess, time
from collections import deque
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
MAP=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {gladeMap} from './src/game/chapter.ts';console.log(JSON.stringify(gladeMap()));"],text=True))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1000,'height':1000},reduced_motion='reduce');errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({map:'glade',trackedQuest:'glade',accepted:true,x:2,z:10}));")
    def save():return page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'))")
    def ready():page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
    def walk(x,z):
        a=save();queue=deque([((a['x'],a['z']),[])]);seen={(a['x'],a['z'])};route=None
        def allowed(x,z):
            if not(0<=z<MAP['h'] and 0<=x<MAP['w']):return False
            tile=MAP['rows'][z][x]
            return tile in '.LKP' or tile=='h' and a['chapter']['butterflyStep']>0 or tile=='J' and a['chapter']['bridgeFixed']
        while queue:
            (cx,cz),path=queue.popleft()
            if (cx,cz)==(x,z):route=path;break
            for key,dx,dz in [('ArrowUp',0,-1),('ArrowDown',0,1),('ArrowLeft',-1,0),('ArrowRight',1,0)]:
                nx,nz=cx+dx,cz+dz
                if (nx,nz) not in seen and allowed(nx,nz):seen.add((nx,nz));queue.append(((nx,nz),path+[(key,nx,nz)]))
        assert route is not None,(a,x,z)
        for key,nx,nz in route:
            page.keyboard.press(key)
            page.wait_for_function("p=>{const a=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return a.x===p[0]&&a.z===p[1]}",arg=[nx,nz],timeout=15000)
    started=time.monotonic();page.goto(BASE+'/adventure.html');ready()
    guide=page.get_by_role('complementary',name='Your next goal')
    assert guide.get_by_role('heading',name='Follow the glowing butterflies').is_visible()
    guide.get_by_text('A little hint',exact=True).click()
    assert guide.get_by_role('button',name='Show the walking path').is_visible()
    for x,z,step in [(2,9,1),(3,8,2),(4,6,3)]:
        walk(x,z)
        if save()['chapter']['butterflyStep']<step:
            page.get_by_role('button',name='Use butterfly lantern',exact=True).click()
        assert save()['chapter']['butterflyStep']==step
    assert guide.get_by_role('heading',name='Help the thirsty flowers').is_visible()
    assert 'nearby action picks it up' in guide.inner_text()
    walk(5,6);page.get_by_role('button',name='Use watering can',exact=True).click()
    assert save()['chapter']['flowersRevived']
    assert guide.get_by_role('heading',name='Mend the friendship bridge').is_visible()
    reward=page.locator('[data-reward=blossom]')
    assert reward.is_visible()
    reward.get_by_role('button',name='Try it at home',exact=True).click();ready()
    page.wait_for_function("document.querySelector('#stage canvas').dataset.outfit==='blossom'")
    assert page.locator('.action-bar>button').count()==3
    page.get_by_role('button',name='Remember The flower patch',exact=True).click()
    assert page.locator('[data-memory=flowers]').count()==1
    page.keyboard.press('Escape');page.reload();ready()
    assert save()['chapter']['flowersRevived']
    assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).outfit")== 'blossom'
    page.get_by_role('button',name='Inventory ♡',exact=True).click()
    assert page.get_by_role('button',name='Blossom keepsake',exact=True).get_attribute('aria-pressed')=='true'
    page.keyboard.press('Escape')
    page.screenshot(path='/tmp/nancy-stage3-room.png',full_page=True)
    assert not errors,errors
    print(f'PASS fresh glade journey: visible goal/hint, three one-tap lantern actions, watering, earned dress at home, room souvenir, inventory and reload. Automated elapsed {time.monotonic()-started:.1f}s (not a first-player duration).',flush=True)
    browser.close()
