const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

// List of models to try in case of temporary high demand (503)
const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

async function runTest() {
  const prompt = 'Explain what an insurance policy deductible is in 2 simple sentences for a customer.';

  for (const model of candidateModels) {
    console.log(`Sending request to ${model}...`);
    const startTime = Date.now();

    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n===========================================`);
      console.log(`✅ SUCCESS from ${model} in ${elapsed}s:`);
      console.log(`===========================================`);
      console.log(response.text);
      console.log(`===========================================\n`);
      return; // Exit on success
    } catch (error) {
      console.warn(`⚠️ ${model} returned error (${error.status || error.message}). Trying fallback...\n`);
    }
  }

  console.error("❌ All candidate models failed. Please try again in a few moments.");
}

runTest();
