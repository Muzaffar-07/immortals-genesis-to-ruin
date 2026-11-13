"""Bake Tripo's +X-facing geometry into Meshy's required +Z facing direction.

Source textures and UVs are unchanged. Requires numpy. With --upload, read the
temporary Higgsfield upload manifest and upload the corrected GLBs in this run.
"""
import json, pathlib, struct, sys, subprocess
import numpy as np

root = pathlib.Path(__file__).resolve().parent / 'downloads'
for character in ['ena', 'aro']:
    raw = (root / f'{character}_raw.glb').read_bytes()
    json_size = struct.unpack_from('<I', raw, 12)[0]
    gltf = json.loads(raw[20:20+json_size])
    binary = bytearray(raw[28+json_size:])
    visited = set()
    for mesh in gltf['meshes']:
        for primitive in mesh['primitives']:
            for attribute in ['POSITION', 'NORMAL', 'TANGENT']:
                if attribute not in primitive['attributes']:
                    continue
                index = primitive['attributes'][attribute]
                if index in visited:
                    continue
                visited.add(index)
                accessor = gltf['accessors'][index]
                view = gltf['bufferViews'][accessor['bufferView']]
                assert accessor['componentType'] == 5126
                width = 4 if attribute == 'TANGENT' else 3
                array = np.ndarray((accessor['count'], width), dtype='<f4', buffer=binary,
                    offset=view.get('byteOffset', 0)+accessor.get('byteOffset', 0),
                    strides=(view.get('byteStride', width*4), 4))
                original = array.copy()
                array[:, 0] = -original[:, 2]
                array[:, 2] = original[:, 0]
                if attribute == 'POSITION':
                    accessor['min'] = array.min(axis=0).tolist()
                    accessor['max'] = array.max(axis=0).tolist()
    encoded = json.dumps(gltf, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    binary += b'\0' * (-len(binary) % 4)
    data = (struct.pack('<4sII', b'glTF', 2, 28+len(encoded)+len(binary))
            + struct.pack('<I4s', len(encoded), b'JSON') + encoded
            + struct.pack('<I4s', len(binary), b'BIN\0') + binary)
    destination = root / f'{character}-forward.glb'
    destination.write_bytes(data)
    print(destination.name, len(data), flush=True)
    if '--upload' in sys.argv:
        uploads = json.loads((root / 'rig-uploads.json').read_text())['uploads']
        upload = uploads[0 if character == 'ena' else 1]
        result = subprocess.run(['curl', '-sS', '--fail', '-X', 'PUT',
            '-H', 'Content-Type: '+upload['content_type'], '--data-binary', '@'+str(destination),
            upload['upload_url'], '-o', str(root/'upload-response.txt'), '-w', '%{http_code}'],
            capture_output=True, text=True)
        if result.returncode or result.stdout != '200':
            raise SystemExit('Upload failed; HTTP status '+result.stdout)
        print(character, 'upload HTTP 200', flush=True)
