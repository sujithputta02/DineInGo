const axios = require('axios');
require('dotenv').config();

async function testGroq() {
  console.log('Testing Groq API...');
  console.log('API Key:', process.env.GROQ_API_KEY?.substring(0, 20) + '...');
  console.log('Model:', process.env.GROQ_MODEL);
  
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: process.env.GROQ_MODEL,
        messages: [
          { role: 'user', content: 'Say "Hello, I am working!" if you can read this.' }
        ],
        temperature: 0.7,
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('\n✅ SUCCESS! Groq API is working!');
    console.log('Response:', response.data.choices[0].message.content);
    console.log('\nFull response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ ERROR! Groq API test failed');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }
}

async function testOpenRouter() {
  console.log('Testing OpenRouter API...');
  console.log('API Key:', process.env.OPENROUTER_API_KEY?.substring(0, 20) + '...');
  console.log('Model:', process.env.AI_MODEL);
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.AI_MODEL,
        messages: [
          { role: 'user', content: 'Say "Hello, I am working!" if you can read this.' }
        ],
        temperature: 0.7,
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://dineingo.com',
          'X-Title': 'DineInGo AI Test'
        },
        timeout: 30000
      }
    );

    console.log('\n✅ SUCCESS! API is working!');
    console.log('Response:', response.data.choices[0].message.content);
    console.log('\nFull response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ ERROR! API test failed');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      console.log('\n💡 Model not found or not available with your API key.');
      console.log('Try these free models instead:');
      console.log('  - google/gemini-flash-1.5');
      console.log('  - meta-llama/llama-3.2-3b-instruct:free');
      console.log('  - mistralai/mistral-7b-instruct:free');
    }
  }
}

async function testSarvam() {
  console.log('\n\nTesting Sarvam AI...');
  console.log('API Key:', process.env.SARVAM_API_KEY?.substring(0, 20) + '...');
  console.log('Model:', process.env.SARVAM_MODEL);
  
  try {
    const response = await axios.post(
      'https://api.sarvam.ai/v1/chat/completions',
      {
        model: process.env.SARVAM_MODEL,
        messages: [
          { role: 'user', content: 'Say "Hello, I am working!" if you can read this.' }
        ],
        temperature: 0.7,
        max_tokens: 50
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SARVAM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('\n✅ SUCCESS! Sarvam API is working!');
    console.log('Response:', response.data.choices[0].message.content);
    
  } catch (error) {
    console.log('\n❌ ERROR! Sarvam API test failed');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }
}

// Run tests
(async () => {
  await testGroq();
  await testSarvam();
  await testOpenRouter();
})();
