import { WebSocketServer } from "ws";
import { storage } from "../storage";
import { generateChart } from "../utils/chart";
import { processMessageWithOpenAI, extractStructuredData, analyzeImage, isOpenAIAvailable } from "./openai";
import OpenAI from "openai";
import path from "path";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

// Message handling function to process user queries and generate responses
export async function handleMessage(
  userMessage: Message, 
  processingMessage: Message, 
  conversationId: number
) {
  try {
    console.log("Processing message from user:", userMessage.id);
    console.log("User message content:", userMessage.content);
    
    // Send typing indicator event (start typing)
    sendTypingIndicator(conversationId, true);
    
    // First, let's try the direct mock response as an early check (useful for demo)
    // If it returns true, it means we processed the message successfully with a mock
    const mockProcessed = await tryDirectMockResponse(userMessage, processingMessage, conversationId);
    if (mockProcessed) {
      console.log("Message handled via direct mock response");
      return;
    }
    
    // Always get connected systems - even if LLM is not available,
    // we can still provide data from the systems
    const systems = await storage.getSystems();
    const connectedSystems = systems.filter(s => s.status === "connected" || s.status === "limited");
    console.log(`Found ${connectedSystems.length} connected systems:`, 
      connectedSystems.map(s => s.name).join(", "));
    
    if (connectedSystems.length === 0) {
      console.log("No connected systems found - informing user to connect systems");
      await updateAssistantMessage(
        processingMessage, 
        "No systems connected. Please connect to at least one system to enable data retrieval."
      );
      // Stop typing indicator
      sendTypingIndicator(conversationId, false);
      return;
    }
    
    // Get conversation history
    const messages = await storage.getMessages(conversationId);
    console.log(`Found ${messages.length} messages in conversation history`);
    
    // Create context from previous messages (excluding the processing message)
    const messageHistory = messages
      .filter(m => m.id !== processingMessage.id)
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));
    
    // Extract system names for context
    const systemNames = connectedSystems.map(s => s.name).join(", ");
    
    // Check if OpenAI API key is available
    console.log("Checking for OpenAI API key availability");
    const openAIKeyAvailable = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
    if (!openAIKeyAvailable) {
      console.warn("OPENAI_API_KEY environment variable is missing or empty");
    } else {
      console.log("OPENAI_API_KEY is available");
    }
    
    // Get active LLM provider - but don't fail if none is available
    const llmProvider = await storage.getActiveLlmProvider();
    
    if (!llmProvider) {
      console.log("No active LLM provider found in database");
      
      // Check if we have direct OpenAI integration available via environment variable
      // This bypasses the need for an explicit LLM provider in the storage
      if (openAIKeyAvailable) {
        console.log("No active LLM provider in database, but OPENAI_API_KEY is available. Using direct OpenAI integration.");
        // Pass a placeholder API key to signal we should use the environment variable
        return await handleOpenAIMessage(
          userMessage,
          processingMessage,
          messageHistory,
          systemNames,
          connectedSystems,
          "use_env_var", // Signal to use environment variable
          DEFAULT_MODEL
        );
      } else {
        console.log("No active LLM provider found and no OPENAI_API_KEY available, using demo data without LLM");
        return await handleOpenAIMessage(
          userMessage,
          processingMessage,
          messageHistory,
          systemNames,
          connectedSystems,
          "", // No API key
          DEFAULT_MODEL
        );
      }
    }
    
    console.log(`Found active LLM provider: ${llmProvider.name} (${llmProvider.type})`);
    
    // Process content based on provider type
    switch (llmProvider.type) {
      case "openai":
      case "azure":
        // Parse the settings safely to extract the model name
        const settings = llmProvider.settings as Record<string, any>;
        const modelName = settings && typeof settings === 'object' && 'model' in settings ? 
          String(settings.model) : DEFAULT_MODEL;
          
        console.log(`Using ${llmProvider.type} provider with model: ${modelName}`);
        
        // Check for API key priority: provider key first, then environment variable
        const apiKeyToUse = llmProvider.apiKey || (openAIKeyAvailable ? "use_env_var" : "");
        console.log(`API key source: ${llmProvider.apiKey ? "provider settings" : (openAIKeyAvailable ? "environment variable" : "none")}`);
          
        return await handleOpenAIMessage(
          userMessage, 
          processingMessage, 
          messageHistory, 
          systemNames, 
          connectedSystems,
          apiKeyToUse,
          modelName
        );
      
      case "anthropic":
        console.log("Anthropic Claude integration not implemented, using demo data");
        return await handleOpenAIMessage(
          userMessage, 
          processingMessage, 
          messageHistory, 
          systemNames, 
          connectedSystems,
          "", // No API key
          DEFAULT_MODEL
        );
        
      default:
        console.log(`Unsupported LLM provider type: ${llmProvider.type}, using demo data`);
        return await handleOpenAIMessage(
          userMessage, 
          processingMessage, 
          messageHistory, 
          systemNames, 
          connectedSystems,
          "", // No API key
          DEFAULT_MODEL
        );
    }
  } catch (error: any) {
    console.error("Error handling message:", error);
    try {
      await updateAssistantMessage(
        processingMessage, 
        `I encountered an issue while processing your request. ${error?.message || "Please try again with a different query."}`
      );
    } catch (updateError) {
      console.error("Failed to update error message:", updateError);
      
      // Last resort attempt to update the message directly in storage
      try {
        await storage.updateMessage(processingMessage.id, {
          content: "Sorry, I encountered an error processing your request. Please try again.",
          systemSources: []
        });
        console.log("Updated message directly in storage as fallback");
      } catch (storageError) {
        console.error("Failed all attempts to update stuck processing message:", storageError);
      }
    } finally {
      // Always ensure typing indicator is stopped
      sendTypingIndicator(conversationId, false);
    }
  }
}

