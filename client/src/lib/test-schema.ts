// Test file to verify shared schema imports
import type { 
  User, 
  System, 
  Conversation, 
  Message, 
  Document as DocumentType,
  ChartData,
  TableData
} from '@shared/schema';

import { 
  AccessLevel,
  SubscriptionTier,
  AuthProvider,
  DocumentType as DocType,
  userLoginSchema,
  userRegisterSchema
} from '@shared/schema';

// Test that all enums and schemas are properly imported
export const testSchemaImports = {
  AccessLevel,
  SubscriptionTier,
  AuthProvider,
  DocumentType: DocType,
  userLoginSchema,
  userRegisterSchema
};

// Test schema validation
export const testSchemaValidation = () => {
  try {
    const loginData = { username: 'test', password: 'test123' };
    const result = userLoginSchema.parse(loginData);
    console.log('Schema validation test passed:', result);
    return true;
  } catch (error) {
    console.error('Schema validation test failed:', error);
    return false;
  }
}; 