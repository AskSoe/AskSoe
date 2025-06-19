import { getTenantCredentials, saveTenantCredentials } from "./tenant-auth";

// Supported integration types
export enum IntegrationType {
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  TABLEAU = 'tableau',
  SAP = 'sap',
  MICROSOFT_DYNAMICS = 'microsoft_dynamics',
  ORACLE = 'oracle',
  WORKDAY = 'workday',
  SLACK = 'slack',
  TEAMS = 'teams'
}

// Integration configuration templates
export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  requiredFields: string[];
  description: string;
  authType: 'oauth' | 'api_key' | 'basic_auth';
}

export const INTEGRATION_CONFIGS: Record<IntegrationType, IntegrationConfig> = {
  [IntegrationType.SALESFORCE]: {
    type: IntegrationType.SALESFORCE,
    name: 'Salesforce CRM',
    requiredFields: ['instanceUrl', 'accessToken', 'refreshToken'],
    description: 'Connect to Salesforce CRM for customer data and analytics',
    authType: 'oauth'
  },
  [IntegrationType.HUBSPOT]: {
    type: IntegrationType.HUBSPOT,
    name: 'HubSpot CRM',
    requiredFields: ['apiKey'],
    description: 'Connect to HubSpot for marketing and sales data',
    authType: 'api_key'
  },
  [IntegrationType.TABLEAU]: {
    type: IntegrationType.TABLEAU,
    name: 'Tableau Analytics',
    requiredFields: ['serverUrl', 'username', 'password', 'siteId'],
    description: 'Connect to Tableau for data visualization and reporting',
    authType: 'basic_auth'
  },
  [IntegrationType.SAP]: {
    type: IntegrationType.SAP,
    name: 'SAP ERP',
    requiredFields: ['baseUrl', 'username', 'password', 'client'],
    description: 'Connect to SAP ERP for enterprise resource planning data',
    authType: 'basic_auth'
  },
  [IntegrationType.MICROSOFT_DYNAMICS]: {
    type: IntegrationType.MICROSOFT_DYNAMICS,
    name: 'Microsoft Dynamics 365',
    requiredFields: ['resourceUrl', 'accessToken', 'refreshToken'],
    description: 'Connect to Microsoft Dynamics 365 for CRM and ERP data',
    authType: 'oauth'
  },
  [IntegrationType.ORACLE]: {
    type: IntegrationType.ORACLE,
    name: 'Oracle Cloud',
    requiredFields: ['baseUrl', 'username', 'password'],
    description: 'Connect to Oracle Cloud applications',
    authType: 'basic_auth'
  },
  [IntegrationType.WORKDAY]: {
    type: IntegrationType.WORKDAY,
    name: 'Workday HCM',
    requiredFields: ['tenantUrl', 'username', 'password'],
    description: 'Connect to Workday for HR and financial data',
    authType: 'basic_auth'
  },
  [IntegrationType.SLACK]: {
    type: IntegrationType.SLACK,
    name: 'Slack',
    requiredFields: ['botToken', 'appToken'],
    description: 'Connect to Slack for team communication data',
    authType: 'oauth'
  },
  [IntegrationType.TEAMS]: {
    type: IntegrationType.TEAMS,
    name: 'Microsoft Teams',
    requiredFields: ['accessToken', 'refreshToken'],
    description: 'Connect to Microsoft Teams for collaboration data',
    authType: 'oauth'
  }
};

// Integration service class
export class IntegrationService {
  
  static async getAvailableIntegrations(): Promise<IntegrationConfig[]> {
    return Object.values(INTEGRATION_CONFIGS);
  }

  static async getTenantIntegrations(tenantId: string): Promise<any[]> {
    const credentials = await getTenantCredentials(tenantId);
    
    return credentials.map(cred => ({
      type: cred.appType,
      name: INTEGRATION_CONFIGS[cred.appType as IntegrationType]?.name || cred.appType,
      connected: true,
      lastUpdated: cred.encryptedAt,
      config: INTEGRATION_CONFIGS[cred.appType as IntegrationType]
    }));
  }

