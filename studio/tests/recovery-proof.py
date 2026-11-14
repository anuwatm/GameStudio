"""Phase1.5 real IndexedDB/Web Locks/OPFS, production UI + WASM. Native OS prompt not claimed."""
import functools,http.server,json,pathlib,threading,sys,copy,uuid,time
from playwright.sync_api import sync_playwright,expect
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'document/phase-1/evidence/1.5';OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads((ROOT/'contract/fixtures/summer-house.json').read_text(encoding='utf-8'))
class Handler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'}
 def log_message(self,*_):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/studio/dist/'
report={'passed':False,'mode':'production UI + real Worker/IndexedDB/Web Locks/OPFS; injected picker, write and IDB faults','checks':[],'pageErrors':[]}
def passed(s):report['checks'].append(s);print(s,flush=True)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True);context=browser.new_context(accept_downloads=True,viewport={'width':1440,'height':1100})
  def newpage():
   page=context.new_page();page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.on('dialog',lambda d:d.accept());page.goto(url);expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน');return page
  page=newpage()
  def settled(p=None):expect((p or page).locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  def click(name,p=None):(p or page).get_by_role('button',name=name,exact=True).click();settled(p)
  def nav(name,p=None):(p or page).get_by_role('navigation').get_by_role('button',name=name,exact=True).click()
  def install(rootname,p=None):
   (p or page).evaluate("""async name=>{window.testRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle(name,{create:true});window.showDirectoryPicker=async()=>window.testRoot;}""",rootname)
  def load():
   project=copy.deepcopy(fixture);project['id']=str(uuid.uuid4());rootname='recovery-'+str(uuid.uuid4());install(rootname)
   page.evaluate("""async p=>{const w=await(await window.testRoot.getFileHandle('project.storyflow.json',{create:true})).createWritable();await w.write(JSON.stringify(p));await w.close();}""",project)
   nav('โปรเจกต์');click('เปิดโฟลเดอร์โปรเจกต์');expect(page.locator('.react-flow__node')).to_have_count(6);return project,rootname
  def disk(p=None):return (p or page).evaluate("async()=>JSON.parse(await(await window.testRoot.getFileHandle('project.storyflow.json')).getFile().then(f=>f.text()))")
  def rows(p=None):return (p or page).evaluate("""async()=>{const db=await new Promise((res,rej)=>{const q=indexedDB.open('storyflow-recovery',1);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});try{return await new Promise((res,rej)=>{const tx=db.transaction('drafts');const q=tx.objectStore('drafts').getAll();q.onsuccess=()=>res(q.result.map(({root,...r})=>r));q.onerror=()=>rej(q.error);});}finally{db.close();}}""")
  def edit(name):nav('โปรเจกต์');page.get_by_label('ชื่อโปรเจกต์',exact=True).fill(name);click('ใช้ชื่อโปรเจกต์');expect(page.locator('.project-name')).to_have_text(name)
  def saved(name):expect(page.locator('.save-status')).to_have_text('บันทึกแล้ว',timeout=10000);assert disk()['name']==name
  original,root=load();edit('ร่างแรก');first=next(r for r in rows() if r['project']['id']==original['id']);assert first['sourceRevision'] and first['revision'];assert disk()['name']==original['name']
  edit('ร่างล่าสุด');second=next(r for r in rows() if r['project']['id']==original['id']);assert second['revision']!=first['revision'];page.wait_for_timeout(600);assert disk()['name']==original['name'];saved('ร่างล่าสุด');assert not any(r['project']['id']==original['id'] for r in rows())
  passed('Debounced Autosave writes latest acknowledged edit after ~2s; IDB precedes disk and clears committed draft')
  edit('กู้หลังปิดหน้า');assert any(r['project']['name']=='กู้หลังปิดหน้า' for r in rows());page.close();page=newpage();install(root);page.get_by_text('ร่างที่กู้คืนได้',exact=False).click();click('กู้คืนร่าง');expect(page.locator('.project-name')).to_have_text('กู้หลังปิดหน้า');saved('กู้หลังปิดหน้า')
  passed('Real page close before debounce → persisted IndexedDB draft and folder handle → recovery to unchanged source revision')
  # A second tab cannot open same Project ID, even if it picked the same folder itself.
  other=newpage();install(root,other);click('เปิดโฟลเดอร์โปรเจกต์',other);expect(other.get_by_role('alert')).to_contain_text('เปิดอยู่ในแท็บอื่น');assert disk(other)['name']=='กู้หลังปิดหน้า';page.close();page=other;click('เปิดโฟลเดอร์โปรเจกต์');expect(page.locator('.react-flow__node')).to_have_count(6)
  passed('Session Web Lock blocks duplicate tab before editing; page close releases ownership and next tab opens')
  # Permission failure affects folder writes only, not IDB.
  page.evaluate("""()=>{window.denyWrite=true;window.originalWritable=FileSystemFileHandle.prototype.createWritable;FileSystemFileHandle.prototype.createWritable=async function(...args){if(window.denyWrite)throw new DOMException('Injected write denial','NotAllowedError');return window.originalWritable.apply(this,args);};window.regrants=0;FileSystemDirectoryHandle.prototype.requestPermission=async()=>{window.regrants++;return 'granted';};}""")
  edit('ร่างหลังสิทธิ์หลุด');expect(page.get_by_role('alert')).to_contain_text('NotAllowedError',timeout=10000);assert disk()['name']=='กู้หลังปิดหน้า';assert any(r['project']['name']=='ร่างหลังสิทธิ์หลุด' for r in rows());page.evaluate('window.denyWrite=false');click('ให้สิทธิ์โฟลเดอร์ใหม่และบันทึก');saved('ร่างหลังสิทธิ์หลุด');assert page.evaluate('window.regrants')==1
  passed('Write permission loss pauses Autosave with recoverable draft; user regrant action retries successfully')
  # External editor changes disk during debounce.
  edit('Local conflict draft');external=disk();external['name']='External preserved';page.evaluate("""async p=>{const w=await(await window.testRoot.getFileHandle('project.storyflow.json')).createWritable();await w.write(JSON.stringify(p));await w.close();}""",external)
  expect(page.get_by_role('alert')).to_contain_text('ถูกแก้ไขภายนอก',timeout=10000);assert disk()==external;click('Undo');expect(page.locator('.save-status')).to_contain_text('ตรวจไฟล์บนดิสก์');expect(page.get_by_role('button',name='เปิดร่างเป็นสำเนา',exact=True)).to_be_disabled();click('Redo');click('เปิดร่างเป็นสำเนา');expect(page.locator('.project-name')).to_have_text('Local conflict draft (สำเนากู้คืน)');assert disk()==external
  copied=next(r for r in rows() if r['project']['name']=='Local conflict draft (สำเนากู้คืน)');assert copied['project']['id']!=original['id'] and copied['sourceRevision'] is None;expect(page.get_by_role('button',name='บันทึกโปรเจกต์',exact=True)).to_be_disabled()
  passed('External hash conflict never overwrites file; copy gets new Project ID and detached folder')
  # Reopening the source sees the previous draft and explicitly offers recovery/discard.
  page.close();page=newpage();install(root);click('เปิดโฟลเดอร์โปรเจกต์');expect(page.locator('.recovery-panel details')).to_have_attribute('open','');click('กู้คืนร่าง');expect(page.locator('.project-name')).to_have_text('Local conflict draft (สำเนากู้คืน)');assert disk()==external
  passed('Recovery detects revision changed while page was closed; opens detached copy without writing external source')
  # Quota failure must not claim latest draft is safe or save to disk.
  fresh,freshroot=load();page.evaluate("""()=>{window.failDraft=true;window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(window.failDraft&&this.name==='drafts')throw new DOMException('Injected quota failure','QuotaExceededError');return window.originalPut.apply(this,args);};}""")
  edit('Quota failure retained');expect(page.get_by_role('alert')).to_contain_text('QuotaExceededError');expect(page.locator('.save-status')).to_contain_text('เก็บร่างไม่ได้');page.wait_for_timeout(2300);assert disk()==fresh
  page.evaluate('window.failDraft=false');click('ลองเก็บร่างอีกครั้ง');saved('Quota failure retained')
  passed('IDB quota failure retains acknowledged memory, blocks disk Autosave and exposes retry without false recoverable status')
  edit('Undo before debounce');click('Undo');saved('Quota failure retained');assert not any(r['project']['id']==fresh['id'] for r in rows())
  passed('Undo to saved baseline removes obsolete draft and does not resurrect undone edits')
  # Keep an active recoverable memory draft and capture responsive UI.
  edit('Recoverable responsive draft');page.evaluate('window.denyWrite=true')
  page.locator('.recovery-panel summary').first.click()
  for width in [1440,1000,700]:
   page.set_viewport_size({'width':width,'height':1100});page.screenshot(path=str(OUT/f'recovery-{width}.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not report['pageErrors'];report.update(passed=True,browser=browser.version);browser.close()
except Exception as e:report['error']=str(e);raise
finally:
 (OUT/'recovery-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');server.shutdown()
