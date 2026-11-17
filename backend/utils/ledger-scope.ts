/** Legacy clients send <owner>_hq or <owner>_branch_<timestamp>. */
export function splitLedgerScope(value: string): { ownerId: string; branchId: string } {
  const custom = value.match(/^(.*)_(branch_\d+)$/);
  if (custom?.[1]) return { ownerId: custom[1], branchId: custom[2] };
  if (value.endsWith('_hq')) return { ownerId: value.slice(0, -3), branchId: 'hq' };
  const separator = value.lastIndexOf('_');
  if (separator > 0) return { ownerId: value.slice(0, separator), branchId: value.slice(separator + 1) };
  return { ownerId: value, branchId: 'hq' };
}
