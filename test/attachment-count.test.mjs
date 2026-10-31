import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const shared=html.slice(html.indexOf('// ATTACHMENT COUNT METADATA'),html.indexOf('// INTEGRATION METADATA ADAPTER'));
const adapter=html.slice(html.indexOf('window.driveEnvironment='),html.indexOf('// Drive connection:'));
const canonical=v=>JSON.stringify(v,function(k,x){return x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(key=>[key,x[key]])):x;});
const refs=n=>Array.from({length:n},(_,i)=>({id:'synthetic-'+i,name:'Synthetic attachment '+i}));
function harness(current={},options={}){
 const window={garancijeFingerprint:canonical},writes=[],attempts=[];
 const context=vm.createContext({window,Date:options.Date??Date,console:{log(){}}});
 vm.runInContext(shared,context);
 window.firebaseDeps={db:{},appId:'synthetic-project',auth:{currentUser:{uid:'synthetic-owner'}},
  doc(...parts){return parts.slice(1).join('/');},
  async runTransaction(db,fn,settings){
   attempts.push(settings);if(options.transactionError)throw Error('SYNTHETIC_UNCERTAIN');
   const tx={async get(){options.onGet?.(window);return {exists:()=>current!==null,data:()=>current};},
    update(ref,patch){writes.push({ref,patch:structuredClone(patch),mode:'update'});},
    set(ref,patch,config){writes.push({ref,patch:structuredClone(patch),config,mode:'set'});}};
   const result=await fn(tx);options.afterTransaction?.(window);return result;
  }};
 vm.runInContext(adapter,context);
 return {window,writes,attempts,count:window.garancijeAttachmentCounts,store:window.driveEnvironment.metadataStore};
}
for(const n of [0,3,5])test('count '+n+' saved references',()=>{const h=harness();assert.equal(h.count.known({attachments:refs(n)}),n);});
test('legacy and mixed references use only recognized presence and retain duplicates',()=>{
 const {count}=harness();
 assert.equal(count.known({attachments:refs(3),receiptImage:'data:image/png;base64,SYNTHETIC',warrantyImage:'https://synthetic.invalid/image'}),5);
 assert.equal(count.known({receiptImage:'https://synthetic.invalid/image'}),1);
 assert.equal(count.known({attachments:[...refs(1),...refs(1)]}),2);
 assert.equal(count.known({attachments:refs(1),pending:refs(5)}),1);
});
for(const attachments of [undefined,null,[]])test('missing/null/empty attachments are known zero without legacy '+String(attachments),()=>{
 assert.equal(harness().count.known({attachments}),0);
});
for(const record of [{attachments:{}},{attachments:[null]},{attachments:[{id:1,name:'bad'}]},{receiptImage:17},{warrantyImage:'unsupported'}])
 test('unsupported record is unknown and is not silently backfilled '+JSON.stringify(record),async()=>{
  const h=harness(record);assert.equal(h.count.known(record),null);
  const report=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',...record}],isCurrent:()=>true});
  assert.equal(report.skipped,1);assert.equal(h.writes.length,0);
 });
