import { apiRequest } from './queryClient';
import { AccessLevel, type AccessLevelType } from "@/shared/schema";

/**
 * Login with username/email and password
 */
export async function loginWithCredentials(
  username: string, 
  password: string
): Promise<any> {
  return await apiRequest(
    'POST',
    '/api/login',
    { username, password }
  );
}

/**
 * Register a new user
 */
export async function registerUser(
  username: string,
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
): Promise<any> {
  return await apiRequest(
    'POST',
    '/api/register',
    { username, email, password, firstName, lastName }
  );
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  await apiRequest('POST', '/auth/logout');
}

/**
 * Redirect to Google OAuth login
 */
export function redirectToGoogleLogin(): void {
  window.location.href = '/auth/google';
}

/**
 * Redirect to Apple OAuth login
 */
export function redirectToAppleLogin(): void {
  window.location.href = '/auth/apple';
}

/**
 * Redirect to GitHub OAuth login
 */
export function redirectToGitHubLogin(): void {
  // This assumes we'll add GitHub auth later
  // For now, we'll still provide the path but also show a notification
  console.log("GitHub login not yet implemented");
  window.location.href = '/auth/github';
}

/**
 * Initialize Salesforce OAuth flow with the specified access level
 */
export async function initSalesforceOAuth(accessLevel: AccessLevelType = AccessLevel.READ): Promise<{ url: string }> {
  const response = await apiRequest<{ url: string }>(
    'POST',
    '/auth/salesforce',
    { accessLevel }
  );
  
  if (response.url) {
    // Redirect the user to the Salesforce OAuth URL
    window.location.href = response.url;
  }
  
  return response;
}

/**
 * Get current user's access level information
 */
export async function getAccessLevel(): Promise<{
  isAuthenticated: boolean;
  accessLevel: AccessLevelType;
  provider: string | null;
  username: string | null;
}> {
  return await apiRequest(
    'GET',
    '/auth/access-level'
  );
}

/**
 * Check if current user can perform write operations
 */
export async function canPerformWrite(): Promise<boolean> {
  try {
    const accessInfo = await getAccessLevel();
    return accessInfo.isAuthenticated && accessInfo.accessLevel === AccessLevel.WRITE;
  } catch (error) {
    return false;
  }
}