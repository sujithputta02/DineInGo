// Test script for all APIs
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const HF_API_KEY = process.env.VITE_HUGGINGFACE_API_KEY;
const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;
const USDA_API_KEY = process.env.VITE_USDA_API_KEY;

console.log('🧪 Testing DineInGo APIs...\n');

// Test 1: Hugging Face
async function testHuggingFace() {
  console.log('1️⃣ Testing Hugging Face API...');
  try {
    const response = await fetch('https://api-inference.huggingface.co/models/llava-hf/llava-v1.6-mistral-7b-hf', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
      },
    });
    
    if (response.ok) {
      console.log('✅ Hugging Face: WORKING\n');
      return true;
    } else {
      console.log(`❌ Hugging Face: FAILED (${response.status})\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Hugging Face: ERROR - ${error.message}\n`);
    return false;
  }
}

// Test 2: Groq
async function testGroq() {
  console.log('2️⃣ Testing Groq API...');
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
    });
    
    if (response.ok) {
      console.log('✅ Groq: WORKING\n');
      return true;
    } else {
      console.log(`❌ Groq: FAILED (${response.status})\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Groq: ERROR - ${error.message}\n`);
    return false;
  }
}

// Test 3: USDA
async function testUSDA() {
  console.log('3️⃣ Testing USDA API...');
  try {
    const response = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?query=apple&pageSize=1&api_key=${USDA_API_KEY}`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.foods && data.foods.length > 0) {
        console.log('✅ USDA: WORKING\n');
        return true;
      }
    }
    console.log(`❌ USDA: FAILED (${response.status})\n`);
    return false;
  } catch (error) {
    console.log(`❌ USDA: ERROR - ${error.message}\n`);
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = {
    huggingface: await testHuggingFace(),
    groq: await testGroq(),
    usda: await testUSDA()
  };
  
  console.log('📊 Test Results:');
  console.log('================');
  console.log(`Hugging Face: ${results.huggingface ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Groq: ${results.groq ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`USDA: ${results.usda ? '✅ PASS' : '❌ FAIL'}`);
  
  const total = Object.values(results).filter(r => r).length;
  console.log(`\n✅ ${total}/3 APIs working`);
  
  if (total === 3) {
    console.log('\n🎉 All APIs are working! You\'re ready to go!');
  } else {
    console.log('\n⚠️ Some APIs failed. Check your API keys in .env file');
  }
}

runTests();
