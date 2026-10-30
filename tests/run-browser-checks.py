"""Start an isolated production preview and gate releases on real browser journeys."""
import json, os, shutil, signal, subprocess, sys, time
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

SUITES = [
    'controls-browser.py', 'movement-browser.py', 'journey-browser.py',
    'presentation-browser.py', 'device-browser.py', 'release-browser.py',
    'chapter-browser.py', 'play-polish-browser.py', 'navigation-browser.py',
    'react-browser.py',
]
ROOT=Path(__file__).resolve().parent.parent
os.chdir(ROOT)
if not (ROOT/'build/adventure.html').is_file():
    raise SystemExit('Run npm run build before browser checks.')
results=ROOT/'test-results';results.mkdir(exist_ok=True)
port=int(os.environ.get('KITTY_TEST_PORT','8066'))
env=os.environ.copy();env['KITTY_BASE_URL']=f'http://127.0.0.1:{port}'
if not env.get('CHROMIUM_PATH'):
    installed=shutil.which('chromium') or shutil.which('chromium-browser')
    if installed:env['CHROMIUM_PATH']=installed
    else:
        with sync_playwright() as p:env['CHROMIUM_PATH']=p.chromium.executable_path
if not Path(env['CHROMIUM_PATH']).is_file():
    raise SystemExit('Install Chromium with: python -m playwright install --with-deps chromium')
report=[];run_started=time.time()
with (results/'preview.log').open('w') as log:
    server=subprocess.Popen(['npm','run','preview','--','--port',str(port),'--strictPort'],stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
    try:
        deadline=time.monotonic()+30
        while True:
            if server.poll() is not None:raise RuntimeError('Preview could not start; see test-results/preview.log')
            try:
                with urlopen(env['KITTY_BASE_URL']+'/adventure.html',timeout=1) as response:
                    if response.status==200:break
            except OSError:pass
            if time.monotonic()>deadline:raise RuntimeError('Preview startup timed out')
            time.sleep(.2)
        for suite in SUITES:
            print('\nChecking '+suite,flush=True);started=time.monotonic()
            result=subprocess.run([sys.executable,str(ROOT/'tests'/suite)],env=env)
            report.append({'suite':suite,'passed':result.returncode==0,'seconds':round(time.monotonic()-started,2)})
            (results/'browser-summary.json').write_text(json.dumps(report,indent=2))
            if result.returncode:raise SystemExit(result.returncode)
        print('\nPASS all release browser journeys',flush=True)
    finally:
        try:os.killpg(server.pid,signal.SIGTERM)
        except ProcessLookupError:pass
        server.wait(timeout=10)
        screenshots=results/'screenshots';screenshots.mkdir(exist_ok=True)
        for pattern in ['nancy-*.png','kitty-*.png','react-*.png','For-Nancy-Hello-Kitty.png']:
            for path in Path('/tmp').glob(pattern):
                if path.stat().st_mtime>=run_started:shutil.copy2(path,screenshots/path.name)
