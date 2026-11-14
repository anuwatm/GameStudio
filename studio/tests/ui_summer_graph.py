"""Build graph structure only through production UI. No project JSON is injected."""
from playwright.sync_api import expect

def build_summer_graph(page,fixture):
 def ready():expect(page.locator('.session-status')).to_have_text('Core พร้อมใช้งาน')
 def click(name):page.get_by_role('button',name=name,exact=True).click();ready()
 def save():
  ready();button=page.get_by_role('button',name='บันทึกโปรเจกต์',exact=True)
  if button.is_enabled():button.click();ready()
 def current():save();return page.evaluate("async()=>JSON.parse(await(await window.rulesRoot.getFileHandle('project.storyflow.json')).getFile().then(f=>f.text()))")
 page.evaluate("""async()=>{window.rulesRoot=await(await navigator.storage.getDirectory()).getDirectoryHandle('ui-full-'+crypto.randomUUID(),{create:true});window.showDirectoryPicker=async()=>window.rulesRoot;}""")
 page.get_by_label('ชื่อโปรเจกต์ใหม่',exact=True).fill(fixture['name']);click('สร้างโปรเจกต์ในโฟลเดอร์');initial=current();mapping={fixture['id']:initial['id'],fixture['entryGraphId']:initial['entryGraphId']}
 main_end=next(n for n in fixture['nodes'] if n['graphId']==fixture['entryGraphId'] and n['kind']=='end');mapping[main_end['id']]=initial['nodes'][0]['id']
 for graph in fixture['graphs']:
  if graph['kind']=='main':continue
  click('เพิ่ม Subgraph');p=current();actual=p['graphs'][-1];mapping[graph['id']]=actual['id'];old_return=next(n for n in fixture['nodes'] if n['graphId']==graph['id'] and n.get('mode')=='return');mapping[old_return['id']]=actual['entryNodeId']
 def select(node):
  page.get_by_label('Graph',exact=True).select_option(mapping[node['graphId']]);page.get_by_label('เลือกโหนด',exact=True).select_option(mapping[node['id']])
 for node in fixture['nodes']:
  if node['id'] in mapping:continue
  page.get_by_label('Graph',exact=True).select_option(mapping[node['graphId']]);page.get_by_label('ชนิดโหนด',exact=True).select_option(node['kind']);click('เพิ่มโหนด');actual=current()['nodes'][-1];mapping[node['id']]=actual['id'];select(node)
  if node['kind']=='scene':
   page.get_by_label('บทพูด 1',exact=True).fill(node['lines'][0]['text'])
   for i,choice in enumerate(node.get('choices',[]),1):click('เพิ่มตัวเลือก');page.get_by_label(f'ตัวเลือก {i}',exact=True).fill(choice['text'])
   click('ใช้การแก้ไขโหนด');actual=next(n for n in current()['nodes'] if n['id']==mapping[node['id']])
   for old,new in zip(node.get('choices',[]),actual.get('choices',[])):mapping[old['id']]=new['id']
 for graph in fixture['graphs']:
  node=next(n for n in fixture['nodes'] if n['id']==graph['entryNodeId']);select(node);button=page.get_by_role('button',name='ใช้โหนดนี้เริ่มกราฟ',exact=True)
  if button.is_enabled():button.click();ready();save()
 for edge in fixture['edges']:
  node=next(n for n in fixture['nodes'] if n['id']==edge['from']);select(node);page.get_by_label('พอร์ต',exact=True).select_option(mapping.get(edge['port'],edge['port']));page.get_by_label('โหนดปลายทาง',exact=True).focus();page.get_by_label('โหนดปลายทาง',exact=True).select_option(mapping[edge['to']]);click('เชื่อมพอร์ต');actual=next(e for e in current()['edges'] if e['from']==mapping[edge['from']] and e['port']==mapping.get(edge['port'],edge['port']));mapping[edge['id']]=actual['id']
 assert len(current()['nodes'])==len(fixture['nodes']) and len(current()['edges'])==len(fixture['edges']);return mapping
