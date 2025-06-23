import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  AccessLevel, 
  type AccessLevelType,
  type SubscriptionTierType,
  type User
} from "@/shared/schema";
import { 
  getAccessLevel, 
  loginWithCredentials, 
  registerUser, 
  logout,
  redirectToGoogleLogin,
  redirectToAppleLogin,
  redirectToGitHubLogin
} from "@/lib/authApi";
import { useToast } from "@/hooks/use-toast";

// Auth context type definition
interface AuthContextType {
  isAuthenticated: boolean;
  accessLevel: AccessLevelType;
  provider: string | null;
  username: string | null;
  subscriptionTier: SubscriptionTierType | null;
  isLoading: boolean;
  refreshAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<boolean>;
  logoutUser: () => Promise<void>;
  loginWithGoogle: () => void;
  loginWithApple: () => void;
  loginWithGitHub: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  accessLevel: AccessLevel.READ,
  provider: null,
  username: null,
  subscriptionTier: null,
  isLoading: true,
  refreshAuth: async () => {},
  login: async () => false,
  signup: async () => false,
  logoutUser: async () => {},
  loginWithGoogle: () => {},
  loginWithApple: () => {},
  loginWithGitHub: () => {}
});

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<Omit<AuthContextType, 'refreshAuth' | 'isLoading' | 'login' | 'signup' | 'logoutUser' | 'loginWithGoogle' | 'loginWithApple' | 'loginWithGitHub'>>({
    isAuthenticated: false,
    accessLevel: AccessLevel.READ,
    provider: null,
    username: null,
    subscriptionTier: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Function to refresh authentication status
  const refreshAuth = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated (default to logged out)
      try {
        console.log("Checking user status via /api/user endpoint");
        const userResponse = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log("User data from /api/user:", userData);
          
          // Set authenticated state with data from /api/user
          setAuthState({
            isAuthenticated: true,
            accessLevel: userData.accessLevel || AccessLevel.READ,
            provider: userData.provider || null,
            username: userData.username || null,
            subscriptionTier: userData.subscriptionTier || null
          });
          
          setIsLoading(false);
          return;
        }
        
        // If not authenticated, set logged out state
        console.log("User not authenticated, setting logged out state");
        setAuthState({
          isAuthenticated: false,
          accessLevel: AccessLevel.READ,
          provider: null,
          username: null,
          subscriptionTier: null
        });
        
      } catch (userError) {
        console.error("Error fetching from /api/user:", userError);
        // On error, default to logged out
        setAuthState({
          isAuthenticated: false,
          accessLevel: AccessLevel.READ,
          provider: null,
          username: null,
          subscriptionTier: null
        });
      }
    } catch (error) {
      console.error("Error fetching authentication status:", error);
      // On error, default to logged out
      setAuthState({
        isAuthenticated: false,
        accessLevel: AccessLevel.READ,
        provider: null,
        username: null,
        subscriptionTier: null
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Make the login API call
      console.log(`Attempting to login with username: ${username}`);
      const response = await loginWithCredentials(username, password);
      
      // Check if response is valid
      if (!response) {
        throw new Error("Login failed: No response from server");
      }
      
      console.log("Login response:", response);
      
      // Directly update state with the user data received
      setAuthState({
        isAuthenticated: true,
        accessLevel: response.accessLevel || AccessLevel.READ,
        provider: response.provider || null,
        username: response.username || username,
        subscriptionTier: response.subscriptionTier || null
      });
      
      toast({
        title: "Login Successful",
        description: "You have been successfully logged in.",
        variant: "default"
      });
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Check for specific error types
      let errorMessage = "Invalid username or password. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response && error.response.status === 401) {
        errorMessage = "Login failed: Invalid credentials";
      } else if (error.response && error.response.status === 404) {
        errorMessage = "Login failed: Authentication service unavailable";
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Signup function
  const signup = async (
    username: string, 
    email: string, 
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log(`Attempting to register user: ${username}, ${email}`);
      
      // Make the registration API call
      const response = await registerUser(username, email, password, firstName, lastName);
      
      // Check if response is valid
      if (!response) {
        throw new Error("Registration failed: No response from server");
      }
      
      console.log("Registration response:", response);
      
      // Directly update auth state with the user data received
      setAuthState({
        isAuthenticated: true,
        accessLevel: response.accessLevel || AccessLevel.READ,
        provider: response.provider || null,
        username: response.username || username,
        subscriptionTier: response.subscriptionTier || null
      });
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created. You are now logged in.",
        variant: "default"
      });
      return true;
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Check for specific error types
      let errorMessage = "Could not create account. Please try again.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response && error.response.status === 400) {
        errorMessage = "Registration failed: Invalid information provided";
      } else if (error.response && error.response.status === 409) {
        errorMessage = "Registration failed: Username or email already exists";
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logoutUser = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await logout();
      setAuthState({
        isAuthenticated: false,
        accessLevel: AccessLevel.READ,
        provider: null,
        username: null,
        subscriptionTier: null
      });
      toast({
        title: "Logout Successful",
        description: "You have been logged out.",
        variant: "default"
      });
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // OAuth login methods
  const loginWithGoogle = () => redirectToGoogleLogin();
  const loginWithApple = () => redirectToAppleLogin();
  const loginWithGitHub = () => {
    redirectToGitHubLogin();
    toast({
      title: "GitHub Login",
      description: "GitHub login is not yet implemented.",
      variant: "default"
    });
  };

  // Load auth status on mount
  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        ...authState, 
        isLoading, 
        refreshAuth,
        login,
        signup,
        logoutUser,
        loginWithGoogle,
        loginWithApple,
        loginWithGitHub
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}