import {CoreClient} from './client';
import {coreWorkerPath} from './generated';
export function createCore(base=new URL(import.meta.env.BASE_URL,document.baseURI)){return new CoreClient(new Worker(new URL(coreWorkerPath,base),{type:'module'}));}
