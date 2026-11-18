import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCloudBackup } from '../../src/lib/cloud-backup.ts';
import { completeBackup } from '../../backend/utils/complete-backup.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

test('only a verified saved snapshot can report backup success',async()=>{
  const bodies=[{success:true},{isOfflineFallback:true},{skipped:true,reason:'empty'},{backup:{id:1,transaction_count:10}}];
  for(const body of bodies)await assert.rejects(()=>saveCloudBackup('owner_branch_123','synthetic',{},async()=>Response.json(body)));
  await assert.rejects(()=>saveCloudBackup('owner_hq',null,{}));
  const saved=await saveCloudBackup('owner_branch_123','synthetic',{transactions:[{id:'new'}]},async(url,options)=>{
    assert.equal(url,'/api/ledger/backup');
    const body=JSON.parse(options?.body as string);
    assert.equal(body.action,'snapshot');assert.equal(body.userId,'owner_branch_123');
    return Response.json({verified:true,backup:{id:7,taken_on:'2026-11-18',account_count:4,transaction_count:1117,byte_size:100}});
  });assert.equal(saved.transaction_count,1117);
});
test('failure is retryable; a local daily backup does not imply a cloud success',async()=>{
  let attempts=0;
  const fetcher:typeof fetch=async()=>++attempts===1?Response.json({error:'Cloud unavailable'},{status:503}):Response.json({verified:true,backup:{id:1,transaction_count:2}});
  await assert.rejects(()=>saveCloudBackup('owner_hq','synthetic',{},fetcher),/Cloud unavailable/);
  assert.equal((await saveCloudBackup('owner_hq','synthetic',{},fetcher)).id,1);
});
test('snapshot includes cloud-only entries, preserves unsynced precision, strips credentials and never writes ledger rows',async()=>{
  const rows:Record<string,Record<string,unknown>[]>={transactions:[{id:'old',amount:10,user_id:'owner',branchId:'branch_123'},{id:'cloud-only',amount:20}],accounts:[{id:'cash'}]};
  const scopes:string[][]=[];
  const db={from:(table:string)=>{
    const scope:string[]=[];scopes.push(scope);
    const q={select:()=>q,eq:(key:string,value:string)=>{scope.push(key,value);return q;},order:()=>q,range:async()=>({data:rows[table]||[],count:(rows[table]||[]).length,error:null})};return q;
  }} as unknown as SupabaseClient;
  const payload={transactions:[{id:'new',amount:0.123456}],subscription:{licenseKey:'private'},securitySettings:{pinCode:'private'}};
  const before=JSON.stringify(payload);
  const backup=await completeBackup(db,'owner','branch_123',payload);
  assert.equal(backup.transactions.length,3);
  assert.equal(backup.transactions[2].amount,0.123456);
  assert.equal(backup.transactions[0].user_id,undefined);
  assert.equal(backup.subscription,undefined);assert.equal(backup.securitySettings,undefined);
  assert.equal(JSON.stringify(payload),before);
  assert.ok(scopes.every(s=>s.join(',')==='user_id,owner,branchId,branch_123'));
});
