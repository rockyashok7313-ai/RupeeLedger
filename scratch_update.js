const fs = require('fs');
let content = fs.readFileSync('src/components/gst/InvoiceGenerator.tsx', 'utf8');

// 1. Add state variables
content = content.replace(
  "const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18, unit: 'NOS-NUMBERS' }]);",
  "const [customPrefix, setCustomPrefix] = useState('INV');\n  const [customSequence, setCustomSequence] = useState<number | ''>(invoices.filter(i => i.type === 'Tax Invoice' || !i.type).length + 1);\n  const [deliveryChallanNo, setDeliveryChallanNo] = useState('');\n  const [agentId, setAgentId] = useState('');\n  const [agentCommissionPercent, setAgentCommissionPercent] = useState<number>(0);\n  const [items, setItems] = useState<Partial<InvoiceItem>[]>([{ name: '', hsnCode: '', quantity: 1, rate: 0, taxPercent: 18, unit: 'NOS-NUMBERS' }]);"
);

// 2. Add Invoice Number logic and TCS and Agent logic to handleSaveInvoice
content = content.replace(
  "      let baseTotal = subtotal + cgst + sgst + igst;\n\n      const newInvoice: Invoice = {\n        id: uuidv4(),",
        let baseTotal = subtotal + cgst + sgst + igst;
      
      let tcsAmount = 0;
      if (clientId) {
        const clientInvoices = invoices.filter(i => i.clientId === clientId && i.type === 'Tax Invoice');
        const totalTurnover = clientInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const newTotalWithThis = totalTurnover + baseTotal;
        
        if (newTotalWithThis > 5000000) {
          const taxableForTcs = Math.max(0, newTotalWithThis - Math.max(5000000, totalTurnover));
          tcsAmount = Math.round(taxableForTcs * 0.001 * 100) / 100;
        }
      }

      const total = baseTotal + tcsAmount;
      
      let agentCommissionAmount = 0;
      if (agentId && agentCommissionPercent > 0) {
        agentCommissionAmount = Math.round(subtotal * (agentCommissionPercent / 100) * 100) / 100;
      }
      const selectedAgent = clients.find(c => c.id === agentId);

      let invoiceNum = '';
      if (invoiceType === 'Tax Invoice') {
        const seqToUse = customSequence !== '' ? Number(customSequence) : invoices.length + 1;
        invoiceNum = generateInvoiceNumber(seqToUse, customPrefix, getCurrentFinancialYear());
      } else {
        const prefixMap: Record<string, string> = {
          'Delivery Challan': 'DC',
          'Credit Note': 'CN',
          'Proforma': 'EST',
          'Bill of Supply': 'BOS'
        };
        invoiceNum = generateInvoiceNumber(invoices.length + 1, prefixMap[invoiceType] || 'INV', getCurrentFinancialYear());
      }

      const newInvoice: Invoice = {
        id: uuidv4(),
        invoiceNumber: invoiceNum,
        prefix: invoiceType === 'Tax Invoice' ? customPrefix : undefined,
        financialYear: getCurrentFinancialYear(),
        tcsAmount,
        deliveryChallanNo: deliveryChallanNo.trim() !== '' ? deliveryChallanNo : undefined,
        agentId: agentId || undefined,
        agentName: selectedAgent ? selectedAgent.name : undefined,
        agentCommissionPercent: agentId ? agentCommissionPercent : undefined,
        agentCommissionAmount: agentId ? agentCommissionAmount : undefined,
);

// We need to fix the newInvoice closing
content = content.replace(
  "        status: 'draft',\n        createdAt: Date.now()\n      };\n\n      setInvoices",
  "        status: 'draft',\n        createdAt: Date.now()\n      };\n\n      setInvoices"
);

// Remove the 	otal property if we injected it in the block above but it's already below...
// Actually, 
ewInvoice inside InvoiceGenerator.tsx had:
//   subtotal,
//   cgst,
//   sgst,
//   igst,
//   total: baseTotal,
content = content.replace(
  "total: baseTotal,",
  "total,"
);

// 3. Add Custom Prefix UI and Delivery Challan and Agent UI
content = content.replace(
  "      <CardContent className=\"space-y-6\">\n        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4\">",
        <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
);

content = content.replace(
  "          <div className=\"space-y-2\">\n            <Label>Currency</Label>",
            <div className="space-y-2">
            <Label>Currency</Label>
);

content = content.replace(
  "        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">",
          {invoiceType === 'Tax Invoice' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border rounded-md bg-gray-50/50">
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input 
                value={customPrefix} 
                onChange={e => setCustomPrefix(e.target.value)} 
                placeholder="INV"
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Number (Sequence)</Label>
              <Input 
                type="number"
                value={customSequence === '' ? '' : customSequence} 
                onChange={e => setCustomSequence(e.target.value === '' ? '' : parseInt(e.target.value))} 
                placeholder="Auto-generated"
              />
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Delivery Challan No (Optional)</Label>
            <Input 
              value={deliveryChallanNo} 
              onChange={e => setDeliveryChallanNo(e.target.value)} 
              placeholder="e.g. DC-101"
            />
          </div>
          <div className="space-y-2">
            <Label>Agent / Broker</Label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
            >
              <option value="">-- No Agent --</option>
              {clients.filter(c => c.type === 'agent' || c.type === 'both').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {agentId && (
            <div className="space-y-2">
              <Label>Agent Commission (%)</Label>
              <Input 
                type="number"
                value={agentCommissionPercent} 
                onChange={e => setAgentCommissionPercent(parseFloat(e.target.value) || 0)} 
                placeholder="e.g. 5"
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
);


fs.writeFileSync('src/components/gst/InvoiceGenerator.tsx', content);
