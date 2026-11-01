import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('// ATTACHMENT COUNT METADATA'),script=html.slice(start,html.indexOf('</script>',start));
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const ref=(n,name='Image-'+n+'.jpg')=>({id:'attachment-'+n,name,storage:'google-drive',driveFileId:'synthetic_drive_file_'+n,
 mime:'image/jpeg',size:123,sha256:'a'.repeat(64)});
const record=()=>({name:'Synthetic warranty',purchaseDate:'2025-01-01',baseMonths:24,attachments:[ref(1),ref(2)],attachmentCount:2,attachmentNames:['Image-1.jpg','Image-2.jpg'],untouched:'retain'});
function storageFactory(){const data=new Map();return {data,fail:0,getItem:k=>data.get(k)??null,setItem(k,v){if(this.fail>0){this.fail--;throw Error('SYNTHETIC_STORAGE_FAILURE');}data.set(k,String(v));},removeItem:k=>data.delete(k)};}
async function harness(config={}){
 const storage=config.storage??storageFactory(),records=config.records??new Map([['warranty-one',record()]]),calls=[],writes=[],DELETE={deleteField:true};
 const locks=new Map();const navigator={locks:{request(name,options,action){if(typeof options==='function'){action=options;options={};}
  if(options.ifAvailable&&locks.has(name))return Promise.resolve(action(null));const prior=locks.get(name)??Promise.resolve();
  const job=prior.catch(()=>{}).then(()=>action({name}));locks.set(name,job);job.finally(()=>{if(locks.get(name)===job)locks.delete(name);}).catch(()=>{});return job;}}};
 const window={localStorage:storage,sessionStorage:storageFactory(),fetch:async()=>{throw Error('REAL_NETWORK_FORBIDDEN');}};
 const user={uid:'synthetic-owner',email:''};
 let clock=1000;
 const d={db:{},appId:'synthetic-app',auth:{currentUser:user},deleteField:()=>DELETE,
  doc(...p){return {id:p.at(-1)};},collection(){return {};},async getDocFromServer(r){return {exists:()=>records.has(r.id),data:()=>clone(records.get(r.id))};},
  async getDocsFromServer(){return {docs:[...records].map(([id,value])=>({id,data:()=>clone(value)}))};},
  async runTransaction(db,fn){
   const pending=[],readVersions=new Map();const tx={async get(r){config.onGet?.(r.id,records);readVersions.set(r.id,JSON.stringify(records.get(r.id)));return {exists:()=>records.has(r.id),data:()=>clone(records.get(r.id))};},
    update(r,patch){pending.push({id:r.id,patch,mode:'update'});},set(r,patch,options){pending.push({id:r.id,patch,mode:'set',options});},
    delete(){throw Error('WARRANTY_DELETE_FORBIDDEN');}};
   const value=await fn(tx);const kind=pending[0]?.patch?._attachmentEdit?.kind;
   if(config.beforeCommit)await config.beforeCommit({pending,records});
   for(const [id,version]of readVersions)if(JSON.stringify(records.get(id))!==version)throw Error('SYNTHETIC_TRANSACTION_CONFLICT');
   if(config.failBegin&&kind){config.failBegin=false;throw Error('SYNTHETIC_FIRESTORE_DENIED');}
   if(config.failRenameCommit&&pending.some(x=>x.patch.lastOperation)){config.failRenameCommit=false;throw Error('SYNTHETIC_FINAL_SAVE_FAILED');}
   for(const item of pending){const next=item.mode==='set'&&!item.options?.merge?{}:{...records.get(item.id)};
    for(const [key,v]of Object.entries(item.patch)){if(v===DELETE)delete next[key];else next[key]=clone(v);}records.set(item.id,next);writes.push({id:item.id,mode:item.mode,keys:Object.keys(item.patch)});}
   if(config.afterCommit)await config.afterCommit({pending,records});
   if(config.loseBegin&&kind){config.loseBegin=false;throw Error('SYNTHETIC_BEGIN_RESPONSE_LOST');}
   if(config.failSyncAfterBegin&&kind==='remove'){config.failSyncAfterBegin=false;storage.fail=1;}
   if(config.loseFinish&&pending.some(x=>x.patch.lastAttachmentOperation)){config.loseFinish=false;throw Error('SYNTHETIC_FINISH_RESPONSE_LOST');}
   if(config.loseRenameCommit&&pending.some(x=>x.patch.lastOperation)){config.loseRenameCommit=false;throw Error('SYNTHETIC_SAVE_RESPONSE_LOST');}
   return clone(value);
  }};window.firebaseDeps=d;
 const context=vm.createContext({window,navigator,crypto:webcrypto,URL,Blob,Response,Headers,AbortController,DOMException,TextEncoder,TextDecoder,structuredClone,
  console:{log(){}},setTimeout(fn,ms){const t=setTimeout(fn,ms);t.unref?.();return t;},clearTimeout});
 vm.runInContext(script,context);user.email=/const EMAIL = '([^']+)'/.exec(script)[1];
 const products=/products:\s*'([^']+)'/.exec(script)[1],scope=/const SCOPE = '([^']+)'/.exec(script)[1],remote=config.remote??new Map();
 if(!config.remote)for(const value of records.values())for(const a of value.attachments||[])if(a.driveFileId&&!remote.has(a.driveFileId))remote.set(a.driveFileId,
  {id:a.driveFileId,name:a.name,mimeType:a.mime,size:String(a.size),sha256Checksum:a.sha256,parents:[products],ownedByMe:true,shared:false,
   permissions:[{type:'user',role:'owner',emailAddress:user.email}],capabilities:{canRename:true,canTrash:true},
   appProperties:{app:'garancije-pro',operation:'b'.repeat(64),sha256:a.sha256},trashed:false,v:1});
 const send=async(url,init={})=>{
  calls.push({url,method:init.method??'GET',body:init.body,headers:init.headers});const u=new URL(url);
  if(u.pathname==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:user.email}}),{status:200});
  if(!u.pathname.startsWith('/drive/v3/files/'))throw Error('UNEXPECTED_SYNTHETIC_ENDPOINT');
  assert.equal(u.searchParams.has('alt'),false,'No content downloads');const id=decodeURIComponent(u.pathname.split('/').at(-1)),file=remote.get(id);
  if(!file||config.getStatus)return new Response('{}',{status:config.getStatus??404});
  if((init.method??'GET')==='GET')return new Response(JSON.stringify({...file,v:undefined}),{headers:config.noEtag?{}:{etag:'"v'+file.v+'"'}});
  assert.equal(init.method,'PATCH');const patch=JSON.parse(init.body);assert.ok(Object.keys(patch).every(k=>['name','trashed'].includes(k)));
  if(config.patchStatus)return new Response('{}',{status:config.patchStatus});
  if(config.concurrentDrive){config.concurrentDrive=false;file.name='External-change.jpg';file.v++;}
  if(init.headers['If-Match']!=='"v'+file.v+'"')return new Response('{}',{status:412});
  Object.assign(file,patch);file.v++;
  if(config.hangPatch){config.hangPatch=false;return new Promise(()=>{});}
  if(config.losePatch){config.losePatch=false;throw Error('SYNTHETIC_DRIVE_RESPONSE_LOST');}
  return new Response(JSON.stringify(file));
 };
 const service=window.createGarancijeDrive({simulated:true,allowWrites:true,storage,namespace:'synthetic-saved-edit',fetch:send,
  authorize:async()=>({access_token:'synthetic-token-never-real',expires_in:3600,scope}),getUser:()=>d.auth.currentUser,now:()=>clock,
  metadataStore:window.driveEnvironment.metadataStore,timeouts:{metadata:100,commit:100,read:100}});
 await service.authChanged(user);await service.connect();calls.length=0;
 async function stage({name='Synthetic warranty',attachments=clone(records.get('warranty-one').attachments),pending=[],seal=false}={}){
  const base=clone(records.get('warranty-one'));
  return service.stageDraft({userId:user.uid,id:'warranty-one',base,metadata:{name},attachments,pending,operationId:'draft-one',seal,
   expectedRevision:service.contentRevision(service.getDraft(user.uid))});
 }
 async function remove(extra={}){const draft=service.getDraft(user.uid);return service.removeSavedAttachment({userId:user.uid,id:'warranty-one',attachmentId:'attachment-1',
  expectedRevision:()=>service.contentRevision(draft),expectedMetadata:draft.metadata,expectedAttachments:draft.attachments,
  expectedPending:()=>service.pendingFingerprint(draft.pending),isCurrent:()=>true,...extra});}
 const patches=()=>calls.filter(x=>x.method==='PATCH');
 return {service,stage,remove,patches,records,remote,storage,calls,writes,window,user,config,expire:()=>{clock=4000000;},context};
}

