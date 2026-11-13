"""Download redistributable assets from their original providers."""
import json, pathlib, urllib.request, concurrent.futures
ROOT=pathlib.Path(__file__).resolve().parents[1]
ASSETS=ROOT/'native'/'assets'
HEADERS={'User-Agent':'ImmortalsGame/3.0 open-source game asset preparation'}
def fetch(url,path):
    path=pathlib.Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists() and path.stat().st_size>0:return
    with urllib.request.urlopen(urllib.request.Request(url,headers=HEADERS),timeout=120) as r, path.open('wb') as f:
        while chunk:=r.read(1024*1024):f.write(chunk)
    print(path.relative_to(ROOT),path.stat().st_size,flush=True)
def api(asset):
    with urllib.request.urlopen(urllib.request.Request('https://api.polyhaven.com/files/'+asset,headers=HEADERS)) as r:return json.load(r)
def terrain():
    data=api('forest_ground_04')
    for key,name in [('Diffuse','ground_color.jpg'),('nor_gl','ground_normal.jpg'),('Rough','ground_rough.jpg')]:fetch(data[key]['2k']['jpg']['url'],ASSETS/'terrain'/name)
def model(asset):
    data=api(asset)['gltf']['1k']['gltf'];dest=ASSETS/'environment'/asset
    fetch(data['url'],dest/(asset+'.gltf'))
    for name,entry in data['include'].items():fetch(entry['url'],dest/name)
def audio():
    # CC0 Kenney Impact Sounds, mirrored as individual files. Original license/source
    # is recorded in native/assets/ATTRIBUTION.md. No paid account is needed.
    base='https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/main/assets/kenney/impact-sounds/Audio/'
    for category in ['footstep_grass','footstep_concrete','impactPunch_heavy','impactMetal_heavy','impactBell_heavy']:
        for i in range(5):
            name=f'{category}_{i:03d}.ogg'
            fetch(base+name,ASSETS/'audio'/name)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    tasks=[pool.submit(terrain),pool.submit(model,'boulder_01'),pool.submit(model,'dead_tree_trunk'),pool.submit(audio)]
    for task in tasks:task.result()
