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
 const context=vm.createContext({window,navigator,crypto:webcrypto,URL,URLSearchParams,Blob,Response,Headers,AbortController,DOMException,TextEncoder,TextDecoder,structuredClone,
  console:{log(){}},setTimeout(fn,ms){const t=setTimeout(fn,ms);t.unref?.();return t;},clearTimeout});
 vm.runInContext(config.legacyNullBug?script.replace('const existing=record?._attachmentEdit;','const existing=record._attachmentEdit;'):script,context);user.email=/const EMAIL = '([^']+)'/.exec(script)[1];
 const products=/products:\s*'([^']+)'/.exec(script)[1],scope=/const SCOPE = '([^']+)'/.exec(script)[1],remote=config.remote??new Map();
 if(!config.remote)for(const value of records.values())for(const a of value.attachments||[])if(a.driveFileId&&!remote.has(a.driveFileId))remote.set(a.driveFileId,
  {id:a.driveFileId,name:a.name,mimeType:a.mime,size:String(a.size),sha256Checksum:a.sha256,parents:[products],ownedByMe:true,shared:false,
   permissions:[{type:'user',role:'owner',emailAddress:user.email}],capabilities:{canRename:true,canTrash:true},
   appProperties:{app:'garancije-pro',operation:'b'.repeat(64),sha256:a.sha256},trashed:false,v:1});
 const folders=vm.runInContext('('+/const DRIVE_FOLDERS = (\{[^;]+\});/.exec(script)[1]+')',context);
 const uploads=new Map();let generated=0;
 const send=async(url,init={})=>{
  calls.push({url,method:init.method??'GET',body:init.body,headers:init.headers});const u=new URL(url);
  if(u.pathname.startsWith('/drive/v2/files/')){
   assert.ok(config.v2Enabled,'V2 is forbidden outside explicit trial tests');const id=decodeURIComponent(u.pathname.split('/').at(-1)),f=remote.get(id);
   if(!f)return new Response('{}',{status:404});
   if((init.method??'GET')==='GET'){
    if(config.v2GetStatus)return new Response('{}',{status:config.v2GetStatus});
    await config.onV2Get?.(f);
    const v={...f,title:f.name,version:String(f.v),etag:'"v'+f.v+'"',fileSize:f.size,parents:f.parents.map(id=>({id})),labels:{trashed:f.trashed},
     properties:Object.entries(f.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))};
    if(config.v2NoTag)delete v.etag;if(config.v2WeakTag)v.etag='W/'+v.etag;if(config.v2BadPrivate)v.properties[0].visibility='PUBLIC';
    return new Response(JSON.stringify(v));
   }
   assert.equal(init.method,'PATCH');const body=JSON.parse(init.body);assert.deepEqual(Object.keys(body),['title']);
   assert.ok([config.v2Old,config.v2New].includes(body.title));const negative=body.title===config.v2Old;
   if(negative){assert.notEqual(init.headers['If-Match'],'"v'+f.v+'"');if(config.v2NegativeLost){config.v2NegativeLost=false;throw Error('NEGATIVE_RESPONSE_LOST');}
    if(config.v2NegativeIgnored){f.v++;return new Response(JSON.stringify({id:f.id,title:f.name}),{status:200});}
    config.onV2Negative?.(f);return new Response('{}',{status:412});
   }
   if(config.v2PositiveConflict){f.name='EXTERNAL.jpg';f.v++;}
   if(init.headers['If-Match']!=='"v'+f.v+'"')return new Response('{}',{status:412});
   f.name=body.title;f.v++;if(config.v2PositiveLost){config.v2PositiveLost=false;throw Error('POSITIVE_RESPONSE_LOST');}
   if(config.v2PositiveHang){config.v2PositiveHang=false;return new Promise(()=>{});}
   return new Response(JSON.stringify({id:f.id,title:f.name}));
  }
  if(u.pathname==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:user.email}}),{status:200});
  if(config.uploads){
   if(u.pathname==='/drive/v3/files/generateIds')return new Response(JSON.stringify({ids:['synthetic_upload_'+(++generated)]}));
   if(u.pathname==='/upload/drive/v3/files'){
    assert.equal(init.method,'POST');const meta=JSON.parse(init.body);assert.ok(!remote.has(meta.id));uploads.set(meta.id,meta);
    return new Response('',{headers:{Location:'https://www.googleapis.com/upload/drive/v3/files/synthetic/'+meta.id}});
   }
   if(u.pathname.startsWith('/upload/drive/v3/files/synthetic/')){
    assert.equal(init.method,'PUT');assert.ok(init.body instanceof Blob);const meta=uploads.get(u.pathname.split('/').at(-1));assert.ok(meta);
    const hash=Buffer.from(await webcrypto.subtle.digest('SHA-256',await init.body.arrayBuffer())).toString('hex');assert.equal(hash,meta.appProperties.sha256);
    remote.set(meta.id,{...meta,size:String(init.body.size),sha256Checksum:hash,ownedByMe:true,shared:false,
     permissions:[{type:'user',role:'owner',emailAddress:user.email}],trashed:false,v:1});return new Response('{}');
   }
   const folderId=u.pathname.split('/').at(-1),kind=Object.keys(folders).find(k=>folders[k]===folderId);
   if(kind)return new Response(JSON.stringify({id:folderId,name:{root:'baza-garancije-i-racuni',products:'proizvodi',backups:'rezervne-kopije'}[kind],
    mimeType:'application/vnd.google-apps.folder',parents:kind==='root'?[]:[folders.root],ownedByMe:true,trashed:false,
    permissions:[{type:'user',role:'owner',emailAddress:user.email}]}));
  }
  if(u.pathname==='/drive/v3/files'){config.onRecovery?.();if(config.recoveryOffline)throw Error('SYNTHETIC_OFFLINE');if(config.recoveryStatus)return new Response('{}',{status:config.recoveryStatus});const page=u.searchParams.has('pageToken')?1:0;const result=typeof config.recoveryPages==='function'?config.recoveryPages(u,page):(config.recoveryPages?.[page]??{files:[]});return new Response(JSON.stringify(result));}
  if(!u.pathname.startsWith('/drive/v3/files/'))throw Error('UNEXPECTED_SYNTHETIC_ENDPOINT');
  assert.equal(u.searchParams.has('alt'),false,'No content downloads');const id=decodeURIComponent(u.pathname.split('/').at(-1)),file=remote.get(id);
  if(!file||config.getStatus)return new Response('{}',{status:config.getStatus??404});
  if((init.method??'GET')==='GET'){await config.onMetadata?.();}
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

