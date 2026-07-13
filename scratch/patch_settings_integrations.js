const fs = require('fs');
let content = fs.readFileSync('src/components/gst/SettingsView.tsx', 'utf8');

const integrations = `
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
`;

content = content.replace(
  '<div className="flex justify-end pt-4 gap-4">',
  integrations + '\n\n          <div className="flex justify-end pt-4 gap-4">'
);

fs.writeFileSync('src/components/gst/SettingsView.tsx', content);
