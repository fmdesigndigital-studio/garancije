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
 const locks=config.lockMap??new Map();const navigator={locks:{request(name,options,action){if(typeof options==='function'){action=options;options={};}
  if(options.ifAvailable&&locks.has(name))return Promise.resolve(action(null));const prior=locks.get(name)??Promise.resolve();
  const job=prior.catch(()=>{}).then(()=>action({name}));locks.set(name,job);job.finally(()=>{if(locks.get(name)===job)locks.delete(name);}).catch(()=>{});return job;}}};
 const window={localStorage:storage,sessionStorage:storageFactory(),fetch:async()=>{throw Error('REAL_NETWORK_FORBIDDEN');}};
 const user={uid:'synthetic-owner',email:''};
 let clock=1000;
 const d={db:{},appId:'synthetic-app',auth:{currentUser:user},deleteField:()=>DELETE,
  doc(...p){return {id:p.at(-1)};},collection(){return {};},async getDocFromServer(r){if(config.activeInspection){(config.inspectionReads??=[]).push(r.id);if(config.inspectionReadError)throw Error('SYNTHETIC_SECRET_ERROR');}return {exists:()=>records.has(r.id),data:()=>clone(records.get(r.id))};},
  async getDocsFromServer(){return {docs:[...records].map(([id,value])=>({id,data:()=>clone(value)}))};},
  async runTransaction(db,fn){
   const pending=[],readVersions=new Map();const tx={async get(r){config.onGet?.(r.id,records);readVersions.set(r.id,JSON.stringify(records.get(r.id)));return {exists:()=>records.has(r.id),data:()=>clone(records.get(r.id))};},
    update(r,patch){pending.push({id:r.id,patch,mode:'update'});},set(r,patch,options){pending.push({id:r.id,patch,mode:'set',options});},
    delete(){throw Error('WARRANTY_DELETE_FORBIDDEN');}};
   const value=await fn(tx);const kind=pending[0]?.patch?._attachmentEdit?.kind;
   if(config.beforeCommit)await config.beforeCommit({pending,records});
   for(const [id,version]of readVersions)if(JSON.stringify(records.get(id))!==version)throw Error('SYNTHETIC_TRANSACTION_CONFLICT');
   if(config.failBegin&&kind){config.failBegin=false;throw Error('SYNTHETIC_FIRESTORE_DENIED');}
   if(config.failFinish&&pending.some(x=>x.patch.lastAttachmentOperation)){config.failFinish=false;throw Error('SYNTHETIC_FINISH_FAILED');}
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
  if(config.activeInspection&&u.pathname!=='/drive/v3/about'){
   assert.equal(init.method??'GET','GET');assert.equal(u.searchParams.has('alt'),false);assert.ok(!/generateIds|upload/.test(u.pathname));
   await config.onInspection?.();if(config.inspectionOffline)throw Error('SYNTHETIC_SECRET_ERROR');
   if(config.inspectionStatus)return new Response(JSON.stringify({error:{message:'SYNTHETIC_SECRET_ERROR'}}),{status:config.inspectionStatus});
   if(u.pathname==='/drive/v3/files'){const page=u.searchParams.has('pageToken')?1:0;return new Response(JSON.stringify((config.inspectionPages||[{files:[]}])[page]));}
   const f=remote.get(u.pathname.split('/').at(-1));return new Response(JSON.stringify(f||{}),{status:f?200:404});
  }
  if(config.txtEnabled){
   if(u.pathname==='/drive/v3/files/generateIds'){if(config.txtIdLost)throw Error('ID_RESPONSE_LOST');return new Response(JSON.stringify({ids:['synthetic_txt_'+(++generated)]}));}
   if(u.pathname==='/upload/drive/v3/files'){
    assert.equal(init.method,'POST');assert.equal(u.searchParams.get('uploadType'),'multipart');
    const raw=await init.body.text(),boundary=init.body.type.split('boundary=')[1],parts=raw.split('--'+boundary);
    const meta=JSON.parse(parts[1].split('\r\n\r\n')[1].replace(/\r\n$/,'')),content=parts[2].split('\r\n\r\n')[1].replace(/\r\n$/,'');
    const hash=Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(content))).toString('hex');
    assert.equal(meta.appProperties.sha256,hash);assert.equal(meta.name,'GP-provera-A.txt');assert.equal(meta.mimeType,'text/plain');assert.ok(!remote.has(meta.id));
    remote.set(meta.id,{...meta,size:String(new TextEncoder().encode(content).length),sha256Checksum:hash,ownedByMe:true,shared:false,permissions:[{type:'user',role:'owner',emailAddress:user.email}],capabilities:{canRename:true,canTrash:true},trashed:false,v:1});
    if(config.txtCreateLost)throw Error('CREATE_RESPONSE_LOST');
    return new Response(JSON.stringify({id:meta.id}));
   }
   if(u.pathname.startsWith('/drive/v2/files/')){
    const id=decodeURIComponent(u.pathname.split('/').at(-1)),f=remote.get(id);assert.ok(id.startsWith('synthetic_txt_'),'No existing file may be touched');
    if(!f)return new Response('{}',{status:404});
    if((init.method||'GET')==='GET'){
     await config.onTxtGet?.(f);
     const data={...f,title:f.name,fileSize:f.size,version:String(f.v),etag:config.txtWeakTag?'W/"weak"':config.txtEqualTag?'"v1"':'"v'+f.v+'"',
      labels:{trashed:f.trashed},parents:f.parents.map(id=>({id})),properties:Object.entries(f.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))};
     if(config.txtMissingTag)delete data.etag;return new Response(JSON.stringify(data));
    }
    assert.equal(init.method,'PATCH');const b=JSON.parse(init.body);
    if(b.labels){assert.deepEqual(b,{labels:{trashed:true}});assert.equal(init.headers['If-Match'],'"v'+f.v+'"');f.trashed=true;f.v++;if(config.txtTrashLost)throw Error('TRASH_RESPONSE_LOST');return new Response(JSON.stringify({id:f.id,title:f.name}));}
    assert.ok(['GP-provera-B.txt','GP-provera-C.txt'].includes(b.title));assert.deepEqual(Object.keys(b),['title']);
    const stale=b.title==='GP-provera-C.txt';assert.equal(init.headers['If-Match'],'"v1"');assert.equal(f.name,stale?'GP-provera-B.txt':'GP-provera-A.txt');
    const status=stale?(config.txtStaleStatus??412):(config.txtValidStatus??200);
    if(status===200){f.name=b.title;f.v++;}
    if(stale&&config.txtStaleLost||!stale&&config.txtValidLost)throw Error('PATCH_RESPONSE_LOST');
    return new Response(JSON.stringify(status>=400?{error:{code:status,errors:[{reason:status===412?'conditionNotMet':'backendError'}],message:config.txtErrorMessage||'Backend Error'}}:{id:f.id,title:f.name}),{status});
   }
  }
  if(u.pathname.startsWith('/drive/v2/files/')&&!config.v2Enabled&&!config.txtEnabled){
   const id=decodeURIComponent(u.pathname.split('/').at(-1)),f=remote.get(id);if(!f||config.getStatus)return new Response('{}',{status:config.getStatus??404});
   if((init.method||'GET')==='GET'){
    await config.onMetadata?.();
    const data={...f,title:f.name,fileSize:f.size,etag:'"v'+f.v+'"',labels:{trashed:f.trashed},parents:f.parents.map(id=>({id})),properties:Object.entries(f.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))};
    if(config.renameDuplicateProperty)data.properties.push({...data.properties[0]});if(config.renamePublicOnly)data.properties.forEach(p=>p.visibility='PUBLIC');if(config.renameNoProperties)delete data.properties;
    if(config.noEtag&&!config.v2KeepJsonTag||config.renameMissingTag)delete data.etag;if(config.renameWeakTag)data.etag='W/"weak"';
    return new Response(JSON.stringify(data));
   }
   assert.equal(init.method,'PATCH');const b=JSON.parse(init.body),removing=Object.hasOwn(b,'labels');
   if(removing)assert.deepEqual(b,{labels:{trashed:true}});else assert.deepEqual(Object.keys(b),['title']);
   if(config.patchStatus)return new Response('{}',{status:config.patchStatus});if(config.concurrentDrive){config.concurrentDrive=false;f.name='External-change.jpg';f.v++;}
   if(removing)await config.beforeRemovalPatch?.(f);
   if(init.headers['If-Match']!=='"v'+f.v+'"')return new Response('{}',{status:412});if(config.renameLostBeforeApply||removing&&config.removeLostBeforeApply)throw Error('PATCH_RESPONSE_UNKNOWN');
   if(removing)f.trashed=true;else f.name=b.title;f.v++;
   if(config.hangPatch){config.hangPatch=false;return new Promise(()=>{});}if(config.losePatch){config.losePatch=false;throw Error('SYNTHETIC_DRIVE_RESPONSE_LOST');}
   return new Response(JSON.stringify({id:f.id,title:f.name}));
  }
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
   if(negative&&config.v2NegativeStatus)return new Response('{}',{status:config.v2NegativeStatus});
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
 assert.deepEqual(JSON.parse(h.patches()[0].body),{title:'Renamed-ž.jpg'});assert.equal(h.remote.get(ref(1).driveFileId).sha256Checksum,'a'.repeat(64));
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
 assert.ok(h.writes[0].keys.includes('attachments'));assert.deepEqual(JSON.parse(h.patches()[0].body),{labels:{trashed:true}});
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
  const component=html.slice(html.indexOf('        function RemovalInspection('),html.indexOf('        const draftConflictMessage'));
  const start=html.indexOf('            useEffect(()=>{',html.indexOf('exitContent.current=stagedContent;'));
  const effect=html.slice(start,html.indexOf('            const allowExit=',start));
  const hs=html.indexOf('            const changeSavedName='),handler=html.slice(hs,html.indexOf('\n            };',hs)+15);
  const parent=html.split('\n').find(l=>l.includes('<AttachmentList attachments={[...legacy, ...attachments, ...pending]}'));
  const code=[
   "const {useState,useEffect,useRef}=React,attachmentNames=window.attachmentNames,attachmentKinds=['Ostalo'],appNavigation={pending:false},AttachmentViewer=()=>null;",
   "window.firebaseDeps={auth:{currentUser:{uid:'synthetic-owner',email:"+JSON.stringify(/const EMAIL = '([^']+)'/.exec(script)[1])+"}}};",
   "const service=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'isolated-dom',storage:localStorage,metadataStore:{read:async()=>null,list:async()=>[]},authorize:async()=>({access_token:'synthetic-DOM-token',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'}),getUser:()=>window.firebaseDeps.auth.currentUser,fetch:async u=>{if(new URL(u).pathname==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:window.firebaseDeps.auth.currentUser.email}}));if(new URL(u).pathname==='/drive/v3/files')return new Response(JSON.stringify({files:[]}));throw Error('NETWORK_FORBIDDEN');}});",
   "const actualStage=service.stageDraft.bind(service);window.stageTransitions=[];service.stageDraft=args=>new Promise(r=>setTimeout(r,35)).then(()=>actualStage(args)).then(d=>{window.stageTransitions.push(d);return d;});window.service=service;window.attachmentService=service;",
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
   "fetch:async(u,init={})=>{if(new URL(u).pathname==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:window.firebaseDeps.auth.currentUser.email}}));window.diagCalls.push(init.method||'GET');if(window.diagHold)await new Promise(r=>window.releaseDiag=r);if((init.method||'GET')!=='GET')throw Error('WRITE_FORBIDDEN');return new Response(JSON.stringify({...window.diagFile,title:window.diagFile.name,fileSize:window.diagFile.size,labels:{trashed:window.diagFile.trashed},parents:window.diagFile.parents.map(id=>({id})),properties:Object.entries(window.diagFile.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))}));}});",
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
  assert.equal(await run.isDisabled(),true);assert.equal(await page.evaluate(()=>window.trialPatches.length),0);assert.equal(await page.evaluate(()=>window.trialSdk.length),0);assert.equal(requests,0);console.log('DOM legacy V2 probe: readonly evidence available; old mutating probe button permanently disabled');


  const textComponent=html.slice(html.indexOf('        function TextConcurrencyTrial('),html.indexOf('        function V2RenameTrial('));
  const folderObject=vm.runInNewContext('('+/const DRIVE_FOLDERS = (\{[^;]+\});/.exec(script)[1]+')');
  const textSetup=[
   textComponent,'window.txtFolders='+JSON.stringify(folderObject)+';window.txtCreates=0;window.txtPatches=[];window.txtRemote=null;',
   "window.txtService=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'isolated-txt-dom',storage:localStorage,getUser:()=>window.firebaseDeps.auth.currentUser,metadataStore:{read:async()=>{throw Error('FIREBASE_FORBIDDEN');},commit:async()=>{throw Error('FIREBASE_FORBIDDEN');}},",
   "authorize:async()=>({access_token:'synthetic-txt-only',expires_in:3600,scope:"+JSON.stringify(/const SCOPE = '([^']+)'/.exec(script)[1])+"}),",
   "fetch:async(u,init={})=>{const p=new URL(u).pathname,user=window.firebaseDeps.auth.currentUser,permissions=[{type:'user',role:'owner',emailAddress:user.email}];if(p==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:user.email}}));const kind=Object.keys(window.txtFolders).find(k=>p.endsWith('/'+window.txtFolders[k]));if(kind)return new Response(JSON.stringify({id:window.txtFolders[kind],name:{root:'baza-garancije-i-racuni',products:'proizvodi',backups:'rezervne-kopije'}[kind],mimeType:'application/vnd.google-apps.folder',ownedByMe:true,parents:kind==='root'?[]:[window.txtFolders.root],permissions}));",
   "if(p==='/drive/v3/files/generateIds')return new Response(JSON.stringify({ids:['synthetic_txt_dom_01']}));if(p==='/upload/drive/v3/files'){window.txtCreates++;if(window.txtCreates!==1)throw Error('DUPLICATE');const raw=await init.body.text(),parts=raw.split('--'+init.body.type.split('boundary=')[1]),m=JSON.parse(parts[1].split('\\r\\n\\r\\n')[1].replace(/\\r\\n$/,'')),content=parts[2].split('\\r\\n\\r\\n')[1].replace(/\\r\\n$/,'');window.txtRemote={...m,size:String(new TextEncoder().encode(content).length),sha256Checksum:m.appProperties.sha256,v:1,trashed:false};return new Response(JSON.stringify({id:m.id}));}",
   "const f=window.txtRemote;if(!f||p!=='/drive/v2/files/'+f.id)throw Error('UNAPPROVED_TARGET');if((init.method||'GET')==='GET')return new Response(JSON.stringify({...f,title:f.name,fileSize:f.size,etag:'\"v'+f.v+'\"',version:String(f.v),ownedByMe:true,shared:false,permissions,capabilities:{canRename:true,canTrash:true},labels:{trashed:f.trashed},parents:f.parents.map(id=>({id})),properties:Object.entries(f.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))}));if(init.method!=='PATCH')throw Error('UNAPPROVED_METHOD');const b=JSON.parse(init.body);window.txtPatches.push(b);if(init.headers['If-Match']!=='\"v'+f.v+'\"')return new Response(JSON.stringify({error:{code:412,errors:[{reason:'conditionNotMet'}],message:'Precondition Failed'}}),{status:412});if(b.title)f.name=b.title;else f.trashed=true;f.v++;return new Response(JSON.stringify({id:f.id,title:f.name}));}});",
   "window.attachmentService=window.txtService;function TextFixture(){const [busy,setBusy]=useState(false);return <fieldset disabled={busy}><TextConcurrencyTrial user={window.firebaseDeps.auth.currentUser} onBusy={setBusy}/></fieldset>;}",
   "window.mountText=async()=>{await window.txtService.authChanged(window.firebaseDeps.auth.currentUser);await window.txtService.connect();await window.txtService.stageDraft({userId:'synthetic-owner',base:null,metadata:{name:'KEEP OLD DRAFT'},attachments:[],pending:[],operationId:'unrelated-old-draft',expectedRevision:window.txtService.contentRevision(null),seal:true});const key=Object.keys(localStorage).find(k=>k.includes('isolated-txt-dom'));const j=JSON.parse(localStorage.getItem(key));j.v2Trials={old:{phase:'halted',negativeStatus:500}};localStorage.setItem(key,JSON.stringify(j));window.txtUntouched=JSON.stringify({draft:j.draft,v2Trials:j.v2Trials});await window.txtService.textTrial({userId:'synthetic-owner',action:'start'});window.domRoot.render(<TextFixture/>);};"
  ].join('\n');
  await page.addScriptTag({content:babel.transform(textSetup,{presets:[['react',{runtime:'classic'}]]}).code});await page.evaluate(()=>window.mountText());
  const textRegion=page.getByRole('region',{name:'Nedovršena Drive provera'});
  await textRegion.waitFor();assert.equal(await page.getByRole('button',{name:'Pokreni izolovanu TXT proveru',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>window.txtCreates),1);assert.deepEqual(await page.evaluate(()=>window.txtPatches),[{title:'GP-provera-B.txt'},{title:'GP-provera-C.txt'}]);
  await textRegion.getByRole('button',{name:'Prikaži detalje i oporavak',exact:true}).click();
  assert.ok((await textRegion.innerText()).includes('412'));const trashText=textRegion.getByRole('button',{name:'Premesti samo probni TXT fajl u korpu',exact:true});assert.equal(await trashText.isDisabled(),true);
  await textRegion.getByRole('button',{name:'Procitaj stanje istog TXT fajla - bez izmene',exact:true}).click();assert.equal(await page.evaluate(()=>window.txtCreates),1);assert.equal(await page.evaluate(()=>window.txtPatches.length),2);
  await textRegion.getByRole('button',{name:'Procitao sam rezultat',exact:true}).click();assert.equal(await trashText.isEnabled(),true);
  page.once('dialog',d=>d.accept());await trashText.click();await page.waitForFunction(()=>window.txtService.getTextTrial('synthetic-owner')?.phase==='trashed',null,{timeout:5000});
  await textRegion.waitFor({state:'detached'});assert.equal(await page.getByRole('button',{name:'Pokreni izolovanu TXT proveru',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>window.txtRemote.trashed),true);assert.equal(await page.evaluate(()=>window.txtCreates),1);
  assert.equal(await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.includes('isolated-txt-dom')),j=JSON.parse(localStorage.getItem(key));return JSON.stringify({draft:j.draft,v2Trials:j.v2Trials})===window.txtUntouched;}),true);
  assert.equal(requests,0);console.log('DOM TXT: one file, A->B->stale C gives 412, visible phase results, readonly inspect, explicit read acknowledgement before exact-ID trash, old draft/halted unchanged, no Firebase');


  const recoveryComponent=html.slice(html.indexOf('        function HaltedRenameRecovery('),html.indexOf('        function V2RenameTrial('));
  const rr=record();rr.name=V2_PIN.name;rr.attachments[0].name=V2_PIN.oldName;rr.attachmentNames=rr.attachments.map(a=>a.name);
  const rf={...syntheticRemote,name:V2_PIN.oldName,v:1};
  const setup=[
   recoveryComponent,'window.recBase='+JSON.stringify(rr)+';window.recFile='+JSON.stringify(rf)+';window.recPatches=[];window.recCommits=0;',
   "window.recService=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'isolated-halted-recovery',storage:localStorage,getUser:()=>window.firebaseDeps.auth.currentUser,metadataStore:{read:async()=>structuredClone(window.recRecord),list:async()=>[{...structuredClone(window.recRecord),id:"+JSON.stringify(V2_PIN.id)+"}],commit:async a=>{if(Object.keys(a.metadata).length)throw Error('UNAPPROVED_FIELDS');const base=window.garancijeSavedAttachments.withoutEdit(window.recRecord);if(window.garancijeFingerprint(base)!==a.expected)throw Error('CONFLICT');window.recCommits++;window.recRecord={...base,attachments:a.attachments,attachmentNames:a.attachments.map(x=>x.name),attachmentCount:a.attachments.length,lastOperation:a.operationId};}},",
   "authorize:async()=>({access_token:'synthetic-rec-only',expires_in:3600,scope:"+JSON.stringify(/const SCOPE = '([^']+)'/.exec(script)[1])+"}),",
   "fetch:async(u,init={})=>{const p=new URL(u).pathname,f=window.recFile;if(p==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:window.firebaseDeps.auth.currentUser.email}}));if(p!=='/drive/v2/files/'+f.id)throw Error('UNAPPROVED_TARGET');if((init.method||'GET')==='GET')return new Response(JSON.stringify({...f,title:f.name,fileSize:f.size,etag:'\"v'+f.v+'\"',labels:{trashed:false},parents:f.parents.map(id=>({id})),properties:Object.entries(f.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))}));if(init.method!=='PATCH')throw Error('UNAPPROVED_METHOD');if(init.headers['If-Match']!=='\"v'+f.v+'\"')return new Response('{}',{status:412});const b=JSON.parse(init.body);window.recPatches.push(b);f.name=b.title;f.v++;return new Response(JSON.stringify({id:f.id,title:f.name}));}});window.attachmentService=window.recService;",
   "function RecoveryFixture(){const [busy,setBusy]=useState(false);return <fieldset disabled={busy}><HaltedRenameRecovery user={window.firebaseDeps.auth.currentUser} operationId='dom-halted-op' contentKey='stable' onBusy={setBusy} onComplete={()=>{window.recComplete=true;}}/></fieldset>;}",
   "window.mountRecovery=async()=>{const user=window.firebaseDeps.auth.currentUser;await window.recService.authChanged(user);await window.recService.connect();const d=await window.recService.stageDraft({userId:user.uid,id:"+JSON.stringify(V2_PIN.id)+",base:window.recBase,metadata:{name:'KEEP UNSAVED'},attachments:window.recBase.attachments.map((a,i)=>i===0?{...a,name:"+JSON.stringify(V2_PIN.newName)+"}:a),pending:[],operationId:'dom-halted-op',expectedRevision:window.recService.contentRevision(null),seal:true});const row={...window.garancijeSavedAttachments.row(window.recBase.attachments[0]),newName:"+JSON.stringify(V2_PIN.newName)+"},bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(d.operationId)),executionId='v2-'+[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join(''),baseHash=await window.garancijeSavedAttachments.hash(window.recBase),op={version:1,userId:user.uid,operationId:executionId,kind:'rename',targets:[row],baseHash};window.recRecord={...window.recBase,_attachmentEdit:op};const key=Object.keys(localStorage).find(k=>k.includes('isolated-halted-recovery')),j=JSON.parse(localStorage.getItem(key));j.v2Trials={[d.operationId]:{version:1,userId:user.uid,ownerEmail:user.email,id:d.id,operationId:d.operationId,row,baseHash,baseExpected:d.expected,phase:'halted',negativeStatus:500,reason:'negative_not_rejected'}};j.attachmentEdits={[d.id]:{userId:user.uid,id:d.id,operation:op,draftOperationId:d.operationId,expected:d.expected}};j.textExperiment={phase:'trashed',status:412};localStorage.setItem(key,JSON.stringify(j));window.recProtected=JSON.stringify({v2Trials:j.v2Trials,textExperiment:j.textExperiment});window.domRoot.render(<RecoveryFixture/>);};"
  ].join('\n');
  await page.addScriptTag({content:babel.transform(setup,{presets:[['react',{runtime:'classic'}]]}).code});await page.evaluate(()=>window.mountRecovery());
  const region=page.getByRole('region',{name:'Oporavak starog preimenovanja'}),finish=region.getByRole('button',{name:'Dovrši preimenovanje testnog priloga',exact:true});
  assert.equal(await finish.isDisabled(),true);await region.getByRole('button',{name:'Proveri stanje oporavka - bez čuvanja',exact:true}).click();await region.getByText('Faza: ready.',{exact:false}).waitFor({timeout:5000});assert.equal(await finish.isEnabled(),true);
  assert.equal(await page.evaluate(()=>window.recPatches.length),0);assert.equal(await page.evaluate(()=>window.recCommits),0);
  page.once('dialog',d=>d.accept());await finish.click();await page.waitForFunction(()=>window.recComplete===true,null,{timeout:5000});
  assert.deepEqual(await page.evaluate(()=>window.recPatches),[{title:V2_PIN.newName}]);assert.equal(await page.evaluate(()=>window.recRecord.attachments[0].name),V2_PIN.newName);assert.equal(await page.evaluate(()=>window.recCommits),1);
  assert.equal(await page.evaluate(()=>window.recService.getDraft('synthetic-owner').metadata.name),'KEEP UNSAVED');assert.equal(await region.count(),0);
  assert.equal(await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.includes('isolated-halted-recovery')),j=JSON.parse(localStorage.getItem(key));return JSON.stringify({v2Trials:j.v2Trials,textExperiment:j.textExperiment})===window.recProtected;}),true);
  assert.equal(requests,0);console.log('DOM halted recovery: readonly first, explicit confirmation, one pinned V2 rename, target-only commit, preserved unsaved metadata and old500/TXT audits');


  const remBase=record(),remFiles=Object.fromEntries(remBase.attachments.map(a=>[a.driveFileId,{id:a.driveFileId,name:a.name,mimeType:a.mime,size:String(a.size),sha256Checksum:a.sha256,parents:syntheticRemote.parents,ownedByMe:true,shared:false,permissions:syntheticRemote.permissions,capabilities:{canTrash:true,canRename:true},appProperties:{app:'garancije-pro',operation:'b'.repeat(64),sha256:a.sha256},trashed:false,v:1}]));
  const handlerStart=html.indexOf('            const syncSavedRemoval='),remHandlers=html.slice(handlerStart,html.indexOf('            const changeSavedName=',handlerStart));
  const remSetup=[
   html.split('\n').find(l=>l.includes('const textValue =')),html.split('\n').find(l=>l.includes('const attachmentRefs =')),
   'window.remBase='+JSON.stringify({...remBase,id:'warranty-one'})+';window.remRecord='+JSON.stringify(remBase)+';window.remFiles='+JSON.stringify(remFiles)+';window.remPatches=[];window.remWrites=0;window.remGets=0;',
   "window.remStore={read:async()=>structuredClone(window.remRecord),list:async()=>[{...structuredClone(window.remRecord),id:'warranty-one'}],beginAttachmentEdit:async a=>{if(a.id!=='warranty-one'||window.garancijeFingerprint(window.remRecord)!==a.expected||a.operation.kind!=='remove')throw Error('CONFLICT');const base=structuredClone(window.remRecord),next={...base,attachments:base.attachments.filter(x=>x.id!==a.operation.targets[0].attachmentId)};next.attachmentCount=next.attachments.length;next.attachmentNames=next.attachments.map(x=>x.name);const op={...a.operation,postHash:await window.garancijeSavedAttachments.hash(next)};window.remLastOp=structuredClone(op);window.remRecord={...next,_attachmentEdit:op};window.remWrites++;return structuredClone(window.remRecord);},finishAttachmentRemoval:async a=>{const r=window.remRecord;if(r._attachmentEdit?.operationId!==a.operationId)throw Error('CONFLICT');const base=window.garancijeSavedAttachments.withoutEdit(r);if(await window.garancijeSavedAttachments.hash(base)!==r._attachmentEdit.postHash)throw Error('POST_CONFLICT');window.remRecord={...base,lastAttachmentOperation:{operationId:a.operationId,kind:'remove',attachmentId:r._attachmentEdit.targets[0].attachmentId}};window.remWrites++;return structuredClone(window.remRecord);}};",
   "window.remService=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'isolated-removal-dom',storage:localStorage,getUser:()=>window.firebaseDeps.auth.currentUser,metadataStore:window.remStore,authorize:async()=>({access_token:'synthetic-rem-only',expires_in:3600,scope:"+JSON.stringify(/const SCOPE = '([^']+)'/.exec(script)[1])+"}),fetch:async(u,init={})=>{const p=new URL(u).pathname;if(p==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:window.firebaseDeps.auth.currentUser.email}}));const id=decodeURIComponent(p.split('/').at(-1)),f=window.remFiles[id];if(p!=='/drive/v2/files/'+id||!f)throw Error('UNAPPROVED_REMOVAL_TARGET');if((init.method||'GET')==='GET'){window.remGets++;if(window.remHold)await new Promise(r=>window.remRelease=r);if(window.remGetStatus)return new Response('{}',{status:window.remGetStatus});return new Response(JSON.stringify({...f,title:f.name,fileSize:f.size,etag:'\"v'+f.v+'\"',labels:{trashed:f.trashed},parents:f.parents.map(id=>({id})),properties:Object.entries(f.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))}));}if(init.method!=='PATCH'||id!=='synthetic_drive_file_2')throw Error('FIRST_FILE_MUTATION_FORBIDDEN');const b=JSON.parse(init.body);if(JSON.stringify(b)!==JSON.stringify({labels:{trashed:true}}))throw Error('UNAPPROVED_FIELDS');if(init.headers['If-Match']!=='\"v'+f.v+'\"')return new Response('{}',{status:412});window.remPatches.push(b);f.trashed=true;f.v++;return new Response(JSON.stringify({id:f.id,title:f.name}));}});window.attachmentService=window.remService;",
   "function RemovalFixture(){const service=window.remService,user=window.firebaseDeps.auth.currentUser,initial=window.remBase,d=service.getDraft(user.uid);const [attachments,setAttachments]=useState(d.attachments),[pending,setPending]=useState(d.pending),[removing,setRemoving]=useState(false),[removalNotice,setRemovalNotice]=useState(''),[removalNoticeKind,setRemovalNoticeKind]=useState('neutral'),[imageError,setImageError]=useState(''),[savedEditPending,setSavedEditPending]=useState(false),[probeKey,setProbeKey]=useState('initial');const form=d.metadata;const [view,setView]=useState('form');window.setRemovalView=setView;const mounted=useRef(true),disposed=useRef(false),discardingRef=useRef(false),savingRef=useRef(false),processingRef=useRef(false),removingRef=useRef(false),stagingRef=useRef(false),stageTask=useRef(null),stageSequence=useRef(0),metadataBase=useRef(JSON.parse(d.expected)),draftRevisionRef=useRef(d.revision),draftPending=useRef(service.pendingFingerprint(d.pending)),stageAcknowledged=useRef(null),savedEditPendingRef=useRef(false);const acknowledgeDraft=n=>{draftRevisionRef.current=n.revision;draftPending.current=service.pendingFingerprint(n.pending);};",
   html.split('\n').find(l=>l.includes("const showRemovalNotice=")),remHandlers,
   "return <>{view==='settings'?<><button type='button' onClick={()=>setView('form')}>Povratak u formu</button><AttachmentDiagnostics user={user} disabled={removing} draftStatus='draft'/></>:<><button type='button' onClick={()=>setView('settings')}>Podešavanja</button><AttachmentList attachments={attachments} user={user} onRemoveSaved={runSavedRemoval} removeDisabled={removing||savedEditPending}/><div role=\"status\" aria-live=\"polite\" aria-atomic=\"true\" className=\"attachment-removal-status\">{removalNotice&&<p className={removalNoticeKind==='success'?'attachment-removal-success':undefined}>{removalNotice}</p>}</div>{imageError&&<p role='alert'>{imageError}</p>}</>}</>;}",
   "window.mountRemoval=async()=>{const user=window.firebaseDeps.auth.currentUser;await window.remService.authChanged(user);await window.remService.connect();await window.remService.stageDraft({userId:user.uid,id:'warranty-one',base:window.remRecord,metadata:{name:'KEEP REMOVAL UNSAVED'},attachments:window.remRecord.attachments,pending:[],operationId:'removal-dom-op',expectedRevision:window.remService.contentRevision(null)});window.domRoot.render(<RemovalFixture/>);};"
  ].join('\n');
  await page.addScriptTag({content:babel.transform(remSetup,{presets:[['react',{runtime:'classic'}]]}).code});await page.evaluate(()=>window.mountRemoval());
  await page.setViewportSize({width:390,height:844});
  const targetCard=page.locator('.attachment').filter({has:page.getByText('Image-2.jpg',{exact:true})});
  await targetCard.waitFor();assert.equal(await page.getByRole('button',{name:'Proveri uklanjanje - bez čuvanja',exact:true}).count(),0);
  const remJournalBefore=await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom'));return localStorage.getItem(k);});
  await page.getByRole('button',{name:'Podešavanja',exact:true}).click();
  const diagnostics=page.getByRole('region',{name:'Dijagnostika priloga'}),openDiagnostics=diagnostics.getByRole('button',{name:'Otvori dijagnostiku priloga',exact:true});
  await openDiagnostics.waitFor();assert.equal(await openDiagnostics.getAttribute('aria-expanded'),'false');assert.equal(await diagnostics.getByRole('combobox').count(),0);assert.equal(await page.evaluate(()=>window.remGets),0);
  await openDiagnostics.click();const select=diagnostics.getByRole('combobox',{name:'Prilog za proveru',exact:true});assert.equal(await select.inputValue(),'');assert.equal(await diagnostics.getByRole('button',{name:'Proveri uklanjanje - bez čuvanja',exact:true}).count(),0);
  await select.selectOption('attachment-2');assert.equal(await page.evaluate(()=>window.remGets),0);
  const remProbe=diagnostics.getByRole('button',{name:'Proveri uklanjanje - bez čuvanja',exact:true});
  await remProbe.evaluate(e=>{e.click();e.click();});await diagnostics.getByText('Jak V2 validator dostupan',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.remGets),1);assert.equal(await page.evaluate(()=>window.remWrites),0);assert.equal(await page.evaluate(()=>window.remPatches.length),0);
  assert.equal(await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom'));return localStorage.getItem(k);}),remJournalBefore);
  assert.ok(await select.evaluate(e=>e.getBoundingClientRect().width<=390));assert.ok((await remProbe.boundingBox()).height>=48);
  await page.evaluate(()=>{window.remHold=true;window.remRelease=null;});await remProbe.click();await page.waitForFunction(()=>typeof window.remRelease==='function');
  await select.selectOption('attachment-1');await page.evaluate(()=>{window.remHold=false;window.remRelease();});await page.waitForTimeout(25);
  assert.equal(await diagnostics.getByText('Jak V2 validator dostupan',{exact:true}).count(),0);
  await select.selectOption('attachment-2');await page.evaluate(()=>window.remGetStatus=403);await remProbe.click();await diagnostics.getByRole('alert').waitFor();assert.ok((await diagnostics.getByRole('alert').innerText()).includes('403/404'));
  await page.evaluate(()=>window.remGetStatus=null);await remProbe.click();await diagnostics.getByText('Jak V2 validator dostupan',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Povratak u formu',exact:true}).click();await targetCard.waitFor();
  assert.equal(await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom'));return localStorage.getItem(k);}),remJournalBefore);
  assert.equal(await page.getByRole('button',{name:'Proveri uklanjanje - bez čuvanja',exact:true}).count(),0);
  page.once('dialog',d=>d.dismiss());await targetCard.getByRole('button',{name:'Ukloni prilog',exact:true}).click();assert.equal(await page.evaluate(()=>window.remWrites),0);assert.equal(await page.evaluate(()=>window.remPatches.length),0);
  page.once('dialog',d=>{assert.ok(d.message().includes('Image-2.jpg'));assert.ok(d.message().includes('Odustani'));d.accept();});
  await targetCard.getByRole('button',{name:'Ukloni prilog',exact:true}).click();await page.getByText('Prilog je uklonjen iz garancije i potvrdjen u Drive korpi. Odustani ga ne vraca.',{exact:true}).waitFor({timeout:5000});
  assert.equal(await page.locator('.attachment').count(),1);assert.equal(await page.evaluate(()=>window.remRecord.attachmentCount),1);assert.deepEqual(await page.evaluate(()=>window.remRecord.attachmentNames),['Image-1.jpg']);
  assert.equal(await page.evaluate(()=>window.remFiles.synthetic_drive_file_1.trashed),false);assert.equal(await page.evaluate(()=>window.remFiles.synthetic_drive_file_2.trashed),true);assert.equal(await page.evaluate(()=>window.remService.getDraft('synthetic-owner').metadata.name),'KEEP REMOVAL UNSAVED');
  assert.deepEqual(await page.evaluate(()=>window.remPatches),[{labels:{trashed:true}}]);assert.equal(await page.getByText('Prilog je uklonjen iz garancije i potvrdjen u Drive korpi. Odustani ga ne vraca.',{exact:true}).evaluate(e=>e.classList.contains('attachment-removal-success')),false);assert.equal(requests,0);
  console.log('DOM removal: exact second card, readonly zero writes, duplicate/stale/403 handling, cancel confirmation zero writes, confirmed single V2 trash, first ref and unsaved fields retained');


  await page.addScriptTag({content:babel.transform("window.renderDiagnostics=status=>{window.attachmentService=window.remService;window.domRoot.render(<AttachmentDiagnostics user={window.firebaseDeps.auth.currentUser} draftStatus={status||'draft'}/>);};window.renderText=key=>{window.attachmentService=window.txtService;window.domRoot.render(<TextFixture key={key}/>);};",{presets:[['react',{runtime:'classic'}]]}).code});
  await page.evaluate(()=>window.renderDiagnostics());const maintenance=page.getByRole('region',{name:'Dijagnostika priloga'});
  await maintenance.getByRole('button',{name:'Otvori dijagnostiku priloga',exact:true}).click();const choice=maintenance.getByRole('combobox');await choice.selectOption('attachment-1');
  const getsBeforeStale=await page.evaluate(()=>window.remGets);
  await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom')),j=JSON.parse(localStorage.getItem(k));j.draft.revision++;localStorage.setItem(k,JSON.stringify(j));});
  await maintenance.getByRole('button',{name:'Proveri uklanjanje - bez čuvanja',exact:true}).click();await page.waitForTimeout(25);
  assert.equal(await page.evaluate(()=>window.remGets),getsBeforeStale);
  await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom')),storageArea:localStorage})));
  await page.waitForFunction(()=>document.querySelector('[aria-label="Dijagnostika priloga"] select')?.value==='');
  const stableDraftJournal=await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom'));return localStorage.getItem(k);});
  for(const bad of ['duplicate','none']){
   await page.evaluate(bad=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom')),j=JSON.parse(localStorage.getItem(k));window.stableRemJournal=localStorage.getItem(k);if(bad==='none')j.draft=null;else j.draft.attachments.push({...j.draft.attachments[0]});localStorage.setItem(k,JSON.stringify(j));window.badRemJournal=localStorage.getItem(k);window.dispatchEvent(new StorageEvent('storage',{key:k,storageArea:localStorage}));},bad);
   if(bad==='duplicate')await maintenance.getByRole('alert').waitFor();else await maintenance.getByText('Nema postojećeg nacrta. Dijagnostika ne pravi novi nacrt.',{exact:true}).waitFor();
   assert.equal(await maintenance.getByRole('combobox').count(),0);assert.equal(await maintenance.getByRole('button',{name:'Proveri uklanjanje - bez čuvanja',exact:true}).count(),0);
   assert.equal(await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom'));return localStorage.getItem(k)===window.badRemJournal;}),true);
   await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom'));localStorage.setItem(k,window.stableRemJournal);window.dispatchEvent(new StorageEvent('storage',{key:k,storageArea:localStorage}));});await maintenance.getByRole('combobox').waitFor();
  }
  await page.evaluate(()=>window.renderDiagnostics('error'));await maintenance.getByRole('alert').waitFor();assert.equal(await maintenance.getByRole('combobox').count(),0);
  assert.equal(await page.evaluate(()=>window.remGets),getsBeforeStale);assert.equal(await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-removal-dom'));return localStorage.getItem(k);}),stableDraftJournal);
  await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-txt-dom'));window.completedTxtAudit=localStorage.getItem(k);window.renderText('finished');});await page.waitForTimeout(25);
  assert.equal(await page.getByRole('region',{name:'Nedovršena Drive provera'}).count(),0);assert.equal(await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-txt-dom'));return localStorage.getItem(k)===window.completedTxtAudit;}),true);
  for(const bad of ['uncertain','malformed']){
   await page.evaluate(bad=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-txt-dom')),j=JSON.parse(window.completedTxtAudit);if(bad==='uncertain'){j.textExperiment.uncertain=true;j.textExperiment.inFlight=true;}else j.textExperiment.events={};localStorage.setItem(k,JSON.stringify(j));window.visibleTxtAudit=localStorage.getItem(k);window.renderText(bad);},bad);
   if(bad==='uncertain'){const warning=page.getByRole('region',{name:'Nedovršena Drive provera'});await warning.waitFor();assert.equal(await warning.getByRole('button',{name:'Prikaži detalje i oporavak',exact:true}).count(),1);assert.equal(await warning.getByRole('table').count(),0);}
   else await page.getByRole('alert').filter({hasText:'Stanje ranije Drive provere nije pouzdano'}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Pokreni izolovanu TXT proveru',exact:true}).count(),0);assert.equal(await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-txt-dom'));return localStorage.getItem(k)===window.visibleTxtAudit;}),true);assert.equal(await page.evaluate(()=>window.txtCreates),1);
  }
  await page.evaluate(()=>{const k=Object.keys(localStorage).find(k=>k.includes('isolated-txt-dom'));localStorage.setItem(k,window.completedTxtAudit);});
  const savedRecoveryUi=html.slice(html.indexOf('        function SavedAttachmentRecovery('),html.indexOf('        function App('));
  await page.addScriptTag({content:babel.transform(savedRecoveryUi+"window.renderPendingRemoval=()=>{window.attachmentService=window.remService;window.domRoot.render(<SavedAttachmentRecovery records={[{...window.remRecord,id:'warranty-one',_attachmentEdit:window.remLastOp}]} user={window.firebaseDeps.auth.currentUser} onOpen={()=>{}}/>);};",{presets:[['react',{runtime:'classic'}]]}).code});
  const remWritesBeforeNotice=await page.evaluate(()=>window.remWrites);await page.evaluate(()=>window.renderPendingRemoval());
  await page.getByRole('region',{name:'Nedovrsene izmene priloga'}).getByRole('button',{name:'Nastavi uklanjanje priloga',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.remWrites),remWritesBeforeNotice);assert.equal(await page.evaluate(()=>window.remPatches.length),1);assert.equal(requests,0);
  console.log('DOM production UI: closed mobile Settings, chosen existing draft only, no auto requests/writes, stale revision and ambiguous/missing context blocked, completed TXT hidden with audit retained, unknown/unfinished TXT and pending removal visibly recoverable');


  const appCss=/<style[^>]*>([\s\S]*?)<\/style>/.exec(html)[1];await page.addStyleTag({content:appCss});await page.evaluate(()=>{document.body.classList.add('gp-ui');document.documentElement.style.fontSize='100%';});
  const pendingStart=html.indexOf('            const removePending=async'),pendingHandler=html.slice(pendingStart,html.indexOf('            const applyLoadedDraft=',pendingStart));
  const feedbackState=html.slice(html.indexOf('            const [removing,setRemoving]'),html.indexOf('            const [v2Busy,setV2Busy]'));
  const feedbackMarkup=html.split('\n').find(l=>l.includes('className="attachment-removal-status"')).trim();
  const pendingSetup=[
   "window.pendingRemoteCalls=0;window.pendingService=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'isolated-pending-feedback',storage:localStorage,getUser:()=>window.firebaseDeps.auth.currentUser,metadataStore:{read:async()=>{window.pendingRemoteCalls++;throw Error('FIREBASE_FORBIDDEN');},list:async()=>{window.pendingRemoteCalls++;throw Error('FIREBASE_FORBIDDEN');},commit:async()=>{window.pendingRemoteCalls++;throw Error('FIREBASE_WRITE_FORBIDDEN');}},authorize:async()=>({access_token:'synthetic-pending-only',expires_in:3600,scope:"+JSON.stringify(/const SCOPE = '([^']+)'/.exec(script)[1])+"}),fetch:async u=>{if(new URL(u).pathname==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:window.firebaseDeps.auth.currentUser.email}}));window.pendingRemoteCalls++;throw Error('GOOGLE_FORBIDDEN');}});window.attachmentService=window.pendingService;",
   "const actualPendingRemove=window.pendingService.removePendingAttachment.bind(window.pendingService);window.pendingService.removePendingAttachment=async args=>{if(window.pendingHold)await new Promise(r=>window.pendingRelease=r);const r=await actualPendingRemove(args);return window.pendingForceWarning?{...r,localCopyRetained:true}:r;};",
   "function PendingNoticeFixture(){const service=window.pendingService,user=window.firebaseDeps.auth.currentUser,d=service.getDraft(user.uid);const [pending,setPending]=useState(d.pending),[failure,setFailure]=useState('');const form=d.metadata,attachments=[],documentFile=null,sealed=false,blocked=()=>false;",
   feedbackState,
   "const mounted=useRef(true),disposed=useRef(false),discardingRef=useRef(false),savingRef=useRef(false),processingRef=useRef(false),stagingRef=useRef(false),stageSequence=useRef(0),draftOperation=useRef(d.operationId),draftRevisionRef=useRef(d.revision),draftPending=useRef(service.pendingFingerprint(d.pending));const acknowledgeDraft=n=>{draftRevisionRef.current=n.revision;draftPending.current=service.pendingFingerprint(n.pending);};const setImageError=setFailure;const handleDraftError=e=>setFailure(e.message);",
   pendingHandler,
   "return <form className='form-shell'><label>Naziv proizvoda<input aria-label='Probni naziv' readOnly value={form.name}/></label><section id='attachment-section' tabIndex={-1}><AttachmentList attachments={pending} user={user} pendingIds={pending.map(a=>a.id)} onRemovePending={removePending} removeDisabled={removing}/>"+feedbackMarkup+"{failure&&<p role='alert'>{failure}</p>}</section></form>;}",
   "window.mountPendingNotice=async()=>{const user=window.firebaseDeps.auth.currentUser;await window.pendingService.authChanged(user);await window.pendingService.connect();await window.pendingService.stageDraft({userId:user.uid,base:null,metadata:{name:'Synthetic pending notice'},attachments:[],pending:[{id:'pending-A',name:'A.jpg',mime:'image/jpeg',size:10,sha256:'a'.repeat(64)},{id:'pending-B',name:'B.jpg',mime:'image/jpeg',size:10,sha256:'b'.repeat(64)}],operationId:'pending-feedback-op',expectedRevision:window.pendingService.contentRevision(null)});window.domRoot.render(<PendingNoticeFixture/>);};"
  ].join('\n');
  await page.addScriptTag({content:babel.transform(pendingSetup,{presets:[['react',{runtime:'classic'}]]}).code});await page.evaluate(()=>window.mountPendingNotice());await page.setViewportSize({width:390,height:844});
  const feedback=page.locator('.attachment-removal-status');await feedback.waitFor({state:'attached'});
  assert.equal(await feedback.getAttribute('role'),'status');assert.equal(await feedback.getAttribute('aria-live'),'polite');assert.equal(await feedback.getAttribute('aria-atomic'),'true');assert.equal(await feedback.innerText(),'');
  await feedback.evaluate(e=>window.feedbackNode=e);
  const removeA=page.getByRole('button',{name:'Ukloni iz nacrta: A.jpg',exact:true});page.once('dialog',d=>d.dismiss());await removeA.click();assert.equal(await page.locator('.attachment').count(),2);assert.equal(await page.locator('.attachment-removal-success').count(),0);
  page.once('dialog',d=>d.accept());await removeA.click();const success=feedback.getByText('PRILOG JE UKLONJEN IZ NACRTA.',{exact:true});await success.waitFor();
  assert.equal(await page.locator('.attachment').count(),1);assert.equal(await page.getByRole('textbox',{name:'Probni naziv',exact:true}).inputValue(),'Synthetic pending notice');assert.equal(await feedback.evaluate(e=>e===window.feedbackNode),true);
  const computed=await success.evaluate(e=>{const s=getComputedStyle(e);return {color:s.color,background:s.backgroundColor,fontSize:s.fontSize,fontWeight:s.fontWeight,textAlign:s.textAlign,borderWidth:s.borderTopWidth,borderStyle:s.borderTopStyle};});
  assert.deepEqual(computed,{color:'rgb(23, 97, 68)',background:'rgb(240, 253, 244)',fontSize:'20px',fontWeight:'700',textAlign:'center',borderWidth:'1px',borderStyle:'solid'});
  const luminance=color=>{const c=color.match(/\d+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2];};const x=luminance(computed.color),y=luminance(computed.background);assert.ok((Math.max(x,y)+.05)/(Math.min(x,y)+.05)>=4.5);
  for(const width of [320,390,430])for(const scale of ['100%','200%']){
   await page.setViewportSize({width,height:844});await page.evaluate(scale=>document.documentElement.style.fontSize=scale,scale);await success.scrollIntoViewIfNeeded();
   const box=await success.boundingBox(),parent=await feedback.boundingBox();assert.ok(box.width>0&&box.x>=-.5&&box.x+box.width<=width+.5);assert.ok(Math.abs((box.x+box.width/2)-(parent.x+parent.width/2))<=1);assert.equal(await success.evaluate(e=>e.scrollWidth<=e.clientWidth),true);assert.ok(box.height>=parseFloat(await success.evaluate(e=>getComputedStyle(e).lineHeight)));
  }
  await page.evaluate(()=>{document.documentElement.style.fontSize='100%';window.pendingHold=true;window.pendingForceWarning=true;window.pendingRelease=null;});
  const removeB=page.getByRole('button',{name:'Ukloni iz nacrta: B.jpg',exact:true});page.once('dialog',d=>d.accept());await removeB.click();await page.waitForFunction(()=>typeof window.pendingRelease==='function');assert.equal(await page.locator('.attachment-removal-success').count(),0);
  await page.evaluate(()=>{window.pendingHold=false;window.pendingRelease();});await feedback.getByText('Prilog je uklonjen iz nacrta. Lokalna kopija čeka čišćenje.',{exact:true}).waitFor();
  assert.equal(await page.locator('.attachment-removal-success').count(),0);assert.equal(await feedback.evaluate(e=>e===window.feedbackNode),true);assert.equal(await page.evaluate(()=>window.pendingRemoteCalls),0);assert.equal(requests,0);
  console.log('DOM pending feedback: real pending handler/service, cancel then confirm, unchanged other image/name, persistent polite atomic status, 20px/700 green success with 1px border, centered 320/390/430 at 100/200% text, contrast >=4.5, partial-cleanup warning never green, zero remote writes');

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
test('general rename uses JSON V2 ETag when V3 ETag header is unavailable',async()=>{
 const h=await harness({noEtag:true,v2KeepJsonTag:true}),d=await h.stage({attachments:[ref(1,'New-name.jpg'),ref(2)],seal:true});
 await h.service.saveWarranty(saveArgs(h,d));assert.equal(h.patches().length,1);assert.ok(h.calls.some(c=>c.url.includes('/drive/v2/')));
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

async function txtHarness(config={}){
 const h=await harness({uploads:true,txtEnabled:true,...config});await h.stage({seal:true});
 editJournal(h,j=>j.v2Trials={old:{phase:'halted',negativeStatus:500,marker:'KEEP'}});
 const old=()=>{const j=JSON.parse([...h.storage.data.entries()].find(([k])=>k.startsWith('garancije-drive-integration-v1:'))[1]);delete j.textExperiment;return JSON.stringify(j);};
 const snapshot=old(),before=clone([...h.records]);for(const name of ['read','list','commit','beginAttachmentEdit'])h.window.driveEnvironment.metadataStore[name]=async()=>{throw Error('FIREBASE_FORBIDDEN');};
 return {...h,old,snapshot,before};
}
const txtStart=h=>h.service.textTrial({userId:h.user.uid,action:'start'});
const txtRead=h=>h.service.textTrial({userId:h.user.uid,action:'inspect',expectedRevision:h.service.getTextTrial(h.user.uid).revision});
const txtTrash=h=>h.service.textTrial({userId:h.user.uid,action:'trash',expectedRevision:h.service.getTextTrial(h.user.uid).revision,acknowledgedResult:true});
test('isolated TXT uses one reserved ID, real E0/E1 and 412 preserving B, with no Firebase or old draft/trial changes',async()=>{
 const h=await txtHarness(),result=await txtStart(h);
 assert.equal(result.phase,'passed');assert.equal(result.negativeStatus,412);assert.equal(result.observedName,'GP-provera-B.txt');assert.equal(result.e1Different,true);
 assert.equal(h.remote.size,3);assert.deepEqual(h.calls.filter(x=>x.method==='POST').map(x=>new URL(x.url).pathname),['/upload/drive/v3/files']);
 assert.deepEqual(h.patches().map(x=>JSON.parse(x.body).title),['GP-provera-B.txt','GP-provera-C.txt']);
 assert.equal(h.old(),h.snapshot);assert.deepEqual(clone([...h.records]),h.before);assert.equal(h.writes.length,0);assert.equal(JSON.stringify(result).includes('"v1"'),false);
 await assert.rejects(txtStart(h));assert.equal(h.remote.size,3);
});
for(const code of [500,200,403])test('TXT stale E0 '+code+' halts without further PATCH or rollback',async()=>{
 const h=await txtHarness({txtStaleStatus:code});await assert.rejects(txtStart(h));const s=h.service.getTextTrial(h.user.uid);
 assert.equal(s.negativeStatus,code);assert.equal(s.phase,'halted');assert.equal(s.passed,false);assert.equal(s.observedName,code===200?'GP-provera-C.txt':'GP-provera-B.txt');assert.equal(h.patches().length,2);
 assert.equal(s.events.find(e=>e.label==='stale_E0').status,code);await assert.rejects(txtStart(h));assert.equal(h.patches().length,2);assert.equal(h.old(),h.snapshot);
});
for(const fault of ['txtIdLost','txtCreateLost','txtValidLost','txtStaleLost'])test('TXT '+fault+' never repeats writes or claims proof from observed filename',async()=>{
 const h=await txtHarness({[fault]:true});await assert.rejects(txtStart(h));const count=h.calls.filter(x=>['POST','PATCH'].includes(x.method)).length,s=h.service.getTextTrial(h.user.uid);
 assert.equal(s.uncertain,true);await assert.rejects(txtStart(h));if(s.fileId){await txtRead(h);assert.notEqual(h.service.getTextTrial(h.user.uid).passed,true);}await assert.rejects(txtTrash(h));
 assert.equal(h.calls.filter(x=>['POST','PATCH'].includes(x.method)).length,count);assert.ok(h.remote.size<=3);assert.equal(h.old(),h.snapshot);
});
for(const fault of ['txtMissingTag','txtWeakTag','txtEqualTag'])test('TXT '+fault+' blocks incomplete validator sequence',async()=>{
 const h=await txtHarness({[fault]:true});await assert.rejects(txtStart(h));assert.equal(h.service.getTextTrial(h.user.uid).phase,'halted');assert.equal(h.patches().length,fault==='txtEqualTag'?1:0);assert.equal(h.old(),h.snapshot);
});
test('TXT sanitizes error code/reason/message without tokens, URLs, emails or headers',async()=>{
 const secret='ya29.abcdefghijklmnopqrstuvwxyz0123456789';
 const h=await txtHarness({txtStaleStatus:500,txtErrorMessage:'Backend Error Bearer '+secret+' https://private.invalid/?token=secret owner@example.invalid '+('x'.repeat(90))});await assert.rejects(txtStart(h));
 const s=h.service.getTextTrial(h.user.uid),event=s.events.find(e=>e.label==='stale_E0'),out=JSON.stringify(s);
 assert.equal(event.errorCode,500);assert.equal(event.reason,'backendError');assert.ok(event.message.length<=160);
 for(const value of [secret,'private.invalid','owner@example.invalid','Authorization','uploadURL','access_token'])assert.ok(!out.includes(value));
});
test('TXT refresh/two tabs/double click never create a second file',async()=>{
 const h=await txtHarness();const rs=await Promise.allSettled([txtStart(h),txtStart(h)]);assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);
 const next=await harness({storage:h.storage,remote:h.remote,txtEnabled:true,uploads:true});await assert.rejects(txtStart(next));
 assert.equal(h.calls.filter(x=>x.method==='POST').length,1);assert.equal(next.calls.length,0);assert.equal(h.remote.size,3);
 await txtRead(next);assert.equal(next.service.getTextTrial(next.user.uid).passed,true);
});
test('TXT readonly identity/revision changes cannot redirect or clear prior evidence',async()=>{
 const h=await txtHarness();await txtStart(h);const s=h.service.getTextTrial(h.user.uid);
 await assert.rejects(h.service.textTrial({userId:h.user.uid,action:'inspect',expectedRevision:s.revision-1}));
 h.remote.get(s.fileId).sha256Checksum='f'.repeat(64);await assert.rejects(txtRead(h));assert.equal(h.patches().length,2);assert.equal(h.old(),h.snapshot);
});
test('TXT safe trash requires read acknowledgement, verifies exact ID and never purges',async()=>{
 const h=await txtHarness();await txtStart(h);let s=h.service.getTextTrial(h.user.uid);
 await assert.rejects(h.service.textTrial({userId:h.user.uid,action:'trash',expectedRevision:s.revision}));assert.equal(h.patches().length,2);
 const r=await txtTrash(h);assert.equal(r.phase,'trashed');assert.equal(h.remote.get(r.fileId).trashed,true);
 assert.ok(h.patches().every(x=>new URL(x.url).pathname.endsWith('/'+r.fileId)));assert.deepEqual(JSON.parse(h.patches()[2].body),{labels:{trashed:true}});
 assert.ok(h.calls.every(x=>x.method!=='DELETE'));assert.equal(h.old(),h.snapshot);
});
test('TXT uncertain trash is not repeated and preserves exact ID for readonly reconciliation',async()=>{
 const h=await txtHarness({txtTrashLost:true});await txtStart(h);const id=h.service.getTextTrial(h.user.uid).fileId;await assert.rejects(txtTrash(h));
 await txtRead(h);assert.equal(h.service.getTextTrial(h.user.uid).observedTrashed,true);await assert.rejects(txtTrash(h));assert.equal(h.patches().length,3);assert.equal(h.service.getTextTrial(h.user.uid).fileId,id);
});

test('TXT valid E0 HTTP500 stops before stale C and preserves sanitized phase evidence',async()=>{
 const h=await txtHarness({txtValidStatus:500});await assert.rejects(txtStart(h));const s=h.service.getTextTrial(h.user.uid);
 assert.equal(h.patches().length,1);assert.equal(s.negativeStatus,undefined);assert.equal(s.events.find(e=>e.label==='valid_E0').status,500);assert.equal(s.phase,'halted');assert.equal(h.old(),h.snapshot);
});
test('TXT repeated readonly reconciliation never evicts original stale-request evidence',async()=>{
 const h=await txtHarness({txtStaleStatus:500});await assert.rejects(txtStart(h));for(let i=0;i<32;i++)await txtRead(h);
 const s=h.service.getTextTrial(h.user.uid);assert.equal(s.events.find(e=>e.label==='stale_E0').status,500);assert.equal(s.events.filter(e=>e.label==='inspect').length,1);assert.equal(h.patches().length,2);
});
test('TXT two overlapping tab services share persisted run and create exactly one file',async()=>{
 const h=await txtHarness(),next=await harness({storage:h.storage,remote:h.remote,txtEnabled:true,uploads:true});
 const rs=await Promise.allSettled([txtStart(h),txtStart(next)]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(h.calls.filter(c=>c.method==='POST').length+next.calls.filter(c=>c.method==='POST').length,1);assert.equal(h.remote.size,3);assert.equal(h.old(),h.snapshot);
});
test('TXT stale owner during file GET stops before any rename and cannot touch old draft',async()=>{
 const h=await txtHarness();h.config.onTxtGet=()=>h.window.firebaseDeps.auth.currentUser={uid:'other',email:'other.invalid'};
 await assert.rejects(txtStart(h));h.window.firebaseDeps.auth.currentUser=h.user;assert.equal(h.patches().length,0);assert.equal(h.old(),h.snapshot);
});


async function haltedRecoveryHarness(config={}){
 const h=await v2Harness({v2NegativeStatus:500});await assert.rejects(h.service.runV2RenameTrial(v2Args(h)));
 h.config.v2Enabled=false;Object.assign(h.config,config);editJournal(h,j=>j.textExperiment={userId:h.user.uid,ownerEmail:h.user.email,phase:'trashed',events:[{label:'stale_E0',status:412}]});
 const protectedState=()=>{const j=JSON.parse([...h.storage.data.entries()].find(([k])=>k.startsWith('garancije-drive-integration-v1:'))[1]);return JSON.stringify({v2Trials:j.v2Trials,textExperiment:j.textExperiment});};
 return {...h,protectedState,protectedSnapshot:protectedState()};
}
const recoverArgs=(h,readOnly=false,finalizeOnly=false)=>{const d=h.service.getDraft(h.user.uid);return {userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision,readOnly,finalizeOnly};};
test('halted recovery inspect is readonly and links exact existing reservation without resetting audit',async()=>{
 const h=await haltedRecoveryHarness(),before=JSON.stringify([...h.storage.data]),writes=h.writes.length,patches=h.patches().length;
 const r=await h.service.recoverHaltedRename(recoverArgs(h,true));assert.equal(r.canRun,true);assert.equal(r.oldNegativeStatus,500);assert.equal(r.phase,'ready');
 assert.equal(JSON.stringify([...h.storage.data]),before);assert.equal(h.writes.length,writes);assert.equal(h.patches().length,patches);
});
test('explicit halted recovery renames only exact first file and atomically updates attachment fields, preserving staged metadata/TXT/old500',async()=>{
 const h=await haltedRecoveryHarness(),before=clone(h.records.get(V2_PIN.id)),patches=h.patches().length;
 const r=await h.service.recoverHaltedRename(recoverArgs(h));assert.equal(r.complete,true);assert.equal(h.patches().length,patches+1);
 const saved=h.records.get(V2_PIN.id);assert.equal(saved.name,V2_PIN.name);assert.equal(saved.attachments[0].name,V2_PIN.newName);assert.equal(saved.attachments[0].driveFileId,before.attachments[0].driveFileId);assert.deepEqual(saved.attachments[1],before.attachments[1]);assert.equal(saved.attachmentCount,2);
 assert.equal(h.service.getDraft(h.user.uid).metadata.name,'UNSAVED local metadata');assert.equal(h.service.getDraft(h.user.uid).sealed,false);
 assert.equal(h.protectedState(),h.protectedSnapshot);assert.deepEqual(JSON.parse(h.service.getDraft(h.user.uid).expected),saved);
 await h.service.recoverHaltedRename(recoverArgs(h));assert.equal(h.patches().length,patches+1);
});
for(const fault of ['losePatch','hangPatch','failRenameCommit','loseRenameCommit'])test('halted recovery '+fault+' reconciles same ID then explicitly finalizes without another PATCH',async()=>{
 const h=await haltedRecoveryHarness({[fault]:true}),before=h.patches().length;await assert.rejects(h.service.recoverHaltedRename(recoverArgs(h)));
 assert.equal(h.remote.get(ref(1).driveFileId).name,V2_PIN.newName);await assert.rejects(h.service.recoverHaltedRename(recoverArgs(h)));
 const inspect=await h.service.recoverHaltedRename(recoverArgs(h,true));assert.equal(inspect.canFinalize,true);assert.equal(h.patches().length,before+1);
 const r=await h.service.recoverHaltedRename(recoverArgs(h,false,true));assert.equal(r.complete,true);assert.equal(h.patches().length,before+1);assert.equal(h.protectedState(),h.protectedSnapshot);
});
for(const bad of ['server-revision','file-content','shared-reference','weak-tag','missing-tag','wrong-plan'])test('halted recovery blocks '+bad+' without overwriting newer state',async()=>{
 const h=await haltedRecoveryHarness(),count=h.patches().length;
 if(bad==='server-revision')h.records.get(V2_PIN.id).description='NEWER';
 if(bad==='file-content')h.remote.get(ref(1).driveFileId).sha256Checksum='e'.repeat(64);
 if(bad==='shared-reference')h.records.set('another',{attachments:[ref(1)]});
 if(bad==='weak-tag')h.config.renameWeakTag=true;if(bad==='missing-tag')h.config.renameMissingTag=true;
 if(bad==='wrong-plan')editJournal(h,j=>j.draft.attachments[0].name='UNAPPROVED.jpg');
 await assert.rejects(h.service.recoverHaltedRename(recoverArgs(h)));assert.equal(h.patches().length,count);assert.equal(h.protectedState(),h.protectedSnapshot);
});
test('halted recovery double click and reload keep one conditional write and original audit',async()=>{
 const h=await haltedRecoveryHarness(),args=recoverArgs(h),count=h.patches().length,rs=await Promise.allSettled([h.service.recoverHaltedRename(args),h.service.recoverHaltedRename(args)]);
 assert.equal(rs.filter(x=>x.status==='fulfilled').length,1);assert.equal(h.patches().length,count+1);
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote});assert.equal((await next.service.recoverHaltedRename(recoverArgs(next,true))).complete,true);assert.equal(next.patches().length,0);assert.equal(h.protectedState(),h.protectedSnapshot);
});
test('general V2 rename conflict 412 preserves file and never automatically retries',async()=>{
 const h=await harness({concurrentDrive:true}),d=await h.stage({attachments:[ref(1,'Desired.jpg'),ref(2)],seal:true});
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d)),/412/);await assert.rejects(h.service.saveWarranty(saveArgs(h,d)));assert.equal(h.patches().length,1);assert.equal(h.remote.get(ref(1).driveFileId).name,'External-change.jpg');
});
test('general V2 uncertain old-name outcome cannot trigger a second PATCH',async()=>{
 const h=await harness({renameLostBeforeApply:true}),d=await h.stage({attachments:[ref(1,'Desired.jpg'),ref(2)],seal:true});
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d)));await assert.rejects(h.service.saveWarranty(saveArgs(h,d)),/PATCH/);assert.equal(h.patches().length,1);assert.equal(h.remote.get(ref(1).driveFileId).name,'Image-1.jpg');
});

