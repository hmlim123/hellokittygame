"""Save failures/retry/export/restore, release visibility, and real cross-tab physics refresh."""
import json,os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']);errors=[]
    page=b.new_page(viewport={'width':1000,'height':1000},reduced_motion='reduce',accept_downloads=True);page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("""(()=>{
      if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({map:'glade',x:5,z:6,chapter:{butterflyStep:3,flowersRevived:true}}));
      window.blockSaves=location.search.includes('simulate-save-failure');
      const write=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){if(window.blockSaves)throw new DOMException('Quota exceeded','QuotaExceededError');return write.call(this,k,v)};
    })()""")
    def ready(pg):pg.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
    page.goto(BASE+'/?simulate-save-failure');ready(page)
    page.locator('[data-save-state=failed]').wait_for()
    page.get_by_role('button',name='Inventory ♡',exact=True).click();page.get_by_role('button',name='Blossom keepsake',exact=True).click();page.keyboard.press('Escape')
    with page.expect_download() as download:page.get_by_role('button',name='Download backup',exact=True).click()
    path='/tmp/Nancy-Release-Backup.json';download.value.save_as(path)
    backup=json.load(open(path));assert backup['data']['equipment']['outfit']=='blossom' and backup['data']['adventure']['chapter']['flowersRevived']
    page.evaluate('blockSaves=false');page.get_by_role('button',name='Retry saving',exact=True).click();page.locator('[data-save-state=saved]').wait_for()
    page.goto(BASE+'/');ready(page);page.wait_for_function("document.querySelector('#stage canvas').dataset.outfit==='blossom'")
    page.get_by_role('button',name='Game settings',exact=True).click();assert 'Version 1.6.0' in page.locator('.release-details').inner_text();page.keyboard.press('Escape')
    print('PASS blocked writes remain playable; current progress exports, retry recovers, reload preserves reward and version is visible',flush=True)
    page.close()
    phone=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');phone.on('pageerror',lambda e:errors.append(str(e)))
    phone.goto(BASE+'/adventure.html');ready(phone);phone.get_by_role('button',name='Game settings',exact=True).tap();phone.get_by_text('Keep your progress ♡',exact=True).tap();phone.get_by_label('Choose Kitty save backup',exact=True).set_input_files(path);phone.get_by_role('button',name='Restore this backup',exact=True).tap();ready(phone);phone.keyboard.press('Escape')
    assert phone.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).chapter.flowersRevived")
    assert phone.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).outfit")=='blossom'
    phone.reload();ready(phone);phone.wait_for_function("document.querySelector('#world canvas').dataset.tile==='5,6'")
    print('PASS exported reward/progress restores onto a fresh phone and survives reload',flush=True)
    phone.close()
    context=b.new_context(viewport={'width':1000,'height':1000},reduced_motion='reduce')
    context.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify({map:'glade',accepted:true,x:2,z:10,trackedQuest:'glade',chapter:{butterflyStep:3,flowersRevived:true}}));")
    first=context.new_page();first.on('pageerror',lambda e:errors.append(str(e)));first.goto(BASE+'/adventure.html');ready(first)
    first.wait_for_function("document.querySelector('#world canvas').dataset.tile==='2,10'&&Number(document.querySelector('#world canvas').dataset.bodyX)===2")
    second=context.new_page();second.on('pageerror',lambda e:errors.append(str(e)));second.goto(BASE+'/');ready(second)
    second.evaluate("""()=>{
      const save=JSON.parse(localStorage.getItem('kitty-world-v2'));const a=save.state.adventure;
      a.x=4;a.z=8;a.journey.stops.glade={x:4,z:8,facing:'up'};
      localStorage.setItem('kitty-nancy-adventure-v1',JSON.stringify(a));
      localStorage.setItem('kitty-world-v2',JSON.stringify(save));
    }""")
    first.bring_to_front()
    try:
        first.wait_for_function("(()=>{const d=document.querySelector('#world canvas').dataset;return d.tile==='4,8'&&Math.abs(Number(d.bodyX)-4)<.001&&Math.abs(Number(d.bodyZ)-8)<.001})()",timeout=15000)
    except Exception:
        print('REFRESH DIAGNOSTIC',first.evaluate("({data:document.querySelector('#world canvas')?.dataset,stored:JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')),ready:!document.querySelector('#openWardrobe').disabled})"),flush=True)
        first.screenshot(path='/tmp/nancy-refresh-failed.png',full_page=True)
        raise
    first.keyboard.press('ArrowDown');first.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).z===9",timeout=15000)
    print('PASS a real second-tab save refresh remounts the physics body at the new coordinates and movement remains usable',flush=True)
    assert not errors,errors;b.close()
