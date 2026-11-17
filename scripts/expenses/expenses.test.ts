import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, duplicateIds, expenseCsv, filterExpenses, sumMoney, validateExpenseDraft } from '../../src/lib/expenses.ts';
import type { Expense } from '../../src/lib/types.ts';
import { mutateExpense, ExpenseConflict, expenseRecordSchema } from '../../backend/utils/expense-mutation.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

const original: Expense = { id:'one', vendorName:'Metro', gstin:'', category:'Office', amount:100.1234, cgst:9, sgst:9, igst:0, date:new Date(2026,10,17,12).getTime(), createdAt:123 };
const filters = { query:'', category:'', from:'', to:'', reviewOnly:false, sort:'newest' as const };
test('filtering and summaries never mutate stored precision or order', () => {
  const input = [original, {...original,id:'two',amount:0.2,date:new Date(2026,9,2).getTime()}]; const before = JSON.stringify(input);
  assert.equal(filterExpenses(input,{...filters,from:'2026-11-01',to:'2026-11-30'})[0].amount,100.1234);
  assert.equal(sumMoney([0.1,0.2]),0.3); assert.equal(JSON.stringify(input),before);
});
test('search, category, sort and inclusive local dates agree', () => {
  assert.equal(dateKey(original.date),'2026-11-17');
  assert.equal(filterExpenses([original],{...filters,query:'METRO',category:'Office',from:'2026-11-17',to:'2026-11-17'}).length,1);
  assert.equal(filterExpenses([original],{...filters,query:'absent'}).length,0);
  assert.deepEqual(filterExpenses([original,{...original,id:'two',amount:500}],{...filters,sort:'highest'}).map(e=>e.id),['two','one']);
});
test('duplicate review distinguishes tax amounts and does not remove records', () => {
  const rows=[original,{...original,id:'two',vendorName:' METRO '},{...original,id:'three',igst:1}];
  assert.deepEqual([...duplicateIds(rows)],['one','two']); assert.equal(rows.length,3);
});
test('CSV preserves numbers, escapes multiline text and neutralizes formulas', () => {
  const csv=expenseCsv([{...original,vendorName:'=1+1',category:'A,"B"\nC'}]);
  assert.ok(csv.includes('100.1234')); assert.ok(csv.includes("\"'=1+1\"")); assert.ok(csv.includes('"A,""B""\nC"')); assert.ok(csv.startsWith('\uFEFF'));
});
test('draft rejects invalid money, dates and malformed GSTIN', () => {
  const draft={vendorName:'Vendor',gstin:'',category:'Travel',date:'2026-11-17',amount:'12.345',cgst:'0',sgst:'',igst:''};
  assert.equal(validateExpenseDraft(draft),null);
  for (const patch of [{amount:'NaN'},{amount:'-1'},{amount:''},{cgst:'-1'},{date:'2026-02-30'},{gstin:'123'}]) assert.ok(validateExpenseDraft({...draft,...patch}));
  assert.equal(expenseRecordSchema.safeParse({...original,amount:Infinity}).success,false);
});

// Exercise the real adapter against an in-memory query surface: ownership
// filters and compare-and-write conditions determine which rows may change.
function database(seed: Record<string, unknown>[]) {
  let rows=structuredClone(seed); let fail=false; let race=false;
  const db={from:()=>{
    let action='read'; let payload:Record<string,unknown>={}; const terms:[string,unknown][]=[];
    const matches=(r:Record<string,unknown>)=>terms.every(([k,v])=>r[k]===v);
    const execute=()=>{
      if(fail)return {data:null,error:new Error('offline')};
      if(action==='insert'){if(rows.some(r=>r.id===payload.id))return {data:null,error:new Error('duplicate')};rows.push(payload);return {data:[payload],error:null};}
      if(race && action!=='read'){rows[0].amount=999;race=false;}
      const selected=rows.filter(matches);
      if(action==='update')rows=rows.map(r=>matches(r)?{...r,...payload}:r);
      if(action==='delete')rows=rows.filter(r=>!matches(r));
      return {data:selected,error:null};
    };
    const query={select:()=>query,eq:(k:string,v:unknown)=>{terms.push([k,v]);return query;},is:(k:string,v:unknown)=>{terms.push([k,v]);return query;},insert:(p:Record<string,unknown>)=>{action='insert';payload=p;return query;},update:(p:Record<string,unknown>)=>{action='update';payload=p;return query;},delete:()=>{action='delete';return query;},maybeSingle:async()=>{const r=execute();return {...r,data:r.data?.[0]||null};},then:(resolve:(r:unknown)=>void)=>Promise.resolve(execute()).then(resolve)};
    return query;
  }};
  return { db:db as unknown as SupabaseClient, rows:()=>rows, fail:()=>{fail=true;}, race:()=>{race=true;} };
}
test('single-record update preserves other users, branches and expenses', async()=>{
  const seed=[{...original,user_id:'owner',branchId:'hq'},{...original,id:'other',user_id:'owner',branchId:'hq'},{...original,id:'private',user_id:'someone',branchId:'hq'}];
  const d=database(seed); await mutateExpense(d.db,'owner','hq','expense-save',{...original,amount:25},original);
  assert.equal(d.rows()[0].amount,25); assert.deepEqual(d.rows().slice(1),seed.slice(1));
});
test('stale edits and deletion races fail without overwriting newer records',async()=>{
  for(const action of ['expense-save','expense-delete'] as const){const d=database([{...original,user_id:'owner',branchId:'hq'}]);d.race();await assert.rejects(()=>mutateExpense(d.db,'owner','hq',action,{...original,amount:20},original),ExpenseConflict);assert.equal(d.rows()[0].amount,999);}
});
test('new expense retries are idempotent and cannot hijack another owner id',async()=>{
  const d=database([]);await mutateExpense(d.db,'owner','hq','expense-save',original);await mutateExpense(d.db,'owner','hq','expense-save',original);assert.equal(d.rows().length,1);
  await assert.rejects(()=>mutateExpense(d.db,'other','hq','expense-save',original));assert.equal(d.rows()[0].user_id,'owner');
});
test('delete is explicit, scoped, idempotent and never clears the collection',async()=>{
  const d=database([{...original,user_id:'owner',branchId:'hq'},{...original,id:'keep',user_id:'owner',branchId:'hq'}]);
  await mutateExpense(d.db,'owner','hq','expense-delete',original,original);await mutateExpense(d.db,'owner','hq','expense-delete',original,original);assert.deepEqual(d.rows().map(r=>r.id),['keep']);
});
test('cloud failures and mismatched identifiers do not change records',async()=>{
  const d=database([{...original,user_id:'owner',branchId:'hq'}]);const before=structuredClone(d.rows());d.fail();await assert.rejects(()=>mutateExpense(d.db,'owner','hq','expense-save',original));assert.deepEqual(d.rows(),before);
  await assert.rejects(()=>mutateExpense(d.db,'owner','hq','expense-save',original,{...original,id:'changed'}),ExpenseConflict);
});
