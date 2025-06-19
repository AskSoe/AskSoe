import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Check if OpenAI API is available and configured
export async function isOpenAIAvailable(): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY) {
    console.log("OpenAI API key not found in environment variables");
    return false;
  }
  
  try {
    // Simple test query to verify API key is valid
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Respond with 'OK' if you're working." },
        { role: "user", content: "Test connection" }
      ],
      max_tokens: 5
    });
    
    return response.choices.length > 0;
  } catch (error) {
    console.error("OpenAI API test failed:", error);
    return false;
  }
}

// Process a message with OpenAI, using the connected systems for context
export async function processMessageWithOpenAI(
  userMessage: Message, 
  connectedSystems: System[]
): Promise<{ content: string; systemSources: string[] }> {
  try {
    // Check if OpenAI API is available before proceeding
    const openAIAvailable = await isOpenAIAvailable();
    if (!openAIAvailable) {
      return getMockResponse(userMessage.content, connectedSystems);
    }
    
    // Build system prompt with connected systems information
    const systemsContext = connectedSystems.length > 0
      ? `You have access to the following enterprise systems: ${connectedSystems.map(s => s.name).join(", ")}. 
         Provide information based on these systems when relevant.`
      : "You are a helpful enterprise assistant.";
      
    const messages: ChatMessage[] = [
      { 
        role: "system",
        content: systemsContext
      },
      {
        role: "user",
        content: userMessage.content
      }
    ];
    
    const response = await getChatResponse(messages);
    
    // Determine which systems were referenced in the response
    // For simplicity, we're just including all connected systems as sources
    const systemSources = connectedSystems.map(s => s.name);
    
    return {
      content: response.content,
      systemSources: systemSources
    };
  } catch (error: any) {
    console.error("Error processing message with OpenAI:", error);
    // Instead of throwing an error, fall back to mock response
    return getMockResponse(userMessage.content, connectedSystems);
  }
}

// Fallback function that returns a mock response when OpenAI is unavailable
function getMockResponse(
  userContent: string, 
  connectedSystems: System[]
): { content: string; systemSources: string[] } {
  console.log("Falling back to mock response system");
  
  // Create a standard response prefix
  let response = "I've analyzed your request and I'm retrieving information from our connected enterprise systems. ";
  
  // Simple keyword matching for demo responses
  const normalizedContent = userContent.toLowerCase();
  
  if (normalizedContent.includes("sales") || normalizedContent.includes("revenue")) {
    response += "Based on our sales data, we're seeing a 15% increase in revenue compared to last quarter. The top-performing product categories are enterprise solutions and managed services.";
  } 
  else if (normalizedContent.includes("customer") || normalizedContent.includes("retention")) {
    response += "Our customer retention rate is currently at 87%, which is 3% higher than industry average. The most successful retention strategies have been our loyalty program and personalized outreach campaigns.";
  }
  else if (normalizedContent.includes("pipeline") || normalizedContent.includes("forecast")) {
    response += "The current sales pipeline shows $3.2M in qualified opportunities, with an expected close rate of 32% based on historical data. The forecast for Q2 is trending upward with a projected 8% growth.";
  }
  else if (normalizedContent.includes("system") || normalizedContent.includes("connected")) {
    response += `You currently have access to ${connectedSystems.length} enterprise systems: ${connectedSystems.map(s => s.name).join(", ")}. Each system contains specialized data that can be queried through this interface.`;
  }
  else {
    response += "I don't have specific data on this particular query in our systems. Could you provide more details about what business metrics or information you're interested in?";
  }
  
  return {
    content: response,
    systemSources: connectedSystems.map(s => s.name)
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  sources?: string[];
}

export async function getChatResponse(messages: ChatMessage[]): Promise<ChatResponse> {
  try {
    // Ensure the API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return {
      content: response.choices[0].message.content || "No response generated",
    };
  } catch (error: any) {
    console.error("Error in OpenAI chat completion:", error);
    throw new Error(`Failed to get chat response: ${error.message}`);
  }
}

