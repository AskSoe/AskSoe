// Simple test to verify OpenAI API is working
import { OpenAI } from 'openai';

async function testOpenAI() {
  try {
    console.log('Testing OpenAI with API key:', process.env.OPENAI_API_KEY ? 'Present (starts with ' + process.env.OPENAI_API_KEY.substring(0, 3) + '...)' : 'Missing');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    console.log('Sending test request to OpenAI API...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, just testing if you're available. Respond with a brief greeting." }
      ],
      max_tokens: 100
    });
    
    console.log('Response received from OpenAI:', response);
    console.log('Message content:', response.choices[0].message.content);
    
    return 'OpenAI test successful!';
  } catch (error) {
    console.error('Error testing OpenAI:', error);
    return `OpenAI test failed: ${error.message}`;
  }
}

// Run the test
testOpenAI()
  .then(console.log)
  .catch(console.error);