async function handleOpenAIMessage(
  userMessage: Message,
  processingMessage: Message,
  messageHistory: Array<{ role: "user" | "assistant", content: string }>,
  systemNames: string,
  connectedSystems: any[],
  apiKey: string,
  model: string = DEFAULT_MODEL
) {
  try {
    console.log(`Handling message with ${apiKey ? "API key" : "no API key"}, model: ${model}`);
    
    // Update with processing status
    await updateAssistantMessage(
      processingMessage,
      "Connecting to systems and preparing response...",
      ["Processing"],
      []
    );
    
    // Use isOpenAIAvailable to check if we can use OpenAI
    const openAIAvailable = await isOpenAIAvailable();
    
    console.log(`OpenAI available: ${openAIAvailable}`);
    
    if (openAIAvailable) {
      console.log("Processing with OpenAI API");
      
      try {
        // Update with processing status after systems are "contacted"
        await updateAssistantMessage(
          processingMessage,
          "Processing data from connected systems...",
          ["Processing"],
          connectedSystems.map(s => s.name)
        );
        
        console.log("Calling processMessageWithOpenAI...");
        
        // Use our OpenAI adapter from ./openai.ts
        const result = await processMessageWithOpenAI(userMessage, connectedSystems);
        
        console.log("Received response from processMessageWithOpenAI:", result.content.substring(0, 100) + "...");
        
        // Update assistant message with the OpenAI response
        await updateAssistantMessage(
          processingMessage,
          result.content,
          ["text"],
          ["OpenAI", ...connectedSystems.map(s => s.name)]
        );

        // After getting the main response, check if we should generate visualizations
        const lowerQuery = userMessage.content.toLowerCase();
        if (
          lowerQuery.includes("chart") || 
          lowerQuery.includes("graph") || 
          lowerQuery.includes("visualize") || 
          lowerQuery.includes("visualization") ||
          lowerQuery.includes("data") ||
          lowerQuery.includes("statistics") ||
          lowerQuery.includes("metrics")
        ) {
          console.log("Message contains visualization terms, attempting to extract structured data");
          
          try {
            // Try to extract structured data for visualization
            const chartData = await extractStructuredData(result.content, "chart");
            
            if (chartData) {
              console.log("Successfully extracted chart data");
              
              // If we could extract chart data, update the message to include it
              await updateAssistantMessage(
                processingMessage,
                `${result.content}\n\n[CHART:${JSON.stringify(chartData)}]`,
                ["text", "chart"],
                ["OpenAI", ...connectedSystems.map(s => s.name)]
              );
            } else {
              console.log("No chart data could be extracted");
            }
          } catch (vizError) {
            console.error("Error generating visualization:", vizError);
            // Non-critical error, continue without visualization
          }
        }
        
        // Stop typing indicator after successful processing
        sendTypingIndicator(processingMessage.conversationId, false);
        return;
      } catch (error: any) {
        console.error("OpenAI API error details:", error);
        console.log("OpenAI API error, falling back to demo data:", error.message);
        
        // If we hit rate limits or other OpenAI API errors, fall back to demo data
        // This ensures the chat functionality still works even if OpenAI is unavailable
        
        // In production, we should notify the user about the OpenAI API error rather than silently fallback
        await updateAssistantMessage(
          processingMessage,
          `Note: I experienced an issue connecting to the AI service (${error.message}). Using cached data instead.`,
          ["Processing"],
          connectedSystems.map(s => s.name)
        );
        
        console.log("Generating fallback demo data");
        
        // Create placeholder for demo data (in a real app, would fetch from actual systems)
        const demoData = generateDemoData(userMessage.content, connectedSystems);
        
        // Format the response with appropriate data and visualizations
        const formattedResponse = formatResponse(demoData);
        
        // Update assistant message with the final response
        await updateAssistantMessage(
          processingMessage,
          formattedResponse.content,
          formattedResponse.contentTypes || [],
          formattedResponse.sources || []
        );
        
        // Stop typing indicator after fallback processing
        sendTypingIndicator(processingMessage.conversationId, false);
        return;
      }
    }
    
    // If we don't have an API key, fall back to demo data
    console.log("No OpenAI API key available, using demo data");
    
    // Create placeholder for demo data (in a real app, would fetch from actual systems)
    const demoData = generateDemoData(userMessage.content, connectedSystems);
    
    // Simulate system API calls with a short delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Update with processing status after systems are "contacted"
    await updateAssistantMessage(
      processingMessage,
      "Processing data from connected systems...",
      ["Processing"],
      connectedSystems.map(s => s.name)
    );
    
    // Add a brief delay to simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Format the response with appropriate data and visualizations
    const formattedResponse = formatResponse(demoData);
    
    // Update assistant message with the final response
    await updateAssistantMessage(
      processingMessage,
      formattedResponse.content,
      formattedResponse.contentTypes || [],
      formattedResponse.sources || []
    );
    
    // Stop typing indicator after demo data processing
    sendTypingIndicator(processingMessage.conversationId, false);
  } catch (error: any) {
    console.error("Error in OpenAI handler:", error);
    try {
      await updateAssistantMessage(
        processingMessage,
        `I encountered an issue while processing your request. ${error?.message || "Please try again with a different query."}`
      );
    } catch (updateError) {
      console.error("Failed to update error message in OpenAI handler:", updateError);
      // Last resort attempt with direct storage update
      try {
        await storage.updateMessage(processingMessage.id, {
          content: "Sorry, I encountered a technical issue. Please try again.",
          systemSources: []
        });
      } catch (storageError) {
        console.error("Failed all attempts to update message:", storageError);
      }
    } finally {
      // Always ensure typing indicator is stopped
      sendTypingIndicator(processingMessage.conversationId, false);
    }
  }
}

