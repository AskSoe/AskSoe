import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AuthPage() {
  const { isAuthenticated, login, signup, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  
  // Login form state
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  // Register form state
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Redirect to main app if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/app');
    }
    
    // Trigger fade-in animation after component mounts
    setTimeout(() => setIsVisible(true), 100);
  }, [isAuthenticated, setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const success = await login(loginData.username, loginData.password);
      if (success) {
        setLocation('/app');
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    try {
      const success = await signup(
        registerData.username,
        registerData.email,
        registerData.password
      );
      if (success) {
        setLocation('/app');
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0F2B4D] via-[#1a4b73] to-[#0F2B4D] relative flex items-center justify-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/5 w-32 h-32 bg-[#F4EFE6] rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-[#F4EFE6] rounded-full animate-bounce delay-300"></div>
        <div className="absolute bottom-1/3 left-1/3 w-20 h-20 bg-[#F4EFE6] rounded-full animate-pulse delay-700"></div>
      </div>

      {/* Back to Home Link */}
      <Link href="/">
        <div className="absolute top-8 left-8 text-[#F4EFE6] hover:text-opacity-80 transition-colors cursor-pointer flex items-center space-x-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-lg font-medium">Back to SOE</span>
        </div>
      </Link>

      {/* Main Auth Container */}
      <div className={`max-w-md w-full mx-8 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#F4EFE6] mb-2">Welcome to SOE</h1>
          <p className="text-[#F4EFE6] text-opacity-80 text-lg">Your Enterprise Decision Layer</p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#F4EFE6] bg-opacity-95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#0F2B4D] bg-opacity-10">
              <TabsTrigger 
                value="login" 
                className="text-[#0F2B4D] data-[state=active]:bg-[#0F2B4D] data-[state=active]:text-[#F4EFE6]"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="register"
                className="text-[#0F2B4D] data-[state=active]:bg-[#0F2B4D] data-[state=active]:text-[#F4EFE6]"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="login-username" className="text-[#0F2B4D] font-medium">Username</Label>
                  <Input
                    id="login-username"
                    type="text"
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="bg-white border-[#0F2B4D] border-opacity-20 text-[#0F2B4D] focus:border-[#0F2B4D]"
                    placeholder="Enter your username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-[#0F2B4D] font-medium">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="bg-white border-[#0F2B4D] border-opacity-20 text-[#0F2B4D] focus:border-[#0F2B4D]"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#0F2B4D] hover:bg-[#0F2B4D] hover:bg-opacity-90 text-[#F4EFE6] py-3 text-lg font-semibold rounded-xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="register-username" className="text-[#0F2B4D] font-medium">Username</Label>
                  <Input
                    id="register-username"
                    type="text"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                    className="bg-white border-[#0F2B4D] border-opacity-20 text-[#0F2B4D] focus:border-[#0F2B4D]"
                    placeholder="Choose a username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-[#0F2B4D] font-medium">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    className="bg-white border-[#0F2B4D] border-opacity-20 text-[#0F2B4D] focus:border-[#0F2B4D]"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-[#0F2B4D] font-medium">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    className="bg-white border-[#0F2B4D] border-opacity-20 text-[#0F2B4D] focus:border-[#0F2B4D]"
                    placeholder="Choose a password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm" className="text-[#0F2B4D] font-medium">Confirm Password</Label>
                  <Input
                    id="register-confirm"
                    type="password"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                    className="bg-white border-[#0F2B4D] border-opacity-20 text-[#0F2B4D] focus:border-[#0F2B4D]"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#0F2B4D] hover:bg-[#0F2B4D] hover:bg-opacity-90 text-[#F4EFE6] py-3 text-lg font-semibold rounded-xl transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>


        </div>
      </div>
    </div>
  );
}