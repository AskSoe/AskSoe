import React, { createContext, useContext, useState } from "react";
import { type Conversation } from "@/shared/schema";

interface ChatContextType {
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation) => void;
}

export const ChatContext = createContext<ChatContextType>({
  currentConversation: null,
  setCurrentConversation: () => {}
});

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentConversation, setCurrentConversationState] = useState<Conversation | null>(null);
  
  // Wrap the setState function to add logging
  const setCurrentConversation = (conversation: Conversation) => {
    console.log("Setting current conversation:", conversation);
    setCurrentConversationState(conversation);
  };
  
  return (
    <ChatContext.Provider 
      value={{
        currentConversation, 
        setCurrentConversation
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}