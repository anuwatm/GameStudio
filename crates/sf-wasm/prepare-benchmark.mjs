import {readFile,writeFile,mkdir,copyFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {resolve} from "node:path";

const [cli, wasmFile, directory] = process.argv.slice(2);
if (!cli || !wasmFile || !directory) throw new Error("Usage: node prepare-benchmark.mjs CLI_EXE WASM_FILE NEW_WEB_DIR");
await mkdir(directory, {recursive:false});
for (const name of ["worker.mjs","benchmark.html"]) {
  await copyFile(new URL("./"+name,import.meta.url), resolve(directory,name));
}
await copyFile(wasmFile,resolve(directory,"sf_wasm.wasm"));
const project=JSON.parse(await readFile("contract/fixtures/summer-house.json","utf8"));
const cases=JSON.parse(await readFile("contract/fixtures/summer-house-cases.json","utf8"));
let id=0;
const msg=(kind,name,payload={})=>({contractVersion:1,requestId:String(++id),kind,name,payload});
const messages=[
  msg("query","getProject"),
  msg("command","openProject",{project}),
  msg("query","validate"),
  msg("query","getProject"),
  msg("command","applyEdit",{patch:[{op:"replace",path:"/name",value:"Updated"}]}),
  msg("command","undo"),
  msg("command","redo"),
  msg("command","startPlaytest"),
  msg("command","setVar",{variableId:project.variables[1].id,value:19}),
  msg("command","rewind",{steps:1}),
];
for (const choiceId of cases.cases[0].inputs) messages.push(msg("command","choose",{choiceId}));
messages.push(msg("query","getTrace"));
messages.push(msg("command","choose",{choiceId:cases.cases[0].inputs[0]}));
messages.push({...msg("query","getProject"),contractVersion:2});
messages.push(msg("command","choose"));
await writeFile(resolve(directory,"messages.json"),JSON.stringify(messages));
const expected=execFileSync(cli,["protocol",resolve(directory,"messages.json")],{encoding:"utf8"});
await writeFile(resolve(directory,"expected.json"),expected);
const baseline=execFileSync(process.execPath,["contract/fixtures/generate-baseline.mjs"]);
await writeFile(resolve(directory,"baseline.json"),baseline);
console.log("Prepared "+messages.length+" native/Worker Contract requests");
