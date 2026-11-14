"""Loopback P8 server: ONLY build assets, one test HTML and config/report endpoints. No workspace serving."""
import http.server,json,pathlib,hashlib,sys,urllib.parse
sys.stdout.reconfigure(encoding='utf-8');ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'document/phase-1/evidence/1.7';BUILD=(ROOT/'studio/dist').resolve();HTML=ROOT/'web/native-p8.html'
old=json.loads((OUT/'native-P8-attempt1.json').read_text(encoding='utf-8'));folder=pathlib.Path(old['folder']);config={'folder':str(folder),'folderName':folder.name,'fixtureHash':old['fixtureHash'],'initialFileHash':hashlib.sha256((folder/'project.storyflow.json').read_bytes()).hexdigest()}
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*_):pass
 def do_GET(self):
  path=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
  if path=='/native-p8-config':data=json.dumps(config).encode();kind='application/json'
  elif path=='/native-p8.html':data=HTML.read_bytes();kind='text/html; charset=utf-8'
  elif path.startswith('/studio/dist/'):
   target=(BUILD/path[len('/studio/dist/'):]).resolve()
   if not target.is_relative_to(BUILD):self.send_error(403);return
   if target.is_dir():target=target/'index.html'
   if not target.is_file():self.send_error(404);return
   data=target.read_bytes();kind={'.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.html':'text/html; charset=utf-8','.css':'text/css','.ttf':'font/ttf','.txt':'text/plain'}.get(target.suffix,'application/octet-stream')
  else:self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
 def do_POST(self):
  if self.path!='/native-p8-report':self.send_error(404);return
  length=int(self.headers.get('Content-Length','0'))
  if length>1000000:self.send_error(413);return
  value=json.loads(self.rfile.read(length));(OUT/'native-P8-visible.json').write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8');print('P8_VISIBLE_REPORT',value.get('passed'),value.get('median'),value.get('error'),flush=True);self.send_response(200);self.end_headers();self.wfile.write(b'ok')
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);url=f'http://127.0.0.1:{server.server_port}/native-p8.html';(OUT/'native-visible-config.json').write_text(json.dumps({**config,'url':url},indent=2),encoding='utf-8');print(url,flush=True);server.serve_forever()