async function newDraft(h,pending=[]){
 return h.service.stageDraft({userId:h.user.uid,base:null,metadata:{name:'Synthetic new warranty',purchaseDate:'2026-11-01',baseMonths:12},
  attachments:[],pending,operationId:'synthetic-new-operation',expectedRevision:h.service.contentRevision(h.service.getDraft(h.user.uid)),seal:true});
}
async function originals(){
 return Promise.all(['GP-proba-preimenovanje.jpg','GP-proba-uklanjanje.jpg'].map(async(name,i)=>{
  const original=new Blob(['SYNTHETIC_IMAGE_BYTES_'+i],{type:'image/jpeg'});
  const sha256=Buffer.from(await webcrypto.subtle.digest('SHA-256',await original.arrayBuffer())).toString('hex');
  return {id:'new-pending-'+i,name,mime:original.type,size:original.size,sha256,original};
 }));
}
const saveArgs=(h,d,newAttachments=[])=>({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision,newAttachments});
test('real saveWarranty creates a new warranty without attachments and without Drive calls',async()=>{
 const h=await harness({records:new Map()}),d=await newDraft(h);
 assert.equal(d.edit,false);assert.equal(d.expected,'null');
 const result=await h.service.saveWarranty(saveArgs(h,d));
 assert.equal(result.length,0);assert.equal(h.records.size,1);assert.equal(h.records.get(d.id).attachmentCount,0);
 assert.deepEqual(h.records.get(d.id).attachmentNames,[]);assert.equal(h.calls.length,0);assert.equal(h.writes.length,1);
 assert.equal(h.service.getDraft(h.user.uid),null);
});
test('real saveWarranty creates a new warranty with two pending originals exactly once',async()=>{
 const h=await harness({records:new Map(),uploads:true}),picked=await originals(),d=await newDraft(h,picked);
 const result=await h.service.saveWarranty(saveArgs(h,d,picked));
 assert.equal(result.length,2);assert.equal(h.records.size,1);assert.equal(h.remote.size,2);
 assert.equal(h.records.get(d.id).attachmentCount,2);assert.deepEqual(h.records.get(d.id).attachmentNames,picked.map(x=>x.name));
 assert.equal(h.calls.filter(x=>x.method==='PUT').length,2);assert.equal(h.patches().length,0);assert.equal(h.writes.length,1);
 for(const r of result)assert.equal(h.remote.get(r.driveFileId).appProperties.sha256,r.sha256);
});
test('reload resumes exact sealed draft/operation after reproduced old null failure before any upload',async()=>{
 const old=await harness({records:new Map(),uploads:true,legacyNullBug:true}),picked=await originals(),d=await newDraft(old,picked);
 await assert.rejects(old.service.saveWarranty(saveArgs(old,d,picked)),/Cannot read properties of null/);
 assert.equal(old.calls.length,0);assert.equal(old.writes.length,0);
 const next=await harness({storage:old.storage,records:old.records,remote:old.remote,uploads:true}),restored=next.service.getDraft(next.user.uid);
 assert.equal(restored.sealed,true);assert.equal(restored.operationId,d.operationId);assert.equal(restored.id,d.id);
 assert.equal(restored.revision,d.revision);assert.equal(restored.expected,'null');assert.ok(restored.pending.every(x=>!x.original));
 await assert.rejects(next.service.saveWarranty(saveArgs(next,restored)),/Ponovo izaberite original/);
 assert.equal(next.remote.size,0);assert.equal(next.writes.length,0);
 const wrong=await originals();wrong[0]={...wrong[0],original:new Blob(['WRONG'],{type:'image/jpeg'})};
 await assert.rejects(next.service.saveWarranty(saveArgs(next,restored,wrong)),/Hash mora odgovarati/);
 assert.equal(next.remote.size,0);assert.equal(next.writes.length,0);
 assert.throws(()=>next.window.attachmentNames.reselect(restored.pending[0],{...picked[0],sha256:'f'.repeat(64)}),/ne odgovara/);
 const reselected=restored.pending.map((saved,i)=>next.window.attachmentNames.reselect(saved,picked[i]));
 await next.service.saveWarranty(saveArgs(next,restored,reselected));
 assert.equal(next.records.size,1);assert.equal(next.records.get(d.id).lastOperation,d.operationId);assert.equal(next.remote.size,2);
 assert.equal(next.service.getDraft(next.user.uid),null);
});
test('new save retry after committed response loss uses same record and never uploads twice',async()=>{
 const h=await harness({records:new Map(),uploads:true,loseRenameCommit:true}),picked=await originals(),d=await newDraft(h,picked);
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d,picked)),/SYNTHETIC_SAVE_RESPONSE_LOST/);
 assert.equal(h.records.get(d.id).lastOperation,d.operationId);assert.equal(h.remote.size,2);
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote,uploads:true}),restored=next.service.getDraft(next.user.uid);
 await next.service.saveWarranty(saveArgs(next,restored));assert.equal(next.calls.length,0);assert.equal(next.writes.length,0);
 assert.equal(next.records.size,1);assert.equal(next.remote.size,2);assert.equal(next.service.getDraft(next.user.uid),null);
 await assert.rejects(next.service.saveWarranty(saveArgs(next,restored)),/Nema sačuvanog nacrta/);
});
test('stale draft for deleted existing warranty cannot recreate it or upload pending originals',async()=>{
 const h=await harness({uploads:true}),picked=await originals(),d=await h.stage({pending:picked,seal:true});
 h.records.delete('warranty-one');
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d,picked)),/međuvremenu promenjen/);
 assert.equal(h.records.size,0);assert.equal(h.writes.length,0);assert.equal(h.calls.length,0);
 assert.equal(h.service.getDraft(h.user.uid).operationId,d.operationId);
});

