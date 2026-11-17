// Quick script to test the running Express API endpoints + MongoDB
const samplePolicy = `
COMMERCIAL VENDOR & DRIVER AGREEMENT - SECTION 4: VEHICLE ROADSIDE ASSISTANCE
Coverage Limits:
1. Towing services are covered up to a maximum radius of 50 km from the incident location.
2. Fuel delivery covers emergency delivery of up to 5 liters of fuel (fuel cost to be paid by driver).
3. Flat tire assistance is provided on-site only if the driver carries an operational spare tire.

Exclusions & Penalties:
1. Incidents occurring off-road, on unpaved private logging trails, or during illegal street contests are strictly excluded.
2. If an incident report is submitted more than 48 hours after occurrence, claims will be denied.
3. Maximum compensation for accidental cargo damage during roadside towing is capped at $5,000.
`;

async function testEndpoints() {
  const baseUrl = 'http://localhost:5000';

  console.log("1. Checking Server & Database Health...");
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    console.log("Health Status:", healthData);
  } catch (err) {
    console.error("❌ Is the server running? Run 'node server.js' first!");
    return;
  }

  console.log("\n2. Sending Document to /api/analyze-document...");
  const analyzeRes = await fetch(`${baseUrl}/api/analyze-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentTitle: 'Vendor RSA Agreement 2026',
      documentText: samplePolicy,
    })
  });
  const analyzeData = await analyzeRes.json();
  console.log("Analysis Result Document ID:", analyzeData.documentId);
  console.log("Model Used:", analyzeData.modelUsed);

  console.log("\n3. Checking /api/documents (fetching from MongoDB)...");
  const docsRes = await fetch(`${baseUrl}/api/documents`);
  const docsList = await docsRes.json();
  console.log(`Found ${docsList.length} documents in MongoDB:`, docsList);

  if (analyzeData.documentId) {
    console.log(`\n4. Testing /api/ask-question with Document ID: ${analyzeData.documentId}...`);
    const questionRes = await fetch(`${baseUrl}/api/ask-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: analyzeData.documentId,
        documentText: samplePolicy,
        question: 'What is the maximum compensation for accidental cargo damage?'
      })
    });
    const questionData = await questionRes.json();
    console.log("Answer:", questionData.answer);

    console.log(`\n5. Verifying Chat History saved in MongoDB for document...`);
    const docDetailRes = await fetch(`${baseUrl}/api/documents/${analyzeData.documentId}`);
    const docDetail = await docDetailRes.json();
    console.log(`Document title: ${docDetail.document.title}`);
    console.log(`Chat messages in MongoDB: ${docDetail.chats.length} message(s)`);
  }
}

testEndpoints();
