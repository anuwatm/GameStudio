"""Production UI + real WASM Worker. OPFS picker injection, no game logic mock."""
import functools,http.server,json,pathlib,threading,sys,copy,subprocess
from playwright.sync_api import sync_playwright,expect
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'document/phase-1/evidence/1.4';OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads((ROOT/'contract/fixtures/summer-house.json').read_text(encoding='utf-8'))
class Handler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'}
 def log_message(self,*_):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
report={'passed':False,'mode':'production UI + real Worker; OPFS injected picker','checks':[],'pageErrors':[]}
def passed(s):report['checks'].append(s);print(s,flush=True)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True)
  page=browser.new_page(viewport={'width':1440,'height':1100});page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.on('dialog',lambda d:d.accept())
  page.goto(f'http://127.0.0.1:{server.server_port}/studio/dist/')
  def settled():expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  def click(name):page.get_by_role('button',name=name,exact=True).click();settled()
  def nav(name):page.get_by_role('navigation',name='พื้นที่ทำงาน').get_by_role('button',name=name,exact=True).click()
  def load(project):
   nav('โปรเจกต์');page.evaluate("""async project=>{window.testRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle('play-'+crypto.randomUUID(),{create:true});const w=await(await window.testRoot.getFileHandle('project.storyflow.json',{create:true})).createWritable();await w.write(JSON.stringify(project));await w.close();window.showDirectoryPicker=async()=>window.testRoot;}""",project);click('เปิดโฟลเดอร์โปรเจกต์');expect(page.locator('.react-flow__node')).to_have_count(sum(n['graphId']==project['entryGraphId'] for n in project['nodes']))
  def trace():
   with page.expect_download() as d:click('ดาวน์โหลด Trace JSON')
   return json.loads(pathlib.Path(d.value.path()).read_text(encoding='utf-8'))
  settled();load(fixture);nav('Playtest');expect(page.get_by_role('status').filter(has_text='ยังไม่เริ่ม')).to_be_visible();click('เริ่มจาก Entry')
  choices=page.get_by_label('ทางเลือกที่ Core อนุญาต');assert choices.get_by_role('button').count()>0
  expect(page.get_by_role('button',name='บันทึกโปรเจกต์',exact=True)).to_be_disabled()
  passed('Entry start returns real RunState and activity choices; saved Project unchanged')
  # SetVar error preserves successful state; 19/20 explanations are from Rust.
  variable=fixture['variables'][0]
  page.get_by_label('ตัวแปรจำลอง',exact=True).select_option(variable['id']);page.get_by_label('ค่าจำลองใหม่',exact=True).fill('19');click('ใช้ SetVar')
  expect(page.locator('.play-layout table').first).to_contain_text('19')
  before=trace();page.get_by_label('ค่าจำลองใหม่',exact=True).fill('2147483648');click('ใช้ SetVar');expect(page.get_by_role('alert')).to_contain_text('Invalid variable value');assert trace()==before
  page.get_by_label('ค่าจำลองใหม่',exact=True).fill('20');click('ใช้ SetVar');click('ย้อน RunState');expect(page.locator('.play-layout table').first).to_contain_text('19')
  page.get_by_label('จำนวนก้าวย้อนหลัง',exact=True).fill('9999');click('ย้อน RunState');expect(page.get_by_role('alert')).to_contain_text('Insufficient rewind history');assert trace()==before
  passed('Typed SetVar bounds failure is atomic; Rewind restores prior value; insufficient history preserves trace')
  click('เริ่มจาก Entry')
  inputs=json.loads((ROOT/'contract/fixtures/summer-house-cases.json').read_text(encoding='utf-8'))['cases'][0]['inputs']
  for id in inputs:
   name=next((a['name'] for a in fixture['activities'] if a['id']==id),None) or next(c['text'] for n in fixture['nodes'] for c in n.get('choices',[]) if c['id']==id)
   choices.get_by_role('button',name=name,exact=True).click();settled()
  expect(page.get_by_role('heading',name='วัน 3 · จบการเล่น')).to_be_visible();rows=trace();assert rows[-1]['ending']==inputs[-1].replace('000000000015','000000000009')
  assert all(len(row)==12 for row in rows);assert any(row['varsBefore']!=row['varsAfter'] for row in rows)
  expect(page.locator('.play-explain')).to_contain_text('Core ไม่คืน ExplainCondition');page.locator('.trace-step').first.locator('summary').first.click();expect(page.locator('.trace-step').first.locator('table')).to_be_visible()
  messages=[]
  def request(name,payload):messages.append({'contractVersion':1,'requestId':str(len(messages)+1),'kind':'query' if name=='getTrace' else 'command','name':name,'payload':payload})
  request('openProject',{'project':fixture});request('startPlaytest',{})
  for id in inputs:request('choose',{'choiceId':id})
  request('getTrace',{});(OUT/'ui-trace-messages.json').write_text(json.dumps(messages),encoding='utf-8')
  native=json.loads(subprocess.check_output([str(ROOT/'temp/rust-target/debug/sf-cli.exe'),'protocol',str(OUT/'ui-trace-messages.json')],text=True,encoding='utf-8'));assert native[-1]['value']['trace']==rows
  report['nativeTraceParity']={'equal':True,'steps':len(rows)};report['browser']=browser.version
  (OUT/'ui-trace.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
  passed('Summer House Activity→Event→Choice→Ending; 12-field trace download and before/after values')
  # Graph navigation from a traced choice; selected start works.
  choice_step=next(i for i,r in enumerate(rows) if any(c['id']==r['choiceId'] for n in fixture['nodes'] for c in n.get('choices',[])))
  row=page.locator('.trace-step').nth(choice_step);row.locator('summary').first.click();row.get_by_role('button',name='เปิด Choice',exact=False).click()
  expect(page.locator('.jump-notice')).to_contain_text('Choice:');expect(page.locator('.react-flow__node.selected')).to_have_count(1)
  click('Playtest จากโหนดนี้');expect(page.get_by_role('heading',name='Playtest',exact=True)).to_be_visible()
  passed('Trace choice jumps to selected graph node with choice identity; start selected node uses Core')
  # Snapshot survives editor changes. SetVar is not an edit or save.
  nav('โปรเจกต์');page.get_by_label('ชื่อโปรเจกต์',exact=True).fill('Edited while playing');click('ใช้ชื่อโปรเจกต์');nav('Playtest');expect(page.get_by_role('status').filter(has_text='snapshot เดิม')).to_be_visible()
  click('เริ่มจาก Entry');assert page.get_by_role('status').filter(has_text='snapshot เดิม').count()==0
  nav('โปรเจกต์');click('เปิดโฟลเดอร์โปรเจกต์');nav('Playtest');expect(page.get_by_role('status').filter(has_text='ยังไม่เริ่ม')).to_be_visible()
  saved=page.evaluate("async()=>JSON.parse(await(await window.testRoot.getFileHandle('project.storyflow.json')).getFile().then(f=>f.text()))");assert saved==fixture
  passed('Editor changes retain explicitly labelled old snapshot; restart refreshes; load clears run; saved bytes untouched')
  # Select branch directly; show affection >=20 at19, then20, using visibleIf in scene.
  probe=copy.deepcopy(fixture);scene=next(n for n in probe['nodes'] if len(n.get('choices',[]))>1)
  scene['choices'][1]['visibleIf']=None
  scene['choices'][0]['visibleIf']={'kind':'compare','left':{'kind':'variable','variableId':variable['id']},'operator':'ge','right':{'kind':'literal','value':20}}
  load(probe);page.get_by_label('Graph',exact=True).select_option(scene['graphId']);page.get_by_label('เลือกโหนด',exact=True).select_option(scene['id']);click('Playtest จากโหนดนี้');page.get_by_label('ตัวแปรจำลอง',exact=True).select_option(variable['id']);page.get_by_label('ค่าจำลองใหม่',exact=True).fill('19');click('ใช้ SetVar');expect(page.locator('.play-explain')).to_contain_text('ขาดอีก 1');assert choices.get_by_role('button',name=scene['choices'][0]['text'],exact=True).count()==0
  page.get_by_label('ค่าจำลองใหม่',exact=True).fill('20');click('ใช้ SetVar');expect(choices.get_by_role('button',name=scene['choices'][0]['text'],exact=True)).to_be_visible()
  expect(page.get_by_role('button',name='บันทึกโปรเจกต์',exact=True)).to_be_disabled();expect(page.get_by_role('button',name='Undo',exact=True)).to_be_disabled()
  passed('Core condition at19 hides Choice with deficit1 explanation; at20 unlocks without modifying Project')
  page.get_by_label('ค่าจำลองใหม่',exact=True).focus();page.keyboard.press('Tab');assert page.get_by_role('button',name='ใช้ SetVar',exact=True).evaluate("e=>e===document.activeElement&&getComputedStyle(e).outlineStyle!=='none'")
  report['keyboardFocusVisible']=True
  for width in [1440,1000,700]:
   page.set_viewport_size({'width':width,'height':1100});page.screenshot(path=str(OUT/f'playtest-{width}.png'),full_page=True);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.set_viewport_size({'width':1440,'height':1100})
  nav('Validate');click('ตรวจโปรเจกต์ (Validate)');expect(page.get_by_role('status').filter(has_text='ไม่พบปัญหา')).to_be_visible()
  broken=copy.deepcopy(fixture);broken['edges']=[e for e in broken['edges'] if e['from']!=broken['nodes'][0]['id']]
  load(broken);nav('Validate');click('ตรวจโปรเจกต์ (Validate)');expect(page.locator('.diagnostic-list')).to_contain_text('V002');page.screenshot(path=str(OUT/'diagnostics-1440.png'),full_page=True)
  page.get_by_role('button',name='เปิดโหนดต้นเหตุ',exact=False).first.click();expect(page.locator('.react-flow__node.selected')).to_have_count(1)
  passed('Diagnostics empty and Core errors; nodeId opens source node')
  # Project-level issues do not invent a node. Core blocks invalid playtest.
  invalid=copy.deepcopy(fixture);invalid['variables'][0]['initial']=999999
  load(invalid);nav('Validate');click('ตรวจโปรเจกต์ (Validate)');expect(page.locator('.diagnostic-list')).to_contain_text('Core ไม่ระบุ nodeId');nav('Playtest');click('เริ่มจาก Entry');expect(page.get_by_role('alert')).to_contain_text('V020');expect(page.get_by_role('status').filter(has_text='ยังไม่เริ่ม')).to_be_visible()
  passed('Project-level Diagnostics has no fabricated node; validation blocks invalid start without stale run')
  typed=copy.deepcopy(probe)
  typed['variables'] += [{'id':'00000000-0000-4000-8000-000000000301','name':'flag','type':'bool','initial':False},{'id':'00000000-0000-4000-8000-000000000302','name':'text','type':'string','initial':'เริ่ม'}]
  load(typed);page.get_by_label('Graph',exact=True).select_option(scene['graphId']);page.get_by_label('เลือกโหนด',exact=True).select_option(scene['id']);click('Playtest จากโหนดนี้')
  page.get_by_label('ตัวแปรจำลอง',exact=True).select_option(typed['variables'][-2]['id']);page.get_by_label('ค่าจำลองใหม่',exact=True).select_option('true');click('ใช้ SetVar');expect(page.locator('.play-layout table').first.get_by_role('row').filter(has_text='flag')).to_contain_text('true')
  page.get_by_label('ตัวแปรจำลอง',exact=True).select_option(typed['variables'][-1]['id']);page.get_by_label('ค่าจำลองใหม่',exact=True).fill('ภาษาไทย 42');click('ใช้ SetVar');expect(page.locator('.play-layout table').first).to_contain_text('ภาษาไทย 42');expect(page.get_by_role('button',name='Undo',exact=True)).to_be_disabled();expect(page.get_by_role('button',name='บันทึกโปรเจกต์',exact=True)).to_be_disabled()
  passed('bool/string SetVar retains Scalar types and Unicode without edit history or dirty state')
  assert not report['pageErrors'];report['passed']=True;browser.close()
except Exception as e:
 report['error']=str(e)
 try:page.screenshot(path=str(OUT/'failure.png'),full_page=True);(OUT/'failure.txt').write_text(page.locator('body').inner_text(),encoding='utf-8')
 except:pass
 raise
finally:
 (OUT/'playtest-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');server.shutdown()
