import { World3D } from './world3d.js';

const lore = [
  ['THE WOODS REMEMBER', 'Something is following the light. Recover the six fragments before the shapes between the trees learn your names.', 'Listen for the pulse. The forest becomes hostile after the last fragment.'],
  ['DO NOT LET IT GO OUT', 'A century of darkness has left things under the snow. Find flint and wood, ignite the hearth, and hold the perimeter.', 'Stay close to the fire during the final assault. Your companion will guard your flank.'],
  ['THE BELLS OF THE DEAD', 'The settlement has fallen silent. Its dead return with the weapons of every age. Keep the Beacon standing.', 'Three assaults. The Beacon repairs between waves. Break ranged attackers first.'],
  ['NO WITNESSES', 'Emergency broadcasts call you a contamination event. Cut three containment pylons and escape before the perimeter closes.', 'Communion is suppressed until every pylon falls. Armor arrives after the second.'],
  ['SEVEN HEARTBEATS', 'The sky is burning. Seven living seeds are all that remains of a civilization. Carry them through the fracture.', 'Meteor impacts are marked on the ground. Dash out of the circles.'],
  ['THE THING AT THE END', 'The Maker is gone. Something wearing the silence of a god waits in its place. Wound it, then open the last door.', 'Watch for attack circles and spiraling projectiles. Save Communion for a crowded moment.']
];

class Soundscape {
  constructor(){this.enabled=true;this.lastBeat=0;}
  async unlock(){
    if(!this.enabled)return;
    if(!this.ctx){
      this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=.2;this.master.connect(this.ctx.destination);
      this.drone=this.ctx.createOscillator();this.drone.type='sine';this.drone.frequency.value=43;
      this.droneGain=this.ctx.createGain();this.droneGain.gain.value=.09;this.drone.connect(this.droneGain).connect(this.master);this.drone.start();
    }
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  tone(freq,duration=.15,volume=.15,type='sine',end=25){
    if(!this.ctx||!this.enabled||this.ctx.state!=='running')return;
    const t=this.ctx.currentTime,o=this.ctx.createOscillator(),v=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);
    v.gain.setValueAtTime(volume,t);v.gain.exponentialRampToValueAtTime(.001,t+duration);
    o.connect(v).connect(this.master);o.start(t);o.stop(t+duration);o.onended=()=>{o.disconnect();v.disconnect();};
  }
  tick(game,threat){
    if(!this.ctx)return;
    this.droneGain.gain.setTargetAtTime(game.mode==='play' && this.enabled ? .07+threat*.12 : 0,this.ctx.currentTime,.5);
    if(game.mode==='play'&&this.enabled&&game.time-this.lastBeat>1.5-threat*.8){this.lastBeat=game.time;this.tone(65,.16,.08+threat*.13);}
  }
}

