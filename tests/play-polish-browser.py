"""Production WebGL checks for quick tools, real rig motion/effects and save transfer.
Build + preview on 8053; requires Python Playwright, Chromium and Pillow.
"""
import os,json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8053').rstrip('/')
START={'map':'glade','accepted':True,'x':5,'z':6,'facing':'down','chapter':{'butterflyStep':3},'charms':[]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='no-preference',accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_init_script("if(!localStorage.getItem('kitty-world-v2'))localStorage.setItem('kitty-nancy-adventure-v1',"+json.dumps(json.dumps(START))+");")
 def ready():page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def saved():return page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'))")
 def step(key,x,z):
  page.keyboard.press(key);page.wait_for_function("p=>{const s=JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1'));return s.x===p[0]&&s.z===p[1]}",arg=[x,z],timeout=15000)
 def settings():page.get_by_role('button',name='Game settings',exact=True).click();page.get_by_text('Keep your progress ♡',exact=True).click()
 def import_text(text):
  page.get_by_label('Choose Kitty save backup',exact=True).set_input_files({'name':'Nancy-backup.json','mimeType':'application/json','buffer':text.encode()});page.get_by_role('button',name='Restore this backup',exact=True).click();ready()
 page.goto(BASE+'/adventure.html');ready();page.wait_for_function("Number(document.querySelector('#world canvas').dataset.petalSpread)===.06")
 assert page.get_by_role('button',name='Use watering can',exact=True).is_visible()
 page.get_by_role('button',name='Use watering can',exact=True).click();page.wait_for_function("document.querySelector('#world canvas').dataset.discoveryEffect==='water'");assert saved()['chapter']['flowersRevived'];assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).item")=='watering'
 page.wait_for_function("(()=>{const x=Number(document.querySelector('#world canvas').dataset.petalSpread);return x>.065&&x<.119})()",timeout=5000);page.screenshot(path='/tmp/kitty-pouring-water.png',full_page=True);page.wait_for_function("Number(document.querySelector('#world canvas').dataset.petalSpread)===.12",timeout=6000)
 page.keyboard.press('ArrowLeft');page.wait_for_function("Number(document.querySelector('#world canvas').dataset.walkWeight)>.1&&Number(document.querySelector('#world canvas').dataset.footLift)>.001",timeout=5000)
 yaw=float(page.locator('#world canvas').get_attribute('data-player-yaw'));assert -1.58<yaw<-.01;page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).x===4",timeout=15000);page.wait_for_function("Number(document.querySelector('#world canvas').dataset.walkWeight)<.01",timeout=5000)
 print('PASS quick watering, gradual bloom, alternating feet and smooth turn',flush=True)
 settings()
 with page.expect_download() as download:page.get_by_role('button',name='Download save',exact=True).click()
 path=Path(tempfile.gettempdir())/'Nancy-polish-save.json';download.value.save_as(path);backup=json.loads(path.read_text());assert set(backup['data'])=={'room','adventure','equipment','preferences','journal'};assert 'messages' not in backup['data']
 before=saved();page.get_by_label('Choose Kitty save backup',exact=True).set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{broken'});page.get_by_text('This file is not valid JSON. Choose a Kitty save downloaded from Settings.',exact=True).wait_for();assert saved()==before;assert page.get_by_role('button',name='Restore this backup',exact=True).count()==0
 bridge=json.loads(json.dumps(backup));bridge['data']['adventure'].update(x=6,z=8,facing='right');import_text(json.dumps(bridge));assert saved()['x']==6;page.keyboard.press('Escape');page.keyboard.press('ArrowRight');page.wait_for_function("Number(document.querySelector('#world canvas').dataset.physicsContacts)>0",timeout=15000);assert saved()['x']==6
 page.get_by_role('button',name='Tie friendship ribbon',exact=True).click();page.wait_for_function("(()=>{const x=Number(document.querySelector('#world canvas').dataset.bridgeWidth);return x>.5&&x<1.19})()",timeout=5000);page.screenshot(path='/tmp/kitty-tying-ribbon.png',full_page=True);page.wait_for_function("Number(document.querySelector('#world canvas').dataset.bridgeWidth)>1.19",timeout=6000);step('ArrowRight',7,8);step('ArrowRight',8,8)
 settings();wake=json.loads(json.dumps(backup));wake['data']['adventure'].update(x=10,z=7,chapter={'butterflyStep':3,'flowersRevived':True,'bridgeFixed':True,'stars':['moon','flower','heart']});import_text(json.dumps(wake));assert page.get_by_role('button',name='Download previous save',exact=True).is_visible();page.keyboard.press('Escape');page.get_by_role('button',name='Offer cuddle teddy',exact=True).click();page.wait_for_function("(()=>{const x=Number(document.querySelector('#world canvas').dataset.pipEyeOpen);return x>.012&&x<.037})()",timeout=5000);page.wait_for_function("Number(document.querySelector('#world canvas').dataset.pipEyeOpen)===.038",timeout=6000);assert saved()['chapter']['friendAwake'];assert page.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-equipment-v1')).item")=='teddy'
 settings()
 with page.expect_download() as previous:page.get_by_role('button',name='Download previous save',exact=True).click()
 previous.value.save_as('/tmp/Nancy-Kitty-Previous-Save.json');assert json.loads(Path('/tmp/Nancy-Kitty-Previous-Save.json').read_text())['data']['adventure']['x']==8
 with page.expect_download() as transfer:page.get_by_role('button',name='Download save',exact=True).click()
 transfer.value.save_as('/tmp/Nancy-Kitty-Transfer.json');page.keyboard.press('Escape');page.reload();ready();assert saved()['chapter']['friendAwake']
 print('PASS real bridge collision/tying, Pip waking, invalid-file rejection, previous-save download and reload',flush=True)
 # A fresh phone browser imports the file and redraws the restored adventure.
 mobile=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.goto(BASE+'/adventure.html');mobile.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000);mobile.get_by_role('button',name='Game settings',exact=True).tap();mobile.get_by_text('Keep your progress ♡',exact=True).tap();mobile.get_by_label('Choose Kitty save backup',exact=True).set_input_files('/tmp/Nancy-Kitty-Transfer.json');mobile.get_by_role('button',name='Restore this backup',exact=True).tap();mobile.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000);mobile.get_by_role('button',name='Close Game settings',exact=True).tap();mobile.wait_for_function("Number(document.querySelector('#world canvas').dataset.cameraHalf)>0&&Number(document.querySelector('#world canvas').dataset.cameraHalf)<2.65");assert mobile.evaluate("JSON.parse(localStorage.getItem('kitty-nancy-adventure-v1')).chapter.friendAwake");assert mobile.locator('.world-label').count()<=4;assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth');mobile.screenshot(path='/tmp/kitty-polished-mobile.png',full_page=True)
 assert not errors,errors
 print('PASS cross-device save transfer, closer mobile camera, nearby-only labels, touch controls and zero page errors',flush=True);b.close()
