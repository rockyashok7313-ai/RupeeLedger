const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `{/* Security Lock Card */}`;
const replacement = `{/* Help & Support Card */}
                  <Card className="glass-card premium-glow premium-heading-card shadow-sm border-slate-200/80">
                    <CardHeader>
                      <CardTitle className="premium-heading premium-heading">Help & Support</CardTitle>
                      <CardDescription>Contact us for assistance or dedicated account management</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-lg">
                        <div>
                          <p className="font-semibold text-sm text-slate-800">Your Support Level</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {subscription.tier === 'FREE' ? 'Email Support' : 
                             subscription.tier === 'MONTHLY' ? 'Priority Support' : 
                             'Dedicated Account Manager'}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (subscription.tier === 'FREE') {
                              toast({ title: "Email Support", description: "Please email us at support@rupeeledger.com" });
                            } else if (subscription.tier === 'MONTHLY') {
                              toast({ title: "Priority Support", description: "You have priority queue access. Opening chat..." });
                            } else {
                              toast({ title: "Dedicated Manager", description: "Connecting to your dedicated account manager..." });
                            }
                          }}
                        >
                          Contact Support
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed italic">
                        Upgrade your plan to unlock priority chat support or get a dedicated accounting expert assigned to your business.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Security Lock Card */}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log('Support card added.');
} else {
    console.log('Target string not found.');
}
