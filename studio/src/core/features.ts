export type FeatureEnvironment={secure:boolean;userAgent:string;wasm:boolean;worker:boolean;folder:boolean;indexedDB:boolean;locks:boolean;crypto:boolean};
export function inspectFeatures(env:FeatureEnvironment){return [
 {id:'secure',available:env.secure},{id:'browser',available:/(?:Chrome|Chromium|Edg)\//.test(env.userAgent)&&!/(Android|iPhone|iPad|Mobile)/.test(env.userAgent)},
 {id:'wasm',available:env.wasm},{id:'worker',available:env.worker},{id:'folder',available:env.folder},
 {id:'indexedDB',available:env.indexedDB},{id:'locks',available:env.locks},{id:'crypto',available:env.crypto},
];}
export function browserFeatures(){return inspectFeatures({secure:window.isSecureContext,userAgent:navigator.userAgent,wasm:typeof WebAssembly==='object',worker:typeof Worker==='function',folder:typeof (window as Window & {showDirectoryPicker?:unknown}).showDirectoryPicker==='function',indexedDB:typeof indexedDB==='object',locks:typeof navigator.locks==='object',crypto:!!globalThis.crypto?.subtle});}
