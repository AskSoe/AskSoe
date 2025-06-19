// Simple test file to verify OpenAI API access
import OpenAI from "openai";
import { storage } from "./storage";

// Test direct usage with the environment variable
export async function testOpenAIDirectly(): Promise<string> {
  console.log("Testing OpenAI API with environment variable...");
  try {
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, are you working correctly?" }
      ],
      max_tokens: 100
    });
    
    console.log("OpenAI API response:", response);
    return `✅ Success! OpenAI responded with: "${response.choices[0].message.content}"`;
  } catch (error: any) {
    console.error("Error testing OpenAI with env var:", error);
    return `❌ Error using environment variable: ${error.message}`;
  }
}

// Test with the active LLM provider
export async function testOpenAIWithProvider(): Promise<string> {
  console.log("Testing OpenAI API with active LLM provider...");
  try {
    const provider = await storage.getActiveLlmProvider();
    
    if (!provider) {
      return "❌ No active LLM provider found";
    }
    
    console.log(`Using provider: ${provider.name} (${provider.type}) with API key: ${provider.apiKey ? (provider.apiKey.substring(0, 8) + "...") : "none"}`);
    
    const openai = new OpenAI({ 
      apiKey: provider.apiKey as string 
    });
    
    const settings = provider.settings as Record<string, any> || {};
    const model = settings.model || "gpt-4o";
    
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello from the LLM provider test!" }
      ],
      max_tokens: 100
    });
    
    console.log("OpenAI API response (provider):", response);
    return `✅ Success with provider! OpenAI responded with: "${response.choices[0].message.content}"`;
  } catch (error: any) {
    console.error("Error testing OpenAI with provider:", error);
    return `❌ Error using provider: ${error.message}`;
  }
}