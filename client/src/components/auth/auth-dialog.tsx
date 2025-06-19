import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth-context";
import { AccessLevelBadge } from "./access-level-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ShieldAlert, Check } from "lucide-react";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [signupForm, setSignupForm] = useState({ 
    username: '', 
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  const { 
    isAuthenticated, 
    accessLevel, 
    provider, 
    username, 
    isLoading,
    login,
    signup,
    logoutUser,
    loginWithGoogle,
    loginWithApple,
    loginWithGitHub
  } = useAuth();
  
  // Handle login form input changes
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setLoginForm({
      ...loginForm,
      [id === 'email' ? 'username' : id]: value // Map email field to username
    });
    
    // Clear any existing error for this field
    if (formErrors[id]) {
      setFormErrors({
        ...formErrors,
        [id]: ''
      });
    }
  };
  
  // Handle signup form input changes
  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    // Handle name field (split into firstName and lastName)
    if (id === 'name') {
      const nameParts = value.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setSignupForm({
        ...signupForm,
        firstName,
        lastName
      });
    } else {
      setSignupForm({
        ...signupForm,
        [id === 'signup-email' ? 'email' : 
         id === 'signup-password' ? 'password' : 
         id === 'confirm-password' ? 'confirmPassword' : id]: value
      });
    }
    
    // Clear any existing error for this field
    if (formErrors[id]) {
      setFormErrors({
        ...formErrors,
        [id]: ''
      });
    }
  };
  
  // Validate login form
  const validateLoginForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!loginForm.username) {
      errors.email = 'Email is required';
    }
    
    if (!loginForm.password) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Validate signup form
  const validateSignupForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!signupForm.firstName) {
      errors.name = 'Name is required';
    }
    
    if (!signupForm.email) {
      errors['signup-email'] = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(signupForm.email)) {
      errors['signup-email'] = 'Email is invalid';
    }
    
    if (!signupForm.password) {
      errors['signup-password'] = 'Password is required';
    } else if (signupForm.password.length < 6) {
      errors['signup-password'] = 'Password must be at least 6 characters';
    }
    
    if (!signupForm.confirmPassword) {
      errors['confirm-password'] = 'Please confirm your password';
    } else if (signupForm.password !== signupForm.confirmPassword) {
      errors['confirm-password'] = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }
    
    setSubmitting(true);
    try {
      const success = await login(loginForm.username, loginForm.password);
      if (success) {
        onOpenChange(false); // Close dialog on successful login
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle signup submit
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateSignupForm()) {
      return;
    }
    
    setSubmitting(true);
    try {
      // Create a username from email if not provided
      const username = signupForm.username || signupForm.email.split('@')[0];
      
      const success = await signup(
        username, 
        signupForm.email, 
        signupForm.password,
        signupForm.firstName,
        signupForm.lastName
      );
      
      if (success) {
        onOpenChange(false); // Close dialog on successful signup
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    await logoutUser();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sign in to SOE</DialogTitle>
          <DialogDescription>
            Sign in or create an account to start using SOE
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
            <span className="ml-2">Loading authentication status...</span>
          </div>
        ) : isAuthenticated ? (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-medium">Connected to {provider}</h3>
                  {username && <p className="text-sm text-muted-foreground">User: {username}</p>}
                </div>
                <AccessLevelBadge accessLevel={accessLevel} />
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <p className="text-sm">
                You're currently logged in and can {accessLevel === "write" ? 
                  "read and modify data" : 
                  "read data (write operations restricted)"}
              </p>
              
              {accessLevel !== "write" && (
                <div className="flex items-center text-xs text-amber-500 bg-amber-500/10 p-2 rounded">
                  <ShieldAlert size={14} className="mr-1" />
                  <span>To perform write operations, please connect with write access.</span>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={handleLogout}
                disabled={submitting}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {submitting ? "Logging out..." : "Disconnect"}
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Login to Your Account</CardTitle>
                  <CardDescription>
                    Enter your credentials or use single sign-on
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Login form */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        placeholder="your@email.com"
                        className={`w-full p-2 rounded-md border ${formErrors.email ? 'border-red-500' : 'border-input'} bg-background`}
                        value={loginForm.username}
                        onChange={handleLoginChange}
                        disabled={submitting}
                      />
                      {formErrors.email && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="password">Password</label>
                      <input
                        type="password"
                        id="password"
                        placeholder="••••••••"
                        className={`w-full p-2 rounded-md border ${formErrors.password ? 'border-red-500' : 'border-input'} bg-background`}
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        disabled={submitting}
                      />
                      {formErrors.password && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>
                      )}
                    </div>
                    <Button className="w-full" type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => loginWithGoogle()}
                      disabled={submitting}
                      type="button"
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => loginWithGitHub()}
                      disabled={submitting}
                      type="button"
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5 0-.23 0-.86-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                      </svg>
                      GitHub
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => loginWithApple()}
                      disabled={submitting}
                      type="button"
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
                      </svg>
                      Apple
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4 py-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create an Account</CardTitle>
                  <CardDescription>
                    Sign up to get started with SOE
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sign up form */}
                  <form onSubmit={handleSignupSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="name">Full Name</label>
                      <input
                        type="text"
                        id="name"
                        placeholder="John Doe"
                        className={`w-full p-2 rounded-md border ${formErrors.name ? 'border-red-500' : 'border-input'} bg-background`}
                        value={`${signupForm.firstName} ${signupForm.lastName}`.trim()}
                        onChange={handleSignupChange}
                        disabled={submitting}
                      />
                      {formErrors.name && (
                        <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="signup-email">Email</label>
                      <input
                        type="email"
                        id="signup-email"
                        placeholder="john@example.com"
                        className={`w-full p-2 rounded-md border ${formErrors['signup-email'] ? 'border-red-500' : 'border-input'} bg-background`}
                        value={signupForm.email}
                        onChange={handleSignupChange}
                        disabled={submitting}
                      />
                      {formErrors['signup-email'] && (
                        <p className="text-xs text-red-500 mt-1">{formErrors['signup-email']}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="signup-password">Password</label>
                      <input
                        type="password"
                        id="signup-password"
                        placeholder="••••••••"
                        className={`w-full p-2 rounded-md border ${formErrors['signup-password'] ? 'border-red-500' : 'border-input'} bg-background`}
                        value={signupForm.password}
                        onChange={handleSignupChange}
                        disabled={submitting}
                      />
                      {formErrors['signup-password'] && (
                        <p className="text-xs text-red-500 mt-1">{formErrors['signup-password']}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="confirm-password">Confirm Password</label>
                      <input
                        type="password"
                        id="confirm-password"
                        placeholder="••••••••"
                        className={`w-full p-2 rounded-md border ${formErrors['confirm-password'] ? 'border-red-500' : 'border-input'} bg-background`}
                        value={signupForm.confirmPassword}
                        onChange={handleSignupChange}
                        disabled={submitting}
                      />
                      {formErrors['confirm-password'] && (
                        <p className="text-xs text-red-500 mt-1">{formErrors['confirm-password']}</p>
                      )}
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or sign up with
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => loginWithGoogle()}
                      disabled={submitting}
                      type="button"
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => loginWithApple()}
                      disabled={submitting}
                      type="button"
                    >
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
                      </svg>
                      Apple
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Subscription Plans</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a subscription tier that fits your organization's needs:
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Base Tier */}
                  <Card className="border-blue-200 relative">
                    <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/3">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Free
                      </Badge>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Base</CardTitle>
                      <CardDescription>Single system integration</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 pt-0">
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Connect to 1 system</span>
                      </div>
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Read-only access</span>
                      </div>
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Basic query capabilities</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant="outline">Current Plan</Button>
                    </CardFooter>
                  </Card>
                  
                  {/* Core Tier */}
                  <Card className="border-amber-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Core</CardTitle>
                      <CardDescription>Multiple system integrations</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 pt-0">
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Connect up to 5 systems</span>
                      </div>
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Read-only access</span>
                      </div>
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Advanced analytics</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Upgrade</Button>
                    </CardFooter>
                  </Card>
                  
                  {/* Pro Tier */}
                  <Card className="border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Pro</CardTitle>
                      <CardDescription>Full system integration suite</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 pt-0">
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Connect up to 10 systems</span>
                      </div>
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Read & write capabilities</span>
                      </div>
                      <div className="flex items-start">
                        <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>Custom integrations & priority support</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Upgrade</Button>
                    </CardFooter>
                  </Card>
                </div>
                
                <p className="text-sm text-muted-foreground text-center pt-2">
                  Upgrade your plan to access more systems and enhanced features
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}