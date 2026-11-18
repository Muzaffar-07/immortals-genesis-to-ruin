/** Copy into Ara 3D Gen's scripts/ directory; run with npx tsx scripts/generate-cast.ts <output>. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {buildHuman} from '../src/core/human';
import {DEFAULT_PARAMS,PRESETS} from '../src/core/params';
import {CLIPS,clipById} from '../src/core/anim/clips';
import {DEFAULT_EXPORT,planExport,runExport} from '../src/export';
import {nodeLibrary} from './node-assets';
const out=process.argv[2]; if(!out)throw Error('Output directory required');mkdirSync(out,{recursive:true});
const lib=await nodeLibrary();
// Split the authored boxing combination into independently recoverable strikes.
// Each input now plays one deliberate attack instead of restarting three punches.
const boxing=clipById.get('punch_combo')!;
for(const [id,name,start,end,active,duration] of [
 ['nightfall_jab','Jab',0,.27,.26,.43],
 ['nightfall_cross','Cross',.27,.60,.30,.49],
 ['nightfall_hook','Hook',.60,1.20,.40,.64],
] as [string,string,number,number,number,number][]){
 const clip={...boxing,id,name,duration,sample:(t:number)=>{
  const s=boxing.sample(start+Math.min(t/active,1)*(end-start));
  return t>active?{...s,blend:{sample:boxing.sample(0),w:Math.min(1,(t-active)/(duration-active)),ground:true}}:s;
 }};
 CLIPS.push(clip);clipById.set(id,clip);
}
const jobs=[
 {name:'ena',preset:'The Cyberpunk Hacker',gender:0,age:.54,muscle:.62,height:.57,proportions:.8,hair:'ponytail01',hairTint:'#665c51',skinTint:'#ffffff',eyes:'grey',accessories:['utility_belt'],garmentStyles:{techwear_jacket:{pattern:'workwear',color:'#303c45',color2:'#69747a'},techwear_pants:{pattern:'workwear',color:'#262e34',color2:'#404b51'}}},
 {name:'aro',preset:'The Soldier',gender:1,age:.56,muscle:.82,height:.66,hair:'short02',hairTint:'#4b382a',skinTint:'#ffffff',eyes:'grey',accessories:['tactical_vest','belt'],garmentStyles:{fatigue_shirt:{pattern:'workwear',color:'#334047'},fatigue_pants:{pattern:'workwear',color:'#242e32'}}},
 {name:'guard',preset:'The Soldier',weapon:'rifle'},
 {name:'voss',preset:'The Professional Hitman',weapon:'none'},
 {name:'mara',preset:'The Female Executive',age:.61,hair:'bob02',hairTint:'#4c3529',accessories:[],weapon:'none',carry:'none',earrings:'none',shoes:'oxfords',expression:'neutral'}
];
const ids=['idle','walk','run','nightfall_jab','nightfall_cross','nightfall_hook','punch_low','punch_combo','kick_front','kick_roundhouse','block','hit','knockdown','get_up_face_up','death_backward','talk','rifle_idle','rifle_fire','rifle_aim','dodge_left','dodge_right','roll','jump_start','jump_air','jump_land','fight_idle'];
for(const job of jobs){
 const {preset,...overrides}=job;
 const featured=job.name!=='guard';
 const params={...DEFAULT_PARAMS,...PRESETS[preset],...overrides,detail:featured?'high':'medium',faceShapes:featured,speechShapes:featured,animations:true,rig:'game'} as typeof DEFAULT_PARAMS;
 const ch=await buildHuman(lib,params);
 const clips=ids.filter(id=>CLIPS.some(c=>c.id===id));
 const file=await runExport(lib,ch,planExport(ch,{...DEFAULT_EXPORT,format:'glb',clips,loopSuffix:true,vehicleFile:false,stageProps:false}));
 writeFileSync(join(out,job.name+'.glb'),file.data);
 writeFileSync(join(out,job.name+'.json'),JSON.stringify(params,null,2));
 console.log(job.name,Math.round(file.data.length/1024/1024)+' MB',clips.join(','));
}
