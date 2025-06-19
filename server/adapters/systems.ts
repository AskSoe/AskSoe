
// System adapter interface
export interface SystemAdapter {
  getName(): string;
  getType(): string;
  query(query: string): Promise<any>;
  getStatus(): "connected" | "disconnected" | "limited" | "error";
}

// Base adapter class
export abstract class BaseSystemAdapter implements SystemAdapter {
  protected system: System;
  
  constructor(system: System) {
    this.system = system;
  }
  
  getName(): string {
    return this.system.name;
  }
  
  getType(): string {
    return this.system.type;
  }
  
  getStatus(): "connected" | "disconnected" | "limited" | "error" {
    return this.system.status as any;
  }
  
  abstract query(query: string): Promise<any>;
}

// CRM Adapter
export class CrmAdapter extends BaseSystemAdapter {
  async query(query: string): Promise<any> {
    // In a real implementation, this would connect to the CRM API
    // For now, we'll return mock data
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes("customer") && lowerQuery.includes("retention")) {
      return {
        type: "customer_retention",
        data: {
          quarters: ["Q1 2023", "Q2 2023", "Q3 2023", "Q4 2023"],
          retentionRates: [84.3, 87.1, 82.6, 91.2],
          churnRates: [15.7, 12.9, 17.4, 8.8],
          newCustomers: [142, 156, 128, 163]
        }
      };
    }
    
    if (lowerQuery.includes("sales") || lowerQuery.includes("pipeline")) {
      return {
        type: "sales_pipeline",
        data: {
          stages: ["Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"],
          counts: [324, 215, 98, 56, 42, 31],
          values: [0, 2150000, 980000, 560000, 420000, 310000]
        }
      };
    }
    
    return {
      type: "unknown",
      error: "No relevant data found for this query in the CRM system"
    };
  }
}

// ERP Adapter
export class ErpAdapter extends BaseSystemAdapter {
  async query(query: string): Promise<any> {
    // Mock ERP data response
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes("inventory") || lowerQuery.includes("stock")) {
      return {
        type: "inventory",
        data: {
          categories: ["Raw Materials", "Work in Progress", "Finished Goods"],
          quantities: [1250, 320, 780],
          values: [185000, 240000, 520000]
        }
      };
    }
    
    if (lowerQuery.includes("revenue") || lowerQuery.includes("sales")) {
      return {
        type: "financial",
        data: {
          months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          revenue: [420000, 390000, 440000, 480000, 510000, 540000, 520000, 550000, 590000, 620000, 680000, 710000],
          costs: [310000, 295000, 320000, 350000, 380000, 410000, 390000, 415000, 440000, 470000, 510000, 530000],
          profit: [110000, 95000, 120000, 130000, 130000, 130000, 130000, 135000, 150000, 150000, 170000, 180000]
        }
      };
    }
    
    return {
      type: "unknown",
      error: "No relevant data found for this query in the ERP system"
    };
  }
}

// Visualization Platform Adapter
export class VisualizationAdapter extends BaseSystemAdapter {
  async query(query: string): Promise<any> {
    // Mock visualization platform data
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes("dashboard") || lowerQuery.includes("kpi")) {
      return {
        type: "dashboard",
        data: {
          kpis: [
            { name: "Revenue YTD", value: "$6.45M", target: "$6.2M", status: "above" },
            { name: "Customer Satisfaction", value: "4.2/5", target: "4.0/5", status: "above" },
            { name: "Average Order Value", value: "$1,250", target: "$1,200", status: "above" },
            { name: "Customer Acquisition Cost", value: "$420", target: "$400", status: "below" }
          ]
        }
      };
    }
    
    if (lowerQuery.includes("customer") && lowerQuery.includes("segment")) {
      return {
        type: "customer_segments",
        data: {
          segments: ["Enterprise", "Mid-Market", "SMB", "Startup"],
          revenue: [2800000, 1950000, 1150000, 550000],
          counts: [15, 45, 120, 210],
          retention: [95.2, 88.7, 82.4, 76.8]
        }
      };
    }
    
    return {
      type: "unknown",
      error: "No relevant visualization found for this query"
    };
  }
}

// Factory to create appropriate system adapter
export function createSystemAdapter(system: System): SystemAdapter {
  switch (system.type) {
    case "crm":
      return new CrmAdapter(system);
    case "erp":
      return new ErpAdapter(system);
    case "visualization":
      return new VisualizationAdapter(system);
    default:
      throw new Error(`Unknown system type: ${system.type}`);
  }
}

// Function to query all relevant systems
export async function queryAllSystems(systems: System[], query: string): Promise<any[]> {
  const adapters = systems.map(createSystemAdapter);
  const results = await Promise.all(
    adapters.map(async (adapter) => {
      try {
        const result = await adapter.query(query);
        return {
          system: adapter.getName(),
          type: adapter.getType(),
          status: adapter.getStatus(),
          result
        };
      } catch (error) {
        return {
          system: adapter.getName(),
          type: adapter.getType(),
          status: "error",
          error: error.message || "Unknown error querying system"
        };
      }
    })
  );
  
  return results;
}
