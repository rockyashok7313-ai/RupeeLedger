import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Trash2 } from 'lucide-react';
import { Client } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  clients?: Client[];
  setClients?: (clients: Client[]) => void;
}

export function ClientsView({ clients = [], setClients }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({});

  const handleAddClient = () => {
    if (!newClient.name) return alert('Name is required');
    const client: Client = {
      id: uuidv4(),
      name: newClient.name || '',
      gstin: newClient.gstin || '',
      address: newClient.address || '',
      phone: newClient.phone || '',
      createdAt: Date.now(),
    };
    if (setClients) {
      setClients([...clients, client]);
    }
    setNewClient({});
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      if (setClients) {
        setClients(clients.filter(c => c.id !== id));
      }
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.gstin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="premium-heading flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Client Ledger
          </CardTitle>
          <CardDescription>Manage your business clients and their GSTINs</CardDescription>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Client
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Search clients by name or GSTIN..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md" 
          />
        </div>

        {isAdding && (
          <div className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Client Name *</label>
                <Input value={newClient.name || ''} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="Acme Corp" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">GSTIN</label>
                <Input value={newClient.gstin || ''} onChange={e => setNewClient({...newClient, gstin: e.target.value})} placeholder="29ABCDE1234F1Z5" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
                <Input value={newClient.phone || ''} onChange={e => setNewClient({...newClient, phone: e.target.value})} placeholder="+91 9876543210" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Billing Address</label>
                <Input value={newClient.address || ''} onChange={e => setNewClient({...newClient, address: e.target.value})} placeholder="123 Business Park, City, State" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button onClick={handleAddClient}>Save Client</Button>
            </div>
          </div>
        )}

        {filteredClients.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            No clients found.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 font-medium text-gray-500">Client Name</th>
                  <th className="p-3 font-medium text-gray-500">GSTIN</th>
                  <th className="p-3 font-medium text-gray-500">Phone</th>
                  <th className="p-3 font-medium text-gray-500">Address</th>
                  <th className="p-3 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3 font-medium">{client.name}</td>
                    <td className="p-3 text-gray-500 font-mono text-xs">{client.gstin || '-'}</td>
                    <td className="p-3 text-gray-500">{client.phone || '-'}</td>
                    <td className="p-3 text-gray-500 truncate max-w-[200px]">{client.address || '-'}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
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