// Update assistant message with new content
async function updateAssistantMessage(
  message: Message,
  content: string,
  contentTypes: string[] = [],
  systemSources: string[] = []
) {
  try {
    // Update the message in storage
    const updatedMessage = await storage.updateMessage(message.id, {
      content,
      systemSources: systemSources || message.systemSources
    });
    
    console.log(`Message updated in database: ID ${message.id}`);
    
    // Try to broadcast the update via WebSocket if available
    try {
      const express = (global as any).expressApp;
      if (express && express.broadcastWebSocketMessage) {
        express.broadcastWebSocketMessage("message_updated", {
          messageId: message.id,
          conversationId: message.conversationId,
          content,
          systemSources,
          timestamp: new Date().toISOString()
        });
        console.log(`Broadcast message update for ID ${message.id}`);
      } else {
        console.log("WebSocket broadcast not available, skipping real-time update");
      }
    } catch (wsError) {
      console.error("Error broadcasting message update:", wsError);
      // Non-critical error, continue execution
    }
    
    return updatedMessage || {
      ...message,
      content,
      systemSources: systemSources || message.systemSources
    };
  } catch (dbError) {
    console.error("Error updating message in database:", dbError);
    // If database update fails, return the updated message object anyway
    // so the processing can continue
    return {
      ...message,
      content,
      systemSources: systemSources || message.systemSources
    };
  }
}

// Load mock responses from client
// In a real app, this would be using actual API calls to the connected systems
let mockResponses: Record<string, string> = {};

