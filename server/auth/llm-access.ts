import { getUserAccessLevel } from './salesforce';
import { getLlmPromptWrapper } from './salesforce';

/**
 * Wraps a user's prompt with access-level specific system instructions
 */
export async function wrapPromptWithAccessControl(
  userId: number,
  message: Message
): Promise<Message> {
  try {
    // Get user's access level
    const accessLevel = await getUserAccessLevel(userId);
    
    // Get appropriate wrapper based on access level
    const accessWrapper = getLlmPromptWrapper(accessLevel);
    
    // Only modify system messages or include as a system message if none exists
    const wrappedMessage: Message = {
      ...message,
      content: `${accessWrapper}\n\n${message.content}` // Prepend the access control wrapper
    };
    
    return wrappedMessage;
  } catch (error) {
    console.error('Error wrapping prompt with access control:', error);
    // In case of error, return the original message
    return message;
  }
}

/**
 * Checks if a user has permission to perform write operations
 */
export async function canUserPerformWrite(userId: number): Promise<boolean> {
  try {
    const accessLevel = await getUserAccessLevel(userId);
    return accessLevel === AccessLevel.WRITE;
  } catch (error) {
    console.error('Error checking write permissions:', error);
    return false; // Default to no write access on error
  }
}

/**
 * Modifies response based on access level - removes action suggestions if read-only
 */
export async function filterResponseForAccessLevel(
  userId: number,
  response: string
): Promise<string> {
  try {
    const accessLevel = await getUserAccessLevel(userId);
    
    if (accessLevel === AccessLevel.READ) {
      // For read-only users, we might want to filter out certain types of suggestions
      // This is a simple example - a real implementation might be more sophisticated
      
      // Remove any action suggestion sections
      response = response.replace(/\n## Actions You Can Take:[\s\S]*?(?=\n##|\n\n|$)/, '');
      
      // Add a note about read-only mode if actions were suggested
      if (response.includes('create') || response.includes('update') || response.includes('delete')) {
        response += '\n\n*Note: You are in read-only mode. To perform create, update, or delete operations, please request write-level access.*';
      }
    }
    
    return response;
  } catch (error) {
    console.error('Error filtering response for access level:', error);
    return response; // Return original response in case of error
  }
}