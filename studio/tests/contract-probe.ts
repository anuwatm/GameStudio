import {createCore} from '../src/core/create';
import {CoreError} from '../src/core/client';
import type {RequestName,Payloads,Project} from '../src/core/types';
import fixture from '../../contract/fixtures/summer-house.json';
import cases from '../../contract/fixtures/summer-house-cases.json';
const client=createCore(new URL('../',location.href)),requests:unknown[]=[],responses:unknown[]=[];
function assert(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
async function call<N extends RequestName>(name:N,payload:Payloads[N],expectError=false){
 const requestId=String(requests.length+1),kind=['getProject','validate','getTrace','buildExport'].includes(name)?'query':'command';
 requests.push({contractVersion:1,requestId,kind,name,payload});
 try{const value=await client.request(name,payload);responses.push({contractVersion:1,requestId,kind:'result',name,value});assert(!expectError,`${name} should fail`);return value;}
 catch(e){if(!(e instanceof CoreError))throw e;responses.push({contractVersion:1,requestId,kind:'error',error:{code:e.code,message:e.message}});assert(expectError,`${name} failed: ${e.message}`);return null;}
}
const proof=(async()=>{try{
 await call('getProject',{},true);await call('buildExport',{},true);
 await call('openProject',{project:fixture as Project});
 await call('validate',{});const bundle=await call('buildExport',{});assert(bundle?.projectId===fixture.id&&Object.keys(bundle.files).length===4,'Export bundle shape');await call('getProject',{});
 await call('applyEdit',{patch:[{op:'replace',path:'/name',value:'Transport proof'}]});
 assert((await call('undo',{}))?.project.name===fixture.name,'Undo must restore name');
 assert((await call('redo',{}))?.project.name==='Transport proof','Redo must restore edit');
 await call('applyEdit',{patch:[{op:'replace',path:'/schemaVersion',value:999}]},true);
 assert((await call('getProject',{}))?.project.schemaVersion===1,'Invalid patch must not mutate project');
 await call('startPlaytest',{});
 await call('setVar',{variableId:fixture.variables[1].id,value:19});
 await call('rewind',{steps:1});
 for(const choiceId of cases.cases[0].inputs)await call('choose',{choiceId});
 const trace=await call('getTrace',{});assert(trace&&trace.trace.length>0,'Trace is empty');
 await call('choose',{choiceId:cases.cases[0].inputs[0]},true);
 await call('rewind',{steps:999},true);
 await call('setVar',{variableId:fixture.variables[1].id,value:'invalid type'},true);
 return {passed:true,requests,responses};
 }finally{client.close();}})();
Object.assign(window,{contractProof:proof});
proof.then(report=>{document.getElementById('report')!.textContent=JSON.stringify(report,null,2);}).catch(error=>{document.getElementById('report')!.textContent=String(error);});
