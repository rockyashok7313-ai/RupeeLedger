const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target = `{/* Print-only containers */}
        <div className="print-only fixed inset-0 z-[9999] bg-white overflow-visible">
           
           
           {isReportOpen && selectedAccount && <ReportPrint account={selectedAccount} transactions={accountTransactions} businessProfile={businessProfile} />}
           {isDailyReportOpen && (
             <DailyReport 
               transactions={transactions} 
               accounts={accounts} 
               dateInput={dailyReportDateInput}
               setDateInput={setDailyReportDateInput}
               date={dailyReportDate}
               reportMode={dailyReportMode}
               setReportMode={setDailyReportMode}
               selectedMonth={dailyReportMonth}
               setSelectedMonth={setDailyReportMonth}
               selectedYear={dailyReportYear}
               setSelectedYear={setDailyReportYear}
               businessProfile={businessProfile}
             />
           )}
  
           <UpgradeModal 
             isOpen={upgradeModalOpen} 
             onClose={() => setUpgradeModalOpen(false)} 
             featureName={upgradeFeatureName}
             requiredTier={upgradeRequiredTier}
           />
        </div>`;

const replacement = `<UpgradeModal 
           isOpen={upgradeModalOpen} 
           onClose={() => setUpgradeModalOpen(false)} 
           featureName={upgradeFeatureName}
           requiredTier={upgradeRequiredTier}
         />`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    console.log("Successfully removed print-only container and fixed UpgradeModal visibility");
} else {
    console.log("Could not find the target string!");
}

fs.writeFileSync('src/App.tsx', code);
