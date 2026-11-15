"""P1–P7 on production Edge; P8 deliberately excluded until native-folder user grant."""
import functools,http.server,json,pathlib,threading,sys,hashlib,statistics,subprocess,base64,platform,os
from playwright.sync_api import sync_playwright,expect
sys.stdout.reconfigure(encoding='utf-8');ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/os.environ.get('SF_PERFORMANCE_PROOF_OUT','document/phase-1/evidence/1.7');OUT.mkdir(parents=True,exist_ok=True)
baseline_path=ROOT/'temp/gate-0b-worker/baseline.json';baseline=json.loads(baseline_path.read_text(encoding='utf-8'));media=ROOT/'document/phase-0b/media-probe/probe.webm'
class Handler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'}
 def log_message(self,*_):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}';report={'passed':False,'fixtureHash':hashlib.sha256(baseline_path.read_bytes()).hexdigest(),'nodeCount':len(baseline['nodes']),'samples':{},'pageErrors':[],'os':platform.platform(),'method':'warmup1 + measured5; retain all samples; no WASM startup in P1; P5 starts at Worker Project response; OPFS only for P5/P7 local fixture setup, not P8'}
def metric(id,samples,limit):
 measured=samples[1:];report['samples'][id]={'warmup':samples[0],'raw':measured,'median':statistics.median(measured),'max':max(measured),'limit':limit,'passed':statistics.median(measured)<=limit};print(id,report['samples'][id],flush=True)
