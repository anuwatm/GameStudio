export function safePath(path:string):string;
export function sha256(value:string|Uint8Array):Promise<string>;
export function readFile(root:FileSystemDirectoryHandle,path:string):Promise<Uint8Array|null>;
export function writeFile(root:FileSystemDirectoryHandle,path:string,value:string|Uint8Array):Promise<void>;
export class LocalProject{
 constructor(root:FileSystemDirectoryHandle,options?:{fault?:()=>Promise<void>});
 asset(path:string):Promise<Uint8Array>;
 recover():Promise<{recovered:boolean;[key:string]:unknown}>;
 recoverLocked():Promise<{recovered:boolean;[key:string]:unknown}>;
}
