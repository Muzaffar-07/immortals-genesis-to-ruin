"""Generate offline dialogue and audio envelopes with Kokoro (no runtime TTS needed).
pip install --target tools/bin/voice-deps kokoro-onnx soundfile
Download the model-files-v1.1 ONNX and voice bank from the upstream repository.
"""
from pathlib import Path
import sys, json, hashlib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/bin/voice-deps'))
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro

LINES=[
 ('mara_warning','mara',"If you can hear this, don't trust the voice on the intercom. It sounds like a man. It isn't."),
 ('ena_arrival','ena',"Blackwater. No stars. No way back. Aro, if you're out there, stay with me."),
 ('aro_arrival','aro',"Blackwater. No stars. No way back. Ena, if you're out there, stay with me."),
 ('mara_recorder','mara',"I watched patient nine die three times. Each time he remembered the last. Then he spoke with your voice."),
 ('voss_security','voss',"Security is a kindness. Outside these walls, your species is already extinct."),
 ('mara_witness','mara',"I built the first resurrection chamber. Voss made me keep the memories. I can shut down his reinforcements, but you have to let me stay at the console."),
 ('ena_question','ena',"You built this place. Give me one reason to trust you."),
 ('aro_question','aro',"You built this place. Give me one reason to trust you."),
 ('ena_trust','ena',"Stay at the console. Save whoever is left. I'll hold them off."),
 ('aro_trust','aro',"Stay at the console. Save whoever is left. I'll hold them off."),
 ('ena_evacuate','ena',"No more experiments. Come with me. We're getting you out."),
 ('aro_evacuate','aro',"No more experiments. Come with me. We're getting you out."),
 ('voss_containment','voss',"Containment protocol. Leave no witnesses."),
 ('mara_ambush','mara',"That squad had my clearance code. Voss knew I would help you."),
 ('mara_archive','mara',"Voss is not extending life. He is replacing people with copies that obey him. Broadcast the evidence, and his backup reactor stays online. Destroy the archive, and you erase the proof."),
 ('ena_broadcast','ena',"Send it. Every name. Every voice. Let the world remember."),
 ('aro_broadcast','aro',"Send it. Every name. Every voice. Let the world remember."),
 ('ena_destroy','ena',"No one else dies in this machine. Burn the archive."),
 ('aro_destroy','aro',"No one else dies in this machine. Burn the archive."),
 ('voss_reveal','voss',"You think you are the original? I remember your first sunrise too."),
 ('ena_reveal','ena',"You stole a memory. That doesn't make it yours."),
 ('aro_reveal','aro',"You stole a memory. That doesn't make it yours."),
 ('voss_phase2','voss',"There is more than one of me."),
 ('voss_phase3','voss',"Every death is another beginning."),
 ('mara_escape','mara',"The doors are open. Get out before the next copy wakes up."),
 ('mara_ending','mara',"The sun is coming up. I thought I'd forgotten what it looked like."),
 ('voss_echo','voss',"I remember your first sunrise too."),
]
VOICES={'mara':('bf_emma','en-gb',.94),'voss':('bm_george','en-gb',.9),'ena':('af_heart','en-us',.98),'aro':('am_michael','en-us',.96)}
OUT=ROOT/'native/assets/voice';OUT.mkdir(parents=True,exist_ok=True)
class GameKokoro(Kokoro):
 """Match model input dtypes; kokoro-onnx 0.4.7 casts v1.0 speed to int32."""
 def _create_audio(self,phonemes,voice,speed):
  tokens=self.tokenizer.tokenize(phonemes[:510])
  token_name='input_ids' if 'input_ids' in [i.name for i in self.sess.get_inputs()] else 'tokens'
  data={token_name:np.array([[0,*tokens,0]],dtype=np.int64),
        'style':np.array(voice[len(tokens)],dtype=np.float32),
        'speed':np.array([speed],dtype=np.float32)}
  return self.sess.run(None,data)[0],24000
engine=GameKokoro(str(ROOT/'tools/downloads/voice/kokoro-v1.0.onnx'),str(ROOT/'tools/downloads/voice/voices-v1.0.bin'))
# Limit CPU concurrency so asset generation remains usable alongside the editor.
options=ort.SessionOptions();options.intra_op_num_threads=3;options.inter_op_num_threads=1
engine.sess=ort.InferenceSession(str(ROOT/'tools/downloads/voice/kokoro-v1.0.onnx'),sess_options=options,providers=['CPUExecutionProvider'])
manifest={}
for key,actor,text in LINES:
 voice,lang,speed=VOICES[actor];file=OUT/(key+'.ogg')
 if file.exists(): samples,rate=sf.read(file,dtype='float32')
 else:
  samples,rate=engine.create(text,voice=voice,speed=speed,lang=lang)
  peak=float(np.max(np.abs(samples)))
  if peak>0:samples=samples*(.82/peak)
  sf.write(file,samples,rate,format='OGG',subtype='VORBIS')
 hop=int(rate*.04)
 envelope=[round(float(np.sqrt(np.mean(samples[i:i+hop]**2))),4) for i in range(0,len(samples),hop)]
 maximum=max(envelope) or 1
 envelope=[min(1,round(v/maximum,3)) for v in envelope]
 manifest[key]={'actor':actor,'voice':voice,'text':text,'duration':round(len(samples)/rate,3),'envelope':envelope,'envelope_step':.04,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
 print(key,manifest[key]['duration'],'seconds',flush=True)
(OUT/'lines.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Generated',len(manifest),'dialogue clips',flush=True)
