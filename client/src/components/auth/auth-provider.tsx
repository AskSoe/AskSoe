import { createContext, useContext, useState, ReactNode } from "react";
import { AuthDialog } from "./auth-dialog";

interface AuthProviderContextType {
  isOpen: boolean;
  openAuthDialog: () => void;
  closeAuthDialog: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

const AuthProviderContext = createContext<AuthProviderContextType>({
  isOpen: false,
  openAuthDialog: () => {},
  closeAuthDialog: () => {},
  setIsOpen: () => {}
});

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  
  const openAuthDialog = () => setIsAuthDialogOpen(true);
  const closeAuthDialog = () => setIsAuthDialogOpen(false);
  
  return (
    <AuthProviderContext.Provider value={{ 
      isOpen: isAuthDialogOpen,
      openAuthDialog, 
      closeAuthDialog,
      setIsOpen: setIsAuthDialogOpen
    }}>
      {children}
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </AuthProviderContext.Provider>
  );
}

export function useAuthDialogProvider() {
  return useContext(AuthProviderContext);
}