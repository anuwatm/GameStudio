import {useEffect,useState} from 'react';
import type {Project,Character,Patch} from '../core/types';
import {fieldsPatch,uuid} from '../core/editor';
import {assetFile,checkAssets} from '../core/folder';
import {safePath} from '../../../web/local-folder.mjs';
type Props={project:Project;root:FileSystemDirectoryHandle|null;locked:boolean;apply:(patch:Patch[])=>Promise<void>};
function CharacterRow({value,project,locked,apply}:Props&{value:Character}){
 const [draft,setDraft]=useState(value);
 return <form className="resource-row" onSubmit={e=>{e.preventDefault();void apply(fieldsPatch(project,{characters:project.characters.map(c=>c.id===value.id?draft:c)}));}}>
  <fieldset disabled={locked}><label>ชื่อตัวละคร<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>สีตัวละคร<input value={draft.color} onChange={e=>setDraft({...draft,color:e.target.value})}/></label><label>ภาพตัวละคร<select value={draft.portraitAssetId??''} onChange={e=>setDraft({...draft,portraitAssetId:e.target.value||null})}><option value="">ไม่มี</option>{project.assets.map(a=><option key={a.id} value={a.id}>{a.path}</option>)}</select></label><div className="actions"><button type="submit" disabled={JSON.stringify(draft)===JSON.stringify(value)}>ใช้ข้อมูลตัวละคร</button><button type="button" onClick={()=>{if(confirm('ลบตัวละครและเปลี่ยนบทพูดที่อ้างถึงเป็นผู้บรรยาย? Undo คืนได้'))void apply(fieldsPatch(project,{characters:project.characters.filter(c=>c.id!==value.id),nodes:project.nodes.map(n=>n.lines?{...n,lines:n.lines.map(l=>l.characterId===value.id?{...l,characterId:null}:l)}:n)}));}}>ลบตัวละคร</button></div></fieldset>
 </form>;
}
function Preview({root,path}:{root:FileSystemDirectoryHandle;path:string}){
 const [url,setUrl]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let disposed=false,current='';setError('');setUrl('');assetFile(root,path).then(file=>{if(!disposed){current=URL.createObjectURL(file);setUrl(current);}}).catch(e=>{if(!disposed)setError(String(e));});return()=>{disposed=true;if(current)URL.revokeObjectURL(current);};},[root,path]);
 if(error)return <p role="alert">ไม่สามารถพรีวิว: {error}</p>;
 if(!url)return <p role="status">กำลังเปิดสื่อ…</p>;
 if(/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(path))return <img className="asset-preview" src={url} alt={`พรีวิว ${path}`}/>;
 if(/\.(webm|mp4|ogv)$/i.test(path))return <video className="asset-preview" src={url} controls preload="metadata"/>;
 if(/\.(ogg|opus|mp3|wav|m4a)$/i.test(path))return <audio src={url} controls preload="metadata"/>;
 return <p>ไม่มีตัวพรีวิวสำหรับนามสกุลนี้ ไฟล์ยังถูกใช้อ้างอิงได้</p>;
}
export function Resources(props:Props){
 const {project,root,locked,apply}=props;const [path,setPath]=useState(''),[preview,setPreview]=useState(''),[statuses,setStatuses]=useState<{id:string;status:string}[]>([]),[error,setError]=useState(''),[checking,setChecking]=useState(false);
 useEffect(()=>{setStatuses([]);setPreview('');},[root,project.assets]);
 async function scan(){if(!root)return;setChecking(true);try{setStatuses(await checkAssets(root,project.assets));}finally{setChecking(false);}}
 return <section className="resources"><h2>ตัวละครและสื่อ</h2><div className="resource-columns"><section><h3>ตัวละคร</h3>{!project.characters.length&&<p>ยังไม่มีตัวละคร บทพูดใช้ผู้บรรยายได้</p>}{project.characters.map(value=><CharacterRow key={JSON.stringify(value)} {...props} value={value}/>)}<button disabled={locked} onClick={()=>apply(fieldsPatch(project,{characters:[...project.characters,{id:uuid(),name:'ตัวละครใหม่',color:'#58D4B4',portraitAssetId:null}]}))}>เพิ่มตัวละคร</button></section>
  <section><h3>สื่อใน game/assets/</h3><p>ลงทะเบียนพาธสัมพัทธ์ของไฟล์เดิม ไม่คัดลอกหรือลบไฟล์สื่อบนดิสก์</p><form onSubmit={e=>{e.preventDefault();setError('');try{safePath(path);if(project.assets.some(a=>a.path===path))throw Error('พาธนี้ลงทะเบียนแล้ว');void apply(fieldsPatch(project,{assets:[...project.assets,{id:uuid(),path}]}));setPath('');}catch(e){setError(String(e));}}}><label>พาธสื่อ เช่น clips/intro.webm<input value={path} onChange={e=>setPath(e.target.value)} disabled={locked}/></label><button disabled={locked||!path}>ลงทะเบียนสื่อ</button></form>{error&&<p role="alert">{error}</p>}
  <button disabled={!root||checking||locked} onClick={scan}>{checking?'กำลังตรวจสื่อ…':'ตรวจสื่อที่หาย'}</button>{!root&&<p>เปิดโฟลเดอร์จริงเพื่อตรวจไฟล์และพรีวิว</p>}
  <ul className="asset-list">{project.assets.map(a=><li key={a.id}><span>{a.path}</span><p>{statuses.find(s=>s.id===a.id)?.status??'ยังไม่ตรวจไฟล์'}</p><div className="actions"><button disabled={!root||locked} onClick={()=>setPreview(a.path)}>พรีวิว {a.path}</button><button disabled={locked} onClick={()=>{if(confirm('ยกเลิกทะเบียนและอ้างอิงสื่อนี้ในฉาก/ตัวละคร? ไฟล์บนดิสก์คงอยู่'))void apply(fieldsPatch(project,{assets:project.assets.filter(asset=>asset.id!==a.id),nodes:project.nodes.map(n=>n.assetIds?{...n,assetIds:n.assetIds.filter(id=>id!==a.id)}:n),characters:project.characters.map(c=>c.portraitAssetId===a.id?{...c,portraitAssetId:null}:c)}));}}>ยกเลิกทะเบียน</button></div></li>)}</ul>
  {root&&preview&&<Preview root={root} path={preview}/>}</section></div></section>;
}