test('staged rename and closing/cancel make zero Drive/Firebase writes',async()=>{
 const h=await harness(),attachments=[ref(1,'Renamed.jpg'),ref(2)];await h.stage({attachments});
 assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);assert.equal(h.remote.get(ref(1).driveFileId).name,'Image-1.jpg');
 assert.equal(h.records.get('warranty-one').attachmentNames[0],'Image-1.jpg');
});
test('Save renames same Drive file metadata only and atomically updates names/count',async()=>{
 const h=await harness(),d=await h.stage({attachments:[ref(1,'Renamed-ž.jpg'),ref(2)],seal:true});
 await h.service.saveWarranty({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision});
 const saved=h.records.get('warranty-one');assert.equal(saved.attachments[0].driveFileId,ref(1).driveFileId);
 assert.deepEqual(saved.attachmentNames,['Renamed-ž.jpg','Image-2.jpg']);assert.equal(saved.attachmentCount,2);assert.equal(saved.untouched,'retain');
 assert.equal(saved._attachmentEdit,undefined);assert.equal(h.patches().length,1);
 assert.deepEqual(JSON.parse(h.patches()[0].body),{name:'Renamed-ž.jpg'});assert.equal(h.remote.get(ref(1).driveFileId).sha256Checksum,'a'.repeat(64));
 assert.equal(h.service.getDraft(h.user.uid),null);assert.equal(h.service.hasSavedAttachmentEdit(h.user.uid,'warranty-one'),null);
});
test('immediate removal persists before Drive trash and preserves unsaved fields/pending/other staged rename',async()=>{
 const h=await harness();const pending=[{id:'pending-one',name:'Keep-this.jpg',kind:'Racun',mime:'image/jpeg',size:99,sha256:'c'.repeat(64),autoNamed:true}];
 await h.stage({name:'UNSAVED LOCAL NAME',attachments:[ref(1),ref(2,'Other-staged.jpg')],pending});
 const result=await h.remove(),saved=h.records.get('warranty-one'),draft=h.service.getDraft(h.user.uid);
 assert.equal(saved.name,'Synthetic warranty');assert.equal(saved.attachments.length,1);assert.equal(saved.attachments[0].id,'attachment-2');
 assert.deepEqual(saved.attachmentNames,['Image-2.jpg']);assert.equal(saved.attachmentCount,1);assert.equal(saved.untouched,'retain');
 assert.equal(draft.metadata.name,'UNSAVED LOCAL NAME');assert.equal(draft.attachments[0].name,'Other-staged.jpg');
 assert.equal(draft.pending[0].name,'Keep-this.jpg');assert.equal(draft.pending[0].retainedAutoName.name,'Keep-this.jpg');
 assert.deepEqual(JSON.parse(draft.expected),saved);assert.equal(result.removed,true);
 assert.equal(h.remote.get(ref(1).driveFileId).trashed,true);assert.equal(h.records.size,1);
 assert.ok(h.writes[0].keys.includes('attachments'));assert.deepEqual(JSON.parse(h.patches()[0].body),{trashed:true});
});
test('Cancel/discard after completed immediate removal never restores reference or Drive file',async()=>{
 const h=await harness();await h.stage();await h.remove();const d=h.service.getDraft(h.user.uid);
 await h.service.discardDraft({userId:h.user.uid,id:d.id,operationId:d.operationId,expected:h.window.garancijeFingerprint(d),expectedRevision:d.revision});
 assert.equal(h.records.get('warranty-one').attachments.length,1);assert.equal(h.remote.get(ref(1).driveFileId).trashed,true);
});
test('later Save cannot resurrect removed reference and preserves newly edited form fields',async()=>{
 const h=await harness();await h.stage({name:'Changed local name'});await h.remove();let d=h.service.getDraft(h.user.uid);
 d=await h.service.stageDraft({userId:h.user.uid,id:d.id,metadata:d.metadata,attachments:d.attachments,pending:d.pending,operationId:d.operationId,
  expectedRevision:d.revision,expectedPending:h.service.pendingFingerprint(d.pending),seal:true});
 await h.service.saveWarranty({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision});
 assert.equal(h.records.get('warranty-one').attachments.length,1);assert.equal(h.records.get('warranty-one').name,'Changed local name');
 assert.equal(h.patches().length,1);assert.equal(h.remote.get(ref(1).driveFileId).trashed,true);
});
for(const phase of ['losePatch','loseBegin','loseFinish','failSyncAfterBegin'])test('remove recovery after '+phase+' uses same operation and never trashes twice',async()=>{
 const config={[phase]:true},h=await harness(config);await h.stage({name:'Keep unsaved'});await assert.rejects(h.remove());
 assert.ok(h.service.hasSavedAttachmentEdit(h.user.uid,'warranty-one'));assert.equal(h.records.get('warranty-one').attachments.length,1);
 const reloaded=await harness({storage:h.storage,records:h.records,remote:h.remote});
 await reloaded.service.resumeSavedAttachmentEdit({userId:reloaded.user.uid,id:'warranty-one'});
 assert.equal(reloaded.records.get('warranty-one')._attachmentEdit,undefined);
 assert.equal(reloaded.service.getDraft(reloaded.user.uid).metadata.name,'Keep unsaved');
 assert.equal(h.patches().length+reloaded.patches().length,1);
});
for(const phase of ['losePatch','failRenameCommit','loseRenameCommit'])test('rename recovery after '+phase+' does not redo applied rename or roll it back',async()=>{
 const config={[phase]:true},h=await harness(config),d=await h.stage({attachments:[ref(1,'Desired.jpg'),ref(2)],seal:true});
 await assert.rejects(h.service.saveWarranty({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision}));
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote}),restored=next.service.getDraft(next.user.uid);
 await next.service.saveWarranty({userId:next.user.uid,operationId:restored.operationId,expectedRevision:restored.revision});
 assert.equal(next.records.get('warranty-one').attachmentNames[0],'Desired.jpg');assert.equal(h.patches().length+next.patches().length,1);
});
for(const getStatus of [403,404])test('preflight '+getStatus+' cannot unlink or claim local-only status',async()=>{
 const h=await harness({getStatus});await h.stage();await assert.rejects(h.remove());
 assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);assert.equal(h.records.get('warranty-one').attachments.length,2);
});
for(const patchStatus of [403,404,412])test('Drive '+patchStatus+' after unlink is visibly pending and blocks Save/discard',async()=>{
 const h=await harness({patchStatus});await h.stage();await assert.rejects(h.remove());
 assert.equal(h.records.get('warranty-one').attachments.length,1);assert.ok(h.records.get('warranty-one')._attachmentEdit);
 const d=h.service.getDraft(h.user.uid);
 await assert.rejects(h.service.stageDraft({userId:h.user.uid,id:d.id,metadata:d.metadata,attachments:d.attachments,pending:[],operationId:d.operationId,seal:true,allowSealed:true}));
 await assert.rejects(h.service.discardDraft({userId:h.user.uid,id:d.id,operationId:d.operationId,expected:h.window.garancijeFingerprint(d),expectedRevision:d.revision}));
});
test('double-click immediate removal has exactly one unlink/trash',async()=>{
 const h=await harness();await h.stage();const results=await Promise.allSettled([h.remove(),h.remove()]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(h.patches().length,1);assert.equal(h.records.get('warranty-one').attachments.length,1);
});
for(const bad of ['shared','duplicate','foreign','changed-content','no-capability','missing-etag','legacy'])test('unsafe reference blocked before any write '+bad,async()=>{
 const h=await harness({noEtag:bad==='missing-etag'}),r=h.remote.get(ref(1).driveFileId);
 if(bad==='shared')h.records.set('other',{...record(),attachments:[ref(1)]});
 if(bad==='duplicate')h.records.get('warranty-one').attachments.push({...ref(1),id:'alias'});
 if(bad==='foreign')r.ownedByMe=false;if(bad==='changed-content')r.sha256Checksum='d'.repeat(64);
 if(bad==='no-capability')r.capabilities.canTrash=false;
 if(bad==='legacy'){h.records.get('warranty-one').attachments[0]={id:'attachment-1',name:'Stari racun',dataUrl:'data:image/jpeg;base64,SYNTHETIC'};}
 await h.stage();await assert.rejects(h.remove());assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
});
test('expired token blocks before unlink; wrong owner never sends a request',async()=>{
 const h=await harness();await h.stage();h.expire();await assert.rejects(h.remove());assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
 const other=await harness();await other.stage();other.window.firebaseDeps.auth.currentUser={uid:'other',email:'other.invalid'};
 await assert.rejects(other.remove());assert.equal(other.writes.length,0);assert.equal(other.calls.length,0);
});
test('stale draft/server metadata cannot be overwritten',async()=>{
 const h=await harness();await h.stage();h.records.get('warranty-one').description='Concurrent value';await assert.rejects(h.remove());
 assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);assert.equal(h.records.get('warranty-one').description,'Concurrent value');
});
test('external Drive change fails conditional write and is never rolled back',async()=>{
 const h=await harness({concurrentDrive:true});await h.stage();await assert.rejects(h.remove());
 assert.equal(h.remote.get(ref(1).driveFileId).name,'External-change.jpg');assert.equal(h.remote.get(ref(1).driveFileId).trashed,false);
 await assert.rejects(h.service.resumeSavedAttachmentEdit({userId:h.user.uid,id:'warranty-one'}));
 assert.equal(h.remote.get(ref(1).driveFileId).name,'External-change.jpg');
});
test('reserved/uncertain upload state is not treated as a local-only pending attachment',async()=>{
 const h=await harness();const pending={id:'fresh',name:'Fresh.jpg',mime:'image/jpeg',size:1,sha256:'c'.repeat(64)};
 await h.stage({pending:[pending]});
 const entry=[...h.storage.data.entries()].find(([k])=>k.startsWith('garancije-drive-integration-v1:'));const j=JSON.parse(entry[1]);
 const key=await h.window.garancijeDeletionHash('unused');
 // Existing sealed state alone is sufficient to forbid local removal without claiming upload absence.
 j.draft.sealed=true;j.draft.saveState={version:1,phase:'external'};j.jobs[key]={id:'synthetic_reserved_id',state:'uncertain'};h.storage.data.set(entry[0],JSON.stringify(j));
 const d=h.service.getDraft(h.user.uid);await assert.rejects(h.service.removePendingAttachment({userId:h.user.uid,operationId:d.operationId,attachmentId:'fresh',expectedRevision:d.revision,
  expectedPending:h.service.pendingFingerprint(d.pending),expectedMetadata:d.metadata,expectedAttachments:d.attachments,isCurrent:()=>true}));
 assert.equal(h.service.getDraft(h.user.uid).pending.length,1);assert.equal(h.patches().length,0);
});
for(const name of ['Good-ž.jpg','😀.jpg','a'.repeat(120)+'.jpg','bad.png.jpg','../bad.jpg','a'.repeat(121)+'.jpg'])test('rename validation/extension '+name.slice(0,30),async()=>{
 const h=await harness(),d=await h.stage({attachments:[ref(1,name),ref(2)],seal:true});
 const valid=['Good-ž.jpg','😀.jpg','a'.repeat(120)+'.jpg'].includes(name);
 if(valid){await h.service.saveWarranty({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision});assert.equal(h.records.get('warranty-one').attachmentNames[0],name);}
 else{await assert.rejects(h.service.saveWarranty({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision}));assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);}
});
test('UI keeps immediate confirmation distinct from Save/Cancel and keeps legacy controls unavailable',()=>{
 assert.match(html,/Odustani iz forme ne ponistava ovu radnju/);assert.match(html,/Nastavi uklanjanje priloga/);
 assert.match(html,/onRemoveSaved&&!a\.legacy&&window\.garancijeSavedAttachments\.ref\(a\)/);
 assert.match(html,/onSavedNameChange&&!a\.legacy&&window\.garancijeSavedAttachments\.ref\(a\)/);
 assert.match(html,/savedEditPendingRef\.current/);
});
test('real bounded timeout after Drive success keeps recovery and does not repeat trash',async()=>{
 const h=await harness({hangPatch:true});await h.stage();
 const keepAlive=new Promise(resolve=>setTimeout(resolve,150));await assert.rejects(h.remove());await keepAlive;
 assert.equal(h.remote.get(ref(1).driveFileId).trashed,true);assert.ok(h.records.get('warranty-one')._attachmentEdit);
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote});await next.service.resumeSavedAttachmentEdit({userId:next.user.uid,id:'warranty-one'});
 assert.equal(next.patches().length,0);assert.equal(next.records.get('warranty-one')._attachmentEdit,undefined);
});
test('transaction conflict cannot overwrite concurrent metadata or send a Drive mutation',async()=>{
 let changed=false;const h=await harness({beforeCommit({pending,records}){if(!changed&&pending.some(x=>x.patch._attachmentEdit)){changed=true;records.get('warranty-one').description='Concurrent preserved';}}});
 await h.stage();await assert.rejects(h.remove());assert.equal(h.records.get('warranty-one').description,'Concurrent preserved');
 assert.equal(h.records.get('warranty-one').attachments.length,2);assert.equal(h.patches().length,0);
});
test('reference appearing in another record after unlink prevents trash and stays pending',async()=>{
 const h=await harness({afterCommit({pending,records}){if(pending.some(x=>x.patch._attachmentEdit?.kind==='remove'))records.set('new-other',{name:'Other',attachments:[ref(1)]});}});
 await h.stage();await assert.rejects(h.remove());assert.equal(h.records.get('warranty-one').attachments.length,1);
 assert.equal(h.remote.get(ref(1).driveFileId).trashed,false);assert.ok(h.records.get('warranty-one')._attachmentEdit);
});
for(const mode of ['omit','swap-id','change-checksum'])test('Save rejects an implicit unlink or changed file identity '+mode,async()=>{
 const h=await harness();let attachments=[ref(1),ref(2)];if(mode==='omit')attachments=[ref(2)];
 if(mode==='swap-id')attachments[0].driveFileId=ref(2).driveFileId;if(mode==='change-checksum')attachments[0].sha256='e'.repeat(64);
 const d=await h.stage({attachments,seal:true});await assert.rejects(h.service.saveWarranty({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision}));
 assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);
});
test('a different signed-in account can render status without accessing owner journal',async()=>{
 const h=await harness();h.window.firebaseDeps.auth.currentUser={uid:'other',email:'other.invalid'};
 assert.equal(h.service.hasSavedAttachmentEdit('other','warranty-one'),null);
});
test('UI progress observes persisted unlink and rebased draft while Drive is still unchanged',async()=>{
 const h=await harness();await h.stage({name:'Unsaved name'});let notified=0;
 await h.remove({onUnlinked({record,draft}){
  notified++;assert.equal(record.attachments.length,1);assert.equal(draft.attachments.length,1);
  assert.equal(draft.metadata.name,'Unsaved name');assert.equal(h.remote.get(ref(1).driveFileId).trashed,false);
  assert.equal(h.patches().length,0);assert.equal(h.records.get('warranty-one').attachmentCount,1);
 }});assert.equal(notified,1);assert.equal(h.remote.get(ref(1).driveFileId).trashed,true);
});
test('genuinely unuploaded pending file is removed locally with zero Firebase/Drive writes',async()=>{
 const h=await harness(),pending={id:'fresh',name:'Fresh.jpg',mime:'image/jpeg',size:1,sha256:'c'.repeat(64)};await h.stage({pending:[pending]});
 const d=h.service.getDraft(h.user.uid);await h.service.removePendingAttachment({userId:h.user.uid,operationId:d.operationId,attachmentId:'fresh',
  expectedRevision:d.revision,expectedPending:h.service.pendingFingerprint(d.pending),expectedMetadata:d.metadata,expectedAttachments:d.attachments,isCurrent:()=>true});
 assert.equal(h.service.getDraft(h.user.uid).pending.length,0);assert.equal(h.writes.length,0);assert.equal(h.calls.length,0);
});
for(const state of ['reserved','uncertain','confirmed'])test('upload journal '+state+' blocks local-only pending removal even before sealing',async()=>{
 const h=await harness(),pending={id:'fresh',name:'Fresh.jpg',mime:'image/jpeg',size:1,sha256:'c'.repeat(64)};await h.stage({pending:[pending]});
 const d=h.service.getDraft(h.user.uid),entry=[...h.storage.data.entries()].find(([k])=>k.startsWith('garancije-drive-integration-v1:'));
 const key=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('upload:'+d.operationId+':'+pending.sha256))).toString('hex');
 const j=JSON.parse(entry[1]);j.jobs[key]={id:'synthetic_reserved_file',state};h.storage.data.set(entry[0],JSON.stringify(j));
 await assert.rejects(h.service.removePendingAttachment({userId:h.user.uid,operationId:d.operationId,attachmentId:'fresh',expectedRevision:d.revision,
  expectedPending:h.service.pendingFingerprint(d.pending),expectedMetadata:d.metadata,expectedAttachments:d.attachments,isCurrent:()=>true}));
 assert.equal(h.service.getDraft(h.user.uid).pending.length,1);assert.equal(h.writes.length,0);assert.equal(h.calls.length,0);
});
test('saved-name preparation uses existing NFC/trim rules before sealing Save',async()=>{
 const h=await harness(),desired=[ref(1,'  Cafe\u0301.jpg  '),ref(2)];
 // The UI appends the locked extension after the editable base.
 desired[0].name='  Cafe\u0301  .jpg';
 const prepared=h.window.garancijeSavedAttachments.prepareNames(h.records.get('warranty-one'),desired);
 assert.equal(prepared[0].name,'Café.jpg');assert.equal(desired[0].name,'  Cafe\u0301  .jpg');
 const d=await h.stage({attachments:clone(prepared),seal:true});await h.service.saveWarranty({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision});
 assert.equal(h.records.get('warranty-one').attachmentNames[0],'Café.jpg');
});
test('double Save after staged rename cannot issue a second Drive mutation',async()=>{
 const h=await harness(),d=await h.stage({attachments:[ref(1,'Desired.jpg'),ref(2)],seal:true});
 const args={userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision};
 const result=await Promise.allSettled([h.service.saveWarranty(args),h.service.saveWarranty(args)]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(h.patches().length,1);
});
