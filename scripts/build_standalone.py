"""Package the tested game as a click-to-open, offline HTML file.
First bundle JS: npm exec --yes --package=esbuild@0.28.2 -- esbuild dist/app.js --bundle --format=esm --target=es2022 --minify --outfile=/tmp/kitty-standalone.js
Then: python scripts/build_standalone.py /tmp/kitty-standalone.js /path/to/HelloKitty-Play.html
"""
from pathlib import Path
import base64
import json
import sys
root=Path(__file__).resolve().parents[1]
bundle=Path(sys.argv[1]).read_text().replace('</script','<\\/script')
model='data:model/gltf-binary;base64,'+base64.b64encode((root/'dist/assets/hello-kitty.glb').read_bytes()).decode()
html=(root/'dist/index.html').read_text()
html=html.replace('<link rel="stylesheet" href="./simple.css">','<style>'+(root/'dist/simple.css').read_text()+'</style>')
a=html.index('<script type="importmap">');b=html.index('</script>',a)+len('</script>')
html=html[:a]+html[b:]
html=html.replace('<script type="module" src="./app.js"></script>', '<script>globalThis.KITTY_MODEL_URL='+json.dumps(model)+'</script><script type="module">'+bundle+'</script>')
html=html.replace('href="./" aria-label="Hello Kitty home"','href="#" aria-label="Hello Kitty home"')
html=html.replace('href="./adventure.html"','href="https://hmlim123.github.io/hellokittygame/adventure.html"').replace('Moonflower Adventure</strong>','Moonflower Adventure · online</strong>')
html=html.replace('Your friends save here automatically.','Your friends save in this browser when file storage is available.')
Path(sys.argv[2]).write_text(html)
print('Standalone game written:',sys.argv[2],Path(sys.argv[2]).stat().st_size,'bytes')
