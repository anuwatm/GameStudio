from pathlib import Path
import json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 context=p.chromium.launch_persistent_context(str(Path('temp/0b4-native-profile').resolve()),executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True)
 page=context.new_page();page.goto('http://127.0.0.1:8767/recovery-proof.html');page.wait_for_function('window.sfProof')
 result=page.evaluate('''async()=>{
  const info=JSON.parse(localStorage.getItem('sf-0b4'));const dir=await sfProof.root();
  const permission=await dir.queryPermission({mode:'readwrite'});let error=null;
  if(permission!=='granted'){
   try{const game=await dir.getDirectoryHandle('game');const generated=await game.getDirectoryHandle('storyflow_generated');const file=await generated.getFileHandle('sf_schedule.rpy');const stream=await file.createWritable();await stream.abort();}
   catch(e){error={name:e.name,error:String(e)};info.failure={phase:'permission-unavailable-after-browser-reopen',...error,permission};localStorage.setItem('sf-0b4',JSON.stringify(info));}
  }
  return {mode:info.mode,name:info.name,permission,error,method:'stored native directory handle reopened in fresh browser session; no permission override or synthetic exception'};
 }''')
 Path('document/phase-0b/evidence/native-reopen-permission.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result))
 context.close()