test('Chromium DOM focus/caret and real draft autosave through rapid saved/pending/product edits',{skip:process.env.GP_DOM_TEST!=='1'},async()=>{
 const {createRequire}=await import('node:module'),req=createRequire(import.meta.url);
 let pw;try{pw=req('playwright');}catch{pw=req(process.env.GP_PLAYWRIGHT_PATH);}
 const babel=req(process.env.GP_BABEL_PATH);
 const urls=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(x=>/react(?:-dom)?@/.test(x));
 const libs=await Promise.all(urls.map(async u=>{const r=await fetch(u);assert.equal(r.status,200);return r.text();}));
 const browser=await pw.chromium.launch({headless:true,...(process.env.GP_CHROMIUM_PATH?{executablePath:process.env.GP_CHROMIUM_PATH}:{})});
 try{
  const page=await browser.newPage();page.on('pageerror',e=>console.log('DOM_ERROR',e.message));let requests=0;
  await page.route('**/*',r=>r.request().url()==='http://localhost/'?r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}):(requests++,r.abort()));
  await page.goto('http://localhost/');for(const content of libs)await page.addScriptTag({content});
  await page.addScriptTag({content:script});
  const component=html.slice(html.indexOf('        function AttachmentList('),html.indexOf('        const draftConflictMessage'));
  const start=html.indexOf('            useEffect(()=>{',html.indexOf('exitContent.current=stagedContent;'));
  const effect=html.slice(start,html.indexOf('            const allowExit=',start));
  const hs=html.indexOf('            const changeSavedName='),handler=html.slice(hs,html.indexOf('\n            };',hs)+15);
  const parent=html.split('\n').find(l=>l.includes('<AttachmentList attachments={[...legacy, ...attachments, ...pending]}'));
  const code=[
   "const {useState,useEffect,useRef}=React,attachmentNames=window.attachmentNames,attachmentKinds=['Ostalo'],appNavigation={pending:false},AttachmentViewer=()=>null;",
   "window.firebaseDeps={auth:{currentUser:{uid:'synthetic-owner',email:"+JSON.stringify(/const EMAIL = '([^']+)'/.exec(script)[1])+"}}};",
   "const service=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'isolated-dom',storage:localStorage,metadataStore:{read:async()=>null,list:async()=>[]},authorize:async()=>({access_token:'synthetic-DOM-token',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'}),getUser:()=>window.firebaseDeps.auth.currentUser,fetch:async u=>{if(new URL(u).pathname==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:window.firebaseDeps.auth.currentUser.email}}));if(new URL(u).pathname==='/drive/v3/files')return new Response(JSON.stringify({files:[]}));throw Error('NETWORK_FORBIDDEN');}});",
   "const actualStage=service.stageDraft.bind(service);window.stageTransitions=[];service.stageDraft=args=>new Promise(r=>setTimeout(r,35)).then(()=>actualStage(args)).then(d=>{window.stageTransitions.push(d);return d;});window.service=service;",
   component,
   "function Fixture(){const user=window.firebaseDeps.auth.currentUser,initial={id:'dom-warranty',name:'Product',attachments:"+JSON.stringify([ref(1)])+"};",
   "const [form,setForm]=useState({name:'Product'}),[attachments,setAttachments]=useState(initial.attachments),[pending,setPending]=useState([{id:'pending',name:'Pending.jpg',mime:'image/jpeg',sha256:'c'.repeat(64),size:5,kind:'Ostalo'}]);",
   "const [staging,setStaging]=useState(false),[sealed,setSealed]=useState(false),[safety,setSafety]=useState(false);const saving=safety,processing=false,removing=false,stale=false,conflict=null,resolving=false,documentFile=null,legacy=[],blocked=()=>false;",
   "const mounted=useRef(true),disposed=useRef(false),discardingRef=useRef(false),savingRef=useRef(false),removingRef=useRef(false),processingRef=useRef(false),stagingRef=useRef(false),stageSequence=useRef(0),draftOperation=useRef('dom-operation'),draftPending=useRef(service.pendingFingerprint([])),draftRevisionRef=useRef(service.contentRevision(null)),stageTask=useRef(null),stageAcknowledged=useRef(null),exitContent=useRef(null);",
   "savingRef.current=saving;window.setSafety=setSafety;window.staging=staging;const acknowledgeDraft=d=>{draftPending.current=service.pendingFingerprint(d.pending);draftRevisionRef.current=service.contentRevision(d);setSealed(!!d.sealed);};const handleDraftError=e=>{window.fixtureError=e.message;};const stagedContent=window.garancijeFingerprint({form,attachments,pending:service.pendingFingerprint(pending)});exitContent.current=stagedContent;",
   effect,handler,
   "const changeKind=()=>{},removePending=()=>{},runSavedRemoval=()=>{},changePendingName=(id,value)=>setPending(p=>p.map(a=>a.id===id?{...a,name:value+'.jpg'}:a));",
   'return <><input aria-label="Product name" value={form.name} onChange={e=>setForm({name:e.target.value})}/>{'+parent.trim()+'}</>;}',
   "service.authChanged(window.firebaseDeps.auth.currentUser).then(()=>service.connect()).then(()=>{window.domRoot=ReactDOM.createRoot(document.getElementById('root'));window.domRoot.render(<Fixture/>);});"
  ].join('\n');
  await page.addScriptTag({content:babel.transform(code,{presets:[['react',{runtime:'classic'}]]}).code});
  await page.waitForFunction(()=>window.stageTransitions?.length>0,null,{timeout:5000});
  const saved=page.locator('input').nth(1);assert.equal(await saved.inputValue(),'Image-1');
  await saved.focus();await saved.evaluate(e=>{window.originalInput=e;window.blurCount=0;window.disabledDuringTyping=0;new MutationObserver(()=>{if(e.disabled)window.disabledDuringTyping++;}).observe(e,{attributes:true,attributeFilter:['disabled']});e.addEventListener('blur',()=>window.blurCount++);e.setSelectionRange(2,2);});
  await page.keyboard.type('abc',{delay:1});await page.waitForTimeout(100);
  assert.deepEqual(await saved.evaluate(e=>({same:e===window.originalInput,focus:e===document.activeElement,caret:e.selectionStart,disabled:e.disabled,blur:window.blurCount})),{same:true,focus:true,caret:5,disabled:false,blur:0});
  await page.keyboard.press('Backspace');await page.keyboard.insertText('Ž paste ');
  await saved.dispatchEvent('compositionstart',{data:''});await page.keyboard.insertText('漢');await saved.dispatchEvent('compositionend',{data:'漢'});
  await page.waitForTimeout(150);const value=await saved.inputValue();
  assert.equal(await page.evaluate(()=>window.service.getDraft('synthetic-owner').attachments[0].name),value+'.jpg');
  assert.equal(await saved.evaluate(e=>e===document.activeElement&&e===window.originalInput),true);assert.equal(await page.evaluate(()=>window.blurCount),0);assert.equal(await page.evaluate(()=>window.disabledDuringTyping),0);assert.ok(await page.evaluate(()=>window.stageTransitions.length>1));
  for(const label of ['Naziv priloga 2','Product name']){
   const input=page.getByRole('textbox',{name:label,exact:true});await input.focus();await input.press('End');await input.pressSequentially('quick',{delay:1});await input.press('Backspace');await page.waitForTimeout(100);
   assert.equal(await input.evaluate(e=>e===document.activeElement),true);const v=await input.inputValue();
   const persisted=await page.evaluate(l=>{const d=window.service.getDraft('synthetic-owner');return l==='Product name'?d.metadata.name:d.pending[0].name;},label);assert.equal(persisted,label==='Product name'?v:v+'.jpg');
  }
  await page.evaluate(()=>window.setSafety(true));assert.equal(await saved.isDisabled(),true);
  await page.evaluate(()=>window.setSafety(false));assert.equal(await saved.isDisabled(),false);
  assert.equal(await page.evaluate(()=>window.fixtureError),undefined);assert.equal(requests,0);
  console.log('DOM: stable node/focus/caret; typing/delete/paste/composition; pending/product; latest actual stageDraft; Save lock; zero network');

  await page.evaluate(async()=>{
   const service=window.service,d=service.getDraft('synthetic-owner');
   await service.stageDraft({userId:'synthetic-owner',id:d.id,base:JSON.parse(d.expected),metadata:d.metadata,attachments:d.attachments,pending:d.pending,operationId:d.operationId,expectedRevision:d.revision,seal:true});
   const key=Object.keys(localStorage).find(k=>k.startsWith('garancije-drive-integration-v1:isolated-dom:'));
   const j=JSON.parse(localStorage.getItem(key));j.draft.saveState={version:1,phase:'external'};
   const sha=j.draft.pending[0].sha256,bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('upload:'+d.operationId+':'+sha));
   const job=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
   localStorage.setItem(key,JSON.stringify(j));window.attachmentService=service;
  });
  const recovery=html.slice(html.indexOf('        function AbandonedDraftRecovery('),html.indexOf('        function SavedAttachmentRecovery('));
  const discardButton=html.split('\n').find(l=>l.includes('onClick={discard}')&&l.includes('Odbaci nacrt'));
  const discardFixture=[
   recovery,
   "function DiscardFixture(){const [done,setDone]=useState(false),[failure,setFailure]=useState('');const saving=false,processing=false,staging=false,removing=false,discarding=false,sealed=true;",
   "const discard=async()=>{if(!confirm('Odbaci aktivni nacrt? Sacuvana garancija i Drive fajlovi ostaju.'))return;try{const d=service.getDraft('synthetic-owner');await service.discardDraft({userId:'synthetic-owner',id:d.id,operationId:d.operationId,expected:window.garancijeFingerprint(d),expectedRevision:d.revision});setDone(true);}catch(e){setFailure(e.message);}};",
   'return <>{done?<p>Aktivni nacrt je odbacen</p>:<>'+discardButton+'</>}<p role="alert">{failure}</p><AbandonedDraftRecovery user={window.firebaseDeps.auth.currentUser}/></>;}',
   'window.domRoot.render(<DiscardFixture/>);'
  ].join('\n');
  await page.addScriptTag({content:babel.transform(discardFixture,{presets:[['react',{runtime:'classic'}]]}).code});
  const discardControl=page.getByRole('button',{name:'Odbaci nacrt',exact:true});assert.equal(await discardControl.isEnabled(),true);
  page.once('dialog',d=>d.accept());await discardControl.click();
  await page.getByText('Aktivni nacrt je odbacen',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.service.getDraft('synthetic-owner')),null);
  const archive=page.getByRole('region',{name:'Odbaceni nacrti za oporavak'});
  assert.equal(await archive.count(),1);const toggle=archive.getByRole('button',{name:'Prikaži detalje prenosa'});await toggle.focus();await toggle.press('Enter');assert.equal(await archive.getByRole('button',{name:'Sakrij detalje'}).getAttribute('aria-expanded'),'true');assert.ok((await archive.innerText()).includes('dom-operation'));await archive.getByRole('button',{name:'Sakrij detalje'}).click();await archive.getByRole('button',{name:'Proveri prenos',exact:true}).click();await archive.getByText('Nije pronađen fajl dostupan ovoj aplikaciji.',{exact:false}).waitFor();page.once('dialog',d=>d.accept());await archive.getByRole('button',{name:'Zatvori upozorenje i sačuvaj evidenciju',exact:true}).click();await page.waitForFunction(()=>window.service.getAbandonedDrafts('synthetic-owner')[0].closed===true);assert.equal(await archive.count(),0);assert.ok(await page.evaluate(()=>window.service.getAbandonedDrafts('synthetic-owner')[0].closeAudit));
  assert.equal(requests,0);console.log('DOM discard: sealed missing Blob, confirmation, active draft released, same-ID recovery visible, zero network');


  const diagnosticComponent=html.slice(html.indexOf('        function RenameInspection('),html.indexOf('        function DraftForm('));
  const syntheticRecord=record(),syntheticRemote={id:ref(1).driveFileId,name:ref(1).name,mimeType:ref(1).mime,size:String(ref(1).size),
   parents:[/products:\s*'([^']+)'/.exec(script)[1]],appProperties:{app:'garancije-pro',operation:'b'.repeat(64),sha256:ref(1).sha256},sha256Checksum:ref(1).sha256,
   ownedByMe:true,shared:false,permissions:[{type:'user',role:'owner',emailAddress:/const EMAIL = '([^']+)'/.exec(script)[1]}],capabilities:{canRename:true},trashed:false};
  const diagnosticSetup=[
   diagnosticComponent,
   'window.diagRecord='+JSON.stringify(syntheticRecord)+';window.diagFile='+JSON.stringify(syntheticRemote)+';window.diagCalls=[];',
   "window.diagService=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'isolated-diagnostic',storage:localStorage,getUser:()=>window.firebaseDeps.auth.currentUser,metadataStore:{read:async()=>structuredClone(window.diagRecord),list:async()=>[],commit:async()=>{throw Error('COMMIT_FORBIDDEN');}},",
   "authorize:async()=>({access_token:'synthetic-never-real',expires_in:3600,scope:"+JSON.stringify(/const SCOPE = '([^']+)'/.exec(script)[1])+"}),",
   "fetch:async(u,init={})=>{if(new URL(u).pathname==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:window.firebaseDeps.auth.currentUser.email}}));window.diagCalls.push(init.method||'GET');if(window.diagHold)await new Promise(r=>window.releaseDiag=r);if((init.method||'GET')!=='GET')throw Error('WRITE_FORBIDDEN');return new Response(JSON.stringify(window.diagFile));}});",
   "window.attachmentService=window.diagService;",
   "function DiagnosticFixture(){const [key,setKey]=useState('stable');window.changeDiagnosticKey=setKey;return <fieldset><RenameInspection user={window.firebaseDeps.auth.currentUser} operationId='dom-diagnostic-operation' contentKey={key}/></fieldset>;}",
   "window.mountDiagnostic=async()=>{await window.diagService.authChanged(window.firebaseDeps.auth.currentUser);await window.diagService.connect();await window.diagService.stageDraft({userId:'synthetic-owner',id:'warranty-one',base:window.diagRecord,metadata:{name:'Synthetic warranty'},attachments:window.diagRecord.attachments.map((a,i)=>i===0?{...a,name:'New-name.jpg'}:a),pending:[],operationId:'dom-diagnostic-operation',expectedRevision:window.diagService.contentRevision(null),seal:true});window.domRoot.render(<DiagnosticFixture/>);};"
  ].join('\n');
  await page.addScriptTag({content:babel.transform(diagnosticSetup,{presets:[['react',{runtime:'classic'}]]}).code});
  await page.evaluate(()=>window.mountDiagnostic());
  const diagnosticButton=page.getByRole('button',{name:'Proveri preimenovanje - bez čuvanja',exact:true});
  assert.equal(await diagnosticButton.isEnabled(),true);
  const journalBefore=await page.evaluate(()=>JSON.stringify(Object.entries(localStorage)));
  await diagnosticButton.dblclick();
  await page.getByText('JavaScript vidi ETag (etagReadable)',{exact:true}).waitFor();
  assert.equal(await page.locator('dl dd').last().innerText(),'Ne');assert.ok((await page.getByRole('region',{name:'Dijagnostika preimenovanja'}).innerText()).includes('nije dokaz'));
  assert.equal(await page.evaluate(()=>window.diagCalls.length),1);
  assert.equal(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage))),journalBefore);
  await page.evaluate(()=>window.diagHold=true);await diagnosticButton.click();
  await page.waitForFunction(()=>window.diagCalls.length===2,null,{timeout:5000});
  await page.evaluate(()=>{window.changeDiagnosticKey('edited-while-checking');});
  await page.waitForTimeout(20);await page.evaluate(()=>window.releaseDiag());
  await page.waitForFunction(()=>!document.querySelector('[aria-label="Dijagnostika preimenovanja"] button').disabled,null,{timeout:5000});
  assert.equal(await page.locator('dl').count(),0);
  await diagnosticButton.click();await page.waitForFunction(()=>window.diagCalls.length===3,null,{timeout:5000});
  await page.addScriptTag({content:"window.domRoot.render(React.createElement('p',null,'Form closed'));"});await page.waitForTimeout(20);await page.evaluate(()=>window.releaseDiag());await page.waitForTimeout(50);
  assert.equal(await page.getByRole('region',{name:'Dijagnostika preimenovanja'}).count(),0);
  assert.equal(await page.evaluate(()=>JSON.stringify(Object.entries(localStorage))),journalBefore);
  assert.ok(await page.evaluate(()=>window.diagCalls.every(m=>m==='GET')));assert.equal(requests,0);
  console.log('DOM rename diagnostic: sealed draft, accessible button, sanitized predicates/ETag disclaimer, doubleclick one GET, content-change/unmount discard stale result, byte-identical journal, zero remote writes');


  const trialComponent=html.slice(html.indexOf('        function V2RenameTrial('),html.indexOf('        function RenameInspection('));
  const trialRecord=record();trialRecord.name=V2_PIN.name;trialRecord.attachments[0].name=V2_PIN.oldName;trialRecord.attachmentNames=trialRecord.attachments.map(a=>a.name);
  const trialRemote={...syntheticRemote,name:V2_PIN.oldName,v:1};
  const trialSetup=[
   trialComponent,'window.trialRecord='+JSON.stringify(trialRecord)+';window.trialRemote='+JSON.stringify(trialRemote)+';window.trialPatches=[];window.trialSdk=[];',
   "window.trialService=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'isolated-v2-approved',storage:localStorage,getUser:()=>window.firebaseDeps.auth.currentUser,",
   "metadataStore:{read:async()=>structuredClone(window.trialRecord),list:async()=>[{...structuredClone(window.trialRecord),id:"+JSON.stringify(V2_PIN.id)+"}],",
   "beginAttachmentEdit:async a=>{if(window.garancijeFingerprint(window.trialRecord)!==a.expected)throw Error('CONFLICT');window.trialSdk.push('reserve');window.trialRecord._attachmentEdit=a.operation;return structuredClone(window.trialRecord);},",
   "commit:async a=>{if(Object.keys(a.metadata).length)throw Error('UNAPPROVED_METADATA');const base=window.garancijeSavedAttachments.withoutEdit(window.trialRecord);if(window.garancijeFingerprint(base)!==a.expected)throw Error('CONFLICT');window.trialSdk.push('commit');window.trialRecord={...base,attachments:a.attachments,attachmentCount:a.attachments.length,attachmentNames:a.attachments.map(x=>x.name),lastOperation:a.operationId};}},",
   "authorize:async()=>({access_token:'synthetic-not-real',expires_in:3600,scope:"+JSON.stringify(/const SCOPE = '([^']+)'/.exec(script)[1])+"}),",
   "fetch:async(u,init={})=>{const p=new URL(u).pathname,f=window.trialRemote;if(p==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:window.firebaseDeps.auth.currentUser.email}}));if(p!=='/drive/v2/files/'+f.id)throw Error('UNAPPROVED_TARGET');if((init.method||'GET')==='GET')return new Response(JSON.stringify({...f,title:f.name,etag:'\"v'+f.v+'\"',version:String(f.v),fileSize:f.size,parents:f.parents.map(id=>({id})),labels:{trashed:false},properties:Object.entries(f.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))}));if(init.method!=='PATCH')throw Error('UNAPPROVED_METHOD');const b=JSON.parse(init.body);window.trialPatches.push(b);if(init.headers['If-Match']!=='\"v'+f.v+'\"')return new Response('{}',{status:412});f.name=b.title;f.v++;return new Response(JSON.stringify({id:f.id,title:f.name}));}});",
   "window.attachmentService=window.trialService;",
   "function TrialFixture(){const [busy,setBusy]=useState(false);return <fieldset disabled={busy}><V2RenameTrial user={window.firebaseDeps.auth.currentUser} operationId='dom-v2-trial' contentKey='fixed-approved' onBusy={setBusy} onComplete={()=>{window.trialCompleted=true;}}/></fieldset>;}",
   "window.mountTrial=async()=>{await window.trialService.authChanged(window.firebaseDeps.auth.currentUser);await window.trialService.connect();await window.trialService.stageDraft({userId:'synthetic-owner',id:"+JSON.stringify(V2_PIN.id)+",base:window.trialRecord,metadata:{name:'KEEP UNSAVED'},attachments:window.trialRecord.attachments.map((a,i)=>i===0?{...a,name:"+JSON.stringify(V2_PIN.newName)+"}:a),pending:[],operationId:'dom-v2-trial',expectedRevision:window.trialService.contentRevision(null),seal:true});window.domRoot.render(<TrialFixture/>);};"
  ].join('\n');
  await page.addScriptTag({content:babel.transform(trialSetup,{presets:[['react',{runtime:'classic'}]]}).code});await page.evaluate(()=>window.mountTrial());
  const prepare=page.getByRole('button',{name:'Proveri V2 oznaku - bez čuvanja',exact:true}),run=page.getByRole('button',{name:'Pokreni / nastavi odobrenu V2 probu',exact:true});
  assert.equal(await run.isDisabled(),true);await prepare.click();await page.getByText('V2 validator: dostupan.',{exact:false}).waitFor();
  assert.equal(await page.evaluate(()=>window.trialPatches.length),0);assert.equal(await page.evaluate(()=>window.trialSdk.length),0);
  page.once('dialog',d=>d.accept());await run.click();await page.waitForFunction(()=>window.trialCompleted===true,null,{timeout:5000});
  assert.deepEqual(await page.evaluate(()=>window.trialPatches),[{title:V2_PIN.oldName},{title:V2_PIN.newName}]);assert.deepEqual(await page.evaluate(()=>window.trialSdk),['reserve','commit']);
  assert.equal(await page.evaluate(()=>window.trialRemote.name),V2_PIN.newName);assert.equal(await page.evaluate(()=>window.trialService.getDraft('synthetic-owner').metadata.name),'KEEP UNSAVED');
  assert.equal(await page.evaluate(()=>window.trialRecord.attachments[1].name),trialRecord.attachments[1].name);assert.equal(await run.isDisabled(),true);
  assert.equal(requests,0);console.log('DOM V2 trial: prepare does zero writes; exact pin, explicit confirmation, 412 before valid PATCH, target-only commit, preserved draft; mock proof does not enable general transport');

 }finally{await browser.close();}
});



