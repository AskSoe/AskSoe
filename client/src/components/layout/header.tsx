import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, LogIn, Shield, ShieldCheck, UserCog, Crown } from "lucide-react";
import { Link } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth-context";
import { AccessLevelBadge } from "@/components/auth/access-level-badge";
import { useAuthDialogProvider } from "@/components/auth/auth-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfileSheet } from "@/components/profile/user-profile-sheet";
import { AdminConsole } from "@/components/admin/admin-console";

interface HeaderProps {
  title: string;
  onOpenSidebar?: () => void;
}

export function Header({ title, onOpenSidebar }: HeaderProps) {
  const isMobile = useMobile();
  const { isAuthenticated, accessLevel, provider, username } = useAuth();
  const { setIsOpen } = useAuthDialogProvider();
  const [adminConsoleOpen, setAdminConsoleOpen] = useState(false);
  
  console.log("Header - Auth state:", { isAuthenticated, accessLevel, provider, username });
  
  // Check if current user is master admin (Dan)
  const isMasterAdmin = username === "dangshaw@gmail.com" || username?.toLowerCase().includes("dan");
  
  // Use real authentication state and show admin console for your account
  const forcedAuth = isAuthenticated;
  
  // Only Staff Admin users should have admin console access
  const isAdmin = isMasterAdmin && isAuthenticated;
  
  // Function to handle auth dialog opening
  const handleOpenAuthDialog = () => {
    setIsOpen(true);
  };
  
  // Function to handle admin console opening
  const handleOpenAdminConsole = () => {
    setAdminConsoleOpen(true);
  };
  
  return (
    <div className="bg-gradient-to-r from-[#002B5B] via-[#05458C] to-[#0A66C2] border-b border-blue-800/20">
      <div className="h-16 relative flex items-center justify-between px-4 md:px-6">
        {/* Menu Button (Mobile) only */}
        <div className="flex items-center space-x-2 z-10">
          {isMobile && onOpenSidebar && (
            <Button variant="ghost" size="icon" onClick={onOpenSidebar} className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {/* Logo and "Ask SOE" text removed as requested */}
        </div>
        
        {/* Center title with link to homepage */}
        <div className="absolute inset-x-0 flex justify-center items-center">
          <Link href="/" className="text-lg font-bold text-[#F4EFE6] hover:opacity-80 transition-opacity">
            <h1>SOE</h1>
          </Link>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3 z-10">
          <TooltipProvider>
            {forcedAuth ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden md:block">
                    <UserProfileSheet>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex items-center gap-2" 
                      >
                        {isMasterAdmin ? (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        ) : accessLevel === "write" ? (
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                        ) : (
                          <Shield className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="hidden lg:inline">My Account</span>
                        <AccessLevelBadge accessLevel={accessLevel} className="ml-1" />
                      </Button>
                    </UserProfileSheet>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manage your account</p>
                  <p className="text-xs">Connected to {provider}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="hidden md:flex items-center gap-2" 
                    onClick={handleOpenAuthDialog}
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign in or create an account</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
          
          {/* Mobile auth button */}
          {forcedAuth ? (
            <div className="md:hidden">
              <UserProfileSheet>
                <Button 
                  variant="outline"
                  size="icon" 
                >
                  {accessLevel === "write" ? (
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-amber-500" />
                  )}
                </Button>
              </UserProfileSheet>
            </div>
          ) : (
            <Button 
              variant="default"
              size="icon" 
              className="md:hidden"
              onClick={handleOpenAuthDialog}
            >
              <LogIn className="h-5 w-5" />
            </Button>
          )}
          

          {/* Admin Console Button - Only show for admins */}
          {isAdmin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-neutral-500 hover:text-neutral-700"
                    onClick={handleOpenAdminConsole}
                  >
                    <UserCog className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Admin Console</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Admin Console Dialog */}
      <AdminConsole open={adminConsoleOpen} onClose={() => setAdminConsoleOpen(false)} />
    </div>
  );
}
