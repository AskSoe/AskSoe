import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth-context";
import { Crown, Settings, LogOut, Menu } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

export function TopNav() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, username, subscriptionTier, logoutUser } = useAuth();
  
  return (
    <div className="nav-modern border-b border-border bg-[#001f3f]">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <div className="mr-4 flex items-center">
          <Link href="/app">
            <span className="text-xl font-bold cursor-pointer text-white hover:text-primary transition-colors outfit-semibold">SOE</span>
          </Link>
        </div>
        
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="mobile-nav-button text-white hover:bg-primary/10 ml-auto md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Desktop navigation */}
        <nav className="nav-links items-center space-x-2 lg:space-x-4 mx-6 hidden md:flex">
          <Link href="/app">
            <Button 
              variant={location === '/app' ? "default" : "ghost"} 
              className="btn-modern text-sm font-medium text-white hover:text-primary hover:bg-primary/10 hover-glow"
            >
              Dashboard
            </Button>
          </Link>
          
          <Link href="/subscription-plans">
            <Button 
              variant={location === '/subscription-plans' ? "default" : "ghost"} 
              className="btn-modern text-sm font-medium text-white hover:text-primary hover:bg-primary/10 hover-glow"
            >
              Plans
            </Button>
          </Link>
        </nav>
        
        {/* Desktop user menu */}
        <div className="ml-auto hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              {subscriptionTier === 'staff_admin' && (
                <Link href="/admin">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="btn-modern text-white hover:text-yellow-400 hover:bg-yellow-400/10 hover-glow"
                  >
                    <Crown className="h-4 w-4 mr-1 text-yellow-400" />
                    Admin
                  </Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full hover-glow">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-white text-xs outfit-medium">
                        {username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card border-border" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-sm text-foreground outfit-medium">
                        {username}
                      </p>
                      <p className="text-xs text-muted-foreground outfit-regular">
                        {subscriptionTier} tier
                      </p>
                    </div>
                  </div>
                  <DropdownMenuItem className="cursor-pointer hover-glow">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-destructive hover-glow" onClick={() => logoutUser()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button size="sm" className="btn-modern btn-primary hover-glow">Log in</Button>
          )}
        </div>

        {/* Mobile user menu */}
        {isAuthenticated && (
          <div className="md:hidden flex items-center space-x-2">
            {subscriptionTier === 'staff_admin' && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-white hover:bg-yellow-400/10">
                  <Crown className="h-4 w-4 text-yellow-400" />
                </Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card border-border" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm text-foreground">
                      {username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {subscriptionTier} tier
                    </p>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/app" className="cursor-pointer">
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/subscription-plans" className="cursor-pointer">
                    Plans
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => logoutUser()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}