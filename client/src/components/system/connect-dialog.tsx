import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronRight, 
  Link, 
  Server,
  Database,
  LineChart,
  Share2,
  Key
} from "lucide-react";

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectDialog({ open, onOpenChange }: ConnectDialogProps) {
  const [activeTab, setActiveTab] = useState("standard");
  const [systemType, setSystemType] = useState("crm");
  const [systemName, setSystemName] = useState("");
  const [connectionUrl, setConnectionUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!systemName) {
      toast({
        title: "System name required",
        description: "Please provide a name for your system connection.",
        variant: "destructive",
      });
      return;
    }

    if (!connectionUrl) {
      toast({
        title: "Connection URL required",
        description: "Please provide a connection URL for your system.",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    
    // Simulate connection success
    setTimeout(() => {
      setConnecting(false);
      onOpenChange(false);
      
      toast({
        title: "System connected",
        description: `Successfully connected to ${systemName}`,
        variant: "default",
      });
      
      // Reset form
      setSystemName("");
      setConnectionUrl("");
      setApiKey("");
      setSystemType("crm");
    }, 1500);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form
    setSystemName("");
    setConnectionUrl("");
    setApiKey("");
    setSystemType("crm");
  };
  
  // System type options with icons
  const systemTypes = [
    { id: "crm", name: "CRM", icon: <Server className="h-4 w-4 mr-2" /> },
    { id: "erp", name: "ERP", icon: <Database className="h-4 w-4 mr-2" /> },
    { id: "analytics", name: "Analytics", icon: <LineChart className="h-4 w-4 mr-2" /> },
    { id: "custom", name: "Custom API", icon: <Share2 className="h-4 w-4 mr-2" /> },
  ];
  
  // Templates for quick connection to popular systems
  const templates = [
    { id: "salesforce", name: "Salesforce", type: "crm", icon: <Server className="h-10 w-10 p-2 bg-blue-100 rounded-full text-blue-500" /> },
    { id: "hubspot", name: "HubSpot", type: "crm", icon: <Server className="h-10 w-10 p-2 bg-orange-100 rounded-full text-orange-500" /> },
    { id: "sap", name: "SAP ERP", type: "erp", icon: <Database className="h-10 w-10 p-2 bg-indigo-100 rounded-full text-indigo-500" /> },
    { id: "tableau", name: "Tableau", type: "analytics", icon: <LineChart className="h-10 w-10 p-2 bg-green-100 rounded-full text-green-500" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect System</DialogTitle>
          <DialogDescription>
            Add a new enterprise system connection to your account.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="standard" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
          
          {/* Standard Connection Tab */}
          <TabsContent value="standard" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-name">System Name</Label>
                <Input
                  id="system-name"
                  placeholder="e.g. Company CRM"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="system-type">System Type</Label>
                <Select value={systemType} onValueChange={setSystemType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select system type" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center">
                          {type.icon}
                          <span>{type.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="connection-url">Connection URL</Label>
                <Input
                  id="connection-url"
                  placeholder="https://api.example.com"
                  value={connectionUrl}
                  onChange={(e) => setConnectionUrl(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key (optional)</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Key className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <div 
                  key={template.id}
                  className="border rounded-lg p-3 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => {
                    setSystemName(template.name);
                    setSystemType(template.type);
                    setActiveTab("standard");
                  }}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    {template.icon}
                    <span className="font-medium">{template.name}</span>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Select <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              Select a template to pre-fill connection details
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button disabled={connecting} onClick={handleConnect}>
            {connecting ? (
              "Connecting..."
            ) : (
              <span className="flex items-center">
                <Link className="h-4 w-4 mr-2" />
                Connect
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}