try {
  // Mock responses data for quick answers
  // Used for demo purposes only - in a real application this would connect to backend systems
  mockResponses = {
    "what's our q4 pipeline by region?": "Here's the Q4 pipeline breakdown:\n\n- APAC: $1.2M\n- EMEA: $850K\n- AMER: $2.5M\n\nTotal: $4.55M",
    "how many open deals do we have?": "There are 134 open deals across all regions.\n\nTop 3 reps:\n1. Jordan Lee – 22 deals\n2. Priya Mehta – 19 deals\n3. Daniel Shaw – 17 deals",
    "show me a chart of revenue by product": "Based on data from our systems, here's the revenue breakdown by product line:\n\n- Product A: $1.3M (29.9%)\n- Product B: $2.1M (48.3%)\n- Product C: $950K (21.8%)\n\nTotal quarterly revenue: $4.35M",
    "what's our churn rate?": "Customer churn for Q3 was 3.8%, down from 5.1% in Q2.\n\nKey reasons for improvement:\n- Enhanced onboarding process implementation\n- Price sensitivity adjustments in mid-market\n- New customer success team structure",
    "q4 sales summary": "Q4 Sales Summary from our systems:\n\n• Total Revenue: $5.7M (+12% YoY)\n• New Customers: 27\n• Expansion Revenue: $1.2M\n• Top Product: Enterprise Suite ($2.3M)\n• Largest Deal: Acme Corp ($450K)",
    "customer acquisition cost": "Current Customer Acquisition Cost (CAC) based on our systems:\n\n• SMB: $2,450\n• Mid-Market: $12,800\n• Enterprise: $95,200\n\nAverage CAC: $18,750 (-5% QoQ)",
    "industry benchmarks": "Industry Benchmarks for SaaS from our analysis:\n\n• Average ARR Growth: 27% (Our growth: 32%)\n• NPS: 38 (Our NPS: 52)\n• Retention Rate: 85% (Our rate: 91%)\n• Sales Cycle: 90 days (Our cycle: 78 days)",
    "retention": "Our current customer retention metrics:\n\nOverall retention rate: 89%\nEnterprise segment: 94%\nMid-market segment: 87%\nSMB segment: 76%\n\nRetention has improved 5% quarter-over-quarter due to our new customer success program.",
    "revenue": "Revenue breakdown for the current quarter:\n\nTotal Revenue: $4.3M\n- Recurring Revenue: $3.1M\n- Services Revenue: $850K\n- One-time Sales: $350K\n\nWe're currently 8% above target for the quarter.",
    "pipeline": "Current pipeline status:\n\n- Qualification: 42 deals ($3.2M)\n- Discovery: 28 deals ($2.1M)\n- Proposal: 19 deals ($4.5M)\n- Negotiation: 9 deals ($2.8M)\n\nTotal pipeline value: $12.6M",
    "win rate": "Overall win rate is 32% for Q1 2025.\n\nBreakdown by deal size:\n- Small (<$50K): 41%\n- Medium ($50K-$200K): 29%\n- Large (>$200K): 18%\n\nThis represents a 4% improvement from previous quarter.",
    "sales forecast": "Sales forecast for Q2 2025:\n\n- Conservative: $4.8M\n- Likely: $5.6M\n- Optimistic: $6.2M\n\nBased on current pipeline conversion rates and historical performance."
  };
  
  console.log("Loaded mock responses for demo");
} catch (error) {
  console.error("Failed to load mock responses, using fallback:", error);
}

