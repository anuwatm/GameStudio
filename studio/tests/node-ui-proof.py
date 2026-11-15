"""Phase1.8.1 actual production UI + Worker/OPFS; native picker not claimed."""
import functools,http.server,json,pathlib,threading,sys,base64
from playwright.sync_api import sync_playwright,expect
sys.stdout.reconfigure(encoding='utf-8');ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'document/phase-1/evidence/1.8.1';OUT.mkdir(parents=True,exist_ok=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.js':'text/javascript','.wasm':'application/wasm'}
 def log_message(self,*_):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/studio/dist/';report={'passed':False,'checks':[],'errors':[],'mode':'production Worker/OPFS; injected picker'}
def passed(s):report['checks'].append(s);print(s,flush=True)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True);page=browser.new_page(viewport={'width':1440,'height':1100});page.on('pageerror',lambda e:report['errors'].append(str(e)));page.goto(url);expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  project=json.loads((ROOT/'contract/fixtures/summer-house.json').read_text(encoding='utf8'));scene=project['nodes'][0]['id'];other=next(n['id'] for n in project['nodes'] if n['id']!=scene and n['graphId']==project['entryGraphId']);project['assets']=[{'id':'00000000-0000-4000-8000-000000000901','path':'thumbnail.png'}];project['nodes'][0]['assetIds']=[project['assets'][0]['id']]
  page.evaluate("""async project=>{window.testRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle('node-ui-'+crypto.randomUUID(),{create:true});let w=await(await window.testRoot.getFileHandle('project.storyflow.json',{create:true})).createWritable();await w.write(JSON.stringify(project));await w.close();const a=await(await window.testRoot.getDirectoryHandle('game',{create:true})).getDirectoryHandle('assets',{create:true});w=await(await a.getFileHandle('thumbnail.png',{create:true})).createWritable();await w.write(Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0)));await w.close();window.showDirectoryPicker=async()=>window.testRoot;window.revoked=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{window.revoked.push(u);revoke(u);};}""",project)
  def click(name):page.get_by_role('button',name=name,exact=True).click();expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  click('เปิดโฟลเดอร์โปรเจกต์')
  def select(id):page.get_by_label('เลือกโหนด',exact=True).select_option(id);expect(page.locator('.node-inspector>code')).to_have_text(id);click('โฟกัสโหนด')
  def disk():return page.evaluate("async()=>JSON.parse(await(await window.testRoot.getFileHandle('project.storyflow.json')).getFile().then(f=>f.text()))")
  select(scene);before=disk();expect(page.locator('.node-thumbnail')).to_be_visible();page.wait_for_function("document.querySelector('.node-thumbnail').naturalWidth===1")
  page.get_by_label('บทพูด 1',exact=True).fill('ร่างที่ยังไม่ Apply');select(other);select(scene);expect(page.get_by_label('บทพูด 1',exact=True)).to_have_value('ร่างที่ยังไม่ Apply');page.wait_for_timeout(2300);assert disk()==before
  click('ยกเลิกการแก้ไขโหนด');expect(page.get_by_label('บทพูด 1',exact=True)).to_have_value(before['nodes'][0]['lines'][0]['text']);assert page.evaluate('window.revoked.length')>=1
  passed('Inspector draft survives selection changes; Cancel restores canonical; no draft Autosave before Apply; selected thumbnail URL released')
  card=page.locator(f'.react-flow__node[data-id="{scene}"]');card.get_by_role('button',name='แก้ข้อความบนกราฟ',exact=True).click();card.get_by_label('บทพูดบนกราฟ',exact=True).fill('inline draft survives remount')
  page.get_by_role('navigation').get_by_role('button',name='โปรเจกต์',exact=True).click();page.get_by_role('navigation').get_by_role('button',name='Story Graph',exact=True).click();select(scene);card=page.locator(f'.react-flow__node[data-id="{scene}"]');expect(card.get_by_label('บทพูดบนกราฟ',exact=True)).to_have_value('inline draft survives remount');card.get_by_role('button',name='ยกเลิก',exact=True).click();assert disk()==before
  passed('Inline card draft survives graph unmount/remount and Cancel leaves canonical disk unchanged')
  page.get_by_label('บทพูด 1',exact=True).fill('ฉากภาษาไทยที่ใช้จริง');click('ใช้การแก้ไขโหนด');expect(page.locator('.node-inspector [role=alert]')).to_have_count(0);expect(page.get_by_role('button',name='ใช้การแก้ไขโหนด',exact=True)).to_be_disabled();click('Undo');expect(page.get_by_label('บทพูด 1',exact=True)).to_have_value(before['nodes'][0]['lines'][0]['text']);click('Redo');expect(page.get_by_label('บทพูด 1',exact=True)).to_have_value('ฉากภาษาไทยที่ใช้จริง')
  passed('Apply and Undo/Redo synchronize graph/Inspector without false draft conflicts')
  kinds={}
  for kind in ['scene','branch','effect','schedule','end']:
   ids=page.get_by_label('เลือกโหนด',exact=True).locator('option').evaluate_all('(els)=>els.map(e=>e.value)');page.get_by_label('ชนิดโหนด',exact=True).select_option(kind);click('เพิ่มโหนด');id=next(v for v in page.get_by_label('เลือกโหนด',exact=True).locator('option').evaluate_all('(els)=>els.map(e=>e.value)') if v and v not in ids);select(id);card=page.locator(f'.react-flow__node[data-id="{id}"]');expect(card.locator('.node-kind-title')).to_be_visible();ports=card.locator('.react-flow__handle.source').evaluate_all('(els)=>els.map(e=>e.dataset.handleid)');assert ports=={'scene':['next'],'branch':['true','false'],'effect':['next'],'schedule':['onComplete'],'end':[]}[kind],(kind,ports);kinds[kind]=id
   card.get_by_role('button',name='เปิด Inspector',exact=True).focus();page.keyboard.press('Enter');expect(page.locator('#node-inspector-title')).to_be_focused();page.screenshot(path=str(OUT/f'node-{kind}.png'),full_page=True)
  report['nodeIds']=kinds;passed('All five node cards expose correct Contract ports; keyboard opens and focuses Inspector; End has no outgoing handle')
  select(scene);page.get_by_label('บทพูด 1',exact=True).fill('ชื่อฉากยาวและข้อความภาษาไทย'*12);click('เพิ่มตัวเลือก');page.get_by_label('ตัวเลือก 1',exact=True).fill('ทางเลือกที่ยาวมาก'*10);click('ใช้การแก้ไขโหนด');card=page.locator(f'.react-flow__node[data-id="{scene}"]');expect(card.locator('.node-port-row')).to_have_count(2);expect(card).to_contain_text('ไม่มี Choice ผ่าน visibleIf');assert card.locator('[data-handleid="next"]').count()==0
  click('ตรวจโปรเจกต์ (Validate)');select(kinds['branch']);expect(page.locator(f'.react-flow__node[data-id="{kinds["branch"]}"] .node-issues')).to_contain_text('Error')
  passed('Choice UUID and fallback replace next; fallback copy is accurate; Core validation issues appear on affected cards')
  select(scene)
  for width in [1440,1000,700]:
   page.set_viewport_size({'width':width,'height':1100});click('โฟกัสโหนด');page.screenshot(path=str(OUT/f'node-ui-{width}.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  passed('Long Thai content and controls remain accessible without page overflow at 1440/1000/700')
  assert not report['errors'];report['passed']=True;report['browser']=browser.version;browser.close()
except Exception as e:report['error']=str(e);raise
finally:(OUT/'node-ui-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');server.shutdown()
