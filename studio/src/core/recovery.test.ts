import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acquireProject} from './recovery.ts';

test('project can reopen after a closing owner releases; lease remains held until release',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(navigator,'locks');let attempts=0,released=false;let held:Promise<unknown>|undefined;
 Object.defineProperty(navigator,'locks',{configurable:true,value:{request:(_name:string,options:{ifAvailable:boolean;steal?:boolean},callback:(lock:object|null)=>Promise<void>)=>{assert.equal(options.ifAvailable,true);assert.equal(options.steal,undefined);attempts++;if(attempts===1)return callback(null);held=callback({name:'test'}).then(()=>{released=true;});return held;}}});
 try{const lease=await acquireProject('closing-owner');assert.ok(attempts>1);assert.equal(released,false);lease.release();await held;assert.equal(released,true);}finally{if(descriptor)Object.defineProperty(navigator,'locks',descriptor);else Reflect.deleteProperty(navigator,'locks');}
});
test('live owner blocks opening without queueing or stealing', {timeout:2000}, async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(navigator,'locks');let attempts=0;
 Object.defineProperty(navigator,'locks',{configurable:true,value:{request:(_name:string,options:{ifAvailable:boolean;steal?:boolean},callback:(lock:null)=>Promise<void>)=>{assert.equal(options.ifAvailable,true);assert.equal(options.steal,undefined);attempts++;return callback(null);}}});
 try{await assert.rejects(acquireProject('live-owner'),/เปิดอยู่ในแท็บอื่น/);assert.ok(attempts>0);}finally{if(descriptor)Object.defineProperty(navigator,'locks',descriptor);else Reflect.deleteProperty(navigator,'locks');}
});
