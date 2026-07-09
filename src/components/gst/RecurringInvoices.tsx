import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarClock, Plus, Trash2, Power, PowerOff } from 'lucide-react';
import { RecurringTemplate, Client } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  recurringTemplates?: RecurringTemplate[];
  setRecurringTemplates?: (r: RecurringTemplate[]) => void;
}

export function RecurringInvoices({ recurringTemplates = [], setRecurringTemplates }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Notice: For a real app, you would select clients and items from existing lists. 
  // But for this mockup/V1, we provide simple text fields or a simple button.
  
  const handleToggleActive = (id: string) => {
    if (setRecurringTemplates) {
      setRecurringTemplates(recurringTemplates.map(t => 
        t.id === id ? { ...t, active: !t.active } : t
      ));
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this recurring template?')) {
      if (setRecurringTemplates) {
        setRecurringTemplates(recurringTemplates.filter(t => t.id !== id));
      }
    }
  };

  const filteredTemplates = recurringTemplates.filter(t => 
    t.clientId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="premium-heading flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Recurring Invoices
          </CardTitle>
          <CardDescription>Automate your billing with scheduled templates</CardDescription>
        </div>
        <Button size="sm" onClick={() => alert('Add Recurring Template flow requires deep integration with InvoiceGenerator. For now, you can mock data or save from generator.')}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Search templates by client..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-md" 
          />
        </div>
        
        {filteredTemplates.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            No recurring templates configured.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-medium text-gray-500">Client ID</th>
                  <th className="p-3 font-medium text-gray-500">Interval</th>
                  <th className="p-3 font-medium text-gray-500">Next Run</th>
                  <th className="p-3 font-medium text-gray-500">Status</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 font-medium">{template.clientId}</td>
                    <td className="p-3 capitalize">{template.interval}</td>
                    <td className="p-3">{new Date(template.nextRun).toLocaleDateString()}</td>
                    <td className="p-3">
                      {template.active ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Paused</span>
                      )}
                    </td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleActive(template.id)} className={template.active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}>
                        {template.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(template.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