test('display counter preserves former permissive catalog semantics',()=>{
 const {count}=harness();const record={attachments:[null,...refs(2),{id:2,name:'bad'}],receiptImage:'bad',warrantyImage:'https://synthetic.invalid'};
 assert.equal(count.display(record),3);assert.equal(count.known(record),null);
});
test('save atomically merges only edited metadata, references and computed count; legacy is preserved',async()=>{
 const current={name:'Old',receiptImage:'https://synthetic.invalid/image',other:'preserve'},h=harness(current);
 await h.store.commit({id:'one',userId:'synthetic-owner',operationId:'save-one',expected:canonical(current),metadata:{name:'New'},attachments:refs(2),isCurrent:()=>true});
 assert.equal(h.writes.length,1);const write=h.writes[0];assert.equal(write.mode,'set');assert.equal(write.config.merge,true);
 assert.equal(write.patch.attachmentCount,3);assert.equal(write.patch.attachments.length,2);
 assert.equal(Object.hasOwn(write.patch,'receiptImage'),false);assert.equal(Object.hasOwn(write.patch,'other'),false);
});
test('new save and removing saved references compute count from final list, without pending values',async()=>{
 for(const current of [null,{attachments:refs(5)}]){
  const h=harness(current);await h.store.commit({id:'one',userId:'synthetic-owner',operationId:'new',expected:canonical(current),metadata:{name:'Product',pending:refs(9)},attachments:[],isCurrent:()=>true});
  assert.equal(h.writes[0].patch.attachmentCount,0);assert.equal(Object.hasOwn(h.writes[0].patch,'pending'),false);
 }
});
test('save preserves old conflict, idempotency and deletion protections',async()=>{
 for(const current of [{name:'concurrent'},{_attachmentDeletion:{operationId:'delete'}}]){
  const h=harness(current);await assert.rejects(h.store.commit({id:'one',userId:'synthetic-owner',operationId:'save',expected:canonical({}),metadata:{},attachments:[],isCurrent:()=>true}));assert.equal(h.writes.length,0);
 }
 const h=harness({lastOperation:'same'});await h.store.commit({id:'one',userId:'synthetic-owner',operationId:'same',metadata:{},attachments:[],isCurrent:()=>true});assert.equal(h.writes.length,0);
});
const plain=v=>JSON.parse(JSON.stringify(v));
test('names preserve modern order, duplicates and legacy unknown slots',()=>{
 const {count}=harness();
 const record={attachments:[{id:'b',name:'Drugi.jpg'},{id:'a',name:'Isti.png'},{id:'c',name:'Isti.png'}],
  receiptImage:'https://synthetic.invalid/image',warrantyImage:'data:image/png;base64,SYNTHETIC'};
 assert.deepEqual(plain(count.names(record)),[null,null,'Drugi.jpg','Isti.png','Isti.png']);
 assert.equal(count.names(record).length,count.known(record));
 assert.deepEqual(plain(count.names({attachments:[],pending:refs(5)})),[]);
});
for(const value of ['', '   ','x\ny','x\u200by','https://synthetic.invalid/file','data:image/png;base64,SYNTHETIC','folder/file.jpg','x'.repeat(257)])
 test('invalid or oversized stored name is an unknown slot, never rewritten '+JSON.stringify(value),()=>{
  const {count}=harness();const record={attachments:[{id:'one',name:value}]};
  assert.deepEqual(plain(count.names(record)),[null]);assert.equal(record.attachments[0].name,value);
 });