  static async connectIntegration(
    tenantId: string, 
    integrationType: IntegrationType, 
    credentials: Record<string, any>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const config = INTEGRATION_CONFIGS[integrationType];
      if (!config) {
        return { success: false, message: 'Unsupported integration type' };
      }

      // Validate required fields
      const missingFields = config.requiredFields.filter(field => !credentials[field]);
      if (missingFields.length > 0) {
        return { 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        };
      }

      // Test connection before saving
      const connectionTest = await this.testConnection(integrationType, credentials);
      if (!connectionTest.success) {
        return { 
          success: false, 
          message: `Connection test failed: ${connectionTest.error}` 
        };
      }

      // Save credentials
      await saveTenantCredentials(tenantId, integrationType, credentials);

      return { 
        success: true, 
        message: `Successfully connected to ${config.name}` 
      };
    } catch (error) {
      console.error('Integration connection error:', error);
      return { 
        success: false, 
        message: 'Failed to connect integration' 
      };
    }
  }

  static async testConnection(
    integrationType: IntegrationType, 
    credentials: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    // Basic validation - in production, implement actual API tests
    try {
      switch (integrationType) {
        case IntegrationType.SALESFORCE:
          if (!credentials.instanceUrl || !credentials.accessToken) {
            return { success: false, error: 'Missing Salesforce credentials' };
          }
          break;
          
        case IntegrationType.HUBSPOT:
          if (!credentials.apiKey) {
            return { success: false, error: 'Missing HubSpot API key' };
          }
          break;
          
        case IntegrationType.TABLEAU:
          if (!credentials.serverUrl || !credentials.username || !credentials.password) {
            return { success: false, error: 'Missing Tableau credentials' };
          }
          break;
          
        default:
          // Basic check for any credentials
          if (Object.keys(credentials).length === 0) {
            return { success: false, error: 'No credentials provided' };
          }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Connection test failed' };
    }
  }

  static async getIntegrationData(
    tenantId: string, 
    integrationType: IntegrationType,
    query?: string
  ): Promise<any> {
    try {
      const credentials = await getTenantCredentials(tenantId, integrationType);
      if (credentials.length === 0) {
        throw new Error(`No ${integrationType} credentials found for tenant`);
      }

      const creds = credentials[0].credentials;
      
      // Route to appropriate data fetcher based on integration type
      switch (integrationType) {
        case IntegrationType.SALESFORCE:
          return await this.fetchSalesforceData(creds, query);
        case IntegrationType.HUBSPOT:
          return await this.fetchHubSpotData(creds, query);
        case IntegrationType.TABLEAU:
          return await this.fetchTableauData(creds, query);
        default:
          return { message: `Data fetching for ${integrationType} not implemented yet` };
      }
    } catch (error) {
      console.error(`Error fetching ${integrationType} data:`, error);
      throw error;
    }
  }

  // Data fetchers for each integration
  private static async fetchSalesforceData(credentials: any, query?: string): Promise<any> {
    // In production, implement actual Salesforce API calls
    return {
      source: 'Salesforce',
      query,
      data: [],
      message: 'Salesforce integration ready - provide API credentials to fetch real data'
    };
  }

  private static async fetchHubSpotData(credentials: any, query?: string): Promise<any> {
    // In production, implement actual HubSpot API calls
    return {
      source: 'HubSpot',
      query,
      data: [],
      message: 'HubSpot integration ready - provide API credentials to fetch real data'
    };
  }

  private static async fetchTableauData(credentials: any, query?: string): Promise<any> {
    // In production, implement actual Tableau API calls
    return {
      source: 'Tableau',
      query,
      data: [],
      message: 'Tableau integration ready - provide API credentials to fetch real data'
    };
  }
}