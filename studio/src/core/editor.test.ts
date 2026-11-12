import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,createNode,deleteNodePatch,nodePatch,connectPatch,ports} from './editor.ts';
test('node deletion removes every linked edge and replaces graph entry in one patch',()=>{
 const project=createProject('ทดสอบ'),entry=project.nodes[0],next=createNode('scene',entry.graphId);project.nodes.push(next);project.edges.push({id:crypto.randomUUID(),from:entry.id,port:'next',to:next.id},{id:crypto.randomUUID(),from:next.id,port:'next',to:entry.id});
 const patch=deleteNodePatch(project,entry.id,next.id);const fields=Object.fromEntries(patch.map(p=>[p.path,p.value]));
 assert.deepEqual(fields['/nodes'],[next]);assert.deepEqual(fields['/edges'],[]);assert.equal((fields['/graphs'] as typeof project.graphs)[0].entryNodeId,next.id);assert.equal(project.nodes.length,2);
 assert.throws(()=>deleteNodePatch(createProject('one'),createProject('other').nodes[0].id),/not found/);
});
test('editing choices preserves IDs and removes obsolete ports atomically',()=>{
 const p=createProject('x'),n=createNode('scene',p.entryGraphId);n.choices=[{id:crypto.randomUUID(),text:'เดิม',visibleIf:null,effects:[]}];p.nodes.push(n);p.edges.push({id:crypto.randomUUID(),from:n.id,port:n.choices[0].id,to:p.nodes[0].id});
 const edited={...n,choices:n.choices.map(c=>({...c,text:'ใหม่'}))};assert.equal(edited.choices[0].id,n.choices[0].id);assert.equal(nodePatch(p,edited).some(op=>op.path==='/edges'),false);
 assert.deepEqual(nodePatch(p,{...n,choices:[]}).find(op=>op.path==='/edges')?.value,[]);
});
test('ports and connection constraints cover five Contract node kinds',()=>{
 const p=createProject('x'),graph=p.entryGraphId;for(const kind of ['scene','branch','effect','schedule','end'] as const){const n=createNode(kind,graph);assert.equal(n.kind,kind);assert.ok(n.id);assert.ok(Array.isArray(ports(n)));}
 const scene=createNode('scene',graph);p.nodes.push(scene);const edges=connectPatch(p,scene.id,'next',p.nodes[0].id)[0].value as typeof p.edges;p.edges=edges;
 assert.equal((connectPatch(p,scene.id,'next',scene.id)[0].value as typeof p.edges).length,1);
 assert.throws(()=>connectPatch(p,scene.id,'wrong',p.nodes[0].id));
 const other=createNode('scene',crypto.randomUUID());p.nodes.push(other);assert.throws(()=>connectPatch(p,scene.id,'next',other.id));
});
