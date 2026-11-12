import sys, pathlib, json, threading, functools, http.server
from playwright.sync_api import sync_playwright
root=pathlib.Path(sys.argv[1]).resolve()
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root))
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/recovery-proof.html'
profile=str(root/'profile')
with sync_playwright() as p:
 def launch():return p.chromium.launch_persistent_context(profile,executable_path='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless=True)
 context=launch();page=context.new_page();page.goto(url);page.wait_for_function('window.sfProof')
 baseline=page.evaluate('sfProof.start()')
 page.wait_for_function('sfState.phase === "paused-after-first-file"')
 paused=page.evaluate('sfState');assert paused['pending'];assert paused['before']!=paused['partial']
 page.close();context.close() # Real page and browser-context destruction while export is unresolved.
 context=launch();page=context.new_page();page.goto(url);page.wait_for_function('window.sfProof')
 result=page.evaluate('sfProof.recover()');assert result['equal'];assert not result['secondRecovery']['recovered']
 repeat=page.evaluate('sfProof.recover()');assert repeat['alreadyRestored'] and repeat['equal']
 # A distinct case explicitly labelled fault injection, not a real permission revocation.
 page.evaluate('sfProof.start("opfs", null, true)');page.wait_for_function('sfState.phase === "failed"')
 failure=page.evaluate('sfState');assert failure['name']=='NotAllowedError'
 page.close();page=context.new_page();page.goto(url);page.wait_for_function('window.sfProof')
 permission_recovery=page.evaluate('sfProof.recover()');assert permission_recovery['equal']
 report={'pageClose':{'passed':True,'method':'page.close then context.close; reopen persistent profile on same origin','paused':paused,'result':result,'repeat':repeat},'permissionInjection':{'passed':True,'actualPermissionRevocation':False,'failure':failure,'result':permission_recovery},'userAgent':page.evaluate('navigator.userAgent')}
 pathlib.Path('document/phase-0b/evidence/recovery-browser-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 context.close()
server.shutdown()
print('PASS real page/context close and recovery; PASS explicit NotAllowedError injection; native permission verified separately by native audit')
