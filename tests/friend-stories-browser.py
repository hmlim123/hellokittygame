"""Use the real shelf, complete all five friendship stories, then return to play."""
import os,json,sys,traceback
from playwright.sync_api import sync_playwright
BASE=os.environ.get('KITTY_BASE_URL','http://127.0.0.1:8081').rstrip('/')
TALES=[('cloud','A ribbon after the rain',[['ribbon-left','ribbon-middle','ribbon-right'],['loop','knot','second-loop'],['flower','heart','bow']]),('witch','A pocketful of starlight',[['light-1','light-2','light-3'],['moon','star','heart'],['lantern-1','lantern-2','lantern-3']]),('baby','The sleepiest little cloud',[['soft-star-1','soft-star-2','soft-star-3'],['moon','cloud','heart'],['teddy','blanket','nightlight']]),('kitten','The garden’s quiet surprise',[['bud-1','bud-2','bud-3'],['leaf','flower','sun'],['seed','water','sunshine']]),('bunny','An invitation from the moon',[['paper-1','paper-2','paper-3'],['moon','flower','heart'],['cup','plate','invitation']])]
with sync_playwright()as p:
 b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1100,'height':1060},reduced_motion='reduce');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def fail(kind,value,tb):
  try:page.screenshot(path='/tmp/nancy-friend-story-failure.png',full_page=True)
  except Exception:pass
  traceback.print_exception(kind,value,tb)
 sys.excepthook=fail
 def save():return page.evaluate("JSON.parse(localStorage.getItem('kitty-world-v2')).state")
 def ready():page.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 def stories():
  shelf=page.locator('.shelf-panel');
  if shelf.get_attribute('open') is None:shelf.locator('summary').click()
  page.get_by_role('button',name='Meet your new friends',exact=False).click()
 page.goto(BASE+'/');ready();print('PASS initial room and new shelf load',flush=True);page.screenshot(path='/tmp/nancy-friend-stories-start.png',full_page=True);assert page.locator('.action-bar>button').count()==3
 page.locator('.shelf-panel summary').click();assert page.locator('[data-friend]').count()==6
 assert page.locator('[data-friend=bunny]').is_disabled();assert page.locator('[data-friend=bunny] img').get_attribute('src').split('?')[0].endswith('/assets/plush/bunny.png')
 assert '0 of 5 friends invited'in page.locator('.shelf-panel summary').inner_text()
 page.get_by_role('button',name='Meet your new friends',exact=False).click();assert page.locator('.tale-index>button').count()==5
 for index,(style,title,phases)in enumerate(TALES):
  print('BEGIN '+style,flush=True);page.get_by_role('button',name='Begin '+title,exact=True).click();page.wait_for_function("style=>document.querySelector('.tale-preview canvas')?.dataset.plush===style",arg=style,timeout=60000)
  if index==0:
   page.locator('.friend-tales-dialog').screenshot(path='/tmp/nancy-friend-story-scene.png')
   canvas=page.locator('.tale-preview canvas');r=canvas.bounding_box();canvas.click(position={'x':r['width']*.31,'y':r['height']*.76});page.wait_for_function("JSON.parse(localStorage.getItem('kitty-nancy-cozy-v1')).tales.cloud.found.includes('ribbon-left')",timeout=15000);page.get_by_role('button',name='Save & pause',exact=True).click();page.reload();ready();stories();page.get_by_role('button',name='Continue '+title,exact=True).click();assert page.locator('[data-tale-action="ribbon-left"]').is_disabled();assert save()['room']['owned']==[0]
  for phase,actions in enumerate(phases):
   if phase==1:
    before=save()['cozy']['tales'][style];page.locator('[data-tale-action="'+actions[-1]+'"]').click();assert save()['cozy']['tales'][style]==before
   for action in actions:
    button=page.locator('[data-tale-action="'+action+'"]')
    if button.is_enabled():button.click()
  assert save()['cozy']['tales'][style]['step']==3
  page.locator('.tale-ending').screenshot(path='/tmp/nancy-friend-story-'+style+'.png')
  page.get_by_role('button',name='Invite ',exact=False).click()
  page.keyboard.press('Escape');page.keyboard.press('Escape');ready()
  assert save()['cozy']['tales'][style]['complete'];assert index+1 in save()['room']['owned'];assert len(save()['room']['owned'])==index+2
  if index<4:stories()
  print('PASS '+title+' saves, accepts gentle activities and invites its matching friend',flush=True)
 page.wait_for_function("document.querySelector('#stage canvas')?.dataset.shelfFriends?.split(',').length===6",timeout=30000)
 page.screenshot(path='/tmp/nancy-new-friend-shelf.png',full_page=True)
 for style,_,_ in TALES:
  page.locator('[data-friend='+style+']').click();page.wait_for_function("s=>document.querySelector('#stage canvas').dataset.plush===s",arg=style,timeout=60000);assert save()['equipment']['plush']==style
 page.locator('[data-friend=classic]').click();page.wait_for_function("document.querySelector('#stage canvas').dataset.plush==='classic'",timeout=60000)
 page.get_by_role('button',name='Play a mission',exact=False).click();page.get_by_role('button',name='Your storybook',exact=False).click();assert page.locator('[aria-label^="Read "]').count()>=5
 page.get_by_role('button',name='Read An invitation from the moon',exact=True).click();assert 'saved her a seat'in page.locator('.memory-spread').inner_text();page.get_by_role('button',name='Read the full story',exact=False).click();assert page.locator('.tale-reading').is_visible();assert len(save()['room']['owned'])==6
 page.get_by_role('button',name='Back to Kitty',exact=True).click();page.reload();ready();assert sum(t['complete']for t in save()['cozy']['tales'].values())==5
 print('PASS all six real shelf miniatures, all five friend selections, storybook/full reading and reload preserve invitations',flush=True)
 context=b.new_context(viewport={'width':320,'height':568},is_mobile=True,has_touch=True,reduced_motion='reduce');phone=context.new_page();phone.on('pageerror',lambda e:errors.append(str(e)));phone.add_init_script("if(!localStorage.getItem('kitty-room-3d-v1')){localStorage.setItem('kitty-room-3d-v1',JSON.stringify({owned:[0,2,5],slots:[5,0,2],selected:0}));localStorage.setItem('kitty-nancy-equipment-v1',JSON.stringify({outfit:'sailor',item:'teddy'}));}");phone.goto(BASE+'/');phone.wait_for_function("!document.querySelector('#openWardrobe').disabled",timeout=60000)
 phone.locator('.shelf-panel summary').tap();assert '2 of 5 friends invited' in phone.locator('.shelf-panel summary').inner_text();assert phone.locator('[data-friend=bunny]').is_enabled();assert phone.locator('[data-friend=witch]').is_enabled();assert phone.locator('[data-friend=cloud]').is_disabled();phone.get_by_role('button',name='Meet your new friends',exact=False).tap();phone.get_by_role('button',name='Begin The sleepiest little cloud',exact=True).tap();phone.wait_for_function("document.querySelector('.tale-preview canvas')?.dataset.plush==='baby'",timeout=60000)
 phone.locator('[data-tale-action="soft-star-1"]').tap();assert phone.evaluate('document.documentElement.scrollWidth<=innerWidth');phone.screenshot(path='/tmp/nancy-friend-story-phone.png',full_page=True);phone.get_by_role('button',name='Save & pause',exact=True).tap();assert not errors,errors
 print('PASS 320px touch story, reachable pause, no horizontal overflow and zero page errors; physical Safari unverified',flush=True);b.close()