const discardArgs=(h,d)=>({userId:h.user.uid,id:d.id,operationId:d.operationId,expected:h.window.garancijeFingerprint(d),expectedRevision:d.revision});
function editJournal(h,fn){const entry=[...h.storage.data.entries()].find(([k])=>k.startsWith('garancije-drive-integration-v1:'));const j=JSON.parse(entry[1]);fn(j);h.storage.data.set(entry[0],JSON.stringify(j));return entry[0];}
test('discard without Blobs preserves existing warranty/count/names and makes zero Drive writes',async()=>{
 const h=await harness();await h.stage({pending:[{id:'p',name:'Missing.jpg',mime:'image/jpeg',sha256:'c'.repeat(64),size:5}]});
 const before=clone(h.records.get('warranty-one')),d=h.service.getDraft(h.user.uid);
 await h.service.discardDraft(discardArgs(h,d));assert.equal(h.service.getDraft(h.user.uid),null);assert.deepEqual(h.records.get('warranty-one'),before);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
test('sealed preflight can discard after authoritative absence without originals',async()=>{
 const h=await harness({records:new Map()}),d=await newDraft(h,[{id:'p',name:'Missing.jpg',mime:'image/jpeg',sha256:'c'.repeat(64),size:5}]);
 const result=await h.service.discardDraft(discardArgs(h,d));assert.equal(result.recoveryRetained,false);assert.equal(h.service.getDraft(h.user.uid),null);assert.equal(h.calls.length,0);
});
test('confirmed commit discards only local draft and preserves saved count/names',async()=>{
 const h=await harness({records:new Map(),uploads:true,loseRenameCommit:true}),picked=await originals(),d=await newDraft(h,picked);
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d,picked)));const before=clone(h.records.get(d.id)),live=h.service.getDraft(h.user.uid),calls=h.calls.length;
 const r=await h.service.discardDraft(discardArgs(h,live));assert.equal(r.committed,true);assert.equal(h.service.getDraft(h.user.uid),null);
 assert.deepEqual(h.records.get(d.id),before);assert.equal(h.calls.length,calls);assert.equal(h.remote.size,2);
});
for(const state of ['reserved','uncertain','confirmed'])test('discard archives '+state+' same IDs before clear, survives reload and forbids replay/duplicate upload',async()=>{
 const h=await harness({records:new Map(),uploads:true}),picked=await originals(),d=await newDraft(h,picked);
 const key=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('upload:'+d.operationId+':'+picked[0].sha256))).toString('hex');
 editJournal(h,j=>{j.jobs[key]={id:'synthetic_retained_upload',state};j.draft.saveState={version:1,phase:'external'};});
 const live=h.service.getDraft(h.user.uid),r=await h.service.discardDraft(discardArgs(h,live));assert.equal(r.recoveryRetained,true);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote,uploads:true});assert.equal(next.service.getDraft(next.user.uid),null);
 const archives=next.service.getAbandonedDrafts(next.user.uid);assert.equal(archives.length,1);assert.equal(archives[0].operationId,d.operationId);
 assert.equal(archives[0].jobs[key].id,'synthetic_retained_upload');assert.equal(archives[0].jobs[key].state,state);
 await assert.rejects(next.service.stageDraft({userId:next.user.uid,base:null,metadata:{name:'No replay'},attachments:[],pending:[],operationId:d.operationId}));
 const nd=await next.service.stageDraft({userId:next.user.uid,base:null,metadata:{name:'Different draft'},attachments:[],pending:picked,operationId:'different-operation',expectedRevision:next.service.contentRevision(null),seal:true});
 await assert.rejects(next.service.saveWarranty(saveArgs(next,nd,picked)),/nerazresenom prenosu/);assert.equal(next.remote.size,0);assert.equal(next.calls.filter(x=>x.method==='PUT').length,0);
});
for(const phase of ['commit','unknown'])test('unconfirmed '+phase+' phase cannot be discarded or silently archived',async()=>{
 const h=await harness({records:new Map()}),d=await newDraft(h);editJournal(h,j=>j.draft.saveState={version:1,phase});
 const live=h.service.getDraft(h.user.uid);await assert.rejects(h.service.discardDraft(discardArgs(h,live)),/Ishod cuvanja/);assert.ok(h.service.getDraft(h.user.uid));assert.equal(h.service.getAbandonedDrafts(h.user.uid).length,0);
});
for(const error of ['403','404','OFFLINE'])test('server '+error+' keeps sealed draft and recovery unchanged',async()=>{
 const h=await harness({records:new Map()}),d=await newDraft(h);
 h.window.driveEnvironment.metadataStore.read=async()=>{throw Error(error);};
 await assert.rejects(h.service.discardDraft(discardArgs(h,d)),new RegExp(error));assert.ok(h.service.getDraft(h.user.uid));assert.equal(h.service.getAbandonedDrafts(h.user.uid).length,0);
});
for(const kind of ['rename','remove'])test('active server '+kind+' blocks discard',async()=>{
 const h=await harness(),d=await h.stage({seal:true});h.records.get(d.id)._attachmentEdit={kind};
 await assert.rejects(h.service.discardDraft(discardArgs(h,d)));assert.ok(h.service.getDraft(h.user.uid));assert.equal(h.writes.length,0);
});
test('owner/revision changes during server reconciliation keep original draft',async()=>{
 for(const mode of ['owner','revision']){
  const h=await harness(),d=await h.stage({seal:true}),read=h.window.driveEnvironment.metadataStore.read;
  h.window.driveEnvironment.metadataStore.read=async(...args)=>{const r=await read(...args);if(mode==='owner')h.window.firebaseDeps.auth.currentUser={uid:'other'};else editJournal(h,j=>j.draft.revision++);return r;};
  await assert.rejects(h.service.discardDraft(discardArgs(h,d)));if(mode==='owner')h.window.firebaseDeps.auth.currentUser=h.user;assert.ok(h.service.getDraft(h.user.uid));
 }
});
for(const failure of ['archive-write','archive-readback','clear-write'])test('discard '+failure+' failure keeps active original and never loses upload identity',async()=>{
 const h=await harness({records:new Map()}),picked=await originals();await newDraft(h,picked);
 editJournal(h,j=>{j.draft.saveState={version:1,phase:'external'};});const d=h.service.getDraft(h.user.uid);
 if(failure==='archive-write')h.storage.fail=1;
 if(failure==='clear-write'){const set=h.storage.setItem.bind(h.storage);let n=0;h.storage.setItem=(k,v)=>{if(++n===2)throw Error('SYNTHETIC_CLEAR_FAILED');set(k,v);};}
 if(failure==='archive-readback'){const get=h.storage.getItem.bind(h.storage);h.storage.getItem=k=>{const raw=get(k);if(!raw)return raw;const j=JSON.parse(raw);if(j.abandonedDrafts)delete j.abandonedDrafts;return JSON.stringify(j);};}
 await assert.rejects(h.service.discardDraft(discardArgs(h,d)));assert.equal(h.service.getDraft(h.user.uid).operationId,d.operationId);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
test('double discard clears once and next new draft is not blocked by abandoned active operation',async()=>{
 const h=await harness({records:new Map()}),d=await newDraft(h),args=discardArgs(h,d);
 const result=await Promise.allSettled([h.service.discardDraft(args),h.service.discardDraft(args)]);assert.equal(result.filter(x=>x.status==='fulfilled').length,1);
 const next=await h.service.stageDraft({userId:h.user.uid,base:null,metadata:{name:'New'},attachments:[],pending:[],operationId:'fresh-operation',expectedRevision:h.service.contentRevision(null)});
 assert.equal(next.operationId,'fresh-operation');await assert.rejects(h.service.saveWarranty(saveArgs(h,d)));
});


test('active SDK commit lease blocks discard before server read or local clearing',async()=>{
 const h=await harness({records:new Map()}),d=await newDraft(h);
 const ns=[...h.storage.data.keys()].find(k=>k.startsWith('garancije-drive-integration-v1:'));
 let release;const held=new Promise(r=>release=r);
 const running=h.context.navigator.locks.request(ns+':commit:'+JSON.stringify([h.user.uid,d.operationId]),async()=>held);
 try{await assert.rejects(h.service.discardDraft(discardArgs(h,d)),e=>e.code==='COMMIT_PENDING');assert.ok(h.service.getDraft(h.user.uid));}
 finally{release();await running;}
});
test('unsealed flag cannot erase persistent uncertainty of an earlier commit',async()=>{
 const h=await harness({records:new Map()});await newDraft(h);editJournal(h,j=>{j.draft.sealed=false;j.draft.saveState={version:1,phase:'commit'};});
 const d=h.service.getDraft(h.user.uid);await assert.rejects(h.service.discardDraft(discardArgs(h,d)),/Ishod cuvanja/);assert.ok(h.service.getDraft(h.user.uid));
});


async function recoveryHarness(config={}){
 const h=await harness({records:new Map(),...config}),picked=await originals();await newDraft(h,picked);
 editJournal(h,j=>j.draft.saveState={version:1,phase:'external'});
 await h.service.discardDraft(discardArgs(h,h.service.getDraft(h.user.uid)));
 return h;
}
const recoveryArgs=h=>{const r=h.service.getAbandonedDrafts(h.user.uid)[0];return {userId:h.user.uid,operationId:r.operationId,expected:h.window.garancijeFingerprint(r)};};
async function foundFile(h,index=0,extra={}){
 const r=h.service.getAbandonedDrafts(h.user.uid)[0],a=r.pending[index];
 const key=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('upload:'+r.operationId+':'+a.sha256))).toString('hex');
 return {id:'synthetic_found_'+index,name:a.name,mimeType:a.mime,size:String(a.size),appProperties:{app:'garancije-pro',operation:key,sha256:a.sha256},
  sha256Checksum:a.sha256,ownedByMe:true,shared:false,permissions:[{type:'user',role:'owner',emailAddress:h.user.email}],trashed:false,...extra};
}
test('external/no jobs complete same-client search has limited negative result; audited close preserves active other draft/reupload guard',async()=>{
 const h=await recoveryHarness({recoveryPages:[{files:[]}]});
 const other=await h.service.stageDraft({userId:h.user.uid,base:null,metadata:{name:'Other'},attachments:[],pending:[],operationId:'other-active',expectedRevision:h.service.contentRevision(null)});
 const r=await h.service.checkAbandonedTransfer(recoveryArgs(h));assert.equal(r.status,'no_accessible_files');assert.equal(r.complete,true);
 assert.ok(h.calls.filter(c=>new URL(c.url).pathname==='/drive/v3/files').every(c=>!new URL(c.url).searchParams.get('q').includes('trashed')&&!new URL(c.url).searchParams.get('q').includes('parents')));
 await h.service.closeAbandonedTransfer(recoveryArgs(h));const a=h.service.getAbandonedDrafts(h.user.uid)[0];assert.equal(a.closed,true);assert.ok(a.closeAudit);assert.equal(a.pending.length,2);assert.equal(h.service.getDraft(h.user.uid).operationId,other.operationId);
 const reload=await harness({storage:h.storage,records:h.records,remote:h.remote});assert.equal(reload.service.getAbandonedDrafts(reload.user.uid)[0].closed,true);
 assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
});
test('confirmed commit stays untouched and close stores audit without copying warranty body',async()=>{
 const h=await recoveryHarness({recoveryPages:[{files:[]}]}),a=h.service.getAbandonedDrafts(h.user.uid)[0];
 h.records.set(a.id,{name:'Saved',lastOperation:a.operationId,attachmentCount:0,attachmentNames:[],attachments:[]});const before=clone(h.records.get(a.id));
 assert.equal((await h.service.checkAbandonedTransfer(recoveryArgs(h))).status,'confirmed_commit');
 await h.service.closeAbandonedTransfer(recoveryArgs(h));assert.deepEqual(h.records.get(a.id),before);assert.equal(h.writes.length,0);
 assert.match(h.service.getAbandonedDrafts(h.user.uid)[0].check.serverFingerprint,/^[a-f0-9]{64}$/);
});
test('unknown IDs search finds moved/trashed multiple matches on all pages with references',async()=>{
 const h=await recoveryHarness();const f=await foundFile(h),g={...f,id:'second_match',trashed:true,parents:['moved-folder']};
 h.config.recoveryPages=(u,page)=>u.searchParams.get('q').includes(f.appProperties.operation)?[{files:[f],nextPageToken:'page2'},{files:[g]}][page]:{files:[]};h.records.set('reference-warranty',{attachments:[{driveFileId:g.id}]});
 const r=await h.service.checkAbandonedTransfer(recoveryArgs(h));assert.equal(r.status,'files_found');assert.equal(r.files.length,2);assert.equal(r.files[1].trashed,true);assert.deepEqual(clone(r.files[1].references),['reference-warranty']);assert.equal(h.patches().length,0);
});
test('known ID is read directly and must match same operation identity',async()=>{
 const h=await recoveryHarness(),f=await foundFile(h);h.remote.set(f.id,f);h.config.recoveryPages=[{files:[]}];
 editJournal(h,j=>{const a=Object.values(j.abandonedDrafts)[0];a.jobs[f.appProperties.operation]={id:f.id,state:'confirmed'};});
 const r=await h.service.checkAbandonedTransfer(recoveryArgs(h));assert.equal(r.files[0].id,f.id);assert.ok(h.calls.some(c=>new URL(c.url).pathname.endsWith('/'+f.id)));
});
for(const mode of ['403','offline','incomplete','malformed','identity','repeat-page','known404'])test('recovery '+mode+' blocks close and invalidates previous successful finding',async()=>{
 const h=await recoveryHarness({recoveryPages:[{files:[]}]});await h.service.checkAbandonedTransfer(recoveryArgs(h));
 if(mode==='403')h.config.recoveryStatus=403;
 if(mode==='offline')h.config.recoveryOffline=true;
 if(mode==='incomplete')h.config.recoveryPages=[{files:[],incompleteSearch:true}];
 if(mode==='malformed')h.config.recoveryPages=[{}];
 if(mode==='identity')h.config.recoveryPages=[{files:[await foundFile(h,0,{ownedByMe:false})]}];
 if(mode==='repeat-page')h.config.recoveryPages=[{files:[],nextPageToken:'page2'},{files:[],nextPageToken:'page2'}];
 if(mode==='known404'){const f=await foundFile(h);editJournal(h,j=>{const a=Object.values(j.abandonedDrafts)[0];a.jobs[f.appProperties.operation]={id:'missing-id',state:'uncertain'};});}
 await assert.rejects(h.service.checkAbandonedTransfer(recoveryArgs(h)));await assert.rejects(h.service.closeAbandonedTransfer(recoveryArgs(h)));assert.notEqual(h.service.getAbandonedDrafts(h.user.uid)[0].closed,true);
});
test('account/archive/other draft revision change during search blocks completion',async()=>{
 for(const mode of ['owner','archive','draft']){
  const h=await recoveryHarness({recoveryPages:[{files:[]}]});
  h.config.onRecovery=()=>{if(mode==='owner')h.window.firebaseDeps.auth.currentUser={uid:'other'};else editJournal(h,j=>{if(mode==='archive')Object.values(j.abandonedDrafts)[0].revision++;else j.draft={id:'other',operationId:'other',revision:1};});};
  await assert.rejects(h.service.checkAbandonedTransfer(recoveryArgs(h)));if(mode==='owner')h.window.firebaseDeps.auth.currentUser=h.user;assert.notEqual(h.service.getAbandonedDrafts(h.user.uid)[0].closed,true);
 }
});
for(const mode of ['write','readback','clear'])test('audit '+mode+' failure retains visible original identities',async()=>{
 const h=await recoveryHarness({recoveryPages:[{files:[]}]});await h.service.checkAbandonedTransfer(recoveryArgs(h));const args=recoveryArgs(h);
 if(mode==='write')h.storage.fail=1;
 if(mode==='clear'){const set=h.storage.setItem.bind(h.storage);let n=0;h.storage.setItem=(k,v)=>{if(++n===2)throw Error('SYNTHETIC_CLOSE_FAIL');set(k,v);};}
 if(mode==='readback'){const get=h.storage.getItem.bind(h.storage);h.storage.getItem=k=>{const raw=get(k);if(!raw)return raw;const j=JSON.parse(raw);for(const a of Object.values(j.abandonedDrafts||{}))delete a.closeAudit;return JSON.stringify(j);};}
 await assert.rejects(h.service.closeAbandonedTransfer(args));const a=h.service.getAbandonedDrafts(h.user.uid)[0];assert.notEqual(a.closed,true);assert.equal(a.pending.length,2);
});
test('double check/close cannot overwrite newer archive; closed uncertain uploads remain guarded',async()=>{
 const h=await recoveryHarness({uploads:true,recoveryPages:[{files:[]}]}),args=recoveryArgs(h);
 const rs=await Promise.allSettled([h.service.checkAbandonedTransfer(args),h.service.checkAbandonedTransfer(args)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);
 const ca=recoveryArgs(h);const cs=await Promise.allSettled([h.service.closeAbandonedTransfer(ca),h.service.closeAbandonedTransfer(ca)]);assert.equal(cs.filter(r=>r.status==='fulfilled').length,1);
 const archived=h.service.getAbandonedDrafts(h.user.uid)[0],d=await h.service.stageDraft({userId:h.user.uid,base:null,metadata:{name:'New'},attachments:[],pending:archived.pending,operationId:'new-after-close',expectedRevision:h.service.contentRevision(null),seal:true});
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d)),/Drive veza|prvo|nerazresenom|SYNTHETIC|UNEXPECTED/i);
 assert.equal(h.remote.size,0);assert.equal(h.writes.length,0);
});