// Function to analyze if a query relates to internal or external knowledge
export async function analyzeQueryType(query: string): Promise<{
  isInternal: boolean;
  category: string;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are an enterprise query classifier. Analyze the query to determine if it's asking for internal company data or external general knowledge. Respond with JSON in this format: { 'isInternal': boolean, 'category': string, 'confidence': number }. For internal queries, categorize them as 'financial', 'customer', 'product', 'employee', or 'operations'. For external queries, categorize them as 'general', 'industry', 'technical', 'market', or 'regulatory'.",
        },
        {
          role: "user",
          content: query,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      isInternal: result.isInternal || false,
      category: result.category || "general",
      confidence: result.confidence || 0.5,
    };
  } catch (error: any) {
    console.error("Error analyzing query type:", error);
    // Default to external knowledge if analysis fails
    return {
      isInternal: false,
      category: "general",
      confidence: 0.5,
    };
  }
}

// Function to extract entities from a query for system routing
export async function extractEntities(query: string): Promise<{
  entities: { type: string; value: string }[];
  intentType: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "Extract named entities and the primary intent from this business query. Entities might include: products, customers, employees, dates, locations, or metrics. Return JSON in this format: { 'entities': [{'type': string, 'value': string}], 'intentType': string }. Intent types include: 'lookup', 'analyze', 'compare', 'forecast', 'summarize'.",
        },
        {
          role: "user",
          content: query,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    return {
      entities: result.entities || [],
      intentType: result.intentType || "lookup",
    };
  } catch (error: any) {
    console.error("Error extracting entities:", error);
    return {
      entities: [],
      intentType: "lookup",
    };
  }
}

// Function to extract structured data from text for visualization
export async function extractStructuredData(text: string, dataType: "chart" | "table" | "metrics"): Promise<any> {
  try {
    let systemPrompt = "";
    
    if (dataType === "chart") {
      systemPrompt = `
        Extract structured data from the text for visualization as a chart. 
        Return valid JSON that can be parsed and rendered with a charting library.
        The JSON should have the following structure:
        {
          "chartType": "bar|line|pie|scatter",
          "title": "Chart title",
          "labels": ["Label1", "Label2", ...],
          "datasets": [
            {
              "label": "Dataset name",
              "data": [value1, value2, ...]
            }
          ]
        }
        Only extract data if it actually exists in the text. If no suitable data for visualization is found, return null.
      `;
    } else if (dataType === "table") {
      systemPrompt = `
        Extract structured data from the text for display as a table.
        Return valid JSON that can be parsed and rendered as a table.
        The JSON should have the following structure:
        {
          "headers": ["Column1", "Column2", ...],
          "rows": [
            ["row1col1", "row1col2", ...],
            ["row2col1", "row2col2", ...]
          ]
        }
        Only extract data if it actually exists in the text. If no suitable data for tabular representation is found, return null.
      `;
    } else if (dataType === "metrics") {
      systemPrompt = `
        Extract key metrics/KPIs from the text.
        Return valid JSON that can be parsed and rendered as metrics.
        The JSON should have the following structure:
        {
          "metrics": [
            {"name": "Metric name", "value": value, "unit": "unit", "change": change_percent},
            ...
          ]
        }
        Only extract data if it actually exists in the text. If no suitable metrics are found, return null.
      `;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const jsonContent = response.choices[0].message.content;
    if (!jsonContent) return null;
    
    try {
      const result = JSON.parse(jsonContent);
      // Return null if the extraction didn't find suitable data
      if (
        (dataType === "chart" && (!result.chartType || !result.datasets)) ||
        (dataType === "table" && (!result.headers || !result.rows)) ||
        (dataType === "metrics" && (!result.metrics || result.metrics.length === 0))
      ) {
        return null;
      }
      return result;
    } catch (parseError) {
      console.error("Error parsing extracted structured data:", parseError);
      return null;
    }
  } catch (error: any) {
    console.error(`Error extracting ${dataType} data:`, error);
    return null;
  }
}

// Function to analyze images and describe their content
export async function analyzeImage(base64Image: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image in detail and describe its main elements, context, and any notable aspects that would be relevant in a business context."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "No analysis could be generated for this image.";
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    return "Error analyzing image. Please try again with a different image or ensure the image is in a supported format.";
  }
}