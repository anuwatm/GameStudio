import type {Payloads,RequestName,Results} from './types.ts';
export class CoreError extends Error {
 readonly code:string;
 constructor(code:string,message:string){super(message);this.name='CoreError';this.code=code;}
}
type Port=Pick<Worker,'postMessage'|'addEventListener'|'removeEventListener'|'terminate'>;
type Pending={name:RequestName;resolve:(value:never)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
const queries=new Set<RequestName>(['getProject','validate','getTrace']);
/** Owns its Worker. A timeout invalidates the session; mutations are never replayed. */
export class CoreClient {
 #port:Port;#pending=new Map<string,Pending>();#next=0;#closed=false;#timeout:number;
 constructor(port:Port,timeoutMs=15000){this.#port=port;this.#timeout=timeoutMs;port.addEventListener('message',this.#message);port.addEventListener('error',this.#failure);port.addEventListener('messageerror',this.#failure);}
 get closed(){return this.#closed;}
 request<N extends RequestName>(name:N,payload:Payloads[N]):Promise<Results[N]>{
  if(this.#closed)return Promise.reject(new CoreError('WORKER_CLOSED','Core session is closed; restart it.'));
  const requestId=String(++this.#next);
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>this.#stop(new CoreError('WORKER_TIMEOUT','Core did not respond; the session was stopped.')),this.#timeout);
   this.#pending.set(requestId,{name,resolve:resolve as (value:never)=>void,reject,timer});
   try{this.#port.postMessage({contractVersion:1,requestId,kind:queries.has(name)?'query':'command',name,payload});}
   catch(error){clearTimeout(timer);this.#pending.delete(requestId);reject(error instanceof Error?error:new Error(String(error)));}
  });
 }
 #message=(event:Event)=>{
  const data=(event as MessageEvent).data;
  if(!data||data.contractVersion!==1||typeof data.requestId!=='string'||!['result','error'].includes(data.kind)){this.#stop(new CoreError('PROTOCOL_ERROR','Invalid Worker response.'));return;}
  const pending=this.#pending.get(data.requestId);if(!pending)return;
  if(data.kind==='error'){
   if(typeof data.error?.code!=='string'||typeof data.error?.message!=='string'){this.#stop(new CoreError('PROTOCOL_ERROR','Invalid Worker error.'));return;}
   const error=new CoreError(data.error.code,data.error.message);
   if(error.code==='WORKER_ERROR'){this.#stop(error);return;}
   clearTimeout(pending.timer);this.#pending.delete(data.requestId);pending.reject(error);return;
  }
  if(data.name!==pending.name||!data.value||typeof data.value!=='object'){this.#stop(new CoreError('PROTOCOL_ERROR','Worker response does not match request.'));return;}
  clearTimeout(pending.timer);this.#pending.delete(data.requestId);pending.resolve(data.value as never);
 };
 #failure=()=>this.#stop(new CoreError('WORKER_CRASH','Core Worker failed or its message could not be read.'));
 #stop(error:Error){if(this.#closed)return;this.#closed=true;this.#port.removeEventListener('message',this.#message);this.#port.removeEventListener('error',this.#failure);this.#port.removeEventListener('messageerror',this.#failure);this.#port.terminate();for(const pending of this.#pending.values()){clearTimeout(pending.timer);pending.reject(error);}this.#pending.clear();}
 close(){this.#stop(new CoreError('WORKER_CLOSED','Core session was closed.'));}
}
