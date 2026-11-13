"""Rebuild every Summer House rule with UI controls, then check canonical data and Core parity."""
import functools,http.server,json,pathlib,threading,sys,copy,re,subprocess,os
from playwright.sync_api import sync_playwright,expect
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/os.environ.get('SF_RULES_PROOF_OUT','document/phase-1/evidence/1.3');OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads((ROOT/'contract/fixtures/summer-house.json').read_text(encoding='utf-8'))
cases=json.loads((ROOT/'contract/fixtures/summer-house-cases.json').read_text(encoding='utf-8'))['cases']
skeleton=copy.deepcopy(fixture);skeleton.update(variables=[],activities=[],events=[])
for node in skeleton['nodes']:
 if 'effects' in node:node['effects']=[]
 if 'condition' in node:node['condition']={'kind':'all','conditions':[]}
 for choice in node.get('choices',[]):choice.update(visibleIf=None,effects=[])
 if node['kind']=='schedule':node.update(startDay=1,lastDay=1,activityIds=[],eventIds=[])
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
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True)
  page=browser.new_page(viewport={'width':1440,'height':1100})
  page.on('pageerror',lambda e:report['pageErrors'].append(str(e)));page.on('dialog',lambda dialog:dialog.accept())
  page.goto(base+'/studio/dist/')
  expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
  page.evaluate('''async project=>{window.rulesRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle('rules-'+crypto.randomUUID(),{create:true});const w=await(await window.rulesRoot.getFileHandle('project.storyflow.json',{create:true})).createWritable();await w.write(JSON.stringify(project));await w.close();window.showDirectoryPicker=async()=>window.rulesRoot;}''',skeleton)
  page.get_by_role('button',name='เปิดโฟลเดอร์โปรเจกต์',exact=True).click();expect(page.locator('.react-flow__node')).to_have_count(6)
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
  def graph_node(id,graph='00000000-0000-4000-8000-000000000002'):
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
  page.get_by_label('Event Target Subgraph',exact=True).select_option('00000000-0000-4000-8000-000000000007');click('ใช้ Event')
  tab('Daily Schedule');page.get_by_label('lastDay (รวมวันสุดท้าย)',exact=True).fill('3')
  page.get_by_label('ใช้กิจกรรม Help Mina',exact=True).check();page.get_by_label('ใช้กิจกรรม Rest',exact=True).check()
  page.locator('input[aria-label^="ใช้ Event "]').check()
  page.get_by_label('Schedule onComplete',exact=True).select_option('00000000-0000-4000-8000-000000000003');click('ใช้ Schedule')
  page.get_by_label('Schedule onComplete',exact=True).select_option('00000000-0000-4000-8000-000000000005');click('ใช้ Schedule')
  passed('Build Activities, nested Event condition, phase/priority/order/once/target and inclusive Schedule/onComplete through UI')
  graph_node('00000000-0000-4000-8000-000000000201');compare('Branch condition',variable=variables['affection'],value='0');click('ใช้การแก้ไขโหนด')
  for node in fixture['nodes']:
   if node['kind']!='effect':continue
   graph_node(node['id'])
   for index,e in enumerate(node['effects'],1):effect('Node Effects',index,variables['boundsProbe'],e['op'],str(e['value']))
   click('ใช้การแก้ไขโหนด')
  graph_node('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000007')
  for i in (1,2):compare(f'Choice {i} visibleIf',variable=variables['affection'],value='20')
  click('ใช้การแก้ไขโหนด');save()
  actual=saved();mapping={v['id']:next(expected['id'] for expected in fixture['variables'] if expected['name']==v['name']) for v in actual['variables']}
  mapping.update({a['id']:next(expected['id'] for expected in fixture['activities'] if expected['name']==a['name']) for a in actual['activities']});mapping[actual['events'][0]['id']]=fixture['events'][0]['id']
  normalized=remap(actual,mapping)
  (OUT/'ui-project.json').write_text(json.dumps(actual,ensure_ascii=False,indent=2),encoding='utf-8')
  (OUT/'normalized-project.json').write_text(json.dumps(normalized,ensure_ascii=False,indent=2),encoding='utf-8')
  assert normalized==fixture,'UI rebuilt project differs from reference fixture after UUID-only remapping'
  click('Rules & Schedule');click('ตรวจ Rules (Validate)');expect(page.locator('.validation-summary')).to_contain_text('Validation: ไม่พบปัญหา')
  passed('All Summer House rules rebuilt without JSON editing; full saved Project equals fixture after UUID-only mapping; Core Validate has zero issues')
  # Run all original cases using the UI-generated Project, not fixture rules.
  inverse={v:k for k,v in mapping.items()};messages=[];baseline_messages=[]
  def request(name,payload,base_payload=None):
   common={'contractVersion':1,'requestId':str(len(messages)+1),'kind':'query' if name in ('getTrace','validate') else 'command','name':name}
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
  assert remap(responses,mapping)==expected,'UI rules Worker trace differs from native reference fixture'
  traces=[r['value']['trace'] for r in responses if r.get('name')=='getTrace']
  report['parity']={'cases':len(cases),'messages':len(messages),'traceSteps':sum(map(len,traces)),'uuidNormalizationOnly':True}
  (OUT/'core-parity.json').write_text(json.dumps({'messages':messages,'responses':responses,'referenceResponses':expected},ensure_ascii=False,indent=2),encoding='utf-8')
  passed('UI-generated rules pass all ten Core cases with Worker/native trace equality')
  # An externally edited draft can contain valid UUIDs whose memberships are missing.
  before=saved()
  missing=page.evaluate('''async()=>{const f=await window.rulesRoot.getFileHandle('project.storyflow.json');const project=JSON.parse(await(await f.getFile()).text());const activity=crypto.randomUUID(),event=crypto.randomUUID();project.nodes.find(n=>n.kind==='schedule').activityIds.push(activity);project.nodes.find(n=>n.kind==='schedule').eventIds.push(event);const w=await f.createWritable();await w.write(JSON.stringify(project));await w.close();return {activity,event};}''')
  click('โปรเจกต์');click('เปิดโฟลเดอร์โปรเจกต์');click('Rules & Schedule');tab('Daily Schedule')
  page.get_by_label('กิจกรรมหาย '+missing['activity'],exact=True).click();expect(page.get_by_label('กิจกรรมหาย '+missing['activity'],exact=True)).to_have_count(0)
  page.get_by_label('Event หาย '+missing['event'],exact=True).click();expect(page.get_by_label('Event หาย '+missing['event'],exact=True)).to_have_count(0)
  click('ใช้ Schedule');save()
  assert saved()==before,'Removing missing memberships must preserve every other rule and ID'
  passed('Missing external Activity/Event memberships can be removed through UI without editing JSON or changing other rules')
  # bool/string and nested any/not, field types, ordered effects and history.
  tab('Variables')
  for name,type,value in [('flag','bool','true'),('ข้อความ','string','ไทย [literal]')]:
   click('เพิ่มตัวแปร');row=page.locator('.variable-grid .rule-record').last;row.get_by_label('ชื่อตัวแปร',exact=True).fill(name);row.get_by_label('ชนิดตัวแปร',exact=True).select_option(type)
   field=row.get_by_label('initial',exact=True)
   if type=='bool':field.select_option(value)
   else:field.fill(value)
   row.get_by_role('button',name='ใช้ตัวแปร',exact=True).click();settled()
  save();extras={v['name']:v['id'] for v in saved()['variables']}
  graph_node(fixture['nodes'][0]['id'])
  effect('Scene Effects',1,extras['flag'],'set','true');effect('Scene Effects',2,extras['ข้อความ'],'set','หลังเลือก')
  click('ใช้การแก้ไขโหนด');save();assert saved()['nodes'][0]['effects'][0]['value'] is True;assert saved()['nodes'][0]['effects'][1]['value']=='หลังเลือก'
  # Choice condition nested NOT(ANY), with bool and string literal comparisons.
  graph_node('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000007')
  page.get_by_label('Choice 1 visibleIf รูปแบบ',exact=True).select_option('not')
  page.get_by_label('Choice 1 visibleIf NOT รูปแบบ',exact=True).select_option('any');click('เพิ่มเงื่อนไขใน Choice 1 visibleIf NOT')
  label='Choice 1 visibleIf NOT ข้อ 1';compare(label,variable=extras['flag'],value='0',operator='eq')
  page.get_by_label(label+' ขวา ชนิด literal',exact=True).select_option('bool');page.get_by_label(label+' ขวา ค่า literal',exact=True).select_option('false')
  effect('Choice 1 Effects',1,extras['ข้อความ'],'set','เลือกแล้ว');click('ใช้การแก้ไขโหนด');save()
  choice=saved()['nodes'][3]['choices'][0];assert choice['visibleIf']['kind']=='not' and choice['visibleIf']['condition']['kind']=='any'
  click('Undo');save();assert saved()['nodes'][3]['choices'][0]['visibleIf']==actual['nodes'][3]['choices'][0]['visibleIf']
  click('Redo');save();assert saved()['nodes'][3]['choices'][0]['effects'][0]['value']=='เลือกแล้ว'
  passed('bool/string Variables and typed Effects, recursive NOT/ANY, choice Effects and atomic Undo/Redo work without coercion')
  click('Rules & Schedule');tab('Variables');row=page.locator('.variable-grid .rule-record').filter(has=page.get_by_role('heading',name='affection · int',exact=True))
  row.get_by_role('button',name='ลบตัวแปร',exact=True).click();expect(row.get_by_role('alert')).to_contain_text('ถูกอ้างอิง')
  row.get_by_label('initial',exact=True).fill('-2147483649');row.get_by_role('button',name='ใช้ตัวแปร',exact=True).click();settled()
  expect(page.locator('main > .error')).to_contain_text('CORE_ERROR');expect(row.get_by_label('initial',exact=True)).to_have_value('-2147483649')
  row.get_by_label('initial',exact=True).fill('0');click('ตรวจ Rules (Validate)')
  # Deleting assigned rules must update Schedule memberships in one history entry.
  tab('Events');before=saved();event_id=before['events'][0]['id'];click('ลบ Event');save();deleted=saved();assert not deleted['events'];assert event_id not in deleted['nodes'][1]['eventIds']
  click('Undo');save();assert saved()['events']==before['events'] and saved()['nodes'][1]['eventIds']==before['nodes'][1]['eventIds']
  tab('Daily Schedule');page.get_by_label('เลือกกิจกรรม',exact=True).select_option(next(a['id'] for a in saved()['activities'] if a['name']=='Rest'))
  before=saved();rest_id=next(a['id'] for a in before['activities'] if a['name']=='Rest');click('ลบกิจกรรม');save();assert rest_id not in saved()['nodes'][1]['activityIds']
  click('ตรวจ Rules (Validate)');expect(page.locator('.validation-summary')).to_contain_text('V005')
  click('Undo');save();assert saved()['activities']==before['activities'] and saved()['nodes'][1]['activityIds']==before['nodes'][1]['activityIds']
  passed('Reference-aware variable deletion guard, invalid i32 draft retention, activity/event cascade+Undo and fallback Validation are correct')
  click('ตรวจ Rules (Validate)')
  for tabname in ['Variables','Daily Schedule','Events']:
   tab(tabname);page.set_viewport_size({'width':1440,'height':1100});page.evaluate("document.querySelector('main').scrollTop=0")
   page.screenshot(path=str(OUT/f'{tabname.replace(" ","-").lower()}-1440.png'),full_page=True)
  for width in (1000,700):
   page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.evaluate("document.querySelector('main').scrollTop=0");page.screenshot(path=str(OUT/f'events-{width}.png'),full_page=True)
  assert not report['pageErrors'],report['pageErrors'];report.update(passed=True,browser=browser.version)
  browser.close()
finally:
 server.shutdown();(OUT/'rules-browser.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
