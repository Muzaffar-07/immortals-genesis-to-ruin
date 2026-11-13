import * as T from './vendor/three.module.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { clone } from './vendor/utils/SkeletonUtils.js';

// Gameplay stays in game.js; this renderer maps its world coordinates to X/Z.
export class World3D {
  constructor(game, host) {
    this.game = game;
    this.renderer = new T.WebGLRenderer({antialias:true, alpha:false, powerPreference:'high-performance'});
    this.renderer.setSize(1920,1080,false);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.className = 'world3d';
    this.renderer.domElement.setAttribute('aria-hidden','true');
    host.prepend(this.renderer.domElement);
    this.camera = new T.PerspectiveCamera(48,16/9,2,5500);
    this.ray = new T.Raycaster();
    this.plane = new T.Plane(new T.Vector3(0,1,0),-26);
    this.pointer = new T.Vector2(0,0);
    this.hit = new T.Vector3();
    this.objects = new Map(); this.corpses = []; this.resources = [];
    const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
    const gc=glowCanvas.getContext('2d'),gradient=gc.createRadialGradient(64,64,0,64,64,64);
    gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.12,'#ffffffbb');gradient.addColorStop(.4,'#ffffff22');gradient.addColorStop(1,'#ffffff00');gc.fillStyle=gradient;gc.fillRect(0,0,128,128);this.glowTexture=new T.CanvasTexture(glowCanvas);
    this.box = new T.BoxGeometry(1,1,1);
    this.sphere = new T.SphereGeometry(1,12,8);
    this.rock = new T.IcosahedronGeometry(1,1);
    this.cylinder = new T.CylinderGeometry(1,1,1,8);
    this.cone = new T.ConeGeometry(1,1,8);
    this.geometries = [this.box,this.sphere,this.rock,this.cylinder,this.cone];
    this.branchGeo = new T.CylinderGeometry(.3,1,1,7);this.geometries.push(this.branchGeo);
    this.rigPromise=new GLTFLoader().loadAsync('./assets/immortal-rig.glb').then(asset=>{this.rig=asset;document.documentElement.dataset.rigReady='true';}).catch(error=>console.warn('Using procedural character fallback',error));
    game.cv.addEventListener('pointermove',e=>{
      const r = game.cv.getBoundingClientRect();
      this.pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);
    });
  }
  material(color,metalness=0,emissive=0) {
    const m = new T.MeshStandardMaterial({color,roughness:metalness ? .42 : .89,metalness,emissive:color,emissiveIntensity:emissive});
    this.resources.push(m);return m;
  }
  mesh(parent,geo,mat,x,y,z,sx,sy,sz) {
    const m = new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  glow(parent,color,size,y,opacity=.55){const material=new T.SpriteMaterial({map:this.glowTexture,color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false});this.resources.push(material);const sprite=new T.Sprite(material);sprite.position.y=y;sprite.scale.set(size,size,1);parent.add(sprite);return sprite;}
  quality(full){this.renderer.setSize(full?1920:1280,full?1080:720,false);this.renderer.shadowMap.enabled=full;document.querySelector('#render-status').textContent=full?'3D · 1920 × 1080':'3D · 1280 × 720';}
  groundTexture(seed,index) {
    const cv = document.createElement('canvas');cv.width=cv.height=1024;
    const c=cv.getContext('2d'),r=this.game.rng(seed),img=c.createImageData(1024,1024);
    const palettes=[[40,47,39],[94,104,111],[53,48,38],[35,42,43],[38,27,25],[32,29,41]];
    const base=palettes[index];
    for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
      const n=r()*22+Math.sin(x*.017+Math.sin(y*.019)*2)*8+Math.sin(y*.045+x*.02)*4;
      const p=(y*1024+x)*4;for(let k=0;k<3;k++)img.data[p+k]=base[k]+n;img.data[p+3]=255;
    }
    c.putImageData(img,0,0);
    for(let i=0;i<16000;i++){c.fillStyle=r()<.5?'#ffffff0b':'#00000035';c.fillRect(r()*1024,r()*1024,1+r()*5,1+r()*3);}
    c.strokeStyle='#090b0b66';c.lineWidth=2;
    for(let i=0;i<100;i++){let x=r()*1024,y=r()*1024;c.beginPath();c.moveTo(x,y);for(let j=0;j<6;j++){x+=(r()-.5)*65;y+=r()*28;c.lineTo(x,y);}c.stroke();}
    const tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(7,7);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;this.resources.push(tex);return tex;
  }
  build(G) {
    this.resources.forEach(r=>r.dispose());this.resources=[];this.objects.clear();this.corpses=[];
    this.scene=new T.Scene();this.G=G;
    const sky=[0x101d20,0x17212c,0x272726,0x101b23,0x301811,0x181224][G.i];
    this.scene.background=new T.Color(sky);this.scene.fog=new T.FogExp2(sky,.00105);
    this.scene.add(new T.HemisphereLight(0xa5c5dd,0x18221c,1.8));
    this.moon=new T.DirectionalLight(G.i===4?0xffa779:0xc1d5ef,3.4);
    this.moon.castShadow=true;this.moon.shadow.mapSize.set(2048,2048);
    Object.assign(this.moon.shadow.camera,{left:-800,right:800,top:800,bottom:-800,near:10,far:2400});
    this.moon.shadow.bias=-.0004;this.moon.shadow.normalBias=2;this.scene.add(this.moon,this.moon.target);
    this.lamp=new T.PointLight(0xffbd70,20000,330,2);this.scene.add(this.lamp);
    this.blue=new T.PointLight(0x78aaff,14000,280,2);this.scene.add(this.blue);
    this.flashlight=new T.SpotLight(0xe0e9df,180000,800,.48,.7,1.7);this.scene.add(this.flashlight,this.flashlight.target);
    this.stone=this.material(0x454b4a);this.dark=this.material(0x161a1e,.25);
    this.wood=this.material(0x302922);this.metal=this.material(0x545d60,.72);
    this.bone=this.material(0x9c9482);this.red=this.material(0x500b0c,.1);
    this.gold=this.material(0xe6a65b,.5,1.5);this.cold=this.material(0x8bd1f2,.45,1.7);
    this.ember=this.material(0xff5920,.2,2.5);
    const ground=this.material(G.i===1?0xb8c4c9:0xa1a69b);
    ground.map=this.groundTexture(92+G.i,G.i);ground.bumpMap=ground.map;ground.bumpScale=3;ground.roughness=.72;
    this.mesh(this.scene,this.box,ground,G.w/2,-6,G.h/2,G.w+1400,10,G.h+1400);
    const rn=this.game.rng(592+G.i);
    // Dense instanced debris adds surface detail without hundreds of draw calls.
    const debris=new T.InstancedMesh(this.rock,this.stone,650),matrix=new T.Object3D();
    for(let i=0;i<650;i++){matrix.position.set(rn()*G.w,1,rn()*G.h);matrix.rotation.set(rn(),rn()*6,rn());const s=1+rn()*5;matrix.scale.set(s,s*.45,s);matrix.updateMatrix();debris.setMatrixAt(i,matrix.matrix);}
    debris.receiveShadow=true;this.scene.add(debris);
    G.props.forEach(p=>this.prop(p,G));
    for(const lava of G.lava||[]){
      const geo=new T.CircleGeometry(lava.r,40);this.resources.push(geo);
      const pool=this.mesh(this.scene,geo,this.ember,lava.x,.5,lava.y,1,1,1);pool.rotation.x=-Math.PI/2;
    }
    // Distant silhouettes frame each arena without changing collision boundaries.
    for(let i=0;i<48;i++){
      const x=i%2?rn()*G.w:(i%4?G.w+130:-130),z=i%2?(i%4?G.h+150:-150):rn()*G.h;
      const m=this.mesh(this.scene,this.rock,this.stone,x,65+rn()*90,z,90+rn()*180,120+rn()*220,100+rn()*120);m.rotation.y=rn()*6;
    }
    this.weatherGeo=new T.BufferGeometry();this.resources.push(this.weatherGeo);
    const xyz=new Float32Array(1800);for(let i=0;i<xyz.length;i+=3){xyz[i]=rn()*G.w;xyz[i+1]=rn()*450;xyz[i+2]=rn()*G.h;}
    this.weatherGeo.setAttribute('position',new T.BufferAttribute(xyz,3));
    const wm=new T.PointsMaterial({color:G.i===4?0xff9a54:0xbbccdc,size:G.i===1?2.2:1.3,transparent:true,opacity:.5,depthWrite:false});this.resources.push(wm);
    this.scene.add(new T.Points(this.weatherGeo,wm));
    this.particleGeo=new T.BufferGeometry();this.resources.push(this.particleGeo);
    this.particleGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(4200),3));
    this.particleGeo.setAttribute('color',new T.BufferAttribute(new Float32Array(4200),3));
    const pm=new T.PointsMaterial({size:4,vertexColors:true,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false});this.resources.push(pm);this.scene.add(new T.Points(this.particleGeo,pm));
    this.camera.position.set(G.H[0].x,430,G.H[0].y+400);
  }
  prop(p,G) {
    const group=new T.Group();group.position.set(p.x,0,p.y);this.scene.add(group);
    const s=p.s||1;group.scale.setScalar(s);
    if(['tree','dead','pine'].includes(p.type)){
      const r=this.game.rng(Math.floor(p.x*37+p.y)),segments=[];
      const branch=(start,direction,length,width,depth)=>{
        const end=start.clone().addScaledVector(direction,length);segments.push({start,end,width});
        if(depth>0)for(let j=0;j<3;j++){
          const a=r()*Math.PI*2,dir=new T.Vector3(Math.cos(a)*(.35+r()*.6),.35+r()*.65,Math.sin(a)*(.35+r()*.6)).normalize();
          branch(start.clone().lerp(end,.6+r()*.4),dir,length*(.46+r()*.26),width*.44,depth-1);
        }
      };
      branch(new T.Vector3(),new T.Vector3((r()-.5)*.18,1,(r()-.5)*.18).normalize(),125+r()*60,9+r()*5,3);
      const branches=new T.InstancedMesh(this.branchGeo,this.wood,segments.length),obj=new T.Object3D();
      segments.forEach((b,i)=>{const d=b.end.clone().sub(b.start);obj.position.copy(b.start).addScaledVector(d,.5);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize());obj.scale.set(b.width,d.length(),b.width);obj.updateMatrix();branches.setMatrixAt(i,obj.matrix);});
      branches.castShadow=true;branches.receiveShadow=true;group.add(branches);
      if(p.type==='pine'){for(let i=0;i<4;i++)this.mesh(group,this.cone,this.material(0x1e302a),0,90+i*24,0,60-i*11,80,60-i*11);}
    }else if(p.type==='home'){
      this.mesh(group,this.box,this.stone,0,34,0,88,68,75);
      const roof=this.mesh(group,this.cone,this.dark,0,92,0,75,60,65);roof.rotation.y=Math.PI/4;
      this.mesh(group,this.box,this.dark,0,20,39,18,40,2);
      for(const x of [-26,26])this.mesh(group,this.box,this.gold,x,40,39,12,17,2);
      this.mesh(group,this.box,this.stone,28,102,5,13,65,15);
    }else if(['truck','crate','pod'].includes(p.type)){
      const truck=p.type==='truck',pod=p.type==='pod';
      this.mesh(group,pod?this.sphere:this.box,this.metal,0,25,0,truck?90:pod?55:32,pod?24:40,truck?42:pod?78:32);
      if(truck){for(const x of [-32,32])for(const z of [-23,23])this.mesh(group,this.sphere,this.dark,x,8,z,12,12,7);this.mesh(group,this.box,this.dark,24,40,0,23,15,44);}
      if(pod)this.mesh(group,this.sphere,this.cold,0,34,8,28,5,42);
    }else if(p.type==='lamp'){
      this.mesh(group,this.cylinder,this.metal,0,66,0,3,132,3);this.mesh(group,this.box,this.cold,0,132,0,22,5,12);
    }else{
      const crystal=['crystal','shard','spire'].includes(p.type);
      const m=this.mesh(group,crystal?this.cone:this.rock,crystal?(G.i===4?this.ember:this.cold):this.stone,0,crystal?38:14,0,crystal?16:28,crystal?90:22,crystal?16:25);m.rotation.set(.1,p.x,.12);
    }
  }
  actor(entity,hero=false) {
    const g=new T.Group(),type=entity.type;
    const monster=!hero&&!['soldier','raider','archer','tank','engine','drone','pylon'].includes(type);
    const trim=hero?(entity.kind?this.cold:this.gold):monster?this.ember:this.metal;
    const skin=monster?this.material(0x676359):this.bone;
    const body=hero?this.material(entity.kind?0x637f9a:0x8c7755,.35,.08):monster?this.material(0x282829):this.dark;
    if(this.rig && !['tank','engine','drone','pylon','boss'].includes(type)){
      const figure=clone(this.rig.scene);
      const mixer=new T.AnimationMixer(figure);if(this.rig.animations[0])mixer.clipAction(this.rig.animations[0]).play();mixer.update(.01);
      figure.updateMatrixWorld(true);figure.traverse(object=>{if(object.isSkinnedMesh)object.skeleton.update();});
      const bounds=new T.Box3().setFromObject(figure,true),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=62/size.y;
      // Normalize on a wrapper so animation tracks cannot overwrite the scale.
      const rigRoot=new T.Group();rigRoot.scale.setScalar(scale);rigRoot.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);rigRoot.add(figure);
      figure.traverse(object=>{if(object.isMesh){object.material=hero?body:monster?skin:body;object.castShadow=true;object.receiveShadow=true;}});
      g.add(rigRoot);
      g.userData.mixer=mixer;g.userData.previous=new T.Vector2(entity.x,entity.y);g.userData.rig=true;
      if(hero){
        const blade=this.mesh(g,this.box,trim,16,24,12,2,2,42);blade.rotation.x=-.4;
        for(const x of [-8,8])this.mesh(g,this.sphere,trim,x,40,-4,2,2,2);
        this.glow(g,entity.kind?0x76bbff:0xffb767,65,32,.24);
      }else if(monster){g.scale.set(1,1.25,1);if(type==='brute')g.scale.setScalar(1.8);}
      this.scene.add(g);return g;
    }
    if(['tank','engine','drone','pylon'].includes(type)){
      this.mesh(g,this.box,body,0,18,0,55,28,65);
      this.mesh(g,this.cylinder,trim,0,35,0,16,type==='pylon'?110:15,16);
      if(type!=='pylon'){const barrel=this.mesh(g,this.cylinder,this.metal,25,33,0,4,60,4);barrel.rotation.z=Math.PI/2;}
    }else{
      this.mesh(g,this.sphere,body,0,31,0,12,17,8);
      this.mesh(g,this.sphere,skin,0,54,0,6.7,9,6.5);
      if(hero){this.mesh(g,this.sphere,this.metal,0,56,-1,7.2,7.5,6.5);this.mesh(g,this.box,trim,0,54,6,9,1,2);}
      else{for(const x of [-3,3])this.mesh(g,this.sphere,this.ember,x,55,6,1.1,1.1,1.1);}
      g.userData.legs=[];g.userData.arms=[];
      for(const side of [-1,1]){
        const leg=new T.Group();leg.position.set(side*6,22,0);g.add(leg);
        this.mesh(leg,this.cylinder,body,0,-9,0,4,19,4);this.mesh(leg,this.box,this.dark,0,-20,2,8,7,13);g.userData.legs.push(leg);
        const arm=new T.Group();arm.position.set(side*15,43,0);g.add(arm);
        this.mesh(arm,this.sphere,body,0,0,0,7,7,7);this.mesh(arm,this.cylinder,skin,0,-13,0,3,23,3);g.userData.arms.push(arm);
      }
      if(hero){
        const cape=this.mesh(g,this.box,this.material(entity.kind?0x203746:0x432326),0,29,-9,25,35,2);cape.rotation.x=-.16;
        const sword=this.mesh(g.userData.arms[1],this.box,trim,0,-21,14,3,3,hero&&entity.kind?52:42);sword.rotation.x=-.6;
      }else if(monster){
        for(const side of [-1,1]){const horn=this.mesh(g,this.cone,this.bone,side*6,64,0,3,19,3);horn.rotation.z=-side*.35;}
        g.scale.setScalar(type==='boss'?4:type==='brute'?1.7:1.1);
      }
    }
    this.scene.add(g);return g;
  }
  sync(entity,kind) {
    let mesh=this.objects.get(entity);
    if(!mesh){
      if(kind==='hero'||kind==='enemy')mesh=this.actor(entity,kind==='hero');
      else{
        mesh=new T.Group();this.scene.add(mesh);
        const mat=kind==='shot'?(entity.foe?this.ember:this.cold):kind==='zone'?this.ember:kind==='core'?this.gold:this.cold;
        if(kind==='zone'||kind==='interact'){
          const geo=new T.TorusGeometry(entity.r||45,2,6,40);this.resources.push(geo);const ring=this.mesh(mesh,geo,mat,0,2,0,1,1,1);ring.rotation.x=Math.PI/2;
          if(kind==='interact'){const portal=this.mesh(mesh,geo,this.gold,0,55,0,.6,.6,.6);portal.rotation.y=.2;}
        }else {
          this.mesh(mesh,kind==='core'?this.cone:this.sphere,mat,0,kind==='core'?30:18,0,kind==='core'?25:kind==='shot'?4:7,kind==='core'?75:kind==='shot'?4:12,kind==='core'?25:kind==='shot'?4:7);
          if(kind!=='shot')this.glow(mesh,kind==='core'?0xff8c31:0x74b5e5,kind==='core'?150:70,22);
        }
      }
      this.objects.set(entity,mesh);
    }
    mesh.position.set(entity.x,0,entity.y);
    if(kind==='hero'||kind==='enemy'){
      mesh.rotation.y=-entity.face+Math.PI/2;mesh.visible=!(entity.down>0||entity.dead);
      if(mesh.userData.mixer){const previous=mesh.userData.previous,dist=Math.hypot(entity.x-previous.x,entity.y-previous.y);mesh.userData.mixer.update(this.game.mode==='play'?Math.min(.05,this.game.dt)*(dist>.1?1.3:.08):0);previous.set(entity.x,entity.y);}
      const w=entity.walk||0;
      mesh.userData.legs?.forEach((leg,i)=>{leg.rotation.x=Math.sin(w+i*Math.PI)*.45;});
      mesh.userData.arms?.forEach((arm,i)=>{arm.rotation.x=entity.swing?-entity.swing*2:Math.sin(w+i*Math.PI)*.3;});
      if(entity.type==='drone')mesh.position.y=45+Math.sin(this.game.time*4)*6;
    }else if(kind==='pickup'){mesh.visible=!entity.got;mesh.position.y=Math.sin(this.game.time*2+entity.x)*5;mesh.rotation.y=this.game.time;}
    else if(kind==='interact')mesh.visible=entity.on&&!entity.done;
    else if(kind==='zone'){mesh.scale.setScalar(.7+.3*entity.t/entity.delay);}
    return mesh;
  }
  blood(e) {
    if(!this.scene||!this.game.opt('gore',true)||['tank','engine','drone','pylon'].includes(e.type))return;
    const geo=new T.CircleGeometry(1,14);this.resources.push(geo);
    const remains=new T.Group();remains.position.set(e.x,0,e.y);this.scene.add(remains);
    const stain=this.mesh(remains,geo,this.red,0,.2,0,20+e.r,20+e.r,1);stain.rotation.x=-Math.PI/2;
    for(let i=0;i<5;i++){const part=this.mesh(remains,this.rock,i%2?this.red:this.dark,(Math.random()-.5)*40,3,(Math.random()-.5)*40,3+Math.random()*6,3,4+Math.random()*9);part.rotation.y=Math.random()*6;}
    this.corpses.push(remains);
    if(this.corpses.length>60)this.scene.remove(this.corpses.shift());
  }
  aim() {
    if(!this.G)return;
    this.ray.setFromCamera(this.pointer,this.camera);
    if(this.ray.ray.intersectPlane(this.plane,this.hit)){
      this.game.mouse.x=this.hit.x-this.G.cam.x;
      this.game.mouse.y=this.hit.z-26-this.G.cam.y;
    }
  }
  render(dt) {
    const g=this.game,G=g.G;if(G!==this.G)this.build(G);
    const h=G.H[G.act],target=new T.Vector3(h.x,430,h.y+400);
    if(g.opt('screenShake',true)&&g.shake>0){target.x+=(Math.random()-.5)*g.shake;target.z+=(Math.random()-.5)*g.shake;}
    g.shake=Math.max(0,g.shake-dt*24);
    this.camera.position.lerp(target,1-Math.exp(-dt*5));this.camera.lookAt(h.x,15,h.y-55);
    this.moon.position.set(h.x-400,900,h.y-350);this.moon.target.position.set(h.x,0,h.y);
    this.lamp.position.set(G.H[0].x,65,G.H[0].y);this.blue.position.set(G.H[1].x,65,G.H[1].y);
    this.flashlight.position.set(h.x,55,h.y);this.flashlight.target.position.set(h.x+Math.cos(h.face)*350,0,h.y+Math.sin(h.face)*350);
    const live=new Set();
    const list=(items,kind)=>{for(const e of items){live.add(e);this.sync(e,kind);}};
    list(G.H,'hero');list(G.E,'enemy');list(G.K,'pickup');list(G.memories||[],'pickup');list(G.I,'interact');list(G.S,'shot');list(G.Z,'zone');if(G.core)list([G.core],'core');
    for(const [e,m]of this.objects)if(!live.has(e)){this.scene.remove(m);this.objects.delete(e);}
    const pos=this.particleGeo.attributes.position,col=this.particleGeo.attributes.color;
    const ps=g.P.filter(p=>p.kind!=='text'&&p.kind!=='smoke').slice(0,1400);
    ps.forEach((p,i)=>{pos.setXYZ(i,p.x,18+(p.kind==='spark'?8:0),p.y+20);const c=p.col.split(',').map(Number);col.setXYZ(i,c[0]/255,c[1]/255,c[2]/255);});
    pos.needsUpdate=col.needsUpdate=true;this.particleGeo.setDrawRange(0,ps.length);
    const wp=this.weatherGeo.attributes.position;
    for(let i=0;i<wp.count;i++){let y=wp.getY(i)-dt*(G.i===3?240:18);if(y<0)y=450;wp.setY(i,y);}wp.needsUpdate=true;
    this.renderer.toneMappingExposure=g.opt('bloom',true)?1.25:1;
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){this.resources.forEach(r=>r.dispose());this.geometries.forEach(g=>g.dispose());this.glowTexture.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
