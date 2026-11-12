"""Production + proof builds, served below a subpath; real Edge, no Vite dev server."""
import functools, http.server, json, pathlib, subprocess, threading, sys, os
from playwright.sync_api import sync_playwright, expect
sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / os.environ.get('SF_PROOF_OUT','document/phase-1/evidence')
OUT.mkdir(parents=True, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js':'text/javascript', '.mjs':'text/javascript', '.wasm':'application/wasm'}
    def log_message(self, *_): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
report = {'checks': [], 'errors': []}
def passed(name): report['checks'].append(name)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', headless=True)
        page = browser.new_page(viewport={'width':1440,'height':960})
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda m: print('Browser:',m.text) if m.type=='error' else None)
        page.goto(base+'/temp/studio-proof-dist/tests/contract.html')
        page.wait_for_function('window.contractProof !== undefined')
        proof = page.evaluate('window.contractProof')
        assert proof['passed']
        messages = ROOT/'temp/studio-proof-messages.json'
        messages.write_text(json.dumps(proof['requests']), encoding='utf-8')
        native = json.loads(subprocess.check_output([str(ROOT/'temp/rust-target/debug/sf-cli.exe'),'protocol',str(messages)],text=True,encoding='utf-8'))
        assert native == proof['responses'], 'Worker client/native parity mismatch'
        (OUT/'contract-proof.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2),encoding='utf-8')
        passed(f"CoreClient: {len(native)} requests match native CLI, including rejected patches and playtest")
        page.goto(base+'/studio/dist/')
        expect(page.get_by_role('status')).to_have_text('Core พร้อมใช้งาน')
        expect(page.get_by_role('button',name='เปิดตัวอย่าง')).to_be_enabled()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/'project-1440.png'),full_page=True)
        page.get_by_role('button',name='เปิดตัวอย่าง').click()
        expect(page.locator('.react-flow__node')).to_have_count(6)
        page.locator('.react-flow__node').first.click()
        expect(page.locator('.inspector details')).to_be_visible()
        page.get_by_role('button',name='โปรเจกต์',exact=True).click()
        page.get_by_label('ชื่อโปรเจกต์',exact=True).fill('บ้านฤดูร้อน · Transport')
        page.get_by_role('button',name='ใช้ชื่อโปรเจกต์',exact=True).click()
        expect(page.locator('.project-name')).to_have_text('บ้านฤดูร้อน · Transport')
        page.get_by_role('button',name='Undo',exact=True).click()
        expect(page.locator('.project-name')).to_have_text('Summer House')
        page.get_by_role('button',name='Redo',exact=True).click()
        expect(page.locator('.project-name')).to_have_text('บ้านฤดูร้อน · Transport')
        page.get_by_role('button',name='Story Graph',exact=True).click()
        page.get_by_role('button',name='ตรวจโปรเจกต์ (Validate)').click()
        expect(page.get_by_role('heading',name='ผลการตรวจโปรเจกต์')).to_be_visible()
        page.screenshot(path=str(OUT/'graph-1440.png'),full_page=True)
        page.get_by_label('Graph',exact=True).select_option(label='subgraph · 0007')
        expect(page.locator('.react-flow__node')).to_have_count(3)
        passed('Production UI: fixture → graph/Inspector → Unicode Patch → Undo/Redo → Validate → subgraph')
        for width in (1000,700):
            page.set_viewport_size({'width':width,'height':960})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'Overflow {width}'
            page.screenshot(path=str(OUT/f'graph-{width}.png'),full_page=True)
        passed('No horizontal overflow at 1440 / 1000 / 700 pixels')
        # Reload loses edits; the interface must not imply persistence.
        page.reload()
        expect(page.get_by_role('status')).to_have_text('Core พร้อมใช้งาน')
        expect(page.get_by_text('ตัวอย่างนี้ทำงานในหน่วยความจำ',exact=False)).to_be_visible()
        passed('Reload returns to Project with explicit in-memory warning')
        missing=browser.new_page()
        missing.add_init_script('Object.defineProperty(window,"showDirectoryPicker",{value:undefined,configurable:true})')
        missing.goto(base+'/studio/dist/')
        expect(missing.get_by_role('button',name='เปิดตัวอย่าง')).to_be_disabled()
        expect(missing.get_by_text('ใช้ Chrome หรือ Edge บนเดสก์ท็อป',exact=False)).to_be_visible()
        passed('Missing File System Access API blocks open and explains requirements')
        # Browser-context routing intercepts Worker requests as well as page requests.
        context=browser.new_context()
        context.route('**/*.wasm',lambda route:route.fulfill(status=503,body='Injected failure'))
        failed=context.new_page();failed.goto(base+'/studio/dist/')
        failed.on('pageerror',lambda e: report['errors'].append('Restart page: '+str(e)))
        expect(failed.get_by_role('alert')).to_contain_text('Core WASM HTTP 503')
        expect(failed.get_by_role('button',name='เปิดตัวอย่าง')).to_be_disabled()
        context.unroute('**/*.wasm')
        failed.get_by_role('button',name='เริ่ม Core ใหม่').click()
        expect(failed.get_by_role('status')).to_have_text('Core พร้อมใช้งาน')
        failed.get_by_role('button',name='เปิดตัวอย่าง').click()
        try:
            expect(failed.locator('.react-flow__node')).to_have_count(6)
        except Exception:
            failed.screenshot(path=str(OUT/'restart-failure.png'),full_page=True)
            (OUT/'restart-failure.txt').write_text(failed.locator('body').inner_text(),encoding='utf-8')
            raise
        passed('WASM HTTP failure shown; restart recovers without replaying commands')
        assert not report['errors'],report['errors']
        passed('No uncaught page errors in normal production/proof flows')
        report['browser']=browser.version
        browser.close()
finally:
    server.shutdown()
    (OUT/'browser-proof.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
