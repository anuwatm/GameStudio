export type StoryNode = {id:string;kind:string;graphId:string;lines?:{text:string;characterId?:string|null}[];choices?:{id:string;text:string}[];[key:string]:unknown};
export type Project = {schemaVersion:number;id:string;name:string;entryGraphId:string;graphs:{id:string;kind:string;entryNodeId:string}[];nodes:StoryNode[];edges:{id:string;from:string;port:string;to:string}[];[key:string]:unknown};
export type Patch={op:'add'|'remove'|'replace';path:string;value?:unknown};
export type Issue={code:string;severity:string;message:string;[key:string]:unknown};
export type Payloads={openProject:{project:Project};applyEdit:{patch:Patch[]};undo:Record<string,never>;redo:Record<string,never>;getProject:Record<string,never>;validate:Record<string,never>;startPlaytest:{startNodeId?:string;initialVarsOverride?:Record<string,unknown>};choose:{choiceId:string};setVar:{variableId:string;value:unknown};rewind:{steps:number};getTrace:Record<string,never>};
export type RequestName=keyof Payloads;
export type Results={openProject:{project:Project};applyEdit:{project:Project};undo:{project:Project};redo:{project:Project};getProject:{project:Project};validate:{issues:Issue[]};startPlaytest:Record<string,unknown>;choose:Record<string,unknown>;setVar:Record<string,unknown>;rewind:Record<string,unknown>;getTrace:{trace:unknown[]}};
