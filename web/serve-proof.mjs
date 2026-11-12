import {createServer} from "node:http";
import {readFile,writeFile} from "node:fs/promises";
import {resolve,extname} from "node:path";

const root=resolve(process.argv[2] || "temp/0b-prototype");
const server=createServer(async(request,response)=>{
  try{
    if(request.url==="/result" && request.method==="POST"){
      let body=""; for await(const chunk of request)body+=chunk;
      const result=JSON.parse(body);
      const name=result.mode==="native-folder"?"native-report.json":"opfs-report.json";
      await writeFile(resolve(root,name),JSON.stringify(result,null,2)+"\n");
      console.log(name+": "+(result.error || result.report?.length+" checks passed"));
      response.end("ok");return;
    }
    const path=resolve(root,"."+new URL(request.url,"http://localhost").pathname);
    if(!path.startsWith(root+"/") && !path.startsWith(root+"\\")){response.writeHead(403).end();return;}
    const types={".mjs":"text/javascript",".html":"text/html",".json":"application/json",".webm":"video/webm"};
    response.setHeader("Content-Type",types[extname(path)]||"application/octet-stream");
    response.end(await readFile(path));
  }catch(error){response.writeHead(404).end(String(error));}
});
const port=Number(process.argv[3] || 8765);
server.listen(port,"127.0.0.1",()=>console.log(`http://127.0.0.1:${port}/local-folder.html`));
