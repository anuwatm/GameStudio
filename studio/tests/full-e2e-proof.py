"""Rebuild every Summer House rule with UI controls, then check canonical data and Core parity."""
import functools,http.server,json,pathlib,threading,sys,copy,re,subprocess,os
from playwright.sync_api import sync_playwright,expect
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'document/phase-1/evidence/1.7/full-e2e';OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads((ROOT/'contract/fixtures/summer-house.json').read_text(encoding='utf-8'))
cases=json.loads((ROOT/'contract/fixtures/summer-house-cases.json').read_text(encoding='utf-8'))['cases']
class Handler(http.server.SimpleHTTPRequestHandler):
 extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'}
 def log_message(self,*_):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
report={'passed':False,'mode':'production UI + real Worker; OPFS handles with injected picker','checks':[],'pageErrors':[]}
def passed(name):report['checks'].append(name);print(name)
def remap(value,mapping):
 if isinstance(value,str):return mapping.get(value,value)
 if isinstance(value,list):return [remap(v,mapping) for v in value]
 if isinstance(value,dict):
  result={mapping.get(k,k):remap(v,mapping) for k,v in value.items()}
  # ExplainCondition.expression contains a serialized AST. Normalize only its UUIDs,
  # retaining all AST content instead of ignoring the expression field.
  if isinstance(result.get('expression'),str):
   try:result['expression']=json.dumps(remap(json.loads(result['expression']),mapping),ensure_ascii=False,separators=(',',':'),sort_keys=True)
   except json.JSONDecodeError:pass
  return result
 return value
