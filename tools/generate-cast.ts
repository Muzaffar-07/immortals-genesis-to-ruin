/** Copy into Ara 3D Gen's scripts/ directory; run with npx tsx scripts/generate-cast.ts <output>. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildHuman} from '../src/core/human';
import {DEFAULT_PARAMS,PRESETS} from '../src/core/params';
import {CLIPS} from '../src/core/anim/clips';
import {DEFAULT_EXPORT,planExport,runExport} from '../src/export';
import {nodeLibrary} from './node-assets';
const out=process.argv[2]; if(!out)throw Error('Output directory required');mkdirSync(out,{recursive:true});
const lib=await nodeLibrary();
const jobs=[
 {name:'ena',preset:'The Cyberpunk Hacker',gender:0,age:.53,muscle:.65,height:.56,proportions:.88,hair:'ponytail01',hairTint:'#c8d9e5',skinTint:'#e4edf5',eyes:'ice',accessories:['neon_accents','utility_belt']},
 {name:'aro',preset:'The Soldier',gender:1,age:.56,muscle:.88,height:.66,hair:'short02',skinTint:'#e7ebf3',eyes:'ice',accessories:['tactical_vest','belt'],garmentStyles:{fatigue_shirt:{pattern:'solid',color:'#243640'},fatigue_pants:{pattern:'solid',color:'#18242b'}}},
 {name:'guard',preset:'The Soldier',weapon:'rifle'},
 {name:'voss',preset:'The Professional Hitman',weapon:'none'},
 {name:'mara',preset:'Businesswoman',age:.61,hair:'bob02',accessories:[],weapon:'none'}
];
const ids=['idle','walk','run','punch','punch_combo','kick_front','kick_roundhouse','block','hit','death_backward','talk','rifle_idle','rifle_fire','rifle_aim','dodge_left','jump','fight_idle'];
for(const job of jobs){
 const {preset,...overrides}=job;
 const params={...DEFAULT_PARAMS,...PRESETS[preset],...overrides,detail:'medium',faceShapes:false,speechShapes:false,animations:true,rig:'game'} as typeof DEFAULT_PARAMS;
 const ch=await buildHuman(lib,params);
 const clips=ids.filter(id=>CLIPS.some(c=>c.id===id));
 const file=await runExport(lib,ch,planExport(ch,{...DEFAULT_EXPORT,format:'glb',clips,loopSuffix:true,vehicleFile:false,stageProps:false}));
 writeFileSync(join(out,job.name+'.glb'),file.data);
 writeFileSync(join(out,job.name+'.json'),JSON.stringify(params,null,2));
 console.log(job.name,Math.round(file.data.length/1024/1024)+' MB',clips.join(','));
}