const inspectArgs=(h,d,current=()=>true)=>({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision,isCurrent:current});
for(const branch of ['valid','trashed','name-new','name-other','capability-false','capability-missing','etag-missing'])test('read-only rename diagnostic '+branch+' returns sanitized predicates without any journal or remote writes',async()=>{
 const h=await harness({noEtag:branch==='etag-missing'}),d=await h.stage({attachments:[ref(1,'New-name.jpg'),ref(2)],seal:true}),r=h.remote.get(ref(1).driveFileId);
 if(branch==='trashed')r.trashed=true;if(branch==='name-new')r.name='New-name.jpg';if(branch==='name-other')r.name='Changed elsewhere.jpg';
 if(branch==='capability-false')r.capabilities.canRename=false;if(branch==='capability-missing')delete r.capabilities.canRename;
 const before=JSON.stringify([...h.storage.data]),records=JSON.stringify([...h.records]),remote=JSON.stringify([...h.remote]);
 const result=clone(await h.service.inspectSavedRename(inspectArgs(h,d)));assert.equal(result.length,1);
 assert.deepEqual(result[0],{attachmentId:'attachment-1',trashed:branch==='trashed',nameMatchesOld:!['name-new','name-other'].includes(branch),nameMatchesNew:branch==='name-new',canRename:branch==='capability-missing'?null:branch!=='capability-false',etagReadable:branch!=='etag-missing'});
 assert.equal(JSON.stringify([...h.storage.data]),before);assert.equal(JSON.stringify([...h.records]),records);assert.equal(JSON.stringify([...h.remote]),remote);
 assert.equal(h.writes.length,0);assert.ok(h.calls.every(x=>x.method==='GET'));assert.equal(h.calls.length,1);
 assert.ok(!JSON.stringify(result).includes('synthetic-token'));assert.ok(!JSON.stringify(result).includes('"v1"'));
});
for(const mode of ['403','404','network','identity'])test('rename diagnostic '+mode+' fails closed without writes or secrets',async()=>{
 const h=await harness({getStatus:['403','404'].includes(mode)?Number(mode):undefined}),d=await h.stage({attachments:[ref(1,'New-name.jpg'),ref(2)],seal:true});
 if(mode==='network')h.config.onMetadata=()=>{throw Error('synthetic-token-private-network-error');};
 if(mode==='identity')h.remote.get(ref(1).driveFileId).sha256Checksum='d'.repeat(64);
 const before=JSON.stringify([...h.storage.data]);await assert.rejects(h.service.inspectSavedRename(inspectArgs(h,d)),e=>e.code==='DIAGNOSTIC_FAILED'&&!e.message.includes('synthetic-token'));
 assert.equal(JSON.stringify([...h.storage.data]),before);assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
});
for(const mode of ['owner','revision','attachments','closed','server'])test('rename diagnostic rejects stale '+mode+' before returning result',async()=>{
 const h=await harness(),d=await h.stage({attachments:[ref(1,'New-name.jpg'),ref(2)],seal:true});let alive=true;
 h.config.onMetadata=()=>{if(mode==='owner')h.window.firebaseDeps.auth.currentUser={uid:'other'};if(mode==='revision')editJournal(h,j=>j.draft.revision++);if(mode==='attachments')editJournal(h,j=>j.draft.attachments[0].name='Different.jpg');if(mode==='closed')alive=false;if(mode==='server')h.records.get('warranty-one').description='Concurrent';};
 await assert.rejects(h.service.inspectSavedRename(inspectArgs(h,d,()=>alive)));
 assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
});
test('double diagnostic click performs one metadata GET and never changes sealed draft',async()=>{
 const h=await harness(),d=await h.stage({attachments:[ref(1,'New-name.jpg'),ref(2)],seal:true}),args=inspectArgs(h,d),before=JSON.stringify([...h.storage.data]);
 const results=await Promise.allSettled([h.service.inspectSavedRename(args),h.service.inspectSavedRename(args)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.find(x=>x.status==='rejected').reason.code,'DIAGNOSTIC_BUSY');
 assert.equal(h.calls.length,1);assert.equal(JSON.stringify([...h.storage.data]),before);assert.equal(h.writes.length,0);
});
test('rename diagnostic checks expected revision and prevents wrong-owner request',async()=>{
 const h=await harness(),d=await h.stage({attachments:[ref(1,'New-name.jpg'),ref(2)],seal:true});
 await assert.rejects(h.service.inspectSavedRename({...inspectArgs(h,d),expectedRevision:d.revision+1}),e=>e.code==='DRAFT_STALE');
 h.window.firebaseDeps.auth.currentUser={uid:'other'};await assert.rejects(h.service.inspectSavedRename(inspectArgs(h,d)));assert.equal(h.calls.length,0);
});

const V2_PIN={id:'gp-948b6723-c453-43b1-a2fd-fff132902ce9',name:'PROBA- izmana priloga 01',oldName:'Račun-PROBA- preimenovanje.jpg',newName:'Račun-PROBA- preimenovanje - NOVO.jpg'};
async function v2Harness(config={}){
 const r=record();r.name=V2_PIN.name;r.attachments[0].name=V2_PIN.oldName;r.attachmentNames=r.attachments.map(a=>a.name);
 const h=await harness({records:new Map([[V2_PIN.id,r]]),v2Enabled:true,v2Old:V2_PIN.oldName,v2New:V2_PIN.newName,...config});
 const d=await h.service.stageDraft({userId:h.user.uid,id:V2_PIN.id,base:r,metadata:{name:'UNSAVED local metadata'},attachments:[{...r.attachments[0],name:V2_PIN.newName},r.attachments[1]],pending:[],operationId:'approved-trial-draft',expectedRevision:h.service.contentRevision(null),seal:true});
 return {...h,d};
}
const v2Args=(h,readOnly=false)=>{const d=h.service.getDraft(h.user.uid);return {userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision,readOnly};};
test('V2 read-only stage maps JSON metadata with no ETag header and performs zero writes',async()=>{
 const h=await v2Harness({noEtag:true}),before=JSON.stringify([...h.storage.data]);
 const result=await h.service.runV2RenameTrial(v2Args(h,true));assert.equal(result.phase,'read_only');assert.equal(result.validatorAvailable,true);assert.equal(result.generalTransportEnabled,false);
 assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);assert.equal(JSON.stringify([...h.storage.data]),before);
});
test('V2 gated 412 then valid conditional rename commits only pinned attachment and preserves other staged metadata',async()=>{
 const h=await v2Harness({noEtag:true}),before=clone(h.records.get(V2_PIN.id));const r=await h.service.runV2RenameTrial(v2Args(h));
 assert.equal(r.phase,'complete');assert.equal(r.negativeStatus,412);assert.equal(r.generalTransportEnabled,false);assert.equal(h.patches().length,2);
 assert.deepEqual(h.patches().map(c=>JSON.parse(c.body)),[{title:V2_PIN.oldName},{title:V2_PIN.newName}]);
 const record=h.records.get(V2_PIN.id);assert.equal(record.attachments[0].driveFileId,before.attachments[0].driveFileId);assert.equal(record.attachments[0].sha256,before.attachments[0].sha256);
 assert.equal(record.attachments[0].name,V2_PIN.newName);assert.deepEqual(record.attachments[1],before.attachments[1]);assert.equal(record.attachmentCount,2);assert.equal(record.name,V2_PIN.name);assert.equal(record.untouched,'retain');
 const d=h.service.getDraft(h.user.uid);assert.equal(d.metadata.name,'UNSAVED local metadata');assert.equal(d.sealed,false);assert.deepEqual(JSON.parse(d.expected),record);
 await h.service.runV2RenameTrial(v2Args(h));assert.equal(h.patches().length,2);
});
for(const bad of ['missing-tag','weak-tag','private','foreign','hash','other-record','wrong-target'])test('V2 trial rejects '+bad+' before any external writes',async()=>{
 const h=await v2Harness({v2NoTag:bad==='missing-tag',v2WeakTag:bad==='weak-tag',v2BadPrivate:bad==='private'});
 if(bad==='foreign')h.remote.get(ref(1).driveFileId).ownedByMe=false;
 if(bad==='hash')h.remote.get(ref(1).driveFileId).sha256Checksum='f'.repeat(64);
 if(bad==='other-record')editJournal(h,j=>j.draft.id='warranty-one');
 if(bad==='wrong-target')editJournal(h,j=>j.draft.attachments=[{...j.draft.attachments[0],name:V2_PIN.oldName},{...j.draft.attachments[1],name:'Other-renamed.jpg'}]);
 await assert.rejects(h.service.runV2RenameTrial(v2Args(h)));assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);
});
test('unexpected successful negative probe halts permanently, verifies state and never sends positive or rollback',async()=>{
 const h=await v2Harness({v2NegativeIgnored:true});await assert.rejects(h.service.runV2RenameTrial(v2Args(h)),/NIJE vratila 412/);
 assert.equal(h.patches().length,1);assert.equal(h.remote.get(ref(1).driveFileId).name,V2_PIN.oldName);
 await assert.rejects(h.service.runV2RenameTrial(v2Args(h)),/zaustavljena/);assert.equal(h.patches().length,1);assert.equal(h.records.get(V2_PIN.id).attachments[0].name,V2_PIN.oldName);
});
test('negative timeout/lost response never retries and never enables positive',async()=>{
 const h=await v2Harness({v2NegativeLost:true});await assert.rejects(h.service.runV2RenameTrial(v2Args(h)));
 await assert.rejects(h.service.runV2RenameTrial(v2Args(h)),/nije dokazan/);assert.equal(h.patches().length,1);assert.equal(h.service.getDraft(h.user.uid).sealed,true);
});
for(const fault of ['v2PositiveLost','v2PositiveHang','failRenameCommit','loseRenameCommit'])test('V2 recovery after '+fault+' uses same ID and no duplicate PATCH',async()=>{
 const h=await v2Harness({[fault]:true});await assert.rejects(h.service.runV2RenameTrial(v2Args(h)));
 assert.equal(h.remote.get(ref(1).driveFileId).name,V2_PIN.newName);
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote,v2Enabled:true,v2Old:V2_PIN.oldName,v2New:V2_PIN.newName});
 const r=await next.service.runV2RenameTrial(v2Args(next));assert.equal(r.phase,'complete');assert.equal(h.patches().length+next.patches().length,2);
 assert.equal(next.service.getDraft(next.user.uid).metadata.name,'UNSAVED local metadata');
});
test('concurrent Drive change returns 412, preserves conflict and never rolls back or commits warranty names',async()=>{
 const h=await v2Harness({v2PositiveConflict:true});await assert.rejects(h.service.runV2RenameTrial(v2Args(h)),/HTTP 412/);
 assert.equal(h.remote.get(ref(1).driveFileId).name,'EXTERNAL.jpg');assert.equal(h.records.get(V2_PIN.id).attachments[0].name,V2_PIN.oldName);assert.equal(h.patches().length,2);
});
test('V2 write-ahead failure cannot send any PATCH',async()=>{
 const h=await v2Harness();h.storage.fail=1;await assert.rejects(h.service.runV2RenameTrial(v2Args(h)));assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);
});
test('double V2 click and stale identity/revision are fail-closed',async()=>{
 const h=await v2Harness(),args=v2Args(h);const rs=await Promise.allSettled([h.service.runV2RenameTrial(args),h.service.runV2RenameTrial(args)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal(h.patches().length,2);
 const s=await v2Harness();await assert.rejects(s.service.runV2RenameTrial({...v2Args(s),expectedRevision:s.d.revision+1}));assert.equal(s.calls.length,0);
 s.config.onV2Get=()=>editJournal(s,j=>j.draft.revision++);await assert.rejects(s.service.runV2RenameTrial(v2Args(s)));assert.equal(s.patches().length,0);
});
test('general Save does not use V2 and remains guarded when V3 ETag is missing',async()=>{
 const h=await harness({noEtag:true}),d=await h.stage({attachments:[ref(1,'New-name.jpg'),ref(2)],seal:true});
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d)));assert.equal(h.patches().length,0);assert.ok(h.calls.every(c=>!c.url.includes('/drive/v2/')));
});