test('halted recovery cannot overwrite server changes appearing after Drive success',async()=>{
 const h=await haltedRecoveryHarness(),count=h.patches().length;
 h.config.onMetadata=()=>{if(h.remote.get(ref(1).driveFileId).name===V2_PIN.newName)h.records.get(V2_PIN.id).store='NEWER SERVER VALUE';};
 await assert.rejects(h.service.recoverHaltedRename(recoverArgs(h)));
 assert.equal(h.records.get(V2_PIN.id).store,'NEWER SERVER VALUE');assert.equal(h.records.get(V2_PIN.id).attachments[0].name,V2_PIN.oldName);assert.equal(h.patches().length,count+1);assert.equal(h.protectedState(),h.protectedSnapshot);
});
test('halted recovery local rebase failure after server receipt reloads and finalizes with zero extra PATCH',async()=>{
 const h=await haltedRecoveryHarness(),set=h.storage.setItem.bind(h.storage),count=h.patches().length;
 h.storage.setItem=(k,v)=>{const j=JSON.parse(v);if(j.renameRecoveries?.[h.d.operationId]?.complete&&j.draft?.sealed===false)throw Error('RECOVERY_REBASE_FAILED');set(k,v);};
 await assert.rejects(h.service.recoverHaltedRename(recoverArgs(h)));h.storage.setItem=set;
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote});assert.equal((await next.service.recoverHaltedRename(recoverArgs(next,true))).canFinalize,true);
 assert.equal((await next.service.recoverHaltedRename(recoverArgs(next,false,true))).complete,true);assert.equal(h.patches().length+next.patches().length,count+1);assert.equal(h.protectedState(),h.protectedSnapshot);
});
test('halted recovery validates immutable audit link before further work',async()=>{
 const h=await haltedRecoveryHarness({losePatch:true}),count=h.patches().length;await assert.rejects(h.service.recoverHaltedRename(recoverArgs(h)));
 editJournal(h,j=>j.v2Trials[h.d.operationId].observedName='modified historical audit');
 await assert.rejects(h.service.recoverHaltedRename(recoverArgs(h,true)));assert.equal(h.patches().length,count+1);
});
for(const mode of ['renameDuplicateProperty','renamePublicOnly','renameNoProperties'])test('generic V2 rename mapping rejects '+mode+' before reservation or PATCH',async()=>{
 const h=await harness({[mode]:true}),d=await h.stage({attachments:[ref(1,'New-name.jpg'),ref(2)],seal:true});
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d)));assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);
});