export function enhance(game,root) {
  const audio=new Soundscape();
  game.CH.forEach((chapter,i)=>{chapter.brief=lore[i][1];chapter.lines=[lore[i][0],...chapter.lines,lore[i][2]];});
  const unlock=()=>audio.unlock().catch(()=>{});
  document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
  const host=game.cv.parentElement;
  let world;
  const notice=document.querySelector('#render-status');
  try { world=new World3D(game,host);notice.textContent='3D · 1920 × 1080'; }
  catch(error){notice.textContent='Compatibility graphics';console.warn('WebGL unavailable; using Canvas renderer.',error);}
  const quality=document.createElement('select');quality.id='quality';quality.setAttribute('aria-label','Graphics quality');quality.innerHTML='<option value="full">Full HD</option><option value="performance">Performance</option>';notice.after(quality);quality.onchange=()=>world?.quality(quality.value==='full');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){game.props.screenShake=false;document.querySelector('#shake').checked=false;}
  const ui=document.createElement('div');ui.className='cinema-ui';ui.innerHTML='<div class="lens"></div><div class="damage-edge"></div><div class="mission-stamp"><b>IMMORTALS</b><span>NIGHTFALL EDITION</span></div><div class="field-status"><span class="field-dot"></span><span class="threat-label">PERIMETER QUIET</span><span class="objective-bearing"></span></div><div class="chapter-arrival"></div>';
  host.append(ui);
  const journal=document.createElement('dialog');journal.className='journal';journal.innerHTML='<div class="journal-top"><span>FIELD JOURNAL / THE TWO</span><button aria-label="Close journal">ESC / CLOSE</button></div><div class="journal-body"></div>';
  document.body.append(journal);
  let journalPaused=false;
  function openJournal(){
    journalPaused=game.mode==='play';if(journalPaused)game.setPause(true);
    const ci=game.chapter||0,ch=game.CH[ci],entry=lore[ci];
    journal.querySelector('.journal-body').innerHTML='';
    const append=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;journal.querySelector('.journal-body').append(el);};
    append('small',`CASE 0${ci+1} / ${ch.place}`);append('h2',entry[0]);append('p',entry[1]);
    append('h3','MISSION OBJECTIVES');ch.goals.forEach((goal,i)=>append('p',`${String(i+1).padStart(2,'0')} — ${goal}`));
    append('h3','SURVIVAL INTELLIGENCE');append('p',entry[2]);append('p','Immortality has a cost. If both of you fall together, the cycle breaks.');
    append('h3','OPTIONAL / FORBIDDEN MEMORIES');append('p',`Recover three memory fragments by holding E beside them. Each restores 25 Communion. Recovered this attempt: ${game.G?.memories?.filter(m=>m.got).length||0} / 3.`);
    append('h3','CAMPAIGN RECORD');append('p',`${saved.completed.length} / 6 chapters completed. Chapter checkpoints are saved on this device.`);
    journal.showModal();
  }
  const close=()=>{journal.close();if(journalPaused)game.setPause(false);};
  journal.querySelector('button').onclick=close;
  journal.addEventListener('cancel',e=>{e.preventDefault();close();});
  document.querySelector('#journal').onclick=openJournal;
  const key=e=>{if(e.key.toLowerCase()==='m'&&!journal.open){e.preventDefault();openJournal();}};
  document.addEventListener('keydown',key);
  const progressKey='immortals-progress-v2';let saved={chapter:0,completed:[]};
  try{const v=JSON.parse(localStorage.getItem(progressKey));if(v&&Number.isInteger(v.chapter)&&v.chapter>=0&&v.chapter<6)saved={chapter:v.chapter,completed:Array.isArray(v.completed)?v.completed:[]};}catch{}
  const save=()=>{try{localStorage.setItem(progressKey,JSON.stringify(saved));}catch{}};
  const continueButton=document.querySelector('#continue');
  continueButton.textContent=`Continue · Chapter ${saved.chapter+1}`;
  continueButton.onclick=()=>{game.startChapter(saved.chapter);game.focus();};
  const originalStart=game.startMission.bind(game);
  game.startMission=(i,again)=>{originalStart(i,again);game.G.memories=game.spots(game.G,3,220,160).map(p=>({x:p[0],y:p[1],got:false}));saved.chapter=i;save();continueButton.textContent=`Continue · Chapter ${i+1}`;ui.querySelector('.chapter-arrival').textContent=`0${i+1} / ${lore[i][0]}`;ui.querySelector('.chapter-arrival').classList.remove('arrive');requestAnimationFrame(()=>ui.querySelector('.chapter-arrival').classList.add('arrive'));};
  const originalWin=game.win.bind(game);
  game.win=G=>{originalWin(G);if(!saved.completed.includes(G.i))saved.completed.push(G.i);saved.chapter=Math.min(5,G.i+1);save();continueButton.textContent=`Continue · Chapter ${saved.chapter+1}`;audio.tone(220,1.6,.15,'sine',440);};
  const wrap=(name,fn)=>{const original=game[name].bind(game);game[name]=(...args)=>{const result=original(...args);fn(...args);return result;};};
  wrap('hit',(G,e)=>{audio.tone(90,.11,.07,'triangle');});
  wrap('kill',(G,e)=>{world?.blood(e);audio.tone(110,.3,.1,'sawtooth');});
  wrap('hurt',(G,p)=>{if(p.flash>0)audio.tone(50,.24,.16);});
  wrap('heroAttack',()=>audio.tone(170,.08,.025,'triangle',45));
  wrap('commune',()=>{if(game.slow>0)audio.tone(90,1,.2,'sawtooth',300);});
  document.querySelector('#sound').onchange=e=>{audio.enabled=e.target.checked;if(audio.master)audio.master.gain.value=audio.enabled ? .2 : 0;if(audio.enabled)unlock();};
  document.querySelector('#gore').onchange=e=>{game.props.gore=e.target.checked;if(world)world.corpses.forEach(m=>m.visible=e.target.checked);};
  const originalFrame=game.frame.bind(game);let uiAt=0;
  game.frame=ts=>{
    const active=!!game.G&&['play','pause','over'].includes(game.mode);
    if(world){world.renderer.domElement.style.display=active?'block':'none';game.cv.style.opacity=active?'0':'1';}
    ui.classList.toggle('in-field',active);ui.classList.toggle('in-play',game.mode==='play');
    if(world&&active){
      const dt=Math.min(.05,Math.max(0,game.last?(ts-game.last)/1000:.016));game.last=ts;game.time+=dt;game.dt=dt;
      if(world.G!==game.G)world.build(game.G);
      world.aim();
      if(game.mode==='play')game.update(dt);else if(game.mode==='over')game.idle(dt*.4);
      if(game.G)world.render(dt);
    }else originalFrame(ts);
    if(ts-uiAt>150){
      uiAt=ts;const G=game.G,h=G?.H[G.act];let threat=0;
      if(G&&h){
        if(game.mode==='play')for(const memory of G.memories||[]){if(!memory.got&&Math.hypot(memory.x-h.x,memory.y-h.y)<65){
          if(game.keys.e){memory.got=true;G.ult=Math.min(100,G.ult+25);game.say(G,'A forbidden memory returns. Communion +25. '+(G.memories.filter(m=>m.got).length)+' / 3 memories recovered.',5);audio.tone(300,.6,.1,'sine',600);}
          else game.say(G,'Hold E to recover a forbidden memory. It will restore your Communion.',.4);
        }}
        const near=G.E.filter(e=>!e.dead&&Math.hypot(e.x-h.x,e.y-h.y)<500).length;
        threat=Math.min(1,near/7+(100-h.hp)/200);
        ui.querySelector('.threat-label').textContent=near>5?'OVERRUN / KEEP MOVING':near?'HOSTILES NEARBY':'PERIMETER QUIET';
        ui.style.setProperty('--threat',String(threat));ui.style.setProperty('--injury',String(Math.max(0,(60-h.hp)/80)));
        const targets=[...G.K.filter(q=>!q.got),...G.I.filter(q=>q.on&&!q.done),...G.E.filter(e=>!e.dead)];
        targets.sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y));
        const target=targets[0];
        if(target){const angle=Math.atan2(target.y-h.y,target.x-h.x);const dirs=['E','SE','S','SW','W','NW','N','NE'];const direction=dirs[(Math.round(angle/(Math.PI/4))+8)%8];ui.querySelector('.objective-bearing').textContent=`NEXT CONTACT ${direction} · ${Math.round(Math.hypot(target.x-h.x,target.y-h.y)/10)} m`;}
        else ui.querySelector('.objective-bearing').textContent='AREA CLEAR';
      }
      audio.tick(game,threat);
    }
  };
  return ()=>{world?.dispose();audio.ctx?.close();document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);document.removeEventListener('keydown',key);journal.remove();ui.remove();};
}
