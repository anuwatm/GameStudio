import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { spawn } from "node:child_process";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

const [directory, browser, destination] = process.argv.slice(2);
if (!directory || !browser || !destination) throw new Error("Usage: node run-benchmark.mjs WEB_DIR EDGE_EXE RESULT.json");
const root = resolve(directory);
let finish;
const result = new Promise(resolve => { finish = resolve; });
const server = createServer(async (request, response) => {
  if (request.url === "/result" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    response.end("ok");
    finish(JSON.parse(body));
    return;
  }
  const path = resolve(root, "." + (request.url === "/" ? "/benchmark.html" : request.url));
  if (!path.startsWith(root + "/") && !path.startsWith(root + "\\")) {
    response.writeHead(403).end(); return;
  }
  try {
    const types = {".mjs":"text/javascript",".wasm":"application/wasm",".html":"text/html",".json":"application/json"};
    response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    response.end(await readFile(path));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
const profile = resolve(root, "edge-profile");
await mkdir(profile, {recursive:true});
const child = spawn(browser, ["--headless","--disable-gpu","--no-first-run",
  "--user-data-dir="+profile,`http://127.0.0.1:${server.address().port}/benchmark.html`],
  {windowsHide:true,stdio:"ignore"});
let timer;
try {
  const report = await Promise.race([result,new Promise((_,reject)=>{
    timer=setTimeout(()=>reject(new Error("Browser benchmark timed out")),180000);
    child.once("error",reject);
  })]);
  if (report.error) throw new Error(report.error);
  const expected = JSON.parse(await readFile(resolve(root,"expected.json"),"utf8"));
  if (!isDeepStrictEqual(report.actual,expected)) throw new Error("Browser Worker and native Contract outputs differ");
  const wasm = await readFile(resolve(root,"sf_wasm.wasm"));
  const baseline = await readFile(resolve(root,"baseline.json"));
  const median = name => [...report.samples].sort((a,b)=>a[name]-b[name])[2][name];
  const summary = {openProjectMs:median("openProject"),validateMs:median("validate"),commandMs:median("applyEdit")};
  Object.assign(report,{summary,contractMessages:expected.length,
    wasmBytes:wasm.length,gzipBytes:gzipSync(wasm).length,
    brotliBytes:brotliCompressSync(wasm,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).length,
    wasmSha256:createHash("sha256").update(wasm).digest("hex"),
    fixtureSha256:createHash("sha256").update(baseline).digest("hex")});
  await writeFile(destination,JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({...summary,contractMessages:expected.length,gzipBytes:report.gzipBytes,brotliBytes:report.brotliBytes}));
} finally {
  clearTimeout(timer);
  child.kill();
  child.unref();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
