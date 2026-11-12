import {LocalProject,readFile,writeFile,sha256} from './local-folder.mjs';
const bundle=await(await fetch('./bundle.json')).json();
const pending='.storyflow/export.pending.json';
const paths=[...Object.keys(bundle.files),'game/storyflow_generated/sf_manifest.json','.storyflow/sourcemap.json','game/user.rpy','game/assets/probe.webm'];
const status=document.querySelector('#status');
const show=v=>{status.textContent=typeof v==='string'?v:JSON.stringify(v,null,2);};
const db=await new Promise((resolve,reject)=>{const req=indexedDB.open('sf-0b4',1);req.onupgradeneeded=()=>req.result.createObjectStore('handles');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
async function saveHandle(h){await new Promise((res,rej)=>{const tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(h,'root');tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
async function loadHandle(){return new Promise((res,rej)=>{const r=db.transaction('handles').objectStore('handles').get('root');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function root(){const info=JSON.parse(localStorage.getItem('sf-0b4'));return info.mode==='native-folder'?await loadHandle():await(await navigator.storage.getDirectory()).getDirectoryHandle(info.name);}
async function snapshot(dir){const result={};for(const p of paths){const bytes=await readFile(dir,p);result[p]=bytes===null?null:await sha256(bytes);}return result;}
async function start(mode='opfs',handle=null,permissionFault=false){
 const parent=handle||await navigator.storage.getDirectory();const name='recovery-'+crypto.randomUUID();
 const dir=await parent.getDirectoryHandle(name,{create:true});if(handle)await saveHandle(dir);
 await writeFile(dir,'game/user.rpy','# user sentinel — do not overwrite\n');
 await writeFile(dir,'game/assets/probe.webm',new Uint8Array(await(await fetch('./probe.webm')).arrayBuffer()));
 await new LocalProject(dir).export(bundle);const before=await snapshot(dir);
 localStorage.setItem('sf-0b4',JSON.stringify({mode,name,before}));
 const changed=structuredClone(bundle);for(const p in changed.files)changed.files[p]+='\n# interrupted revision\n';
 let triggered=false;
 window.sfState={phase:'writing',mode};
 const adapter=new LocalProject(dir,{fault:async point=>{if(point==='file'&&!triggered){triggered=true;
 const partial=await snapshot(dir);window.sfState={phase:'paused-after-first-file',mode,name,before,partial,pending:await readFile(dir,pending)!==null};show(window.sfState);
  if(mode==='native-folder')await fetch('/result',{method:'POST',body:JSON.stringify({mode,...window.sfState})});
  if(permissionFault)throw new DOMException('Injected permission loss after committed file','NotAllowedError');
  await new Promise(resolve=>{window.sfContinue=resolve;});
 }}});
 window.sfTransaction=adapter.export(changed).then(result=>{window.sfState={phase:'committed',result};show(window.sfState);}).catch(async error=>{
  window.sfState={phase:'failed',name:error.name,error:String(error),permission:dir.queryPermission?await dir.queryPermission({mode:'readwrite'}):'unknown'};show(window.sfState);
  const info=JSON.parse(localStorage.getItem('sf-0b4'));info.failure=window.sfState;localStorage.setItem('sf-0b4',JSON.stringify(info));
  if(mode==='native-folder')await fetch('/result',{method:'POST',body:JSON.stringify({mode,...window.sfState})});
 });
 return {mode,name,before};
}
async function recover(){const info=JSON.parse(localStorage.getItem('sf-0b4'));const dir=await root();
 const hadPending=await readFile(dir,pending)!==null;const recovery=await new LocalProject(dir).recover();
 const after=await snapshot(dir);const equal=JSON.stringify(info.before)===JSON.stringify(after);
 if(!hadPending&&!recovery.recovered&&equal){const result={mode:info.mode,name:info.name,alreadyRestored:true,hadPending,recovery,before:info.before,after,equal,failure:info.failure};show(result);return result;}
 if(!hadPending||!recovery.recovered||recovery.committed||!equal||await readFile(dir,pending)!==null){
  const diagnostic={mode:info.mode,phase:'not-a-rollback-case',hadPending,recovery,equal,before:info.before,after,failure:info.failure||null};
  if(info.mode==='native-folder')await fetch('/result',{method:'POST',body:JSON.stringify(diagnostic)});
  throw Error('Recovery expectation not met: '+JSON.stringify({hadPending,recovery,equal,failure:info.failure||null}));
 }
 const result={mode:info.mode,name:info.name,hadPending,recovery,before:info.before,after,equal,failure:info.failure,secondRecovery:await new LocalProject(dir).recover()};show(result);
 if(info.mode==='native-folder')await fetch('/result',{method:'POST',body:JSON.stringify(result)});
 return result;
}
window.sfProof={start,recover,snapshot,root};window.sfState={phase:'ready'};
document.querySelector('#native').onclick=async()=>{try{await start('native-folder',await showDirectoryPicker({mode:'readwrite'}));}catch(e){show(String(e));}};
document.querySelector('#continue').onclick=async()=>{const dir=await root();const permission=await dir.queryPermission({mode:'readwrite'});
 if(permission==='granted'){show('สิทธิ์ยังเป็น granted จึงยังไม่เขียนต่อ: ถอนสิทธิ์แก้ไฟล์ของโฟลเดอร์นี้ก่อน หากมี prompt ตอนเขียนต่อ ให้ปฏิเสธสำหรับรอบทดสอบ');return;}
 window.sfContinue?.();
};
document.querySelector('#recover').onclick=async()=>{const button=document.querySelector('#recover');button.disabled=true;try{
 if(window.sfState.phase==='paused-after-first-file'){show('Writer ยังถือ lock อยู่: ปิดหน้าทดสอบแล้วเปิดใหม่ก่อนกู้คืน');button.disabled=false;return;}
 show('กำลังขอสิทธิ์/กู้คืน กรุณาตอบ permission prompt หากมี');
 const dir=await root();if(await dir.queryPermission({mode:'readwrite'})!=='granted')await dir.requestPermission({mode:'readwrite'});window.sfResult=await recover();
 button.textContent='กู้คืนสำเร็จ';
}catch(e){show(String(e));button.disabled=false;}};
if(localStorage.getItem('sf-0b4')){
 document.querySelector('#native').hidden=true;document.querySelector('#continue').hidden=true;
 document.querySelector('#instructions').textContent='มีเคสเดิมที่เก็บไว้ กดปุ่มด้านล่างและอนุญาตให้แก้ไฟล์เพื่อกู้คืน ไม่ต้องเลือกโฟลเดอร์ใหม่';
 show('พร้อมกู้คืนเคส '+JSON.parse(localStorage.getItem('sf-0b4')).name);
}else show('พร้อมทดสอบ เลือกโฟลเดอร์ทดสอบใหม่เท่านั้น ระบบจะสร้าง recovery-UUID ภายใน');
