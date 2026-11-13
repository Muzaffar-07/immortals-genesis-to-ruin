"""Copy only the official Godot TPS environment's dependency closure.

Run after cloning godotengine/tps-demo to tools/downloads/tps-demo.
Code MIT; assets and music CC BY 3.0. Preserve the bundled license.
"""
from pathlib import Path
import re, shutil, subprocess

root = Path(__file__).resolve().parents[1]
source = root/'tools/downloads/tps-demo'
destination = root/'native/third_party/tps'
prefix = 'res://third_party/tps/'
queue = [f'level/geometry/scenes/{name}.tscn' for name in ['structure','props','core','lights']]
queue += ['level/geometry/environment.tres','level/geometry/giprobe_data.res','level/level_music.ogg','default_bus_layout.tres']
copied = set()
text_types = {'.tscn','.tres','.gdshader','.gd','.import','.glsl'}
while queue:
    name = queue.pop()
    if name in copied or name.startswith('.godot/'): continue
    path = source/name
    if not path.is_file(): raise FileNotFoundError(name)
    copied.add(name)
    target = destination/name
    target.parent.mkdir(parents=True,exist_ok=True)
    if path.suffix in text_types:
        text = path.read_text(encoding='utf-8')
        queue.extend(re.findall(r'res://([^"\s]+)',text))
        target.write_text(text.replace('res://',prefix),encoding='utf-8')
    else: shutil.copy2(path,target)
    if (source/(name+'.import')).exists(): queue.append(name+'.import')
shutil.copy2(source/'LICENSE.md',root/'native/licenses/GODOT-TPS-LICENSE.md')
# One binary mesh references this embedded material at its original resource path.
# Preserve that alias; binary resources cannot be safely rewritten as text.
alias = root/'native/level/textures/structure/Core/Material_001.material'
alias.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(source/'level/textures/structure/Core/Material_001.material', alias)
commit = subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
(destination/'SOURCE.txt').write_text('https://github.com/godotengine/tps-demo\nCommit: '+commit+'\nPaths rebased to res://third_party/tps/. See licenses/GODOT-TPS-LICENSE.md.\n')
print('Environment dependencies:',len(copied),'files,',round(sum((destination/p).stat().st_size for p in copied)/1e6),'MB; commit',commit)