try:
 import re
 worker=re.search(r'coreWorkerPath\s*=\s*"([^"]+)"',(ROOT/'studio/src/core/generated.ts').read_text())[1]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True);report['browser']=browser.version;context=browser.new_context(viewport={'width':1440,'height':1100})
  page=context.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.goto(base+'/studio/dist/');expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน');report['uiBuild']=page.locator('script[type=module]').get_attribute('src');report['sourceHashes']={name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest() for name in ['studio/src/ui/App.tsx','studio/src/ui/NodeInspector.tsx','studio/src/ui/graph.ts','studio/src/core/recovery.ts']};report['hardware']=page.evaluate('({logicalProcessors:navigator.hardwareConcurrency,userAgent:navigator.userAgent})')
  core=page.evaluate("""async({url,project})=>{const worker=new Worker(url,{type:'module'});let seq=0;const call=(name,payload)=>new Promise((resolve,reject)=>{const requestId=String(++seq);const timer=setTimeout(()=>reject(Error(name+' timeout')),15000);worker.onmessage=e=>{if(e.data.requestId!==requestId)return;clearTimeout(timer);resolve(e.data);};worker.postMessage({contractVersion:1,requestId,kind:name==='validate'||name==='getProject'?'query':'command',name,payload});});try{await call('getProject',{});const out={P1:[],P2:[],P3:[]};for(let round=0;round<6;round++){for(const [id,name,payload] of [['P1','openProject',{project}],['P2','validate',{}],['P3','applyEdit',{patch:[{op:'replace',path:'/nodes/0/lines/0/text',value:'bench '+round}]}]]){const start=performance.now();const result=await call(name,payload);out[id].push(performance.now()-start);if(result.kind!=='result')throw Error(JSON.stringify(result));}}return out;}finally{worker.terminate();}}""",{'url':base+'/studio/dist/'+worker,'project':baseline})
  for id,limit in [('P1',2000),('P2',200),('P3',100)]:metric(id,core[id],limit)
  page.close();p5=[];p6=[]
  for round in range(6):
   page=context.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)))
   page.add_init_script("""(()=>{const W=window.Worker;window.Worker=class extends W{constructor(...args){super(...args);this.addEventListener('message',e=>{if(e.data?.name==='openProject'&&e.data.kind==='result')window.p5Start=performance.now();});}};})();""")
   page.goto(base+'/studio/dist/');expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
   page.evaluate("""async project=>{window.testRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle('perf-'+crypto.randomUUID(),{create:true});const w=await(await window.testRoot.getFileHandle('project.storyflow.json',{create:true})).createWritable();await w.write(JSON.stringify(project));await w.close();window.showDirectoryPicker=async()=>window.testRoot;window.p5Promise=new Promise(resolve=>{const loop=()=>{if(window.p5Start){const canvas=document.querySelector('.canvas'),controls=document.querySelector('.react-flow__controls-button'),nodes=document.querySelectorAll('.react-flow__node');if(canvas&&controls&&nodes.length){const c=canvas.getBoundingClientRect();const visible=Array.from(nodes).some(n=>{const b=n.getBoundingClientRect();return b.width>0&&b.height>0&&b.right>c.left&&b.left<c.right&&b.bottom>c.top&&b.top<c.bottom;});if(visible){requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-window.p5Start)));return;}}}requestAnimationFrame(loop);};requestAnimationFrame(loop);});}""",baseline)
   page.get_by_role('button',name='เปิดโฟลเดอร์โปรเจกต์',exact=True).click()
   try:page.wait_for_function('window.p5Start!==undefined',timeout=15000)
   except Exception:
    (OUT/'performance-failure.txt').write_text(page.locator('body').inner_text(),encoding='utf-8');(OUT/'performance-locks.json').write_text(json.dumps(page.evaluate('navigator.locks.query()'),indent=2),encoding='utf-8');page.screenshot(path=str(OUT/'performance-failure.png'),full_page=True);raise
   duration=page.evaluate('window.p5Promise');p5.append(duration)
   expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
   page.evaluate("""()=>{window.p6Promise=new Promise(resolve=>{const select=document.querySelector('select[aria-label="เลือกโหนด"]');select.addEventListener('change',()=>{const start=performance.now(),id=select.value;const loop=()=>{const code=document.querySelector('.node-inspector>code');if(code?.textContent===id){requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(performance.now()-start)));return;}requestAnimationFrame(loop);};requestAnimationFrame(loop);},{once:true});});}""")
   page.get_by_label('เลือกโหนด',exact=True).select_option(baseline['nodes'][0]['id']);p6.append(page.evaluate('window.p6Promise'));
   if round==5:
    report['mountedViewportNodes']=page.locator('.react-flow__node').count();page.get_by_role('button',name='โฟกัสโหนด',exact=True).click()
    for width in [1440,1000,700]:
     page.set_viewport_size({'width':width,'height':1100});page.get_by_role('button',name='โฟกัสโหนด',exact=True).click();page.screenshot(path=str(OUT/f'graph-2000-{width}.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   report.setdefault('uiRounds',[]).append({'round':round,'P5':p5[-1],'P6':p6[-1]});(OUT/'performance-P1-P7.json').write_text(json.dumps(report,indent=2),encoding='utf-8');page.close();print('UI round',round,p5[-1],p6[-1],flush=True)
  metric('P5',p5,2000);metric('P6',p6,150)
  # P7 preview includes File/Blob read, mount and actual first compositor decoded frame.
  page=context.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.goto(base+'/studio/dist/');expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  project=json.loads((ROOT/'contract/fixtures/summer-house.json').read_text(encoding='utf-8'));project['assets']=[{'id':'00000000-0000-4000-8000-000000000901','path':'probe.webm'}]
  page.evaluate("""async({project,data})=>{window.testRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle('media-'+crypto.randomUUID(),{create:true});const w=await(await window.testRoot.getFileHandle('project.storyflow.json',{create:true})).createWritable();await w.write(JSON.stringify(project));await w.close();const a=await(await window.testRoot.getDirectoryHandle('game',{create:true})).getDirectoryHandle('assets',{create:true});const s=await(await a.getFileHandle('probe.webm',{create:true})).createWritable();await s.write(Uint8Array.from(atob(data),c=>c.charCodeAt(0)));await s.close();window.showDirectoryPicker=async()=>window.testRoot;}""",{'project':project,'data':base64.b64encode(media.read_bytes()).decode()})
  page.get_by_role('button',name='เปิดโฟลเดอร์โปรเจกต์',exact=True).click();expect(page.locator('.react-flow__node')).to_have_count(6);frames=[]
  for round in range(6):
   page.get_by_role('navigation').get_by_role('button',name='โปรเจกต์',exact=True).click()
   page.evaluate("""()=>{window.p7Promise=new Promise(resolve=>{const button=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='พรีวิว probe.webm');button.addEventListener('click',()=>{const start=performance.now();const observer=new MutationObserver(()=>{const v=document.querySelector('video.asset-preview');if(!v)return;observer.disconnect();v.muted=true;v.requestVideoFrameCallback((now,meta)=>resolve({ms:performance.now()-start,width:v.videoWidth,height:v.videoHeight,mediaTime:meta.mediaTime,presentedFrames:meta.presentedFrames}));v.play().catch(e=>resolve({error:String(e)}));});observer.observe(document.querySelector('main'),{childList:true,subtree:true});},{once:true});});}""")
   page.get_by_role('button',name='พรีวิว probe.webm',exact=True).click();frame=page.evaluate('window.p7Promise');assert 'error' not in frame,frame;assert (frame['width'],frame['height'])==(640,360);frames.append(frame);page.get_by_role('navigation').get_by_role('button',name='Story Graph',exact=True).click()
  metric('P7',[f['ms'] for f in frames],1000);report['media']={'sha256':hashlib.sha256(media.read_bytes()).hexdigest(),'path':str(media),'frames':frames};browser.close()
 # P4 deterministic release Brotli11, no media/fonts counted.
 wasm=ROOT/'temp/wasm-target/wasm32-unknown-unknown/release/sf_wasm.wasm'
 compressed=int(subprocess.check_output(['node','-e',"const fs=require('fs'),z=require('zlib');const b=fs.readFileSync(process.argv[1]);console.log(z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_QUALITY]:11}}).length)",str(wasm)],text=True));report['samples']['P4']={'bytes':compressed,'limit':1000000,'passed':compressed<=1000000,'rawBytes':wasm.stat().st_size,'sha256':hashlib.sha256(wasm.read_bytes()).hexdigest()}
 report['passed']=all(v['passed'] for v in report['samples'].values()) and not report['pageErrors'];print('P1–P7 passed',report['passed'],flush=True)
except Exception as e:report['error']=str(e);raise
finally:(OUT/'performance-P1-P7.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');server.shutdown()
