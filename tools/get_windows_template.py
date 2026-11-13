"""Read only the Windows release template from Godot's official ranged ZIP."""
import io,urllib.request,zipfile,pathlib
URL='https://godot-releases.nbg1.your-objectstorage.com/4.7.2-stable/Godot_v4.7.2-stable_export_templates.tpz'
class Remote(io.RawIOBase):
    def __init__(self):
        self.size=int(urllib.request.urlopen(urllib.request.Request(URL,method='HEAD')).headers['Content-Length']);self.pos=0
    def readable(self):return True
    def seekable(self):return True
    def tell(self):return self.pos
    def seek(self,n,whence=0):
        self.pos=n if whence==0 else self.pos+n if whence==1 else self.size+n
        return self.pos
    def read(self,n=-1):
        if n<0:n=self.size-self.pos
        if n==0:return b''
        req=urllib.request.Request(URL,headers={'Range':f'bytes={self.pos}-{min(self.size-1,self.pos+n-1)}'})
        with urllib.request.urlopen(req,timeout=180) as r:
            if r.status!=206:raise RuntimeError('Server ignored range')
            data=r.read()
        self.pos+=len(data);return data
root=pathlib.Path(__file__).resolve().parents[1]
with zipfile.ZipFile(Remote()) as z:
    for name in z.namelist():
        if name.endswith('windows_release_x86_64.exe'):
            data=z.read(name);out=root/'tools/bin/windows_release_x86_64.exe';out.write_bytes(data);print(out,len(data))
