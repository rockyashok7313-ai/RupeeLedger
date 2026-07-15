const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add getDerivedTier helper
const helperCode = `
export const getDerivedTier = (sub: Subscription): "FREE" | "MONTHLY" | "YEARLY" => {
  if (sub.tier) return sub.tier;
  if (!sub.licenseKey || sub.licenseKey === "FREE-TRIAL" || sub.plan.includes("Free")) return "FREE";
  if (sub.plan.toLowerCase().includes("annual") || sub.price.toLowerCase().includes("year")) return "YEARLY";
  return "MONTHLY";
};
`;
// Insert before function App()
code = code.replace(/export default function App\(\) \{/, helperCode + '\nexport default function App() {');

// 2. Replace subscription.tier usages
code = code.replace(/const tier = subscription\.tier \|\| "MONTHLY";/g, 'const tier = getDerivedTier(subscription);');

code = code.replace(/subscription\.tier === 'FREE'/g, "getDerivedTier(subscription) === 'FREE'");
code = code.replace(/subscription\.tier === 'MONTHLY'/g, "getDerivedTier(subscription) === 'MONTHLY'");
code = code.replace(/subscription\.tier === "FREE"/g, 'getDerivedTier(subscription) === "FREE"');
code = code.replace(/subscription\.tier === "MONTHLY"/g, 'getDerivedTier(subscription) === "MONTHLY"');

fs.writeFileSync('src/App.tsx', code);
