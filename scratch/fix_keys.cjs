const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Fix fetchGeneratedKeys
code = code.replace(
  /const fetchGeneratedKeys = async \(userId: string\) => \{([\s\S]*?)\};\n\n  const handleGenerateLicenseKey/g,
  `const fetchGeneratedKeys = async (userId: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(\`/api/keys?userId=\${userId}\`, {
        headers: { ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) }
      });
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      if (data.isOfflineFallback) {
        return;
      }
      setGeneratedKeysList(data.keys || []);
    } catch (err) {
      console.warn("Backend keys fetch failed, using local keys.", err);
      // Fallback to local keys not strictly needed here as they are in state, but we ignore the error
    }
  };

  const handleGenerateLicenseKey`
);

// 2. Fix handleGenerateLicenseKey
code = code.replace(
  /        if \(user && user\.authMethod !== 'guest'\) \{([\s\S]*?)\} else \{([\s\S]*?)\}\n      \} catch \(err\) \{([\s\S]*?)\}\n    \} finally \{/g,
  `        let savedToCloud = false;
        if (user && user.authMethod !== 'guest') {
          try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/keys', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) },
              body: JSON.stringify({
                key: newKey,
                durationDays,
                createdBy: user.id
              })
            });
            if (res.ok) {
              const data = await res.json();
              savedToCloud = !data.isOfflineFallback;
            }
          } catch (e) {
            console.warn("Cloud key generation failed, falling back to local mode", e);
          }
        }
        
        if (savedToCloud) {
          toast({
            title: "License Key Generated",
            description: \`Key \${newKey} is saved to cloud keys database.\`
          });
          if (user) await fetchGeneratedKeys(user.id);
        } else {
          const newLocalKey = {
            key: newKey,
            duration: vendorKeyDuration === "annual" ? "Annual" : "Monthly",
            createdAt: Date.now(),
            status: "unused"
          };
          setGeneratedKeysList(prev => [newLocalKey, ...prev]);
          toast({
            title: "License Key Generated (Local Mode)",
            description: \`Key \${newKey} is stored in local reseller memory.\`
          });
        }
      } catch (err) {
        console.error("Error generating key:", err);
        toast({
          title: "Key Generation Failed",
          description: "An unexpected error occurred.",
          variant: "destructive"
        });
      } finally {`
);

// 3. Fix handleActivateKey
code = code.replace(
  /      if \(user && user\.authMethod !== 'guest'\) \{([\s\S]*?)\} else \{([\s\S]*?)\}\n    \};\n\n  const handleUpdateBusinessProfile/g,
  `      let activatedCloud = false;
      let durationDays = 30;

      if (user && user.authMethod !== 'guest') {
        try {
          const token = await auth.currentUser?.getIdToken();
          const res = await fetch('/api/keys', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': \`Bearer \${token}\` } : {}) },
            body: JSON.stringify({
              key: keyStr,
              userId: user.id
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (!data.error && !data.isOfflineFallback) {
              activatedCloud = true;
              durationDays = data.durationDays || 30;
            } else if (data.error) {
              toast({ title: "Activation Failed", description: data.error, variant: "destructive" });
              return;
            }
          }
        } catch (e) {
          console.warn("Cloud activation failed, trying local", e);
        }
      }

      if (activatedCloud) {
        const newRenewalStr = format(addDays(new Date(), durationDays), "dd-MM-yyyy");
        const planName = durationDays === 365 ? "Pro Business (Annual License)" : "Pro Business (Monthly License)";
        const priceStr = durationDays === 365 ? "₹11,999 / year" : "₹1199 / month";
        
        setSubscription({
          status: "active",
          plan: planName,
          price: priceStr,
          renewalDate: newRenewalStr,
          licenseKey: keyStr
        });
        toast({
          title: "License Activated",
          description: \`Successfully upgraded to \${planName}!\`
        });
        setLicenseInput("");
      } else {
        // Local validation logic
        const localKeyObj = generatedKeysList.find(k => k.key === keyStr);
        if (!localKeyObj) {
          toast({
            title: "Invalid Key",
            description: "The license key you entered is invalid or not found.",
            variant: "destructive"
          });
          return;
        }
        
        if (localKeyObj.status === "used") {
          toast({
            title: "Key Already Used",
            description: "This license key has already been activated.",
            variant: "destructive"
          });
          return;
        }

        // Mark local key as used
        setGeneratedKeysList(prev => prev.map(k => k.key === keyStr ? { ...k, status: "used" } : k));
        
        const days = localKeyObj.duration === "Annual" ? 365 : 30;
        const newRenewalStr = format(addDays(new Date(), days), "dd-MM-yyyy");
        const planName = days === 365 ? "Pro Business (Annual License)" : "Pro Business (Monthly License)";
        const priceStr = days === 365 ? "₹11,999 / year" : "₹1199 / month";
        
        setSubscription({
          status: "active",
          plan: planName,
          price: priceStr,
          renewalDate: newRenewalStr,
          licenseKey: keyStr
        });
        toast({
          title: "License Activated (Local)",
          description: \`Successfully upgraded to \${planName}!\`
        });
        setLicenseInput("");
      }
    };

  const handleUpdateBusinessProfile`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Keys fix applied');