BASE_MAP={}
def fid(value):return BASE_MAP.get(value,value)
def canonical(p):
 p=copy.deepcopy(p)
 for key in ['nodes','edges','graphs']:p[key]=sorted(p[key],key=lambda row:row['id'])
 return p
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True)
  page=browser.new_page(viewport={'width':1440,'height':1100})
  page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.on('dialog',lambda dialog:dialog.accept())
  page.goto(base+'/studio/dist/')
  expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  from ui_summer_graph import build_summer_graph
  BASE_MAP=build_summer_graph(page,fixture);report['graphUUIDMapping']=BASE_MAP;fixture=remap(fixture,BASE_MAP);cases=remap(cases,BASE_MAP)
  passed('Created Project, both Graphs, all nine Nodes, Choices, entry points and nine Edges through UI; no skeleton/JSON injection')
  def settled():expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  def click(name):page.get_by_role('button',name=name,exact=True).click();settled()
  def save():
   settled();b=page.get_by_role('button',name='บันทึกโปรเจกต์',exact=True)
   if b.is_enabled():b.click();settled();expect(b).to_be_disabled()
  def saved():return page.evaluate("async()=>JSON.parse(await(await window.rulesRoot.getFileHandle('project.storyflow.json')).getFile().then(f=>f.text()))")
  def tab(name):page.get_by_role('tab',name=name,exact=True).click()
  def compare(label,leftkind='variable',variable=None,value='20',operator='ge'):
   page.get_by_label(label+' รูปแบบ',exact=True).select_option('compare')
   page.get_by_label(label+' ซ้าย แหล่งค่า',exact=True).select_option(leftkind)
   if variable:page.get_by_label(label+' ซ้าย ตัวแปร',exact=True).select_option(variable)
   page.get_by_label(label+' operator',exact=True).select_option(operator)
   page.get_by_label(label+' ขวา แหล่งค่า',exact=True).select_option('literal')
   page.get_by_label(label+' ขวา ชนิด literal',exact=True).select_option('int')
   page.get_by_label(label+' ขวา ค่า literal',exact=True).fill(value)
  def effect(label,index,variable,op,value):
   click('เพิ่ม '+label)
   page.get_by_label(f'{label} {index} ตัวแปร',exact=True).select_option(variable)
   page.get_by_label(f'{label} {index} op',exact=True).select_option(op)
   field=page.get_by_label(f'{label} {index} ค่า',exact=True)
   if field.evaluate('(e)=>e.tagName')=='SELECT':field.select_option(value)
   else:field.fill(value)
  def graph_node(id,graph=fid('00000000-0000-4000-8000-000000000002')):
   click('Story Graph');page.get_by_label('Graph',exact=True).select_option(graph)
   page.get_by_label('เลือกโหนด',exact=True).select_option(id)
  click('Rules & Schedule')
  # Keyboard tab navigation follows the ARIA tab pattern.
  page.get_by_role('tab',name='Variables',exact=True).focus();page.keyboard.press('ArrowRight')
  expect(page.get_by_role('tab',name='Daily Schedule',exact=True)).to_have_attribute('aria-selected','true')
  page.keyboard.press('Home');expect(page.get_by_role('tab',name='Variables',exact=True)).to_have_attribute('aria-selected','true')
  for variable in fixture['variables']:
   click('เพิ่มตัวแปร');row=page.locator('.variable-grid .rule-record').last
   row.get_by_label('ชื่อตัวแปร',exact=True).fill(variable['name']);row.get_by_label('initial',exact=True).fill(str(variable['initial']))
   for bound in ('min','max'):
    if bound in variable:row.get_by_label('กำหนด '+bound,exact=True).check();row.get_by_label(bound,exact=True).fill(str(variable[bound]))
   row.get_by_role('button',name='ใช้ตัวแปร',exact=True).click();settled()
  save();variables={v['name']:v['id'] for v in saved()['variables']}
  passed('Declare Summer House Variables with initial/min/max using UI; keyboard tabs work')
  tab('Daily Schedule')
  for activity in fixture['activities']:
   click('เพิ่มกิจกรรม');page.get_by_label('ชื่อกิจกรรม',exact=True).fill(activity['name'])
   if activity['condition']:compare('Activity condition',variable=variables['energy'])
   for index,e in enumerate(activity['effects'],1):
    name=next(v['name'] for v in fixture['variables'] if v['id']==e['variableId'])
    effect('Activity Effects',index,variables[name],e['op'],str(e['value']))
   click('ใช้กิจกรรม')
  tab('Events');click('เพิ่ม Event')
  page.get_by_label('Event phase',exact=True).select_option('after_activity');page.get_by_label('priority',exact=True).fill('1');page.get_by_label('order',exact=True).fill('0');page.get_by_label('once',exact=True).check()
  page.get_by_label('Event condition รูปแบบ',exact=True).select_option('all')
  click('เพิ่มเงื่อนไขใน Event condition');click('เพิ่มเงื่อนไขใน Event condition')
  compare('Event condition ข้อ 1',leftkind='day',value='3');compare('Event condition ข้อ 2',variable=variables['affection'],value='20')
  page.get_by_label('Event condition รูปแบบ',exact=True).select_option('any');page.get_by_label('Event condition รูปแบบ',exact=True).select_option('all')
  expect(page.get_by_label('Event condition ข้อ 1 ขวา ค่า literal',exact=True)).to_have_value('3')
  expect(page.get_by_label('Event condition ข้อ 2 ขวา ค่า literal',exact=True)).to_have_value('20')
  page.get_by_label('Event Target Subgraph',exact=True).select_option(fid('00000000-0000-4000-8000-000000000007'));click('ใช้ Event')
  tab('Daily Schedule');page.get_by_label('lastDay (รวมวันสุดท้าย)',exact=True).fill('3')
  page.get_by_label('ใช้กิจกรรม Help Mina',exact=True).check();page.get_by_label('ใช้กิจกรรม Rest',exact=True).check()
  page.locator('input[aria-label^="ใช้ Event "]').check()
  page.get_by_label('Schedule onComplete',exact=True).select_option(fid('00000000-0000-4000-8000-000000000003'));click('ใช้ Schedule')
  page.get_by_label('Schedule onComplete',exact=True).select_option(fid('00000000-0000-4000-8000-000000000005'));click('ใช้ Schedule')
  passed('Build Activities, nested Event condition, phase/priority/order/once/target and inclusive Schedule/onComplete through UI')
  graph_node(fid('00000000-0000-4000-8000-000000000201'));compare('Branch condition',variable=variables['affection'],value='0');click('ใช้การแก้ไขโหนด')
  for node in fixture['nodes']:
   if node['kind']!='effect':continue
   graph_node(node['id'])
   for index,e in enumerate(node['effects'],1):effect('Node Effects',index,variables['boundsProbe'],e['op'],str(e['value']))
   click('ใช้การแก้ไขโหนด')
  graph_node(fid('00000000-0000-4000-8000-000000000006'),fid('00000000-0000-4000-8000-000000000007'))
  for i in (1,2):compare(f'Choice {i} visibleIf',variable=variables['affection'],value='20')
  click('ใช้การแก้ไขโหนด');save()
  actual=saved();mapping={v['id']:next(expected['id'] for expected in fixture['variables'] if expected['name']==v['name']) for v in actual['variables']}
  mapping.update({a['id']:next(expected['id'] for expected in fixture['activities'] if expected['name']==a['name']) for a in actual['activities']});mapping[actual['events'][0]['id']]=fixture['events'][0]['id']
  normalized=remap(actual,mapping)
  (OUT/'ui-project.json').write_text(json.dumps(actual,ensure_ascii=False,indent=2),encoding='utf-8')
  (OUT/'normalized-project.json').write_text(json.dumps(normalized,ensure_ascii=False,indent=2),encoding='utf-8')
  assert canonical(normalized)==canonical(fixture),'UI rebuilt project differs from reference fixture after UUID-only remapping'
  click('Rules & Schedule');click('ตรวจ Rules (Validate)');expect(page.locator('.validation-summary')).to_contain_text('Validation: ไม่พบปัญหา')
  passed('All Summer House rules rebuilt without JSON editing; full saved Project equals fixture after UUID-only mapping; Core Validate has zero issues')
  # Run all original cases using the UI-generated Project, not fixture rules.
  inverse={v:k for k,v in mapping.items()};messages=[];baseline_messages=[]
  def request(name,payload,base_payload=None):
   common={'contractVersion':1,'requestId':str(len(messages)+1),'kind':'query' if name in ('getTrace','validate') else 'command','name':name}
   if name=='applyEdit':
    payload=copy.deepcopy(payload)
    for op in payload['patch']:
     match=re.match(r'^/(nodes|graphs|edges|variables|activities|events)/(\d+)(/.*)?$',op['path'])
     if match:
      collection,index,tail=match.group(1),int(match.group(2)),match.group(3) or '';expected_id=fixture[collection][index]['id'];actual_id=inverse.get(expected_id,expected_id);position=next(i for i,row in enumerate(actual[collection]) if row['id']==actual_id);op['path']=f'/{collection}/{position}{tail}'
   messages.append({**common,'payload':payload});baseline_messages.append({**common,'payload':payload if base_payload is None else base_payload})
  for case in cases:
   request('openProject',{'project':actual},{'project':fixture})
   if case['projectPatch']:request('applyEdit',{'patch':remap(case['projectPatch'],inverse)},{'patch':case['projectPatch']})
   start={k:case[k] for k in ('startNodeId','initialVarsOverride')}
   request('startPlaytest',remap(start,inverse),start)
   for choice in case['inputs']:request('choose',{'choiceId':inverse.get(choice,choice)},{'choiceId':choice})
   request('getTrace',{})
  worker_path=re.search(r'coreWorkerPath\s*=\s*"([^"]+)"',(ROOT/'studio/src/core/generated.ts').read_text())[1]
  responses=page.evaluate('''async({url,messages})=>{const w=new Worker(url,{type:'module'});try{const out=[];for(const message of messages)out.push(await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker timeout')),20000);w.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};w.onmessage=e=>{clearTimeout(timer);resolve(e.data);};w.postMessage(message);}));return out;}finally{w.terminate();}}''',{'url':base+'/studio/dist/'+worker_path,'messages':messages})
  baseline_path=ROOT/'temp/rules-native-messages.json';baseline_path.write_text(json.dumps(baseline_messages),encoding='utf-8')
  expected=json.loads(subprocess.check_output([str(ROOT/'temp/rust-target/debug/sf-cli.exe'),'protocol',str(baseline_path)],text=True,encoding='utf-8'))
  (OUT/'parity-diagnostic.json').write_text(json.dumps({'actual':remap(responses,mapping),'expected':expected,'raw':responses},ensure_ascii=False,indent=2),encoding='utf-8')
  def normalize_responses(values):
   values=copy.deepcopy(values)
   for row in values:
    if 'project' in row.get('value',{}):row['value']['project']=canonical(row['value']['project'])
   return values
  assert normalize_responses(remap(responses,mapping))==normalize_responses(expected),'UI rules Worker trace differs from native reference fixture'
  traces=[r['value']['trace'] for r in responses if r.get('name')=='getTrace']
  report['parity']={'cases':len(cases),'messages':len(messages),'traceSteps':sum(map(len,traces)),'uuidAndTopLevelGraphCollectionOrderOnly':True}
  (OUT/'core-parity.json').write_text(json.dumps({'messages':messages,'responses':responses,'referenceResponses':expected},ensure_ascii=False,indent=2),encoding='utf-8')
  passed('UI-generated rules pass all ten Core cases with Worker/native trace equality')
  # Reload and open the same saved project, then play it on the actual Studio session.
  rootname=page.evaluate('window.rulesRoot.name');page.reload();settled();page.evaluate("""async name=>{window.rulesRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle(name);window.showDirectoryPicker=async()=>window.rulesRoot;}""",rootname);click('เปิดโฟลเดอร์โปรเจกต์');assert saved()==actual
  click('Playtest');click('เริ่มจาก Entry')
  for id in remap(cases[0]['inputs'],inverse):
   text=next((a['name'] for a in actual['activities'] if a['id']==id),None) or next(c['text'] for n in actual['nodes'] for c in n.get('choices',[]) if c['id']==id)
   page.get_by_label('ทางเลือกที่ Core อนุญาต').get_by_role('button',name=text,exact=True).click();settled()
  with page.expect_download() as download:click('ดาวน์โหลด Trace JSON')
  ui_trace=json.loads(pathlib.Path(download.value.path()).read_text(encoding='utf-8'));assert ui_trace==traces[0];report['uiTrace']=ui_trace
  click('Export');click('ติดตั้งเทมเพลตเกมใหม่');expect(page.get_by_role('heading',name='ผลติดตั้งเทมเพลต')).to_be_visible();click('ตรวจและเตรียมส่งออก');click('ส่งออกไปยังโฟลเดอร์นี้');expect(page.get_by_role('heading',name='ส่งออกสำเร็จ')).to_be_visible()
  files=page.evaluate("""async()=>{const out={};async function walk(dir,path=''){for await(const h of dir.values()){const p=path+h.name;if(h.kind==='directory')await walk(h,p+'/');else{let text='';for(const b of new Uint8Array(await(await h.getFile()).arrayBuffer()))text+=String.fromCharCode(b);out[p]=btoa(text);}}}await walk(window.rulesRoot);return out;}""")
  import uuid,base64
  target=ROOT/'temp'/('phase-1.7-full-sdk-'+str(uuid.uuid4()));target.mkdir()
  for name,data in files.items():
   path=target/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(base64.b64decode(data))
  report['sdkGame']=str(target);report['expectedRunState']=responses[next(i for i,r in enumerate(responses) if r.get('name')=='getTrace')-1]['value']['runState'];report['expectedEnding']=ui_trace[-1]['ending']
  passed('UI-created Summer House → save → actual reload/reopen → Playtest trace → template+transaction Export; dumped this exact output for SDK')
  assert not report['pageErrors'];report.update(passed=True,browser=browser.version);browser.close()
finally:
 server.shutdown();(OUT/'full-e2e.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
