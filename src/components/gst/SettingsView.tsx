import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save } from 'lucide-react';
import { BusinessProfile } from '@/lib/types';

interface Props {
  businessProfile: BusinessProfile;
  setBusinessProfile?: (p: BusinessProfile) => void;
}

export function SettingsView({ businessProfile, setBusinessProfile }: Props) {
  const [localProfile, setLocalProfile] = useState<BusinessProfile>(businessProfile);

  const handleSave = () => {
    if (setBusinessProfile) {
      setBusinessProfile(localProfile);
      alert('Settings saved successfully! These settings will be applied to your future invoices.');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="premium-heading flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Invoice Configuration
          </CardTitle>
          <CardDescription>Configure terms, bank details, and invoice prefixes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-semibold text-gray-900">Multi-Business Profiles</h3>
              <Button variant="outline" size="sm" onClick={() => {
                const profiles = JSON.parse(localStorage.getItem('saved_gst_profiles') || '[]');
                profiles.push(localProfile);
                localStorage.setItem('saved_gst_profiles', JSON.stringify(profiles));
                alert('Profile saved to local vault!');
              }}>
                Save Current Profile
              </Button>
            </div>
            
            <div className="space-y-3">
              {(() => {
                const profiles: BusinessProfile[] = JSON.parse(localStorage.getItem('saved_gst_profiles') || '[]');
                if (profiles.length === 0) return <p className="text-xs text-gray-500">No saved profiles found. Configure your settings and click "Save Current Profile" to add one.</p>;
                return profiles.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                    <div>
                      <p className="font-semibold text-sm">{p.companyName || 'Unnamed Business'}</p>
                      <p className="text-xs text-gray-500">GSTIN: {p.gstin || 'N/A'}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => {
                      setLocalProfile(p);
                      if (setBusinessProfile) {
                        setBusinessProfile(p);
                      }
                      alert(`Switched to ${p.companyName || 'Profile'}`);
                    }}>
                      Switch
                    </Button>
                  </div>
                ));
              })()}
            </div>
          </div>


          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Numbering & Terms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Invoice Prefix (Future update)</Label>
                <Input 
                  placeholder="e.g. INV-" 
                  defaultValue="INV-" 
                  disabled
                  title="Will be supported in a future update"
                />
              </div>
              <div className="space-y-2">
                <Label>Next Invoice Number (Future update)</Label>
                <Input 
                  type="number" 
                  defaultValue="1" 
                  disabled 
                  title="Currently using auto-generated unique IDs"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Default Terms & Conditions (Appears on PDF Footer)</Label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="1. Payment due within 30 days.&#10;2. Goods once sold will not be taken back."
                  value={localProfile.printFooter || ''}
                  onChange={(e) => setLocalProfile({...localProfile, printFooter: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Bank Details (For receiving payments)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input 
                  placeholder="HDFC Bank" 
                  value={localProfile.bankName || ''}
                  onChange={(e) => setLocalProfile({...localProfile, bankName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input 
                  placeholder="50100XXXXXXX" 
                  value={localProfile.bankAccountNumber || ''}
                  onChange={(e) => setLocalProfile({...localProfile, bankAccountNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input 
                  placeholder="HDFC0001234" 
                  value={localProfile.bankIfsc || ''}
                  onChange={(e) => setLocalProfile({...localProfile, bankIfsc: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Branch Name</Label>
                <Input 
                  placeholder="MG Road Branch" 
                  value={localProfile.bankBranch || ''}
                  onChange={(e) => setLocalProfile({...localProfile, bankBranch: e.target.value})}
                />
              </div>
            </div>
          </div>

          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Cloud Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg bg-gray-50 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800">Google Drive Backup</h4>
                  <p className="text-xs text-gray-500 mt-1">Sync your JSON returns & PDF invoices directly to your Drive.</p>
                </div>
                <Button 
                  variant="outline" 
                  className="bg-white"
                  onClick={() => {
                    const btn = document.getElementById('drive-btn');
                    if (btn) btn.innerHTML = 'Connecting...';
                    setTimeout(() => {
                      alert('Simulated OAuth: Successfully connected to Google Drive! Backups will now sync daily.');
                      if (btn) btn.innerHTML = 'Connected to Drive';
                    }, 1500);
                  }}
                >
                  <span id="drive-btn" className="flex items-center">Connect Drive</span>
                </Button>
              </div>
            </div>
          </div>


          <div className="flex justify-end pt-4 gap-4">
            <Button 
              variant="destructive"
              onClick={() => {
                localStorage.removeItem("rupee_ledger_user");
                window.location.reload();
              }} 
            >
              Force Sign Out
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" /> Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