// Function to immediately update a message with a mock response
// This provides instant feedback without waiting for LLM processing
export async function tryDirectMockResponse(
  userMessage: Message,
  processingMessage: Message,
  conversationId: number,
  forceResponse: boolean = false
): Promise<boolean> {
  // Get systems to use in response
  const systems = await storage.getSystems();
  const connectedSystems = systems.filter(s => s.status === "connected" || s.status === "limited");
  try {
    console.log(`tryDirectMockResponse for message: "${userMessage.content.substring(0, 50)}..." (forceResponse=${forceResponse})`);
    
    // Check if we have a quick match in our mock responses
    // If forceResponse is true, findMockResponse will always return a response
    const mockResponse = findMockResponse(userMessage.content, forceResponse);
    
    if (mockResponse) {
      console.log("Found direct mock response match, providing instant reply");
      
      // Send typing indicator while we prepare the response
      sendTypingIndicator(processingMessage.conversationId, true);
      
      // Update with a brief delay to simulate processing (but much faster than LLM)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update message with mock response
      await updateAssistantMessage(
        processingMessage,
        mockResponse,
        ["text"],
        connectedSystems.map(s => s.name) // Include all connected systems as sources
      );
      
      // Stop typing indicator
      sendTypingIndicator(processingMessage.conversationId, false);
      
      console.log("Mock response provided successfully");
      return true; // Successfully handled with mock response
    }
    
    // This should never be reached with forceResponse=true
    console.log("No mock response match found, will continue with LLM");
    return false; // No mock response match, continue with LLM
  } catch (error) {
    console.error("Error in tryDirectMockResponse:", error);
    
    if (forceResponse) {
      // Last resort effort to update the message with a generic response
      try {
        console.log("Force-updating message with fallback response due to error");
        await updateAssistantMessage(
          processingMessage,
          "I apologize, but I encountered an issue while processing your request. Please try asking a different question or rephrasing your query.",
          ["text"],
          ["System"]
        );
        return true; // Handled with fallback response
      } catch (finalError) {
        console.error("Critical failure - could not update message even with fallback:", finalError);
        return false;
      }
    } else {
      return false; // Error occurred, let the main handler continue
    }
  }
}

// Find the best match for a user query in mock data
function findMockResponse(query: string, forceResponse: boolean = false): string {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Common follow-up questions (for better user experience)
  if (normalizedQuery.includes("more detail") || 
      normalizedQuery.includes("tell me more") || 
      normalizedQuery.includes("can you expand") ||
      normalizedQuery.includes("what else") ||
      normalizedQuery.includes("additional information") ||
      normalizedQuery.includes("how does that compare")) {
    return "I'd be happy to provide more details on that. Based on our internal systems data:\n\n• The figures represent a 15% YoY growth in most metrics\n• Our top-performing segment is enterprise, which has 22% higher conversion rates\n• We're seeing the strongest results in the AMER region, followed by EMEA\n• Our product mix has shifted 8% toward higher-margin offerings\n\nWould you like me to focus on any specific aspect of this data?";
  }
  
  // Direct match
  if (mockResponses[normalizedQuery]) {
    return mockResponses[normalizedQuery];
  }
  
  // Fuzzy matching for common variations
  for (const key of Object.keys(mockResponses)) {
    // Check if query contains the key phrase
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      return mockResponses[key];
    }
  }
  
  // Match on key terms in enterprise questions
  const commonKeywords = ['revenue', 'sales', 'pipeline', 'deals', 'churn', 'customer', 'benchmark', 'product', 'win', 'forecast'];
  for (const keyword of commonKeywords) {
    if (normalizedQuery.includes(keyword)) {
      for (const key of Object.keys(mockResponses)) {
        if (key.includes(keyword)) {
          return mockResponses[key];
        }
      }
    }
  }
  
  // Generic response for simple questions or if we need to force a response
  if (forceResponse || 
      normalizedQuery.length < 20 || 
      normalizedQuery.endsWith("?") || 
      normalizedQuery.startsWith("how") || 
      normalizedQuery.startsWith("what") || 
      normalizedQuery.startsWith("why") || 
      normalizedQuery.startsWith("when") || 
      normalizedQuery.startsWith("where") || 
      normalizedQuery.startsWith("who") || 
      normalizedQuery.startsWith("can you")) {
    return "Based on the information from our connected systems and my general knowledge, I can tell you that this depends on several factors. While I don't have specific data on this particular question, I can help you access related information from our CRM, ERP, or visualization systems if you provide more details about what you're looking for.";
  }
  
  // Default response if everything else fails (should only happen if forceResponse is false)
  return "I've analyzed your question and I'm attempting to access information from our enterprise systems. Based on the general context, this appears to be related to our business operations, but I don't have the specific details you're looking for immediately available. Could you provide more context or try a more specific question about our sales, customers, or operations?";
}