test('Unicode limits count code points and never truncate original names',()=>{
 const {count}=harness();for(const value of ['Ž'.repeat(256),'😀'.repeat(256),' name with spaces.jpg '])
  assert.deepEqual(plain(count.names({attachments:[{id:'one',name:value}]})),[value]);
 assert.deepEqual(plain(count.names({attachments:[{id:'one',name:'😀'.repeat(257)}]})),[null]);
 assert.equal(count.names({attachments:refs(201)}),null);
 assert.equal(count.names({attachments:refs(200)}).length,200);
});
test('normal save writes count and names in the same merge and preserves references/legacy',async()=>{
 const current={attachments:refs(5),receiptImage:'https://synthetic.invalid/image',unknown:'preserve'},h=harness(current);
 const attachments=[{id:'second',name:'Renamed stored reference.jpg'},{id:'first',name:'Another.png'}];
 await h.store.commit({id:'one',userId:'synthetic-owner',operationId:'new',expected:canonical(current),metadata:{},attachments,isCurrent:()=>true});
 const patch=h.writes[0].patch;assert.equal(patch.attachmentCount,3);
 assert.deepEqual(patch.attachmentNames,[null,'Renamed stored reference.jpg','Another.png']);
 assert.deepEqual(patch.attachments,attachments);assert.equal(Object.hasOwn(patch,'receiptImage'),false);
});
test('saving final empty list removes stale names and ignores local pending names',async()=>{
 const current={attachments:refs(3),attachmentCount:3,attachmentNames:['old','old','old']},h=harness(current);
 await h.store.commit({id:'one',userId:'synthetic-owner',operationId:'new',expected:canonical(current),metadata:{pending:refs(8)},attachments:[],isCurrent:()=>true});
 assert.equal(h.writes[0].patch.attachmentCount,0);assert.deepEqual(h.writes[0].patch.attachmentNames,[]);
});
test('names backfill updates ONLY attachmentNames with a single transaction attempt',async()=>{
 const current={name:'Product',attachments:refs(5),attachmentCount:5,receiptImage:null,other:{retain:true}},h=harness(current);
 const before=canonical(current),report=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',...current}],isCurrent:()=>true});
 assert.equal(report.updated,1);assert.deepEqual(h.writes[0].patch,{attachmentNames:refs(5).map(x=>x.name)});
 assert.equal(h.writes[0].mode,'update');assert.equal(h.attempts[0].maxAttempts,1);assert.equal(canonical(current),before);
});
test('already-correct count does not skip absent/stale names and correct names are idempotent',async()=>{
 for(const attachmentNames of [undefined,null,['stale'],{bad:true}]){
  const current={attachments:refs(3),attachmentCount:3,...(attachmentNames===undefined?{}:{attachmentNames})},h=harness(current);
  const result=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',...current}],isCurrent:()=>true});
  assert.equal(result.updated,1);assert.deepEqual(h.writes[0].patch,{attachmentNames:refs(3).map(x=>x.name)});
 }
 const current={attachments:refs(3),attachmentCount:3,attachmentNames:refs(3).map(x=>x.name)},h=harness(current);
 const result=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',...current}],isCurrent:()=>true});
 assert.equal(result.unchanged,1);assert.equal(h.writes.length,0);
});
for(const attachmentCount of [undefined,null,-1,2,4,'3'])test('names backfill reports count mismatch without changing count '+String(attachmentCount),async()=>{
 const current={attachments:refs(3),...(attachmentCount===undefined?{}:{attachmentCount})},h=harness(current);
 const report=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',...current}],isCurrent:()=>true});
 assert.equal(report.countMismatches,1);assert.equal(h.writes.length,0);
});
test('names backfill skips deleting, unsupported, excluded, and over-limit lists',async()=>{
 const h=harness({});const result=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[
  {id:'gp-live-integration-test-001'},{id:'delete',_attachmentDeletion:{}},{id:'bad',attachments:{}}],isCurrent:()=>true});
 assert.equal(result.skipped,3);assert.equal(h.writes.length,0);
 const current={attachments:refs(201),attachmentCount:201},large=harness(current);
 const report=await large.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'large',...current}],isCurrent:()=>true});
 assert.equal(report.skipped,1);assert.equal(large.writes.length,0);
});
test('names backfill never overwrites concurrent edits or recreates deleted records',async()=>{
 for(const current of [{name:'changed',attachments:refs(4),attachmentCount:4},null]){
  const h=harness(current);const result=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',attachments:refs(3),attachmentCount:3}],isCurrent:()=>true});
  assert.equal(result.conflicts,1);assert.equal(h.writes.length,0);
 }
});
test('names repair rechecks identity/active guard after await without any write',async()=>{
 const current={attachments:refs(3),attachmentCount:3};
 const h=harness(current,{onGet(window){window.firebaseDeps.auth.currentUser={uid:'changed'};}});
 const result=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',...current}],isCurrent:()=>true});
 assert.equal(result.stopped,true);assert.equal(h.writes.length,0);
 const other=harness(current);await assert.rejects(other.store.backfillAttachmentNames({userId:'synthetic-owner',records:[],isCurrent:()=>false}));
});
test('uncertain names repair stops without retry, next request or raw data in report',async()=>{
 const current={attachments:refs(3),attachmentCount:3},h=harness(current,{transactionError:true});
 const report=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',...current},{id:'two',...current}],isCurrent:()=>true});
 assert.equal(h.attempts.length,1);assert.equal(report.uncertain,1);assert.equal(report.stopped,true);assert.equal(h.writes.length,0);
 assert.equal(JSON.stringify(report).includes('Synthetic attachment'),false);
});
test('names repair validates whole captured batch before writes and accepts exactly 200 records',async()=>{
 for(const records of [[{id:'same'},{id:'same'}],[{id:'bad/path'}],Array.from({length:201},(_,i)=>({id:String(i)}))]){
  const h=harness();await assert.rejects(h.store.backfillAttachmentNames({userId:'synthetic-owner',records,isCurrent:()=>true}));assert.equal(h.attempts.length,0);
 }
 const current={attachmentCount:0},h=harness(current);
 const report=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:Array.from({length:200},(_,i)=>({id:'item-'+i,...current})),isCurrent:()=>true});
 assert.equal(report.updated,200);assert.equal(h.attempts.length,200);assert.equal(Object.keys(report).length,7);
 for(const write of h.writes)assert.deepEqual(write.patch,{attachmentNames:[]});
});
test('names repair deadline stops before write or advancing to another record',async()=>{
 let now=0;const current={attachmentCount:0},h=harness(current,{Date:{now:()=>now},onGet(){now=60001;}});
 const report=await h.store.backfillAttachmentNames({userId:'synthetic-owner',records:[{id:'one',...current},{id:'two',...current}],isCurrent:()=>true});
 assert.equal(report.stopped,true);assert.equal(h.writes.length,0);assert.equal(h.attempts.length,1);
});
test('maintenance holds the existing journal lock and never discards active drafts',()=>{
 const start=html.indexOf('async withAttachmentCountMaintenance('),end=html.indexOf('pendingFingerprint:',start),code=html.slice(start,end);
 assert.match(code,/return lock\(async/);assert.match(code,/journal\(\)\.draft!=null\|\|pendingCommits\.size/);
 assert.doesNotMatch(code,/discard|removeItem|persist|fetch\(/);
 assert.equal((html.match(/\.backfillAttachmentNames\(/g)??[]).length,1);
 assert.match(html,/phase!=='idle'\|\|!confirmed\|\|listState!=='ready'\|\|draftStatus!=='none'/);
});
test('actual maintenance wrapper refuses active drafts/commits and guards changes while holding lock',async()=>{
 const start=html.indexOf('async withAttachmentCountMaintenance('),end=html.indexOf('pendingFingerprint:',start),method=html.slice(start,end).trim().replace(/,$/,'');
 for(const blocked of ['draft','commit','none']){
  let held=false,entered=0,draft=blocked==='draft'?{operationId:'preserve'}:null;
  const pendingCommits=new Map(blocked==='commit'?[['pending',{}]]:[]);
  const context=vm.createContext({pendingCommits,journal:()=>({draft}),assertUser:uid=>assert.equal(uid,'synthetic-owner'),
   lock:async fn=>{held=true;try{return await fn();}finally{held=false;}}});
  const fn=vm.runInContext('({'+method+'}).withAttachmentCountMaintenance',context);
  const action=async guard=>{entered++;assert.equal(held,true);guard();draft={operationId:'new-draft'};guard();};
  await assert.rejects(fn('synthetic-owner',action));
  assert.equal(entered,blocked==='none'?1:0);assert.equal(held,false);
  assert.equal(draft?.operationId,blocked==='draft'?'preserve':blocked==='none'?'new-draft':undefined);
 }
});

test('actual control and hidden Unicode characters produce unknown name slots',()=>{
 const {count}=harness();for(const value of ['a'+String.fromCharCode(10)+'b.jpg','a'+String.fromCodePoint(0x200b)+'b.jpg'])
  assert.deepEqual(plain(count.names({attachments:[{id:'one',name:value}]})),[null]);
});
