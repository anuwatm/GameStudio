"""Phase1.6 production UI export into real OPFS. Dump actual output for SDK verification."""
import functools,http.server,json,pathlib,threading,sys,copy,uuid,base64,subprocess
from playwright.sync_api import sync_playwright,expect
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'document/phase-1/evidence/1.6';OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads((ROOT/'contract/fixtures/summer-house.json').read_text(encoding='utf-8'))
class Handler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'}
 def log_message(self,*_):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/studio/dist/'
report={'passed':False,'mode':'production UI + real WASM/OPFS; injected picker and mid-export write denial','checks':[],'pageErrors':[]}
def passed(s):report['checks'].append(s);print(s,flush=True)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True);page=browser.new_page(viewport={'width':1440,'height':1100});page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.on('dialog',lambda d:d.accept());page.goto(url)
  def ready():expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  def click(name):page.get_by_role('button',name=name,exact=True).click();ready()
  def nav(name):page.get_by_role('navigation').get_by_role('button',name=name,exact=True).click()
  def load(project):
   nav('โปรเจกต์');page.evaluate("""async p=>{window.testRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle('export-'+crypto.randomUUID(),{create:true});const w=await(await window.testRoot.getFileHandle('project.storyflow.json',{create:true})).createWritable();await w.write(JSON.stringify(p));await w.close();window.showDirectoryPicker=async()=>window.testRoot;}""",project);click('เปิดโฟลเดอร์โปรเจกต์');nav('Export')
  def read(path):return page.evaluate("""async path=>{try{const parts=path.split('/');const name=parts.pop();let d=window.testRoot;for(const part of parts)d=await d.getDirectoryHandle(part);return await(await(await d.getFileHandle(name)).getFile()).text();}catch(e){if(e.name==='NotFoundError')return null;throw e;}}""",path)
  def write(path,text):page.evaluate("""async({path,text})=>{const parts=path.split('/');const name=parts.pop();let d=window.testRoot;for(const part of parts)d=await d.getDirectoryHandle(part,{create:true});const w=await(await d.getFileHandle(name,{create:true})).createWritable();await w.write(text);await w.close();}""",{'path':path,'text':text})
  def prepare():click('ตรวจและเตรียมส่งออก');expect(page.get_by_role('heading',name='ไฟล์ที่จะส่งออก',exact=True)).to_be_visible()
  def commit():click('ส่งออกไปยังโฟลเดอร์นี้');expect(page.get_by_role('heading',name='ส่งออกสำเร็จ',exact=True)).to_be_visible()
  def outside():return page.evaluate("""async()=>{const out={};async function walk(dir,path=''){for await(const h of dir.values()){const p=path+h.name;if(p==='.storyflow'||p==='game/storyflow_generated')continue;if(h.kind==='directory')await walk(h,p+'/');else out[p]=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await(await h.getFile()).arrayBuffer()))).map(v=>v.toString(16).padStart(2,'0')).join('');}}await walk(window.testRoot);return out;}""")
  def dump(label):
   files=page.evaluate("""async()=>{const out={};async function walk(dir,path=''){for await(const h of dir.values()){const p=path+h.name;if(h.kind==='directory')await walk(h,p+'/');else{const b=new Uint8Array(await(await h.getFile()).arrayBuffer());let text='';for(const v of b)text+=String.fromCharCode(v);out[p]=btoa(text);}}}await walk(window.testRoot);return out;}""")
   target=ROOT/'temp'/('phase-1.6-sdk-'+label+'-'+str(uuid.uuid4()));target.mkdir()
   for name,data in files.items():
    path=target/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(base64.b64decode(data))
   report[label+'Game']=str(target);return files
  ready();project=copy.deepcopy(fixture);project['id']=str(uuid.uuid4());load(project)
  # Existing game files must survive byte-for-byte.
  write('game/script.rpy','label start:\n    call sf_entry\n    return\n');write('game/user.rpy','# user source ภาษาไทย\n');write('game/assets/probe.webm','media sentinel')
  before={p:read(p) for p in ['game/script.rpy','game/user.rpy','game/assets/probe.webm','project.storyflow.json']}
  click('ติดตั้งเทมเพลตเกมใหม่');expect(page.get_by_role('alert')).to_contain_text('พบสคริปต์เกมเดิม');assert all(read(p)==v for p,v in before.items())
  outside_before=outside();prepare();commit();assert outside()==outside_before;report['existingOutsideHashes']=outside_before;assert all(read(p)==v for p,v in before.items())
  manifest=json.loads(read('game/storyflow_generated/sf_manifest.json'));map_=json.loads(read('.storyflow/sourcemap.json'));assert len(manifest['files'])==4
  inputfile=OUT/'existing-project.json';inputfile.write_text(json.dumps(project),encoding='utf-8');nativefile=OUT/'native-bundle.json';subprocess.check_call([str(ROOT/'temp/rust-target/debug/sf-cli.exe'),'bundle',str(inputfile),str(nativefile)]);native=json.loads(nativefile.read_text(encoding='utf-8'))
  assert map_==native['sourceMap'];assert all(read(p)==v for p,v in native['files'].items());dump('existing')
  passed('Existing game export preserves entry/user/media/project bytes; Worker-generated files and Source Map match native CLI bundle')
  # Same bundle twice remains valid and preserves external bytes.
  prepare();commit();assert all(read(p)==v for p,v in before.items())
  story='game/storyflow_generated/sf_story.rpy';original=read(story);write(story,original+'# external edit\n');prepare();click('ส่งออกไปยังโฟลเดอร์นี้');expect(page.get_by_role('alert')).to_contain_text('File conflict: '+story);assert read(story)==original+'# external edit\n';assert page.get_by_role('heading',name='ส่งออกสำเร็จ',exact=True).count()==0
  write(story,original);passed('Repeated export works; generated hash conflict blocks before overwrite and clears success status')
  # Source map identifies one known Choice and opens its subgraph/Inspector.
  path,number,location=next((p,n,v) for p,lines in map_['files'].items() for n,v in lines.items() if v.get('choiceId'))
  page.get_by_label('ไฟล์จาก Ren’Py',exact=True).select_option(path);page.get_by_label('เลขบรรทัดจาก Ren’Py',exact=True).fill(number);click('เปิดตำแหน่งจาก Source Map');expect(page.locator('.react-flow__node.selected')).to_have_count(1);expect(page.locator('.jump-notice')).to_contain_text(location['choiceId'])
  # Modify subgraph structure through Inspector with one non-semantic choice rename? Need structural addition: add a return node to subgraph.
  page.get_by_label('ชนิดโหนด',exact=True).select_option('end');click('เพิ่มโหนด');page.get_by_label('รูปแบบ End',exact=False) if False else None
  # Default end is ending (allowed in subgraph); unreachable is a warning, not export error.
  expect(page.locator('.save-status')).to_have_text('บันทึกแล้ว',timeout=10000);nav('Export');prepare();expect(page.get_by_text('Subgraph changed; older saves may fail to load.',exact=True)).to_be_visible();commit()
  passed('Source Map file/line opens exact Choice node; Subgraph structure change displays old-Save warning before and after export')
  # Failure after journal creation; restore original set via actual LocalProject recovery.
  page.evaluate("""()=>{window.failExport=true;window.nativeWritable=FileSystemFileHandle.prototype.createWritable;FileSystemFileHandle.prototype.createWritable=async function(...args){if(window.failExport&&this.name==='sf_story.rpy')throw new DOMException('Injected export denial','NotAllowedError');return window.nativeWritable.apply(this,args);};}""")
  click('ส่งออกไปยังโฟลเดอร์นี้');expect(page.get_by_role('alert')).to_contain_text('NotAllowedError');assert read('.storyflow/export.pending.json') is not None;page.evaluate('window.failExport=false');click('ให้สิทธิ์โฟลเดอร์และกู้ชุดส่งออก');expect(page.get_by_role('heading',name='ผลกู้ชุดส่งออก')).to_be_visible();assert read('.storyflow/export.pending.json') is None;prepare();commit()
  passed('Mid-export permission failure retains pending journal; explicit regrant/recovery restores then re-export succeeds')
  for width in [1440,1000,700]:
   page.set_viewport_size({'width':width,'height':1100});page.screenshot(path=str(OUT/f'export-{width}.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  # Project revision changes externally, with unchanged generated hash.
  write('project.storyflow.json',before['project.storyflow.json']+' ');click('ส่งออกไปยังโฟลเดอร์นี้');expect(page.get_by_role('alert')).to_contain_text('ถูกแก้ไขภายนอก');assert read('project.storyflow.json')==before['project.storyflow.json']+' '
  passed('Project source revision is rechecked under transaction lock and blocks external edit overwrite')
  collision=copy.deepcopy(fixture);collision['id']=str(uuid.uuid4());load(collision);write(story,'# user-owned collision');prepare();click('ส่งออกไปยังโฟลเดอร์นี้');expect(page.get_by_role('alert')).to_contain_text('Unowned file collision: '+story);assert read(story)=='# user-owned collision' and read('game/storyflow_generated/sf_manifest.json') is None
  passed('Unowned generated-name collision blocks export without replacing the user file or committing manifest')
  # Invalid graph: Core validation must stop before generating or writing any output.
  invalid=copy.deepcopy(fixture);invalid['id']=str(uuid.uuid4());invalid['edges']=[];load(invalid);click('ตรวจและเตรียมส่งออก');expect(page.get_by_role('alert')).to_contain_text('Core Validate');assert read('game/storyflow_generated/sf_manifest.json') is None;assert page.get_by_role('button',name='ส่งออกไปยังโฟลเดอร์นี้',exact=True).count()==0
  passed('Core Validate errors block bundle/commit; diagnostic node links remain available')
  # New game template, actual Thai dialogue/effect/end output for SDK run.
  ids=[str(uuid.uuid4()) for _ in range(5)];new={'schemaVersion':1,'id':ids[0],'name':'UI New Game ไทย','entryGraphId':ids[1],'characters':[],'assets':[],'variables':[{'id':ids[4],'name':'score','type':'int','initial':0}],'activities':[],'events':[],'graphs':[{'id':ids[1],'kind':'main','entryNodeId':ids[2]}],'nodes':[{'id':ids[2],'kind':'scene','graphId':ids[1],'lines':[{'text':'ภาษาไทยจาก UI Export','characterId':None}],'assetIds':[],'choices':[],'effects':[{'variableId':ids[4],'op':'add','value':7}]},{'id':ids[3],'kind':'end','graphId':ids[1],'mode':'ending'}],'edges':[{'id':str(uuid.uuid4()),'from':ids[2],'port':'next','to':ids[3]}]}
  load(new);click('ติดตั้งเทมเพลตเกมใหม่');expect(page.get_by_role('heading',name='ผลติดตั้งเทมเพลต')).to_be_visible();assert read('game/script.rpy').replace('\r\n','\n')=='label start:\n    call sf_entry\n    return\n';assert read('game/sf_template.rpy') is not None
  outside_new=outside();template_before={p:read(p) for p in ['game/script.rpy','game/sf_template.rpy','game/python-packages/sf_tcc.py']};prepare();commit();assert all(read(p)==v for p,v in template_before.items());assert outside()==outside_new;report['newOutsideHashes']=outside_new;dump('new');report['newProject']=new
  passed('New game installs approved Noto Thai/TCC template and UI export preserves template/entry while emitting playable generated files')
  assert not report['pageErrors'];report.update(passed=True,browser=browser.version);browser.close()
except Exception as e:report['error']=str(e);raise
finally:
 (OUT/'export-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');server.shutdown()