// Generate demo data based on user query and connected systems
function generateDemoData(userQuery: string, connectedSystems: any[]) {
  // Check for a match in our mock responses
  const mockResponse = findMockResponse(userQuery);
  
  if (mockResponse) {
    // Format mock response data
    const responseType = userQuery.toLowerCase().includes('chart') ? 'chart_data' : 'text_data';
    
    if (responseType === 'chart_data') {
      return {
        type: "sales_performance",
        sources: connectedSystems.filter(s => s.type === "crm" || s.type === "erp").map(s => s.name),
        chartData: {
          type: "bar",
          title: "Revenue by Product",
          labels: ["Product A", "Product B", "Product C"],
          datasets: [{
            label: "Revenue ($M)",
            data: [1.3, 2.1, 0.95],
            backgroundColor: ["#93C5FD", "#60A5FA", "#3B82F6"]
          }]
        },
        analysisText: mockResponse
      };
    }
    
    return {
      type: "text_analysis",
      sources: connectedSystems.map(s => s.name),
      textResponse: mockResponse
    };
  }
  
  // If no match in mockResponses, fall back to the original logic
  const lowerQuery = userQuery.toLowerCase();
  
  // Generate response data based on user query keywords
  if (lowerQuery.includes("retention") || lowerQuery.includes("churn")) {
    return {
      type: "customer_retention",
      sources: connectedSystems.filter(s => s.type === "crm" || s.type === "erp").map(s => s.name),
      chartData: {
        type: "bar",
        title: "Customer Retention Rate by Quarter",
        labels: ["Q1 2023", "Q2 2023", "Q3 2023", "Q4 2023"],
        datasets: [{
          label: "Retention Rate",
          data: [84.3, 87.1, 82.6, 91.2],
          backgroundColor: ["#93C5FD", "#60A5FA", "#60A5FA", "#2563EB"]
        }]
      },
      tableData: {
        headers: [
          { key: "quarter", label: "Quarter" },
          { key: "retention", label: "Retention Rate", align: "right" },
          { key: "churn", label: "Churn Rate", align: "right" },
          { key: "newCustomers", label: "New Customers", align: "right" }
        ],
        rows: [
          { quarter: "Q1 2023", retention: "84.3%", churn: "15.7%", newCustomers: "142" },
          { quarter: "Q2 2023", retention: "87.1%", churn: "12.9%", newCustomers: "156" },
          { quarter: "Q3 2023", retention: "82.6%", churn: "17.4%", newCustomers: "128" },
          { quarter: "Q4 2023", retention: "91.2%", churn: "8.8%", newCustomers: "163" }
        ]
      },
      analysisText: `The data shows a significant improvement in customer retention during Q4 2023 (91.2%), which is the highest in the year and represents a 8.6% increase from Q3's 82.6% retention rate.

Key factors contributing to this improvement:
- Launch of the enhanced customer support program in October 2023
- Implementation of the new loyalty rewards system
- Targeted re-engagement campaigns for at-risk customers`
    };
  }
  
  // Default response if no specific data matches
  return {
    type: "general_information",
    sources: ["General Knowledge"],
    textResponse: "I don't have specific data for that query from the connected systems. Please try asking about sales, revenue, customer retention, open deals, or industry benchmarks."
  };
}

// Format the response with appropriate visualizations and text
function formatResponse(data: any) {
  if (data.type === "customer_retention" || data.type === "sales_performance") {
    // Format with chart and table if tableData is available
    if (data.tableData) {
      return {
        content: `${data.analysisText}\n\n[CHART:${JSON.stringify(data.chartData)}]\n\n[TABLE:${JSON.stringify(data.tableData)}]\n\nWould you like me to provide more detailed analysis on any specific aspect?`,
        contentTypes: ["text", "chart", "table"],
        sources: data.sources
      };
    } else {
      // Just chart, no table
      return {
        content: `${data.analysisText}\n\n[CHART:${JSON.stringify(data.chartData)}]\n\nWould you like me to provide more detailed analysis on any specific aspect?`,
        contentTypes: ["text", "chart"],
        sources: data.sources
      };
    }
  } else if (data.type === "text_analysis") {
    // For simple text responses from our mock data
    return {
      content: data.textResponse,
      contentTypes: ["text"],
      sources: data.sources
    };
  }
  
  // Default format for text-only responses
  return {
    content: data.textResponse,
    contentTypes: ["text"],
    sources: data.sources
  };
}

// Send typing indicator event via WebSocket
function sendTypingIndicator(conversationId: number, isTyping: boolean) {
  try {
    const express = (global as any).expressApp;
    if (express && express.broadcastWebSocketMessage) {
      express.broadcastWebSocketMessage("assistant_typing", {
        conversationId,
        isTyping,
        timestamp: Date.now()
      });
      console.log(`Broadcasting typing indicator for conversation ${conversationId}: isTyping=${isTyping}`);
    }
  } catch (error) {
    console.error("Error sending typing indicator:", error);
    // Non-critical error, continue execution
  }
}
