const fs = require('fs');
let content = fs.readFileSync('src/components/gst/SettingsView.tsx', 'utf8');

const multiProfileUI = `
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
                      alert(\`Switched to \${p.companyName || 'Profile'}\`);
                    }}>
                      Switch
                    </Button>
                  </div>
                ));
              })()}
            </div>
          </div>
`;

content = content.replace(
  '          <div className="space-y-4">\n            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Numbering & Terms</h3>',
  multiProfileUI + '\n\n          <div className="space-y-4">\n            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Numbering & Terms</h3>'
);

fs.writeFileSync('src/components/gst/SettingsView.tsx', content);
