const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = '{/* Global Header / Branch Selector */}';
const replacement = `{user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-xs font-semibold text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-white mb-2 h-8"
              >
                Sign Out Session
              </Button>
            )}
            <p className="text-[10px] text-primary-foreground/40 text-center">v1.2.1 - Private Ledger</p>
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          {/* Global Header / Branch Selector */}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed aside/main');
