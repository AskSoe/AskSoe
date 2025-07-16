import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth-context";
import { 
  User, 
  Shield, 
  Server, 
  LogOut,
  UserPlus,
  ArrowRight,
  Award,
  Crown,
  CheckCheck
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectDialog } from "@/components/system/connect-dialog";
import { SubscriptionDialog } from "@/components/subscription/subscription-dialog";
import { SubscriptionTier, tierLimits, AccessLevel } from "@shared/schema";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface UserProfileSheetProps {
  children?: React.ReactNode;
}

export function UserProfileSheet({ children }: UserProfileSheetProps) {
  const { isAuthenticated, username, accessLevel, provider, logoutUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  
  console.log("UserProfileSheet - Auth state:", { isAuthenticated, username, accessLevel, provider });
  
  // Build user info from actual auth state
  const userInfo = {
    username: username || "User",
    role: "Member",
    email: username ? `${username}@example.com` : "user@example.com", // Use actual email if available
    joinDate: "March 2025",
    subscriptionTier: SubscriptionTier.FREE as string, // Cast as string to avoid type errors
    systemsConnected: 1,
    maxSystems: tierLimits[SubscriptionTier.FREE].maxSystems,
    avatarUrl: "/images/logo.png" // Placeholder avatar image
  };
  
  // Calculate subscription tier details
  const tierDetails = {
    [SubscriptionTier.FREE]: {
      name: "Free",
      maxSystems: 1,
      color: "bg-neutral-500 text-white",
      features: ["Single system integration", "Read-only access", "Basic chat interface"],
      price: "Free"
    },
    [SubscriptionTier.PRO]: {
      name: "Pro",
      maxSystems: 5,
      color: "bg-blue-500 text-white",
      features: ["Up to 5 system integrations", "Read-only access", "Advanced chat interface", "Document upload"],
      price: "$19.99/month"
    },
    [SubscriptionTier.ENTERPRISE]: {
      name: "Enterprise",
      maxSystems: 10,
      color: "bg-indigo-600 text-white",
      features: ["Up to 10 system integrations", "Read & write access", "Advanced analytics", "Custom LLM provider"],
      price: "$49.99/month"
    }
  };
  
  // Use the subscriptionTier value to lookup the tier details
  // We need to cast it back to one of the valid keys for the lookup
  const tierKey = userInfo.subscriptionTier as keyof typeof tierDetails;
  const currentTier = tierDetails[tierKey];
  
  // Demo-only system connections
  const connectedSystems = [
    { name: "Salesforce CRM", type: "CRM", icon: <Server className="h-4 w-4" />, status: "connected" },
    // For Core and Pro tier, we'd show more connected systems
  ];
  
  const getAccessLevelBadge = (level: string) => {
    if (level === AccessLevel.WRITE) {
      return <Badge className="bg-green-500">Read & Write</Badge>;
    }
    return <Badge className="bg-amber-500">Read Only</Badge>;
  };
  
  const handleLogout = async () => {
    await logoutUser();
  };
  
  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          {children || <Button variant="default">My Account</Button>}
        </SheetTrigger>
        <SheetContent className="sm:max-w-md p-0 flex flex-col h-full min-h-0" side="right">
          <div className="h-full flex flex-col min-h-0">
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle>My Account</SheetTitle>
              <SheetDescription>
                Manage your account settings and preferences
              </SheetDescription>
            </SheetHeader>
            
            <Tabs defaultValue="profile" className="flex-1 flex flex-col min-h-0" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 px-6 pt-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="systems">Systems</TabsTrigger>
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
              </TabsList>
              
              {/* Profile Tab */}
              <TabsContent value="profile" className="flex-1 px-6 py-4 overflow-auto min-h-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={userInfo.avatarUrl || "/images/logo.png"} alt={userInfo.username} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-lg">{userInfo.username}</h3>
                      <p className="text-sm text-muted-foreground">{userInfo.role}</p>
                    </div>
                    <Badge className={currentTier.color + " ml-auto"}>{currentTier.name}</Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Email</h4>
                      <p className="text-sm">{userInfo.email}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Member Since</h4>
                      <p className="text-sm">{userInfo.joinDate}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Authentication Method</h4>
                      <p className="text-sm">{provider || "Local"}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">Access Level</h4>
                      <div>{getAccessLevelBadge(accessLevel)}</div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="destructive" 
                    className="w-full mt-6"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4 mr-2" /> 
                    Sign Out
                  </Button>
                </div>
              </TabsContent>
              
              {/* Systems Tab */}
              <TabsContent value="systems" className="flex-1 px-6 py-4 overflow-auto min-h-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Connected Systems</h3>
                    <p className="text-sm text-muted-foreground">
                      {userInfo.systemsConnected} of {currentTier.maxSystems}
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {connectedSystems.map((system, index) => (
                      <div key={index} className="border rounded-md p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {system.icon}
                          <div>
                            <p className="text-sm font-medium">{system.name}</p>
                            <p className="text-xs text-muted-foreground">{system.type}</p>
                          </div>
                        </div>
                        <Badge 
                          variant={system.status === "connected" ? "default" : "outline"} 
                          className="ml-auto"
                        >
                          {system.status}
                        </Badge>
                      </div>
                    ))}
                    
                    {userInfo.systemsConnected < currentTier.maxSystems && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => setConnectDialogOpen(true)}
                      >
                        <Server className="h-4 w-4 mr-2" /> 
                        Connect New System
                      </Button>
                    )}
                    
                    {userInfo.systemsConnected >= currentTier.maxSystems && (
                      <div className="border border-amber-200 bg-amber-50 text-amber-800 rounded-md p-3 text-sm">
                        <p className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                          You've reached your system connection limit. Upgrade your plan to connect more systems.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2 w-full" 
                          onClick={() => {
                            setActiveTab("subscription");
                            // We should also offer to open the subscription dialog directly
                            setSubscriptionDialogOpen(true);
                          }}
                        >
                          View Plans <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              {/* Subscription Tab */}
              <TabsContent value="subscription" className="flex-1 p-6 overflow-auto min-h-0">
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium mb-1">Current Plan</h3>
                      <Badge className={currentTier.color}>{currentTier.name}</Badge>
                      <p className="text-sm mt-2">{currentTier.price}</p>
                    </div>
                    <Button 
                      onClick={() => setSubscriptionDialogOpen(true)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                  
                  <div className="mt-6 grid gap-4 max-h-[420px] overflow-y-auto pb-2">
                    <Card className={userInfo.subscriptionTier === "free" ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center">
                          <UserPlus className="h-4 w-4 mr-2" /> 
                          Free
                          {userInfo.subscriptionTier === "free" && (
                            <Badge className="ml-2">Current</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>For individual use</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">Free</p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {tierDetails[SubscriptionTier.FREE].features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <CheckCheck className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          disabled={userInfo.subscriptionTier === "free"}
                          onClick={() => {
                            if (userInfo.subscriptionTier !== "free") {
                              setSubscriptionDialogOpen(true);
                            }
                          }}
                        >
                          {userInfo.subscriptionTier === "free" ? 'Current Plan' : 'Downgrade'}
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    <Card className={userInfo.subscriptionTier === "pro" ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center">
                          <Award className="h-4 w-4 mr-2" /> 
                          Pro
                          {userInfo.subscriptionTier === "pro" && (
                            <Badge className="ml-2">Current</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>For teams and small businesses</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">$19.99<span className="text-sm font-normal">/month</span></p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {tierDetails[SubscriptionTier.PRO].features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <CheckCheck className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          variant={userInfo.subscriptionTier === "pro" ? "outline" : "default"} 
                          className="w-full" 
                          disabled={userInfo.subscriptionTier === "pro"}
                          onClick={() => {
                            if (userInfo.subscriptionTier !== "pro") {
                              setSubscriptionDialogOpen(true);
                            }
                          }}
                        >
                          {userInfo.subscriptionTier === "pro" ? 'Current Plan' : userInfo.subscriptionTier === "enterprise" ? 'Downgrade' : 'Upgrade'}
                        </Button>
                      </CardFooter>
                    </Card>
                    
                    <Card className={userInfo.subscriptionTier === "enterprise" ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center">
                          <Crown className="h-4 w-4 mr-2" /> 
                          Enterprise
                          {userInfo.subscriptionTier === "enterprise" && (
                            <Badge className="ml-2">Current</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>For enterprises and power users</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">$49.99<span className="text-sm font-normal">/month</span></p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {tierDetails[SubscriptionTier.ENTERPRISE].features.map((feature: string, i: number) => (
                            <li key={i} className="flex items-start">
                              <CheckCheck className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button 
                          variant={userInfo.subscriptionTier === "enterprise" ? "outline" : "default"} 
                          className="w-full" 
                          disabled={userInfo.subscriptionTier === "enterprise"}
                          onClick={() => {
                            if (userInfo.subscriptionTier !== "enterprise") {
                              setSubscriptionDialogOpen(true);
                            }
                          }}
                        >
                          {userInfo.subscriptionTier === "enterprise" ? 'Current Plan' : 'Upgrade'}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Connect System Dialog */}
      <ConnectDialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen} />
      
      {/* Subscription Dialog */}
      <SubscriptionDialog open={subscriptionDialogOpen} onClose={() => setSubscriptionDialogOpen(false)} user={userInfo} />
    </>
  );
}