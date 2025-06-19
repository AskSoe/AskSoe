// Simple test script to test the debug message endpoint
// Using ES modules syntax for Node.js
import fetch from 'node-fetch';

// Make a direct API call to the Curl endpoint version
async function testDebugMessageCurl() {
  try {
    console.log('Testing debug message via curl (simulated)...');
    
    const command = `curl -X POST -H "Content-Type: application/json" -d '{"content":"Debug message from curl at ${new Date().toISOString()}"}' https://34e57819-84c7-4488-a6b2-9d0b6c674b0f-00-3pm5cjl6msngi.picard.replit.dev/api/debug-message`;
    
    console.log('Run this command in the terminal:');
    console.log(command);
    console.log('\nManually run the above command to see if the debug endpoint is working.');
    console.log('After running the command, look at the messages in the chat interface to see if a new debug message appears.');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Execute the function
testDebugMessageCurl();