for(const status of [403,404])test('V2 metadata HTTP '+status+' makes zero writes',async()=>{
 const h=await v2Harness({v2GetStatus:status});await assert.rejects(h.service.runV2RenameTrial(v2Args(h)));assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
});
for(const mode of ['closed','owner','file-content'])test('V2 stale '+mode+' during metadata GET prevents probe writes',async()=>{
 const h=await v2Harness();let alive=true;h.config.onV2Get=f=>{if(mode==='closed')alive=false;if(mode==='owner')h.window.firebaseDeps.auth.currentUser={uid:'other'};if(mode==='file-content')f.sha256Checksum='e'.repeat(64);};
 await assert.rejects(h.service.runV2RenameTrial({...v2Args(h),isCurrent:()=>alive}));assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);
});
test('post-412 external version change prevents positive request',async()=>{
 const h=await v2Harness({onV2Negative:f=>{f.v++;}});await assert.rejects(h.service.runV2RenameTrial(v2Args(h)),/promenilo/);assert.equal(h.patches().length,1);assert.equal(h.remote.get(ref(1).driveFileId).name,V2_PIN.oldName);
});
test('failed local rebase after confirmed commit recovers without repeated external writes',async()=>{
 const h=await v2Harness(),set=h.storage.setItem.bind(h.storage);h.storage.setItem=(k,v)=>{const j=JSON.parse(v);if(j.draft?.sealed===false&&j.v2Trials?.[h.d.operationId]?.phase==='complete')throw Error('SYNTHETIC_REBASE_FAILURE');set(k,v);};
 await assert.rejects(h.service.runV2RenameTrial(v2Args(h)));assert.equal(h.records.get(V2_PIN.id).attachments[0].name,V2_PIN.newName);h.storage.setItem=set;
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote,v2Enabled:true,v2Old:V2_PIN.oldName,v2New:V2_PIN.newName});
 assert.equal((await next.service.runV2RenameTrial(v2Args(next))).phase,'complete');assert.equal(h.patches().length+next.patches().length,2);assert.equal(next.service.getDraft(next.user.uid).sealed,false);
});
