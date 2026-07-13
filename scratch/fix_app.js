const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The original About Card chunk that was incorrectly duplicated.
// The easiest way to fix it is to take the first 3808 lines (up to where the error started).
// Let's locate the Reseller Key section.
const resellerIndex = code.indexOf('Reseller Key Inventory & Logs');

// We know the "Integrations & API Card" was inserted correctly.
// Let's just find where it starts:
const integrationsStart = code.indexOf('{/* Integrations & API Card */}');

if (integrationsStart === -1) {
  console.log("Could not find Integrations & API Card");
  process.exit(1);
}

// Let's find the end of the Integrations Card:
const integrationsEnd = code.indexOf('</Card>', integrationsStart) + 7;

// Find the Data & Backups Card
const dataStart = code.indexOf('{/* Data & Backups Card */}');
const dataEnd = code.indexOf('{/* About Card */}', dataStart);

// Find the ACTUAL About Card at the end
const aboutStart = code.indexOf('{/* About Card */}', dataEnd);
const aboutEnd = code.indexOf('</Card>', aboutStart) + 7;

if (dataStart === -1 || aboutStart === -1) {
    console.log("Could not find Data or About card");
    process.exit(1);
}

// Now we need to piece it together.
// Before my broken edit, the structure was:
// ...
// {/* Reseller Key Inventory & Logs */} (inside user profile card? no, inside a card)
// </Card>
// {/* Data & Backups Card */}
// </Card>
// {/* About Card */}
// </Card>
// </div>

// In the broken file, after the User Profile Card (which contains Reseller Key), we have `<div className="space-y-3 pt-2"><Label>Reseller Key...`
// Let's find the closing of that first card.
const firstCardEnd = code.indexOf('</CardContent>', resellerIndex);
const firstCardClose = code.indexOf('</Card>', firstCardEnd) + 7;

// Piece together the correct layout:
const prefix = code.substring(0, firstCardClose);
const integrationsPart = code.substring(integrationsStart, integrationsEnd);
const dataPart = code.substring(dataStart, dataEnd);
const aboutPart = code.substring(aboutStart, aboutEnd);
const suffix = code.substring(aboutEnd); // includes the remaining divs and upgrade modal

const newCode = prefix + '\n\n' + integrationsPart + '\n\n' + dataPart + '\n\n' + aboutPart + suffix;

fs.writeFileSync('src/App.tsx', newCode);
console.log('App.tsx repaired!');
