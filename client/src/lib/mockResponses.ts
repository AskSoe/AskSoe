// Mock response system for demo purposes

// Map of query/response patterns
export const mockResponses: Record<string, string> = {
  // Pipeline and sales queries
  "what's our q4 pipeline by region?": "Here's the Q4 pipeline breakdown:\n\n- APAC: $1.2M\n- EMEA: $850K\n- AMER: $2.5M\n\nTotal: $4.55M",
  "how many open deals do we have?": "There are 134 open deals across all regions.\n\nTop 3 reps:\n1. Jordan Lee – 22 deals\n2. Priya Mehta – 19 deals\n3. Daniel Shaw – 17 deals",
  "show me a chart of revenue by product": "🟦 Product A – $1.3M\n🟥 Product B – $2.1M\n🟩 Product C – $950K\n\n(TODO: Embed a real chart here)",
  "what's our churn rate?": "Customer churn for Q3 was 3.8%, down from 5.1% in Q2.\n\nKey reasons:\n- Price sensitivity in mid-market\n- Onboarding delays for new clients",
  "q4 sales summary": "Q4 Sales Summary from our systems:\n\n• Total Revenue: $5.7M (+12% YoY)\n• New Customers: 27\n• Expansion Revenue: $1.2M\n• Top Product: Enterprise Suite ($2.3M)\n• Largest Deal: Acme Corp ($450K)",
  "customer acquisition cost": "Current Customer Acquisition Cost (CAC):\n\n• SMB: $2,450\n• Mid-Market: $12,800\n• Enterprise: $95,200\n\nAverage CAC: $18,750 (-5% QoQ)",
  "industry benchmarks": "Industry Benchmarks for SaaS:\n\n• Average ARR Growth: 27% (Our growth: 32%)\n• NPS: 38 (Our NPS: 52)\n• Retention Rate: 85% (Our rate: 91%)\n• Sales Cycle: 90 days (Our cycle: 78 days)",
  
  // Additional business intelligence queries
  "what's our pipeline": "Current Pipeline Overview:\n\n• Total Value: $8.2M\n• Number of Opportunities: 187\n• Average Deal Size: $43.8K\n• Forecasted Close Rate: 65%\n• Top Segment: Enterprise (42% of pipeline)",
  "sales forecast": "Sales Forecast for Next Quarter:\n\n• Expected Revenue: $6.3M - $7.1M\n• Projected Growth: 14-18% YoY\n• Most Growth: Cloud Services (+24%)\n• Challenge Area: SMB segment (projected -5%)",
  "win rate": "Sales Win Rate Analysis:\n\n• Overall Win Rate: 37%\n• By Segment:\n  - Enterprise: 42%\n  - Mid-Market: 38%\n  - SMB: 31%\n• Competitive Wins vs. Market Leader: 28% (+4pts YoY)",
  "top customers": "Top 5 Customers by Revenue:\n\n1. Acme Corp: $1.2M ARR\n2. TechGiant Inc: $950K ARR\n3. Global Shipping Ltd: $820K ARR\n4. Northern Financial: $775K ARR\n5. Innovate Health: $680K ARR",
  "product performance": "Product Performance Metrics:\n\n• Most Revenue: Enterprise Suite ($8.4M YTD)\n• Fastest Growing: Mobile Platform (+41% YoY)\n• Highest Margin: Security Module (78% gross margin)\n• Most Customer Adoption: API Toolkit (218 customers)",
  "marketing roi": "Marketing ROI by Channel:\n\n• Content Marketing: 320% ROI\n• Paid Search: 280% ROI\n• Events/Conferences: 210% ROI\n• Social Media: 180% ROI\n• Email Campaigns: 350% ROI",
  "revenue by customer segment": "Revenue by Customer Segment (YTD):\n\n• Enterprise: $12.4M (48%)\n• Mid-Market: $8.7M (34%)\n• SMB: $4.6M (18%)\n\nFastest Growing: Mid-Market (+23% YoY)"
};

// Function to find the best match for a user query
export function findMockResponse(query: string): string | null {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Handle follow-up questions
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
  const commonKeywords = [
    'revenue', 'sales', 'pipeline', 'deals', 'churn', 'customer', 
    'benchmark', 'product', 'win rate', 'forecast', 'marketing', 
    'roi', 'segment', 'performance', 'opportunities'
  ];
  
  // Check for multiple keyword matches to increase accuracy
  for (const key of Object.keys(mockResponses)) {
    let matchCount = 0;
    for (const keyword of commonKeywords) {
      if (normalizedQuery.includes(keyword) && key.includes(keyword)) {
        matchCount++;
      }
    }
    
    // If multiple keywords match, this is likely the right response
    if (matchCount >= 1) {
      return mockResponses[key];
    }
  }
  
  // Simple keyword matching as fallback
  for (const keyword of commonKeywords) {
    if (normalizedQuery.includes(keyword)) {
      for (const key of Object.keys(mockResponses)) {
        if (key.includes(keyword)) {
          return mockResponses[key];
        }
      }
    }
  }
  
  // Default response if no match found
  return null;
}

// Simulate a processing delay with a response
export async function getMockResponse(query: string): Promise<string> {
  // First try to find a match in our mock responses
  const response = findMockResponse(query);
  
  // Simulate network delay (between 1-3 seconds)
  const delay = Math.floor(Math.random() * 2000) + 1000;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      if (response) {
        resolve(response);
      } else {
        resolve(
          "I couldn't find specific data for that query. Here are some topics I can help with:\n\n" +
          "• Q4 sales performance\n" +
          "• Pipeline by region\n" +
          "• Customer churn metrics\n" +
          "• Revenue by product\n" +
          "• Open deals and sales rep performance"
        );
      }
    }, delay);
  });
}