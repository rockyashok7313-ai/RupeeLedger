import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitLedgerScope } from '../../backend/utils/ledger-scope.ts';
import { readLedgerRows } from '../../backend/utils/read-ledger-rows.ts';
import { readDeviceLedger, preserveDeviceLedger, deviceBranches } from '../../src/lib/device-ledger.ts';
import { mergeById } from '../../src/lib/sync-merge.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

test('custom branch suffix keeps the authenticated owner and full branch ID',()=>{
  for(const owner of ['uuid-owner','e_client_example_com','p_919999999999']) {
    assert.deepEqual(splitLedgerScope(`${owner}_branch_1794925629010`),{ownerId:owner,branchId:'branch_1794925629010'});
    assert.deepEqual(splitLedgerScope(`${owner}_hq`),{ownerId:owner,branchId:'hq'});
  }
});
function memoryStorage():Storage {
  const data=new Map<string,string>();
  return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);},clear:()=>data.clear()};
}
test('refresh merge retains today device entries without mixing users or branches',()=>{
  const s=memoryStorage();
  s.setItem('rupee_ledger_transactions_owner_branch_123',JSON.stringify([{id:'today',amount:123.4567}]));
  s.setItem('rupee_ledger_transactions_other_branch_123',JSON.stringify([{id:'private'}]));
  s.setItem('rupee_ledger_transactions_owner_hq',JSON.stringify([{id:'hq-only'}]));
  const local=readDeviceLedger(s,'owner','branch_123');
  const merged=mergeById(local.transactions,[{id:'older'} as never]);
  assert.deepEqual(merged.merged.map(t=>t.id),['older','today']);
  assert.equal(local.transactions[0].amount,123.4567);
  assert.deepEqual(deviceBranches(s,'owner'),['hq','branch_123']);
  preserveDeviceLedger(s,'owner','branch_123');
  assert.ok(s.getItem('rupee_ledger_recovery_owner_branch_123')?.includes('today'));
  assert.equal(readDeviceLedger(s,'unknown','branch_123').transactions.length,0);
  s.setItem('rupee_ledger_transactions_owner',JSON.stringify([{id:'legacy-hq'}]));
  assert.equal(readDeviceLedger(s,'owner','branch_456').transactions.length,0);
});
function fakeDb(options:{count:number;cap:number;stop?:number;error?:boolean;change?:boolean}) {
  let requests=0;
  return {from:()=>{
    const q={select:()=>q,eq:()=>q,order:()=>q,range:async(start:number)=>{
      requests++;
      if(options.error)return {data:null,count:null,error:{message:'read failed'}};
      const length=options.stop!==undefined && start>=options.stop?0:Math.min(options.cap,options.count-start);
      return {data:Array.from({length},(_,i)=>({id:`row-${start+i}`})),count:options.count+(options.change&&requests>1?1:0),error:null};
    }};return q;
  }} as unknown as SupabaseClient;
}
test('complete cloud read traverses capped pages beyond 1000 rows',async()=>{
  const rows=await readLedgerRows(fakeDb({count:2505,cap:200}),'transactions','owner','hq');
  assert.equal(rows.length,2505);assert.equal(rows.at(-1)?.id,'row-2504');
});
test('failed, short and changing cloud reads cannot become empty valid ledgers',async()=>{
  for(const options of [{count:100,cap:50,error:true},{count:100,cap:50,stop:50},{count:100,cap:50,change:true}])await assert.rejects(()=>readLedgerRows(fakeDb(options),'transactions','owner','hq'));
  assert.deepEqual(await readLedgerRows(fakeDb({count:0,cap:500}),'transactions','owner','hq'),[]);
});
