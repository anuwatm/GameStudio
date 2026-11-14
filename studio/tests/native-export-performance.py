"""P8 requires the USER to grant actual native-folder access. No OPFS/Node adapter substitute."""
import functools,http.server,json,pathlib,threading,sys,uuid,time,statistics,hashlib,platform
from playwright.sync_api import sync_playwright,expect
sys.stdout.reconfigure(encoding='utf-8');ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'document/phase-1/evidence/1.7';OUT.mkdir(parents=True,exist_ok=True)
source=ROOT/'document/phase-1/evidence/1.6/regression-1.3/ui-project.json';project=json.loads(source.read_text(encoding='utf-8'));target=ROOT/'temp'/('phase-1.7-native-'+str(uuid.uuid4()));target.mkdir();(target/'project.storyflow.json').write_text(json.dumps(project,ensure_ascii=False,indent=2),encoding='utf-8')
class Handler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'}
 def log_message(self,*_):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/studio/dist/'
report={'passed':False,'status':'awaiting-user-native-picker','folder':str(target),'url':url,'sourceProject':str(source),'fixtureHash':hashlib.sha256(source.read_bytes()).hexdigest(),'nodeCount':len(project['nodes']),'samples':[],'pageErrors':[],'method':'actual UI edit Apply→Core/IDB→manual Save if pending→prepare/buildExport→native commit manifest→paint success; user picker/grant excluded; warmup1+5; no OPFS/Node adapter'}
(OUT/'native-P8.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('NATIVE_READY '+str(target),flush=True)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=False);page=browser.new_page(viewport={'width':1440,'height':1100});report['browser']=browser.version;report['os']=platform.platform();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.on('dialog',lambda d:d.accept())
  # Capture the genuine picker result. The native call remains intact and is initiated by the user click.
  page.add_init_script("""(()=>{const native=window.showDirectoryPicker;window.showDirectoryPicker=async function(...args){const handle=await native.apply(this,args);window.p8NativeFolder=handle;return handle;};})();""")
  page.goto(url);expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน');page.evaluate("document.title='StoryFlow P8 Native — เลือกโฟลเดอร์ทดสอบ'")
  print('USER_ACTION click เปิดโฟลเดอร์โปรเจกต์ and choose '+str(target),flush=True)
  page.wait_for_function('window.p8NativeFolder!==undefined',timeout=900000);expect(page.locator('.react-flow__node')).to_have_count(6,timeout=20000)
  permission=page.evaluate("async()=>({name:window.p8NativeFolder.name,kind:window.p8NativeFolder.kind,permission:await window.p8NativeFolder.queryPermission({mode:'readwrite'})})");assert permission['name']==target.name and permission['permission']=='granted',permission;report['nativeHandle']=permission;report['status']='running';(OUT/'native-P8.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('NATIVE_GRANTED',permission,flush=True)
  def ready():expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  def click(name):page.get_by_role('button',name=name,exact=True).click();ready()
  for round in range(6):
   click('Story Graph');page.get_by_label('Graph',exact=True).select_option(project['entryGraphId']);page.get_by_label('เลือกโหนด',exact=True).select_option(project['nodes'][0]['id']);page.get_by_label('บทพูด 1',exact=True).fill('P8 native edit '+str(round)+' ไทย')
   page.evaluate("""()=>{window.p8Measured=new Promise(resolve=>{const apply=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='ใช้การแก้ไขโหนด');apply.addEventListener('click',()=>{const start=performance.now();const observer=new MutationObserver(()=>{const heading=document.querySelector('.export-result h2');if(heading?.textContent==='ส่งออกสำเร็จ'){observer.disconnect();requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));}});observer.observe(document.querySelector('main'),{childList:true,subtree:true});},{once:true,capture:true});});}""")
   click('ใช้การแก้ไขโหนด');save=page.get_by_role('button',name='บันทึกโปรเจกต์',exact=True)
   if save.is_enabled():save.click();ready()
   click('Export');click('ตรวจและเตรียมส่งออก');click('ส่งออกไปยังโฟลเดอร์นี้');expect(page.get_by_role('heading',name='ส่งออกสำเร็จ')).to_be_visible();duration=page.evaluate('window.p8Measured')
   audit=page.evaluate("""async()=>{const root=window.p8NativeFolder;async function bytes(path){const p=path.split('/');let d=root;const name=p.pop();for(const part of p)d=await d.getDirectoryHandle(part);return new Uint8Array(await(await d.getFileHandle(name)).getFile().then(f=>f.arrayBuffer()));}const manifest=JSON.parse(new TextDecoder().decode(await bytes('game/storyflow_generated/sf_manifest.json')));const hashes={};for(const [path,expected] of Object.entries(manifest.files)){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await bytes(path)))).map(v=>v.toString(16).padStart(2,'0')).join('');hashes[path]={expected,actual:hash,equal:hash===expected};}return {hashes,allEqual:Object.values(hashes).every(h=>h.equal),permission:await root.queryPermission({mode:'readwrite'})};}""")
   assert audit['allEqual'] and audit['permission']=='granted';report['samples'].append({'round':round,'warmup':round==0,'ms':duration,'audit':audit});(OUT/'native-P8.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('P8 round',round,duration,flush=True)
  values=[s['ms'] for s in report['samples'][1:]];report.update(status='complete',median=statistics.median(values),max=max(values),limit=5000,passed=statistics.median(values)<=5000 and not report['pageErrors']);browser.close()
except Exception as e:report.update(status='failed',error=str(e));raise
finally:(OUT/'native-P8.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');server.shutdown()