const removalInspect=(h,extra={})=>{const d=h.service.getDraft(h.user.uid);return h.service.inspectSavedRemoval({userId:h.user.uid,operationId:d.operationId,attachmentId:'attachment-1',expectedRevision:d.revision,isCurrent:()=>true,...extra});};
const journalSnapshot=h=>[...h.storage.data.entries()].filter(([k])=>k.startsWith('garancije-drive-integration-v1:'));
test('removal readonly exact selected ID returns only fixed flags and never touches draft/journal/Firebase/Drive',async()=>{
 const h=await harness();await h.stage({name:'UNSAVED'});const before=clone(journalSnapshot(h)),server=clone(h.records.get('warranty-one'));
 const r=await removalInspect(h);
 assert.deepEqual(JSON.parse(JSON.stringify(r)),{identityVerified:true,referencePresent:true,reservation:'none',trashed:false,nameMatchesOld:true,canTrash:true,etagReadable:true,attemptPhase:'not_sent'});
 assert.deepEqual(journalSnapshot(h),before);assert.deepEqual(h.records.get('warranty-one'),server);assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
 assert.ok(h.calls.every(c=>c.method==='GET'&&c.url.includes('/drive/v2/files/'+ref(1).driveFileId)));assert.ok(!h.calls.some(c=>c.url.includes(ref(2).driveFileId)));
 assert.ok(!JSON.stringify(r).includes(ref(1).driveFileId));assert.ok(!JSON.stringify(r).includes('synthetic-token'));assert.ok(!JSON.stringify(r).includes('a'.repeat(64)));
});
for(const flag of ['trashed','different-name','canTrash-false','canTrash-missing','weak-tag','missing-tag'])test('readonly removal reports distinct '+flag+' without changing any data',async()=>{
 const config={renameWeakTag:flag==='weak-tag',renameMissingTag:flag==='missing-tag'},h=await harness(config);await h.stage();const f=h.remote.get(ref(1).driveFileId);
 if(flag==='trashed')f.trashed=true;if(flag==='different-name')f.name='Changed.jpg';if(flag==='canTrash-false')f.capabilities.canTrash=false;if(flag==='canTrash-missing')delete f.capabilities.canTrash;
 const before=clone(journalSnapshot(h)),r=await removalInspect(h);
 assert.equal(r.trashed,flag==='trashed');assert.equal(r.nameMatchesOld,flag!=='different-name');assert.equal(r.canTrash,flag==='canTrash-missing'?null:flag!=='canTrash-false');
 assert.equal(r.etagReadable,!['weak-tag','missing-tag'].includes(flag));assert.deepEqual(journalSnapshot(h),before);assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
});
for(const getStatus of [403,404])test('readonly removal '+getStatus+' preserves all evidence and zero writes',async()=>{
 const h=await harness({getStatus});await h.stage();const before=clone(journalSnapshot(h));await assert.rejects(removalInspect(h),/403\/404/);
 assert.deepEqual(journalSnapshot(h),before);assert.equal(h.writes.length,0);assert.equal(h.patches().length,0);
});
for(const bad of ['foreign','shared','duplicate','checksum','properties','wrong-id','missing-trashed'])test('removal readonly rejects ambiguous identity '+bad,async()=>{
 const h=await harness({renameNoProperties:bad==='properties'});const f=h.remote.get(ref(1).driveFileId);
 if(bad==='foreign')f.ownedByMe=false;if(bad==='shared')h.records.set('other',{...record(),attachments:[ref(1)]});
 if(bad==='duplicate')h.records.get('warranty-one').attachments.push({...ref(1),id:'duplicate'});
 if(bad==='checksum')f.sha256Checksum='e'.repeat(64);if(bad==='wrong-id')f.id='unapproved-id';if(bad==='missing-trashed')delete f.trashed;
 await h.stage();const before=clone(journalSnapshot(h));await assert.rejects(removalInspect(h));assert.deepEqual(journalSnapshot(h),before);assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);
});
for(const stale of ['owner','revision','server','closed'])test('readonly removal rejects stale '+stale+' without returning previous result',async()=>{
 let h;const config={onMetadata:()=>{if(stale==='owner')h.window.firebaseDeps.auth.currentUser={uid:'other',email:'other.invalid'};if(stale==='revision')editJournal(h,j=>j.draft.revision++);if(stale==='server')h.records.get('warranty-one').description='newer';}};
 h=await harness(config);await h.stage();await assert.rejects(removalInspect(h,{isCurrent:()=>stale!=='closed'}));assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);
});
test('repeated readonly removal clicks share busy guard and leave journal byte identical',async()=>{
 let release;const gate=new Promise(r=>release=r),h=await harness({onMetadata:()=>gate});await h.stage();const before=clone(journalSnapshot(h)),one=removalInspect(h),two=removalInspect(h);release();
 const r=await Promise.allSettled([one,two]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.deepEqual(journalSnapshot(h),before);assert.equal(h.writes.length,0);
});
test('V2 removal works with absent V3 header and uses exact JSON validator/labels only',async()=>{
 const h=await harness({noEtag:true,v2KeepJsonTag:true});await h.stage();await h.remove();
 assert.equal(h.patches().length,1);const p=h.patches()[0];assert.ok(p.url.includes('/drive/v2/files/'+ref(1).driveFileId));assert.equal(p.headers['If-Match'],'"v1"');assert.deepEqual(JSON.parse(p.body),{labels:{trashed:true}});
 assert.equal(h.remote.get(ref(2).driveFileId).name,'Image-2.jpg');assert.equal(h.remote.get(ref(2).driveFileId).trashed,false);
});
for(const patchStatus of [412,500,403,404])test('removal '+patchStatus+' is persisted and cannot resend PATCH after reload or reconcile',async()=>{
 const h=await harness({patchStatus});await h.stage();await assert.rejects(h.remove());assert.equal(h.patches().length,1);assert.equal(h.remote.get(ref(1).driveFileId).trashed,false);
 const phase=patchStatus===412?'conflict':'failed',entry=journalSnapshot(h)[0],j=JSON.parse(entry[1]);assert.equal(Object.values(j.removalWrites)[0].phase,phase);
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote});const flags=await removalInspect(next);assert.equal(flags.referencePresent,false);assert.equal(flags.reservation,'matching');assert.equal(flags.attemptPhase,phase);
 for(let i=0;i<2;i++)await assert.rejects(next.service.resumeSavedAttachmentEdit({userId:next.user.uid,id:'warranty-one'}));
 assert.equal(next.patches().length,0);assert.equal(next.records.get('warranty-one').attachmentCount,1);assert.ok(next.records.get('warranty-one')._attachmentEdit);
});
test('actual stale ETag with unchanged name returns 412 and no retry or rollback',async()=>{
 const h=await harness({beforeRemovalPatch:f=>{f.v++;}});await h.stage();const original=h.remote.get(ref(1).driveFileId);
 await assert.rejects(h.remove());assert.equal(original.v,2);assert.equal(original.trashed,false);assert.equal(original.name,'Image-1.jpg');assert.equal(h.patches()[0].headers['If-Match'],'"v1"');
 await assert.rejects(h.service.resumeSavedAttachmentEdit({userId:h.user.uid,id:'warranty-one'}));assert.equal(h.patches().length,1);
});
test('lost removal response before application cannot resend or claim success after reload',async()=>{
 const h=await harness({removeLostBeforeApply:true});await h.stage();await assert.rejects(h.remove());assert.equal(h.remote.get(ref(1).driveFileId).trashed,false);
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote});assert.equal((await removalInspect(next)).attemptPhase,'sending');
 await assert.rejects(next.service.resumeSavedAttachmentEdit({userId:next.user.uid,id:'warranty-one'}));assert.equal(next.patches().length,0);assert.ok(next.records.get('warranty-one')._attachmentEdit);
});
test('local write-ahead failure sends no PATCH; explicit continuation can send its first attempt',async()=>{
 const h=await harness();await h.stage();await assert.rejects(h.remove({onUnlinked:()=>{h.storage.fail=1;}}));assert.equal(h.patches().length,0);assert.equal(h.remote.get(ref(1).driveFileId).trashed,false);
 await h.service.resumeSavedAttachmentEdit({userId:h.user.uid,id:'warranty-one'});assert.equal(h.patches().length,1);assert.equal(h.remote.get(ref(1).driveFileId).trashed,true);
});
test('Firestore finalization failure after verified trash retains pending state then finishes without extra PATCH',async()=>{
 const h=await harness({failFinish:true});await h.stage({name:'Unsaved retained'});await assert.rejects(h.remove());assert.equal(h.remote.get(ref(1).driveFileId).trashed,true);assert.ok(h.records.get('warranty-one')._attachmentEdit);
 const next=await harness({storage:h.storage,records:h.records,remote:h.remote});const r=await removalInspect(next);assert.equal(r.trashed,true);assert.equal(r.referencePresent,false);
 await next.service.resumeSavedAttachmentEdit({userId:next.user.uid,id:'warranty-one'});assert.equal(next.patches().length,0);assert.equal(next.records.get('warranty-one')._attachmentEdit,undefined);assert.equal(next.service.getDraft(next.user.uid).metadata.name,'Unsaved retained');
});
test('removal metadata failure after applied PATCH recovers with same ID and no second write',async()=>{
 const h=await harness();await h.stage();let checks=0;h.config.onMetadata=()=>{if(++checks===3)throw Error('NETWORK_OFFLINE');};
 await assert.rejects(h.remove());assert.equal(h.remote.get(ref(1).driveFileId).trashed,true);assert.equal(h.patches().length,1);
 h.config.onMetadata=undefined;await h.service.resumeSavedAttachmentEdit({userId:h.user.uid,id:'warranty-one'});assert.equal(h.patches().length,1);
});
test('two tab removal shares lock and can never apply trash twice',async()=>{
 const lockMap=new Map(),h=await harness({lockMap});await h.stage({name:'Keep local'});const next=await harness({lockMap,storage:h.storage,records:h.records,remote:h.remote});
 const r=await Promise.allSettled([h.remove(),next.remove()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(h.patches().length+next.patches().length,1);assert.equal(h.records.get('warranty-one').attachments.length,1);
});

for(const flag of ['trashed','different-name','canTrash-false','canTrash-missing','weak-tag','missing-tag'])test('removal preflight '+flag+' cannot write intent, Firebase or Drive',async()=>{
 const h=await harness({renameWeakTag:flag==='weak-tag',renameMissingTag:flag==='missing-tag'});await h.stage();const f=h.remote.get(ref(1).driveFileId);
 if(flag==='trashed')f.trashed=true;if(flag==='different-name')f.name='Changed.jpg';if(flag==='canTrash-false')f.capabilities.canTrash=false;if(flag==='canTrash-missing')delete f.capabilities.canTrash;
 const before=clone(journalSnapshot(h));await assert.rejects(h.remove());assert.deepEqual(journalSnapshot(h),before);assert.equal(h.patches().length,0);assert.equal(h.writes.length,0);assert.equal(h.records.get('warranty-one').attachments.length,2);
});
test('readonly removal offline and expired token never mutate draft or warranty',async()=>{
 const h=await harness({onMetadata:()=>{throw Error('OFFLINE');}});await h.stage();const before=clone(journalSnapshot(h));await assert.rejects(removalInspect(h));assert.deepEqual(journalSnapshot(h),before);assert.equal(h.writes.length,0);
 const next=await harness();await next.stage();next.expire();const requests=next.calls.length;await assert.rejects(removalInspect(next));assert.equal(next.calls.length,requests);assert.equal(next.writes.length,0);assert.equal(next.patches().length,0);
});
test('Firebase rejects initial unlink: no Drive PATCH and existing references/names preserved',async()=>{
 const h=await harness({failBegin:true});await h.stage();const before=clone(h.records.get('warranty-one'));await assert.rejects(h.remove());assert.deepEqual(h.records.get('warranty-one'),before);assert.equal(h.patches().length,0);assert.equal(h.remote.get(ref(1).driveFileId).trashed,false);
});
test('removal preserves completed rename, old halted audit and finished TXT journal exactly',async()=>{
 const h=await harness();await h.stage();const protectedState={v2Trials:{old:{phase:'halted',negativeStatus:500}},textExperiment:{phase:'trashed',events:[{status:412}]},renameRecoveries:{old:{phase:'complete'}}};
 editJournal(h,j=>Object.assign(j,clone(protectedState)));await h.remove();const j=JSON.parse(journalSnapshot(h)[0][1]);for(const k of Object.keys(protectedState))assert.deepEqual(j[k],protectedState[k]);assert.equal(h.remote.get(ref(2).driveFileId).trashed,false);
});
test('readonly removal checks the exact journal draft/operation identity',async()=>{
 const h=await harness({patchStatus:412});await h.stage();await assert.rejects(h.remove());editJournal(h,j=>{const v=Object.values(j.attachmentEdits)[0];v.draftOperationId='unrelated-draft';});const before=clone(journalSnapshot(h));await assert.rejects(removalInspect(h));assert.deepEqual(journalSnapshot(h),before);assert.equal(h.patches().length,1);
});

const supportState=(h,operationId=null)=>JSON.parse(JSON.stringify(h.service.getAttachmentSupportState(h.user.uid,operationId)));
const diagnosticContext=h=>vm.runInContext('('+html.slice(html.indexOf('        function attachmentDiagnosticContext('),html.indexOf('        function ActiveSaveInspection('))+')',h.context)(h.service,h.user);
test('UI support projection is readonly: absent state is not a new test or draft',async()=>{
 const h=await harness(),before=clone(journalSnapshot(h)),calls=h.calls.length;assert.deepEqual(supportState(h),{text:'none',recovery:'none'});assert.equal(diagnosticContext(h).state,'none');
 assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,calls);assert.equal(h.writes.length,0);
});
test('finished TXT disappears only after confirmed trash and its complete audit remains byte identical',async()=>{
 const h=await txtHarness();await txtStart(h);assert.equal(supportState(h).text,'active');await txtTrash(h);const before=clone(journalSnapshot(h)),calls=h.calls.length;
 assert.equal(supportState(h).text,'complete');assert.equal(h.service.getTextTrial(h.user.uid).phase,'trashed');assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,calls);
});
for(const bad of ['uncertain','in-flight','missing-proof','bad-phase','bad-events','wrong-owner'])test('support projection does not hide incomplete/unknown TXT '+bad,async()=>{
 const h=await txtHarness();await txtStart(h);await txtTrash(h);
 editJournal(h,j=>{const s=j.textExperiment;if(bad==='uncertain')s.uncertain=true;if(bad==='in-flight')s.inFlight=true;if(bad==='missing-proof')delete s.verified;if(bad==='bad-phase')s.phase='unexpected';if(bad==='bad-events')s.events={};if(bad==='wrong-owner')s.userId='other';});
 const before=clone(journalSnapshot(h)),calls=h.calls.length;assert.equal(['active','unknown'].includes(supportState(h).text),true);assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,calls);
});
test('uncertain TXT remains active without retry/create and no projection mutation',async()=>{
 const h=await txtHarness({txtValidLost:true});await assert.rejects(txtStart(h));const before=clone(journalSnapshot(h)),calls=h.calls.length;
 assert.equal(supportState(h).text,'active');assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,calls);
});
test('halted recovery UI hides only completed linked recovery and preserves old500 evidence',async()=>{
 const h=await haltedRecoveryHarness(),d=h.service.getDraft(h.user.uid);assert.equal(supportState(h,d.operationId).recovery,'active');
 await h.service.recoverHaltedRename(recoverArgs(h));const before=clone(journalSnapshot(h)),calls=h.calls.length;
 assert.equal(supportState(h,d.operationId).recovery,'complete');assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,calls);assert.equal(h.protectedState(),h.protectedSnapshot);
});
for(const bad of ['wrong-link','inconsistent-complete','unknown-phase','wrong-audit'])test('unknown recovery '+bad+' remains visible and never silently passes',async()=>{
 const h=await haltedRecoveryHarness();await h.service.recoverHaltedRename(recoverArgs(h));const d=h.service.getDraft(h.user.uid);
 editJournal(h,j=>{const r=j.renameRecoveries[d.operationId];if(bad==='wrong-link')r.oldOperationId='other';if(bad==='inconsistent-complete')r.complete=false;if(bad==='unknown-phase')r.phase='unexpected';if(bad==='wrong-audit')j.v2Trials[d.operationId].negativeStatus=200;});
 const before=clone(journalSnapshot(h));assert.equal(supportState(h,d.operationId).recovery,'unknown');assert.deepEqual(journalSnapshot(h),before);
});
test('diagnostics context is existing-draft-only, preserves staged names and makes zero requests',async()=>{
 const h=await harness();await h.stage({name:'UNSAVED RETAINED',attachments:[ref(1,'Staged.jpg'),ref(2)]});const before=clone(journalSnapshot(h)),calls=h.calls.length,c=diagnosticContext(h);
 assert.equal(c.state,'ready');assert.equal(c.draft.metadata.name,'UNSAVED RETAINED');assert.equal(c.rows.length,2);assert.deepEqual(Array.from(c.renameIds),['attachment-1']);assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,calls);assert.equal(h.writes.length,0);
});
test('new draft diagnostics do not invent a saved warranty context or upload pending files',async()=>{
 const h=await harness({records:new Map()}),picked=await originals();await newDraft(h,picked);const before=clone(journalSnapshot(h));assert.equal(diagnosticContext(h).state,'new');assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
for(const bad of ['duplicate-id','duplicate-file','bad-base','missing-file-id','foreign-intent'])test('diagnostic selector rejects ambiguous '+bad+' without writes',async()=>{
 const h=await harness();await h.stage();editJournal(h,j=>{const d=j.draft;if(bad==='duplicate-id')d.attachments.push({...d.attachments[0]});if(bad==='duplicate-file')d.attachments.push({...d.attachments[0],id:'another'});if(bad==='bad-base')d.expected='null';if(bad==='missing-file-id')delete d.attachments[0].driveFileId;if(bad==='foreign-intent')j.attachmentEdits={[d.id]:{userId:'other',id:d.id,operation:{kind:'remove'}}};});
 const before=clone(journalSnapshot(h));assert.throws(()=>diagnosticContext(h));assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
test('pending removal target remains selectable after unlink without restoring its reference',async()=>{
 const h=await harness({patchStatus:412});await h.stage();await assert.rejects(h.remove());const before=clone(journalSnapshot(h)),calls=h.calls.length,c=diagnosticContext(h);
 assert.equal(c.rows.some(x=>x.id==='attachment-1'),true);assert.equal(h.records.get('warranty-one').attachments.some(x=>x.id==='attachment-1'),false);assert.deepEqual(journalSnapshot(h),before);assert.equal(h.calls.length,calls);
});
test('selected rename diagnostic reads only exact chosen staged attachment',async()=>{
 const h=await harness();const d=await h.stage({attachments:[ref(1,'One-new.jpg'),ref(2,'Two-new.jpg')]}),before=clone(journalSnapshot(h));
 const r=await h.service.inspectSavedRename({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision,attachmentId:'attachment-2'});
 assert.equal(r.length,1);assert.equal(r[0].attachmentId,'attachment-2');assert.ok(h.calls.every(c=>c.method==='GET'&&c.url.includes(ref(2).driveFileId)));assert.deepEqual(journalSnapshot(h),before);assert.equal(h.writes.length,0);
 const calls=h.calls.length;await assert.rejects(h.service.inspectSavedRename({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision,attachmentId:'not-selected'}));assert.equal(h.calls.length,calls);
});
test('everyday form has no historical test or per-attachment diagnostic mounts; active recovery remains',()=>{
 const form=html.slice(html.indexOf('        function DraftForm('),html.indexOf('        const deletionFileMessage'));
 assert.ok(!form.includes('<V2RenameTrial'));assert.ok(!form.includes('<RenameInspection'));assert.ok(!form.includes('<RemovalInspection'));
 assert.ok(form.includes('<HaltedRenameRecovery'));assert.ok(form.includes('<TextConcurrencyTrial'));assert.ok(form.includes('Nastavi uklanjanje priloga'));assert.ok(form.includes('Pregled razlika'));
 assert.ok(html.includes('<AttachmentDiagnostics user={user} disabled={formBusy} draftStatus={currentDraftStatus}/>'));
 const txt=html.slice(html.indexOf('        function TextConcurrencyTrial('),html.indexOf('        function HaltedRenameRecovery('));
 assert.ok(!txt.includes('perform(\'start\')'));assert.ok(!txt.includes('Pokreni izolovanu TXT proveru'));assert.ok(txt.includes('Prikaži detalje i oporavak'));
});







// Active sealed Save inspection: fixtures only, never the real browser journal or Drive.
const activeArgs=(h,d=h.service.getDraft(h.user.uid),isCurrent=()=>true)=>({userId:h.user.uid,operationId:d.operationId,expectedRevision:d.revision,expectedSnapshot:h.window.garancijeFingerprint(d),isCurrent});
const uploadKey=async d=>Buffer.from(await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode('upload:'+d.operationId+':'+d.pending[0].sha256))).toString('hex');
async function activeHarness(config={}){
 const h=await harness({records:new Map(),activeInspection:true,...config}),picked=await originals();
 const d=await newDraft(h,[picked[1]]);editJournal(h,j=>j.draft.saveState={version:1,phase:'external'});
 h.key=await uploadKey(d);h.picked=picked;
 h.found={id:'synthetic_inspected_file',name:d.pending[0].name,mimeType:d.pending[0].mime,size:String(d.pending[0].size),
  appProperties:{app:'garancije-pro',operation:h.key,sha256:d.pending[0].sha256},ownedByMe:true,shared:false,
  permissions:[{type:'user',role:'owner',emailAddress:h.user.email}],trashed:false};
 return h;
}
function journalBytes(h){return [...h.storage.data.entries()].find(([k])=>k.startsWith('garancije-drive-integration-v1:'))[1];}
for(const state of ['none','reserved','uncertain','confirmed'])test('active Save inspection '+state+' reads only exact operation metadata and preserves literal journal',async()=>{
 const h=await activeHarness();h.config.inspectionPages=[{files:[h.found]}];h.remote.set(h.found.id,h.found);
 if(state!=='none')editJournal(h,j=>j.jobs[h.key]={id:h.found.id,state});
 const before=journalBytes(h),records=JSON.stringify([...h.records]),files=JSON.stringify([...h.remote]);
 const r=await h.service.inspectActiveSave(activeArgs(h));assert.equal(r.complete,true);assert.equal(r.firebaseStatus,'absent');assert.equal(r.phase,'external');
 assert.equal(r.rows.length,1);assert.equal(r.rows[0].jobState,state);assert.equal(r.rows[0].driveStatus,'verified');
 assert.equal(journalBytes(h),before);assert.equal(JSON.stringify([...h.records]),records);assert.equal(JSON.stringify([...h.remote]),files);assert.equal(h.writes.length,0);
 assert.ok(h.calls.every(c=>c.method==='GET'&&!new URL(c.url).searchParams.has('alt')));
 const list=h.calls.filter(c=>new URL(c.url).pathname==='/drive/v3/files');assert.equal(list.length,1);
 const u=new URL(list[0].url);assert.equal(u.searchParams.get('q'),"appProperties has { key='operation' and value='"+h.key+"' }");
 assert.ok(!u.searchParams.get('q').includes('parents')&&!u.searchParams.get('q').includes('trashed'));
 assert.ok(!/Authorization|synthetic-token|sha256|appProperties|operationHash|uploadURL|dataUrl|original/.test(JSON.stringify(r)));
 assert.ok(h.config.inspectionReads.every(id=>id===r.draftId));assert.equal(h.config.inspectionReads.length,2);
});
for(const status of ['absent','same_operation','conflict'])test('active Save exact Firebase document '+status+' is reported without finalize or draft clearing',async()=>{
 const h=await activeHarness({inspectionPages:[{files:[]}]}),d=h.service.getDraft(h.user.uid);
 if(status!=='absent')h.records.set(d.id,{name:'Saved',lastOperation:status==='same_operation'?d.operationId:'different-operation',attachments:[],attachmentCount:0,attachmentNames:[]});
 const before=journalBytes(h),r=await h.service.inspectActiveSave(activeArgs(h));assert.equal(r.firebaseStatus,status);assert.equal(r.rows[0].driveStatus,'no_accessible_files');assert.equal(r.complete,true);
 assert.equal(journalBytes(h),before);assert.equal(h.writes.length,0);assert.equal(h.service.getDraft(h.user.uid).sealed,true);
});
for(const branch of ['trashed','moved','multiple','pagination','known404','403','offline','incomplete','malformed','identity','repeated-page','duplicate-page','limit'])test('active Save inspection '+branch+' never confuses unknown or ambiguous with a safe retry',async()=>{
 const h=await activeHarness();h.config.inspectionPages=[{files:[]}];let expected='unknown',complete=false;
 if(branch==='trashed'||branch==='moved'){h.config.inspectionPages=[{files:[{...h.found,...(branch==='trashed'?{trashed:true}:{parents:['moved-folder']})}]}];expected=branch==='trashed'?'trashed':'verified';complete=true;}
 if(branch==='multiple'){h.config.inspectionPages=[{files:[h.found,{...h.found,id:'synthetic_second_match'}]}];expected='ambiguous';}
 if(branch==='pagination'){h.config.inspectionPages=[{files:[],nextPageToken:'next'},{files:[h.found]}];expected='verified';complete=true;}
 if(branch==='known404'){editJournal(h,j=>j.jobs[h.key]={id:h.found.id,state:'uncertain'});expected='not_accessible';}
 if(branch==='403')h.config.inspectionStatus=403;
 if(branch==='offline')h.config.inspectionOffline=true;
 if(branch==='incomplete')h.config.inspectionPages=[{files:[],incompleteSearch:true}];
 if(branch==='malformed')h.config.inspectionPages=[{}];
 if(branch==='identity')h.config.inspectionPages=[{files:[{...h.found,ownedByMe:false}]}];
 if(branch==='repeated-page')h.config.inspectionPages=[{files:[],nextPageToken:'next'},{files:[],nextPageToken:'next'}];
 if(branch==='duplicate-page')h.config.inspectionPages=[{files:[h.found],nextPageToken:'next'},{files:[h.found]}];
 if(branch==='limit')h.config.inspectionPages=[{files:Array.from({length:101},(_,i)=>({...h.found,id:'synthetic_many_'+i}))}];
 const before=journalBytes(h),r=await h.service.inspectActiveSave(activeArgs(h));assert.equal(r.rows[0].driveStatus,expected);assert.equal(r.complete,complete);assert.equal(journalBytes(h),before);assert.equal(h.writes.length,0);
 assert.ok(h.calls.every(c=>c.method==='GET'));assert.ok(!JSON.stringify(r).includes('SYNTHETIC_SECRET_ERROR'));
});
test('active Save malformed Firebase document, malformed jobs and overall deadline remain fail-closed',async()=>{
 for(const mode of ['firebase','jobs','deadline']){
  const h=await activeHarness({inspectionPages:[{files:[]}]}),d=h.service.getDraft(h.user.uid);
  if(mode==='firebase')h.records.set(d.id,[]);
  if(mode==='jobs')editJournal(h,j=>j.jobs=[]);
  if(mode==='deadline')h.config.onInspection=()=>h.expire();
  const before=journalBytes(h);await assert.rejects(h.service.inspectActiveSave(activeArgs(h)));assert.equal(journalBytes(h),before);assert.equal(h.writes.length,0);
 }
});
for(const branch of ['owner','operation','revision','job','discarded','firebase-change','ui-closed'])test('active Save inspection rejects '+branch+' changes rather than displaying stale evidence',async()=>{
 const h=await activeHarness({inspectionPages:[{files:[]}]}),before=journalBytes(h);let current=true;
 h.config.onInspection=()=>{
  if(branch==='owner')h.window.firebaseDeps.auth.currentUser={uid:'other',email:h.user.email};
  else if(branch==='firebase-change')h.records.set(h.service.getDraft(h.user.uid).id,{lastOperation:'different'});
  else if(branch==='ui-closed')current=false;
  else editJournal(h,j=>{if(branch==='operation')j.draft.operationId='different';if(branch==='revision')j.draft.revision++;if(branch==='job')j.jobs.changed={id:'synthetic_other',state:'reserved'};if(branch==='discarded')j.discardedDrafts={[j.draft.operationId]:true};});
 };
 await assert.rejects(h.service.inspectActiveSave(activeArgs(h,undefined,()=>current)));assert.equal(h.writes.length,0);assert.ok(h.calls.every(c=>c.method==='GET'));
 if(['firebase-change','ui-closed','owner'].includes(branch))assert.equal(journalBytes(h),before);
});
test('active Save inspection fails immediately under Save lock, duplicate click, invalid context and unavailable session',async()=>{
 const lockMap=new Map(),h=await activeHarness({lockMap,inspectionPages:[{files:[]}]}),before=journalBytes(h);
 const namespace=[...h.storage.data.keys()].find(k=>k.startsWith('garancije-drive-integration-v1:'));lockMap.set(namespace,Promise.resolve());
 await assert.rejects(h.service.inspectActiveSave(activeArgs(h)),e=>e.code==='SAVE_INSPECTION_BUSY');assert.equal(h.calls.length,0);lockMap.delete(namespace);
 let release;h.config.onInspection=()=>new Promise(r=>release=r);
 const first=h.service.inspectActiveSave(activeArgs(h));while(!release)await new Promise(r=>setImmediate(r));
 await assert.rejects(h.service.inspectActiveSave(activeArgs(h)),e=>e.code==='SAVE_INSPECTION_BUSY');h.config.onInspection=null;release();await first;
 h.expire();const calls=h.calls.length,r=await h.service.inspectActiveSave(activeArgs(h));assert.equal(r.complete,false);assert.equal(r.rows[0].driveStatus,'unknown');assert.equal(h.calls.length,calls);assert.equal(journalBytes(h),before);
 editJournal(h,j=>j.draft.sealed=false);await assert.rejects(h.service.inspectActiveSave(activeArgs(h)));assert.equal(h.writes.length,0);
});
test('active Save inspection bounds stalled requests and sanitizes Firebase failures without journal writes',async()=>{
 const h=await activeHarness({inspectionPages:[{files:[]}]}),before=journalBytes(h);
 h.config.onInspection=()=>new Promise(()=>{});const keep=setTimeout(()=>{},250);
 try{const r=await h.service.inspectActiveSave(activeArgs(h));assert.equal(r.complete,false);assert.equal(r.rows[0].driveStatus,'unknown');}finally{clearTimeout(keep);}
 h.config.inspectionReadError=true;
 await assert.rejects(h.service.inspectActiveSave(activeArgs(h)),e=>e.code==='SAVE_INSPECTION_FAILED'&&!e.message.includes('SYNTHETIC_SECRET_ERROR'));
 assert.equal(journalBytes(h),before);assert.equal(h.writes.length,0);
});

test('Chromium two-tab version upgrade preserves literal sealed journal and old File; explicit metadata-only diagnostics',{skip:process.env.GP_DOM_TEST!=='1'},async()=>{
 const {createRequire}=await import('node:module'),req=createRequire(import.meta.url),pw=req(process.env.GP_PLAYWRIGHT_PATH),babel=req(process.env.GP_BABEL_PATH);
 const baseline=process.env.GP_UPGRADE_BASELINE?await readFile(process.env.GP_UPGRADE_BASELINE,'utf8'):await fetch('https://raw.githubusercontent.com/fmdesigndigital-studio/garancije/56b5c7a9ede85a9f6132b75c2ff201dafa0a9e31/index.html').then(r=>{assert.equal(r.status,200);return r.text();});
 assert.ok(baseline.includes("const RELEASE_VERSION = '2026.11.03.4'"));
 const oldStart=baseline.indexOf('// ATTACHMENT COUNT METADATA'),oldScript=baseline.slice(oldStart,baseline.indexOf('</script>',oldStart));
 const urls=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(x=>/react(?:-dom)?@/.test(x));
 const libs=await Promise.all(urls.map(async u=>{const r=await fetch(u);assert.equal(r.status,200);return r.text();}));
 const browser=await pw.chromium.launch({headless:true,...(process.env.GP_CHROMIUM_PATH?{executablePath:process.env.GP_CHROMIUM_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});let unexpected=0;
  await context.route('**/*',r=>r.request().url()==='http://localhost/'?r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}):(unexpected++,r.abort()));
  const old=await context.newPage();await old.goto('http://localhost/');await old.addScriptTag({content:oldScript});
  const email=/const EMAIL = '([^']+)'/.exec(script)[1],scope=/const SCOPE = '([^']+)'/.exec(script)[1];
  const setup=(newPage)=>`window.syntheticCalls=[];window.syntheticReads=[];window.syntheticWrites=0;window.hold=false;window.connectedSession=false;
   window.firebaseDeps={auth:{currentUser:{uid:'synthetic-owner',email:${JSON.stringify(email)}}}};
   window.syntheticService=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'upgrade-active-save',storage:localStorage,getUser:()=>window.firebaseDeps.auth.currentUser,
    authorize:async()=>{window.connectedSession=true;return {access_token:'synthetic-upgrade-only',expires_in:3600,scope:${JSON.stringify(scope)}}},
    metadataStore:{read:async id=>{window.syntheticReads.push(id);return null;},commit:async()=>{window.syntheticWrites++;throw Error('NO_WRITES');}},
    fetch:async(u,o={})=>{window.syntheticCalls.push({url:u,method:o.method||'GET'});if((o.method||'GET')!=='GET'||new URL(u).searchParams.has('alt'))throw Error('WRITE_OR_CONTENT_FORBIDDEN');
      if(new URL(u).pathname==='/drive/v3/about')return new Response(JSON.stringify({user:{emailAddress:${JSON.stringify(email)}}}));
      if(new URL(u).pathname!=='/drive/v3/files')throw Error('OTHER_RESOURCE_FORBIDDEN');
      if(window.hold)await new Promise(r=>window.release=r);return new Response(JSON.stringify({files:[]}));}});
   window.attachmentService=window.syntheticService;${newPage?'':'window.oldFile=new File(["SYNTHETIC_ORIGINAL"],"Original.jpg",{type:"image/jpeg"});window.oldFileIdentity=window.oldFile;'}
   window.syntheticKey=Object.keys(localStorage).find(k=>k.includes('upgrade-active-save'));`;
  await old.addScriptTag({content:setup(false)});
  const raw=await old.evaluate(async()=>{
   const s=window.syntheticService,u=window.firebaseDeps.auth.currentUser;await s.authChanged(u);await s.connect();
   const d=await s.stageDraft({userId:u.uid,base:null,metadata:{name:'Synthetic upgrade warranty'},attachments:[],pending:[{id:'remaining-B',name:'Remaining B.jpg',mime:'image/jpeg',size:18,sha256:'b'.repeat(64)}],operationId:'upgrade-same-operation',expectedRevision:s.contentRevision(null),seal:true});
   const key=Object.keys(localStorage).find(k=>k.includes('upgrade-active-save')),j=JSON.parse(localStorage.getItem(key));j.draft.saveState={version:1,phase:'external'};
   j.v2Trials={history:{phase:'halted',negativeStatus:500}};j.textTrials={history:{phase:'trashed'}};j.abandonedDrafts={audit:{closed:true,operationId:'prior'}};
   localStorage.setItem(key,JSON.stringify(j));window.syntheticKey=key;return localStorage.getItem(key);
  });
  const next=await context.newPage();await next.goto('http://localhost/');for(const content of libs)await next.addScriptTag({content});await next.addScriptTag({content:script});await next.addScriptTag({content:setup(true)});
  assert.equal(await next.evaluate(()=>localStorage.getItem(window.syntheticKey)),raw);assert.equal(await next.evaluate(()=>window.connectedSession),false);
  const component=html.slice(html.indexOf('        function attachmentDiagnosticContext('),html.indexOf('        function DraftForm('));
  await next.addScriptTag({content:babel.transform("const {useState,useEffect,useRef}=React;"+component+"window.root=ReactDOM.createRoot(document.getElementById('root'));window.root.render(<AttachmentDiagnostics user={window.firebaseDeps.auth.currentUser} draftStatus='saving'/>);",{presets:[['react',{runtime:'classic'}]]}).code});
  const section=next.getByRole('region',{name:'Dijagnostika priloga',exact:true});await section.getByRole('button',{name:'Otvori dijagnostiku priloga',exact:true}).click();
  const check=next.getByRole('button',{name:'Proveri započeto čuvanje - bez upisa',exact:true});await check.waitFor();assert.equal(await next.evaluate(()=>window.syntheticCalls.length),0);assert.equal(await next.evaluate(()=>window.syntheticReads.length),0);
  await check.click();await next.getByText('Provera nije potpuna. Ne ponavljajte Sačuvaj na osnovu ovog nalaza.',{exact:true}).waitFor();
  assert.equal(await next.evaluate(()=>window.syntheticCalls.length),0);assert.equal(await next.evaluate(()=>window.connectedSession),false);assert.equal(await next.evaluate(()=>localStorage.getItem(window.syntheticKey)),raw);
  // Synthetic explicit connect establishes a mock session only; production inspection never connects.
  await next.evaluate(async()=>{await window.syntheticService.authChanged(window.firebaseDeps.auth.currentUser);await window.syntheticService.connect();window.syntheticCalls=[];window.hold=true;});
  await check.click();await next.waitForFunction(()=>typeof window.release==='function');assert.equal(await check.isDisabled(),true);
  await next.evaluate(()=>{window.hold=false;window.release();});await next.getByText('Nije pronađen fajl dostupan ovoj aplikaciji',{exact:true}).waitFor();
  assert.equal(await next.evaluate(()=>window.syntheticCalls.length),1);assert.equal(await next.evaluate(()=>window.syntheticWrites),0);assert.equal(await next.evaluate(()=>localStorage.getItem(window.syntheticKey)),raw);
  for(const width of [320,390,430]){await next.setViewportSize({width,height:844});const box=await check.boundingBox();assert.ok(box.height>=48&&box.x>=0&&box.x+box.width<=width);}
  await next.evaluate(()=>{window.hold=true;window.release=null;});await check.click();await next.waitForFunction(()=>typeof window.release==='function');
  await section.getByRole('button',{name:'Zatvori dijagnostiku priloga',exact:true}).click();await next.evaluate(()=>{window.hold=false;window.release();});
  await section.getByRole('button',{name:'Otvori dijagnostiku priloga',exact:true}).click();assert.equal(await next.getByText('Nije pronađen fajl dostupan ovoj aplikaciji',{exact:true}).count(),0);
  assert.equal(await old.evaluate(()=>localStorage.getItem(window.syntheticKey)),raw);assert.equal(await old.evaluate(()=>window.oldFile===window.oldFileIdentity),true);assert.equal(await old.evaluate(()=>window.oldFile.text()),'SYNTHETIC_ORIGINAL');
  await next.reload();assert.equal(await next.evaluate(key=>localStorage.getItem(key),await old.evaluate(()=>window.syntheticKey)),raw);
  // Load the actual entire application entry point as well, not only the diagnostic component.
  const full=await context.newPage();
  const entry=html.slice(html.indexOf('        window.garancijeBoot.start(() => {'),html.lastIndexOf('</script>'));
  for(const state of ['none','reserved','uncertain','confirmed']){
   const expected=await old.evaluate(({raw,state})=>{const j=JSON.parse(raw);if(state!=='none')j.jobs['c'.repeat(64)]={id:'synthetic_upgrade_reserved',state};const value=JSON.stringify(j);localStorage.setItem(window.syntheticKey,value);return value;},{raw,state});
   await full.goto('http://localhost/');for(const content of libs)await full.addScriptTag({content});await full.addScriptTag({content:script});await full.addScriptTag({content:setup(true)});
   await full.addScriptTag({content:`window.lucide={createIcons(){}};window.garancijeBoot={start(fn){fn();},ready(){},fail(m){window.bootFailure=m;}};
    Object.assign(window.firebaseDeps,{db:{},appId:'synthetic-app',collection:()=>({}),onAuthStateChanged:(a,fn)=>{queueMicrotask(()=>fn(a.currentUser));return ()=>{};},onSnapshot:(q,fn)=>{queueMicrotask(()=>fn({docs:[]}));return ()=>{};}});`});
   await full.addScriptTag({content:babel.transform(entry,{presets:[['react',{runtime:'classic'}]]}).code});
   await full.locator('button.settings-button').click();await full.getByRole('button',{name:'Otvori dijagnostiku priloga',exact:true}).click();
   await full.getByRole('button',{name:'Proveri započeto čuvanje - bez upisa',exact:true}).waitFor();
   assert.equal(await full.evaluate(()=>localStorage.getItem(window.syntheticKey)),expected);assert.equal(await old.evaluate(()=>localStorage.getItem(window.syntheticKey)),expected);
   assert.equal(await full.evaluate(()=>window.syntheticCalls.length),0);assert.equal(await full.evaluate(()=>window.syntheticReads.length),0);assert.equal(await full.evaluate(()=>window.syntheticWrites),0);
   assert.equal(await full.locator('form.gp-form').count(),0);assert.equal(await full.evaluate(()=>window.bootFailure||null),null);
  }
  assert.equal(unexpected,0);
  console.log('DOM upgrade .4 to candidate: two pages/same origin, sealed operation and literal journal/audits unchanged, old synthetic File identity/content retained; no autosave, image read or OAuth by diagnostic; disconnected result, single GET, stale unmount hidden; 320/390/430 touch targets. Android memory eviction remains unproven.');
 }finally{await browser.close();}
});



// Temporary gallery byte copies. Every image here is synthetic; no user's files are opened.
const galleryCode=html.slice(html.indexOf('        const galleryImages = (() => {'),html.indexOf('        // All coordinates refer to the browser-oriented image;'));
function syntheticPng(marker=1){const b=new Uint8Array(34),v=new DataView(b.buffer);v.setUint32(0,0x89504e47);v.setUint32(4,0x0d0a1a0a);v.setUint32(8,13);v.setUint32(12,0x49484452);v.setUint32(16,2);v.setUint32(20,2);b[33]=marker;return b;}
class ExpiringGalleryFile extends File {
 constructor(bytes,name='Synthetic.png'){super([bytes],name,{type:'image/png'});this.unreadable=false;this.reads=0;this.changed=null;this.afterRead=null;}
 async arrayBuffer(){this.reads++;if(this.unreadable)throw new DOMException('Synthetic provider permission lost','NotReadableError');const b=this.changed?this.changed.slice().buffer:await super.arrayBuffer();this.afterRead?.();return b;}
}
function loadGallery(h){
 const urls=new Map(),revoked=[];let next=0;
 class SyntheticURL extends URL{static createObjectURL(blob){assert.ok(blob instanceof Blob);const id='blob:synthetic-gallery-'+(++next);urls.set(id,blob);return id;}static revokeObjectURL(id){revoked.push(id);urls.delete(id);}}
 class SyntheticImage{constructor(){this.naturalWidth=2;this.naturalHeight=2;}set src(value){if(value)queueMicrotask(()=>this.onload?.());}}
 const document={createElement(name){assert.equal(name,'canvas');return {width:0,height:0,getContext(){return {fillRect(){},drawImage(){}};},toBlob(done){done(new Blob(['SYNTHETIC_THUMBNAIL'],{type:'image/jpeg'}));}};}};
 Object.assign(h.context,{ArrayBuffer,DataView,URL:SyntheticURL,Image:SyntheticImage,document,queueMicrotask,attachmentNames:h.window.attachmentNames});
 vm.runInContext(galleryCode+'\nwindow.syntheticGallery=galleryImages;',h.context);
 return {gallery:h.window.syntheticGallery,urls,revoked};
}
test('gallery regression reproduces native File loss in real first save before any ID reservation',async()=>{
 const h=await harness({records:new Map(),uploads:true}),{gallery}=loadGallery(h),file=new ExpiringGalleryFile(syntheticPng());
 const row=(await gallery.plan([file],[]))[0],prepared=await gallery.read(row.file,{sha256:row.sha256});
 // Version .5 retained this exact native provider object as attachment.original.
 const oldAttachment={...prepared,original:file};const d=await newDraft(h,[oldAttachment]);file.unreadable=true;
 await assert.rejects(h.service.saveWarranty(saveArgs(h,d,[oldAttachment])),e=>e.name==='NotReadableError');
 assert.equal(h.calls.filter(c=>/generateIds|upload/.test(c.url)).length,0);assert.equal(h.writes.length,0);assert.equal(h.remote.size,0);
 assert.equal(Object.keys(JSON.parse(journalBytes(h)).jobs).length,0);assert.equal(h.service.getDraft(h.user.uid).saveState.phase,'external');
});
test('gallery independent original preserves every byte/hash/MIME after provider File becomes unreadable and saves once',async()=>{
 const h=await harness({records:new Map(),uploads:true}),{gallery}=loadGallery(h),bytes=syntheticPng(2),file=new ExpiringGalleryFile(bytes);
 const row=(await gallery.plan([file],[]))[0],a=await gallery.read(row.file,{sha256:row.sha256});
 assert.notEqual(a.original,file);assert.ok(a.original instanceof Blob);assert.equal(a.original.type,file.type);assert.equal(a.original.size,file.size);assert.equal(a.name,file.name);
 const reads=file.reads;file.unreadable=true;await assert.rejects(file.arrayBuffer(),e=>e.name==='NotReadableError');
 assert.deepEqual(new Uint8Array(await a.original.arrayBuffer()),bytes);assert.equal(await h.service.sha256(a.original),row.sha256);
 const d=await newDraft(h,[a]);await h.service.saveWarranty(saveArgs(h,d,[a]));
 assert.equal(file.reads,reads+1);assert.equal(h.calls.filter(c=>c.method==='PUT').length,1);assert.equal(h.writes.length,1);assert.equal(h.remote.size,1);
 const saved=h.records.get(d.id);assert.equal(saved.attachments[0].sha256,row.sha256);assert.equal(saved.attachmentCount,1);assert.deepEqual(saved.attachmentNames,[a.name]);
 assert.equal(h.service.getDraft(h.user.uid),null);assert.ok(!journalBytes(h).includes('SYNTHETIC_THUMBNAIL'));
});
test('gallery selects two copies, removes first with real service, and first save uploads only retained second bytes',async()=>{
 const h=await harness({records:new Map(),uploads:true}),{gallery}=loadGallery(h),files=[new ExpiringGalleryFile(syntheticPng(3),'A.png'),new ExpiringGalleryFile(syntheticPng(4),'B.png')];
 const rows=await gallery.plan(files,[]),prepared=[];for(const row of rows)prepared.push(await gallery.read(row.file,{sha256:row.sha256}));
 let d=await h.service.stageDraft({userId:h.user.uid,base:null,metadata:{name:'Synthetic two gallery images',purchaseDate:'2026-11-03',baseMonths:12},attachments:[],pending:prepared,operationId:'gallery-two-operation',expectedRevision:h.service.contentRevision(null)});
 const removed=await h.service.removePendingAttachment({userId:h.user.uid,operationId:d.operationId,attachmentId:prepared[0].id,expectedRevision:d.revision,expectedPending:h.service.pendingFingerprint(d.pending),expectedMetadata:d.metadata,expectedAttachments:d.attachments,isCurrent:()=>true});
 assert.equal(removed.draft.pending.length,1);assert.equal(removed.draft.pending[0].id,prepared[1].id);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
 gallery.release(prepared[0]);files.forEach(f=>f.unreadable=true);
 const b={...prepared[1],...removed.draft.pending[0]};d=await h.service.stageDraft({userId:h.user.uid,base:null,metadata:removed.draft.metadata,attachments:[],pending:[b],operationId:d.operationId,expectedRevision:removed.draft.revision,seal:true});
 const bytesBefore=journalBytes(h);assert.ok(!/original|dataUrl|thumbnailUrl|SYNTHETIC_THUMBNAIL/.test(bytesBefore));
 await h.service.saveWarranty(saveArgs(h,d,[b]));assert.equal(h.calls.filter(c=>c.method==='PUT').length,1);assert.equal(h.writes.length,1);assert.equal(h.remote.size,1);
 const saved=h.records.get(d.id);assert.equal(saved.name,'Synthetic two gallery images');assert.equal(saved.attachments[0].id,b.id);assert.equal(saved.attachments[0].sha256,rows[1].sha256);assert.equal(saved.attachmentCount,1);assert.deepEqual(saved.attachmentNames,[b.name]);
 assert.ok(![...h.remote.values()].some(f=>f.appProperties.sha256===rows[0].sha256));
});
for(const mode of ['unreadable','hash-changed','size-changed','cancelled'])test('gallery byte copy rejects '+mode+' before acceptance or writes',async()=>{
 const h=await harness({records:new Map(),uploads:true}),{gallery,urls}=loadGallery(h),file=new ExpiringGalleryFile(syntheticPng(5)),controller=new AbortController();
 const row=(await gallery.plan([file],[]))[0];
 if(mode==='unreadable')file.unreadable=true;
 if(mode==='hash-changed')file.changed=syntheticPng(6);
 if(mode==='size-changed')file.changed=new Uint8Array(1);
 if(mode==='cancelled')file.afterRead=()=>controller.abort();
 await assert.rejects(gallery.read(file,{sha256:row.sha256,signal:controller.signal}));assert.equal(urls.size,0);assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);assert.equal(h.service.getDraft(h.user.uid),null);
});
test('gallery byte copy owns source buffer; subsequent source buffer mutation cannot change attachment',async()=>{
 const h=await harness({records:new Map()}),{gallery}=loadGallery(h),bytes=syntheticPng(7),file=new ExpiringGalleryFile(bytes);
 const row=(await gallery.plan([file],[]))[0],buffer=bytes.slice().buffer;file.arrayBuffer=async()=>buffer;
 const a=await gallery.read(file,{sha256:row.sha256});new Uint8Array(buffer).fill(0);
 assert.deepEqual(new Uint8Array(await a.original.arrayBuffer()),bytes);assert.equal(await h.service.sha256(a.original),row.sha256);
});
test('gallery copy preserves selection/file/batch/count/total limits and duplicate semantics',async()=>{
 const h=await harness({records:new Map()}),{gallery}=loadGallery(h),small=()=>new ExpiringGalleryFile(syntheticPng());
 const six=Array.from({length:6},small);await assert.rejects(gallery.plan(six,[]),/5 slika/);assert.ok(six.every(f=>f.reads===0));
 const large=new ExpiringGalleryFile(new Uint8Array(gallery.limits.file+1));await assert.rejects(gallery.plan([large],[]),/10 MiB/);assert.equal(large.reads,0);
 await assert.rejects(gallery.read(large,{sha256:'a'.repeat(64)}),/10 MiB/);assert.equal(large.reads,0);
 const batch=Array.from({length:4},(_,i)=>{const b=new Uint8Array(8*1024*1024);b[0]=i;return new ExpiringGalleryFile(b);});await assert.rejects(gallery.plan(batch,[]),/30 MiB/);
 const pending=Array.from({length:10},(_,i)=>({id:'old-'+i,sha256:'a'.repeat(64),mime:'image/png',size:1}));await assert.rejects(gallery.plan([small()],pending),/10 novih/);
 await assert.rejects(gallery.plan([small()],[{id:'old',sha256:'a'.repeat(64),mime:'image/png',size:gallery.limits.total}]),/50 MiB/);
 const f=small();assert.equal((await gallery.plan([f,new ExpiringGalleryFile(syntheticPng(),'Same bytes.png')],[])).length,1);
 assert.equal(h.calls.length,0);assert.equal(h.writes.length,0);
});
test('gallery exact known oversized legacy reselect keeps existing exception and same identity',async()=>{
 const h=await harness({records:new Map()}),{gallery}=loadGallery(h),file=new ExpiringGalleryFile(new Uint8Array(gallery.limits.file+1),'Legacy.png'),sha256=await h.service.sha256(file);
 const saved={id:'old-id',name:'Retained legacy name.png',sha256,mime:file.type,size:file.size};const rows=await gallery.plan([file],[saved]);assert.equal(rows[0].matches.length,1);
 const a=await gallery.read(file,{sha256,reselect:true}),reattached=h.window.attachmentNames.reselect(saved,a);file.unreadable=true;
 assert.equal(reattached.id,saved.id);assert.equal(reattached.name,saved.name);assert.equal(await h.service.sha256(reattached.original),sha256);assert.notEqual(reattached.original,file);
});
test('gallery byte copy remains memory-only; reloaded journal still requires exact original',async()=>{
 const h=await harness({records:new Map(),uploads:true}),{gallery}=loadGallery(h),file=new ExpiringGalleryFile(syntheticPng(8)),row=(await gallery.plan([file],[]))[0],a=await gallery.read(file,{sha256:row.sha256}),d=await newDraft(h,[a]);
 const before=journalBytes(h),reloaded=await harness({storage:h.storage,records:h.records,remote:h.remote,uploads:true});assert.equal(journalBytes(h),before);assert.equal(reloaded.service.getDraft(h.user.uid).pending[0].original,undefined);
 await assert.rejects(reloaded.service.saveWarranty(saveArgs(reloaded,d)),/Ponovo izaberite original/);assert.equal(reloaded.writes.length,0);assert.equal(reloaded.remote.size,0);
});

test('Chromium gallery decoder uses verified independent bytes after native File access is revoked',{skip:process.env.GP_DOM_TEST!=='1'},async()=>{
 const {createRequire}=await import('node:module'),pw=createRequire(import.meta.url)(process.env.GP_PLAYWRIGHT_PATH),browser=await pw.chromium.launch({headless:true,...(process.env.GP_CHROMIUM_PATH?{executablePath:process.env.GP_CHROMIUM_PATH}:{})});
 try{
  const page=await browser.newPage();let requests=0;await page.route('**/*',r=>r.request().url()==='http://localhost/'?r.fulfill({contentType:'text/html',body:'<div></div>'}):(requests++,r.abort()));await page.goto('http://localhost/');await page.addScriptTag({content:script});
  await page.addScriptTag({content:'const attachmentNames=window.attachmentNames;\n'+galleryCode+'\nwindow.syntheticGallery=galleryImages;'});
  const result=await page.evaluate(async()=>{
   const gallery=window.syntheticGallery,files=[],originals=[],failures=[];
   for(let i=0;i<2;i++){
    const canvas=document.createElement('canvas');canvas.width=3;canvas.height=2;const ctx=canvas.getContext('2d');ctx.fillStyle=i?'#456789':'#abc123';ctx.fillRect(0,0,3,2);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/png')),file=new File([blob],'Synthetic-'+i+'.png',{type:'image/png'}),native=file.arrayBuffer.bind(file);let unavailable=false;
    Object.defineProperty(file,'arrayBuffer',{value:()=>unavailable?Promise.reject(new DOMException('Synthetic access lost','NotReadableError')):native()});
    files.push(file);originals.push(new Uint8Array(await native()));failures.push(()=>unavailable=true);
   }
   const rows=await gallery.plan(files,[]),a=[];for(const row of rows)a.push(await gallery.read(row.file,{sha256:row.sha256}));failures.forEach(f=>f());
   const checks=[];for(let i=0;i<a.length;i++){
    let rejected=false;try{await files[i].arrayBuffer();}catch(e){rejected=e.name==='NotReadableError';}
    const bytes=new Uint8Array(await a[i].original.arrayBuffer()),image=new Image();image.src=a[i].dataUrl;await image.decode();
    checks.push({rejected,independent:a[i].original!==files[i],hashMatches:await window.attachmentService.sha256(a[i].original)===rows[i].sha256,sameBytes:bytes.length===originals[i].length&&bytes.every((v,n)=>v===originals[i][n]),mime:a[i].original.type,width:image.naturalWidth,height:image.naturalHeight,thumbnail:!!a[i].thumbnailUrl});
    gallery.release(a[i]);image.src='';
   }return checks;
  });
  assert.deepEqual(result,Array.from({length:2},()=>({rejected:true,independent:true,hashMatches:true,sameBytes:true,mime:'image/png',width:3,height:2,thumbnail:true})));assert.equal(requests,0);
  console.log('DOM gallery: actual PNG decode/thumbnail/object URLs, two native Files revoked after prepare, same bytes/hash/MIME retained independently, no network. No Android-provider or reload persistence claim.');
 }finally{await browser.close();}
});

test('Chromium header help preserves live draft/view; paired settings and real tab presence; X/Escape/Back and 200% layout',{skip:process.env.GP_DOM_TEST!=='1'},async()=>{
 const {createRequire}=await import('node:module'),req=createRequire(import.meta.url),pw=req(process.env.GP_PLAYWRIGHT_PATH),babel=req(process.env.GP_BABEL_PATH);
 const navStart=html.indexOf('        const appNavigation ='),hookStart=html.indexOf('        function useBackLayer('),navEnd=html.indexOf('\n        }',hookStart)+10;
 const navigation=html.slice(navStart,navEnd),components=html.slice(html.indexOf('        function HelpDialog('),html.indexOf('        function Catalog('));
 const presenceCode=html.slice(html.indexOf('        function TabPresence('),html.indexOf('        function AttachmentCountRepair('));
 const iconCode=html.slice(html.indexOf('        const Icon ='),html.indexOf('        // Navigation entries'));
 const headerStart=html.indexOf('                <header ref={headerRef}'),headerMarkup=html.slice(headerStart,html.indexOf('</header>',headerStart)+9);
 assert.ok(navStart>0&&hookStart>navStart&&components.includes('function AppFooter'));
 const entry=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];babel.transform(entry,{presets:[['react',{runtime:'classic'}]]});
 const libs=await Promise.all([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]).filter(u=>/react(?:-dom)?@|lucide@/.test(u)).map(async u=>{const r=await fetch(u);assert.equal(r.status,200);return r.text();}));
 const browser=await pw.chromium.launch({headless:true,...(process.env.GP_CHROMIUM_PATH?{executablePath:process.env.GP_CHROMIUM_PATH}:{})});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));let requests=0;
  await page.route('**/*',r=>r.request().url()==='http://localhost/'?r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body class="gp-ui"><div id="root"></div></body></html>'}):(requests++,r.abort()));
  await page.goto('http://localhost/');await page.addStyleTag({content:html.match(/<style>([\s\S]*?)<\/style>/)[1]});for(const content of libs)await page.addScriptTag({content});await page.addScriptTag({content:script});
  const email=/const EMAIL = '([^']+)'/.exec(script)[1];
  const setup=`const {useState,useEffect,useRef}=React;const RELEASE_VERSION=${JSON.stringify(/const RELEASE_VERSION = '([^']+)'/.exec(html)[1])};
   ${iconCode}\n${navigation}\n${components}\n${presenceCode}
   window.helpRouteRestores=0;window.helpGuardCalls=0;window.helpRemoteWrites=0;window.helpReady=false;window.helpError='';
   window.firebaseDeps={auth:{currentUser:{uid:'synthetic-help-owner',email:${JSON.stringify(email)}}}};
   window.helpRoot=ReactDOM.createRoot(document.getElementById('root'));
   function HelpFixture({view,service}){
    const headerRef=useRef(null),[name,setName]=useState('Synthetic help '+view),[pending]=useState(()=>[{id:'help-image',name:'Synthetic.png',mime:'image/png',size:14,sha256:'c'.repeat(64),original:new Blob(['SYNTHETIC_HELP'],{type:'image/png'})}]);
    useEffect(()=>{let active=true;window.helpReady=false;service.stageDraft({userId:'synthetic-help-owner',id:null,base:null,metadata:{name,purchaseDate:'2026-11-03',baseMonths:12},attachments:[],pending,operationId:'help-op-'+view,expectedRevision:()=>service.contentRevision(service.getDraft('synthetic-help-owner')),isCurrent:()=>active}).then(()=>{if(active)window.helpReady=true;},e=>{if(active)window.helpError=e.message;});return()=>{active=false;};},[name]);
    window.helpPending=pending;const formBusy=false,navigate=()=>{throw Error('Unexpected header navigation');};
    return <div className={'gp-app'+(view==='list'?' home-active':'')}>${headerMarkup}<main className="gp-container" style={{minHeight:'1400px',paddingTop:'24px'}}><p className="section-label">IZOLOVANA PROBA</p><h1>{view}</h1><label>Naziv probnog proizvoda<input value={name} onChange={e=>setName(e.target.value)}/></label><p>Sintetički unos. Nema produkcionih upisa.</p></main><AppFooter/></div>;
   }
   window.mountHelpFixture=async view=>{
    window.helpRoot.render(null);await new Promise(r=>setTimeout(r,0));window.helpReady=false;window.helpError='';
    const user=window.firebaseDeps.auth.currentUser,service=window.createGarancijeDrive({simulated:true,allowWrites:true,namespace:'gp-help-test-'+view,storage:localStorage,getUser:()=>user,metadataStore:{read:async()=>null,list:async()=>[],commit:async()=>{window.helpRemoteWrites++;throw Error('WRITE_FORBIDDEN');}},fetch:async()=>{window.helpRemoteWrites++;throw Error('NETWORK_FORBIDDEN');}});
    window.helpService=service;await service.authChanged(user);appNavigation.start(()=>window.helpRouteRestores++,()=>{});appNavigation.record({view,operationId:'help-op-'+view});appNavigation.guard({allow:()=>{window.helpGuardCalls++;return false;},warn:()=>true});window.helpRoot.render(<HelpFixture key={view} view={view} service={service}/>);
   };
   window.captureHelpState=()=>{window.helpSavedNode=document.querySelector('input');window.helpSavedBlob=window.helpPending[0].original;return {journal:JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))),draft:JSON.stringify(window.helpService.getDraft('synthetic-help-owner')),value:window.helpSavedNode.value};};
   window.readHelpState=()=>({journal:JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))),draft:JSON.stringify(window.helpService.getDraft('synthetic-help-owner')),value:document.querySelector('input').value,sameNode:document.querySelector('input')===window.helpSavedNode,sameBlob:window.helpPending[0].original===window.helpSavedBlob});`;
  await page.addScriptTag({content:babel.transform(setup,{presets:[['react',{runtime:'classic'}]]}).code});
  const trigger=page.getByRole('button',{name:'Uputstvo',exact:true}),modal=page.getByRole('dialog',{name:'Uputstvo za korištenje'}),close=page.getByRole('button',{name:'Zatvori uputstvo i vrati se na vrh'});
  for(const [i,view]of ['add','edit','detail','settings','list'].entries()){
   await page.evaluate(v=>window.mountHelpFixture(v),view);await page.waitForFunction(()=>window.helpReady||window.helpError);assert.equal(await page.evaluate(()=>window.helpError),'');
   await page.getByRole('textbox').fill('Retained '+view+' ćčš');await page.waitForFunction(()=>window.helpReady&&window.helpService.getDraft('synthetic-help-owner').metadata.name.startsWith('Retained'));
   const before=await page.evaluate(()=>window.captureHelpState());
   for(const method of ['x','escape','back']){
    await trigger.click();await modal.waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.activeElement.id),'help-title');assert.equal(await modal.locator('ol>li').count(),7);assert.equal(await modal.locator('.help-content').evaluate(e=>getComputedStyle(e).textAlign),'left');assert.equal(await modal.locator('.help-content').evaluate(e=>getComputedStyle(e).fontSize),'16px');
    assert.equal(await page.getByRole('textbox').evaluate(e=>{e.focus();return document.activeElement===e;}),false);
    if(method==='x'){await close.click();await close.click({timeout:200}).catch(()=>{});}else if(method==='escape')await page.keyboard.press('Escape');else await page.goBack();
    await modal.waitFor({state:'detached'});await page.waitForFunction(()=>document.activeElement?.classList.contains('app-header')&&window.scrollY===0);
    const after=await page.evaluate(()=>window.readHelpState());assert.deepEqual(after,{...before,sameNode:true,sameBlob:true});assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
   }
  }
  assert.deepEqual(await page.evaluate(()=>({routes:window.helpRouteRestores,guards:window.helpGuardCalls,writes:window.helpRemoteWrites})),{routes:0,guards:0,writes:0});
  if(process.env.GP_HELP_ARTIFACT_DIR){const {mkdir}=await import('node:fs/promises');await mkdir(process.env.GP_HELP_ARTIFACT_DIR,{recursive:true});}
  for(const presence of [false,true]){
   let peer;
   if(presence){
    peer=await page.context().newPage();await peer.route('**/*',r=>r.request().url()==='http://localhost/'?r.fulfill({contentType:'text/html',body:'<!doctype html><title>Synthetic tab presence peer</title>'}):r.abort());await peer.goto('http://localhost/');
    await peer.evaluate(()=>{window.syntheticPeer=new BroadcastChannel('garancijepro-tab-presence-v1');window.syntheticPeer.onmessage=({data})=>{if(data?.v===1&&data.type==='challenge')window.syntheticPeer.postMessage({v:1,type:'ack',sender:crypto.randomUUID(),to:data.sender,nonce:data.nonce});};});
    await page.bringToFront();await page.evaluate(()=>window.mountHelpFixture('list'));await page.waitForFunction(()=>window.helpReady||window.helpError);assert.equal(await page.evaluate(()=>window.helpError),'');await page.getByRole('button',{name:'Druga kartica',exact:true}).waitFor({state:'visible'});
   }
   for(const width of [320,360,390,430,1280])for(const scale of [1,2]){
    await page.setViewportSize({width,height:844});await page.addStyleTag({content:'html{font-size:'+16*scale+'px}body.gp-ui{font-size:'+16*scale+'px}body.gp-ui .help-content h3,body.gp-ui .help-content{font-size:'+16*scale+'px}body.gp-ui .help-toolbar h2{font-size:'+20.8*scale+'px}'});
    assert.equal(await page.getByRole('button',{name:'Druga kartica',exact:true}).isVisible(),presence);
    assert.equal(await page.locator('footer .help-trigger').count(),0);assert.equal(await page.locator('header .help-trigger').count(),1);
    const header=await page.locator('header.app-header').evaluate(el=>{const pair=el.querySelector('.header-actions'),help=pair.querySelector('.help-trigger'),settings=pair.querySelector('.settings-button'),a=help.getBoundingClientRect(),b=settings.getBoundingClientRect();return {noOverflow:document.documentElement.scrollWidth<=innerWidth,paired:help.nextElementSibling===settings&&Math.abs(a.top-b.top)<1&&Math.abs(a.bottom-b.bottom)<1,inside:a.left>=0&&b.right<=innerWidth,minTarget:Math.min(a.width,a.height,b.width,b.height)>=44,weight:getComputedStyle(help).fontWeight};});
    assert.deepEqual(header,{noOverflow:true,paired:true,inside:true,minTarget:true,weight:'650'},JSON.stringify({width,scale,presence}));
    if(process.env.GP_HELP_ARTIFACT_DIR&&(width===320||width===390||width===1280))await page.screenshot({path:process.env.GP_HELP_ARTIFACT_DIR+'/header-'+width+'-'+(presence?'with-tab':'no-tab')+(scale===2?'-200':'')+'.png'});
    const before=await page.evaluate(()=>window.captureHelpState());await trigger.click();await modal.waitFor({state:'visible'});
    const layout=await modal.evaluate(el=>{const r=el.getBoundingClientRect(),c=el.querySelector('.help-content'),x=el.querySelector('button').getBoundingClientRect();return {within:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,noHorizontal:el.scrollWidth<=el.clientWidth+1&&c.scrollWidth<=c.clientWidth+1,scrolls:c.scrollHeight>c.clientHeight,closeSize:x.width>=44&&x.height>=44,closeVisible:x.top>=r.top&&x.bottom<=r.bottom,bold:[...el.querySelectorAll('h3')].every(h=>Number(getComputedStyle(h).fontWeight)===800)};});
    assert.deepEqual(layout,{within:true,noHorizontal:true,scrolls:true,closeSize:true,closeVisible:true,bold:true},JSON.stringify({width,scale,presence}));
    await close.focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'help-content');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Zatvori uputstvo i vrati se na vrh');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'help-content');
    if(process.env.GP_HELP_ARTIFACT_DIR&&(width===390||width===1280))await page.screenshot({path:process.env.GP_HELP_ARTIFACT_DIR+'/guide-'+width+'-'+(presence?'with-tab':'no-tab')+(scale===2?'-200':'')+'.png'});
    await modal.locator('.help-content').evaluate(e=>e.scrollTop=e.scrollHeight);assert.equal(await close.isVisible(),true);await close.click();await modal.waitFor({state:'detached'});await page.waitForFunction(()=>document.activeElement?.classList.contains('app-header')&&window.scrollY===0);
    assert.deepEqual(await page.evaluate(()=>window.readHelpState()),{...before,sameNode:true,sameBlob:true});
   }
   if(peer){await peer.evaluate(()=>window.syntheticPeer.close());await peer.close();}
  }
  assert.equal(requests,0);assert.deepEqual(errors,[]);console.log('HEADER HELP: X/Escape/history Back in five views; unchanged live journal/draft/input/Blob; header focus/top; paired Uputstvo/settings and actual TabPresence with a synthetic BroadcastChannel peer; 20 layouts at 320/360/390/430/1280 and 100/200% text; 800-weight subtitles; no remote writes or browser network. Physical Android Back remains untested.');
 }finally{await browser.close();}
});
