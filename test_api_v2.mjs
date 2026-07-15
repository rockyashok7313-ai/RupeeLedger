async function test() {
  try {
    console.log("Testing API endpoint...");
    const res = await fetch("https://www.rupeeledgerpro.com/api/ledger/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "test", action: "pull" })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 500));
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
