const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const helperCode = `
export const getDerivedTier = (sub: Subscription): "FREE" | "MONTHLY" | "YEARLY" => {
  if (sub.tier) return sub.tier;
  if (!sub.licenseKey || sub.licenseKey === "FREE-TRIAL" || sub.plan.includes("Free")) return "FREE";
  if (sub.plan.toLowerCase().includes("annual") || sub.price.toLowerCase().includes("year")) return "YEARLY";
  return "MONTHLY";
};
`;

code = code.replace(/export default function RupeeLedger\(\) \{/, helperCode + '\nexport default function RupeeLedger() {');

fs.writeFileSync('src/App.tsx', code);
