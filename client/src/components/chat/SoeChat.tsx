import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, LineChart, Users, BarChart3 } from 'lucide-react';

interface Message {
  sender: 'user' | 'soe';
  text: string;
  systemSources?: string[];
}

// Sample prompt suggestions
const PROMPT_SUGGESTIONS = [
  { text: "Show Q4 pipeline", icon: <LineChart className="h-4 w-4 mr-2" /> },
  { text: "List top customers", icon: <Users className="h-4 w-4 mr-2" /> },
  { text: "Revenue by product", icon: <BarChart3 className="h-4 w-4 mr-2" /> },
];

export default function SoeChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  // Reference to chat container for scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight } = chatContainerRef.current;
      chatContainerRef.current.scrollTop = scrollHeight;
    }
  }, [messages, isTyping]);
  
  // Handle clicking on a prompt suggestion
  const handleSuggestionClick = (suggestion: string) => {
    setUserInput(suggestion);
  };

  const askSoe = async (prompt: string): Promise<{ 
    response: string; 
    conversationId: number;
    systemSources?: string[];
  }> => {
    try {
      const payload = conversationId 
        ? { prompt, conversationId } 
        : { prompt };
    
      const response = await apiRequest('POST', '/api/ask', payload);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      return {
        response: data.response,
        conversationId: data.conversationId,
        systemSources: data.systemSources
      };
    } catch (err: any) {
      console.error('Error asking SOE:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    
    // Reset error state
    setError(null);

    // Add user message immediately
    const userMessage: Message = { sender: 'user', text: userInput };
    setMessages((prev) => [...prev, userMessage]);
    
    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Save the prompt before clearing input
      const prompt = userInput;
      setUserInput('');
      
      // Get response from our new endpoint
      const soeReply = await askSoe(prompt);
      
      // Update conversation ID for future messages
      if (soeReply.conversationId && !conversationId) {
        setConversationId(soeReply.conversationId);
      }
      
      // Add assistant message with placeholder to animate
      setMessages((prev) => [
        ...prev,
        { 
          sender: 'soe', 
          text: '', 
          systemSources: soeReply.systemSources 
        }
      ]);
      
      // Animate typing the response
      let index = 0;
      const typingInterval = setInterval(() => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last.sender === 'soe') {
            const newText = soeReply.response.slice(0, index + 1);
            const updated = [...prev.slice(0, -1), { 
              ...last, 
              text: newText 
            }];
            return updated;
          }
          return prev;
        });
        
        index++;
        if (index >= soeReply.response.length) {
          clearInterval(typingInterval);
          setIsTyping(false);
        }
      }, 15);
      
    } catch (err: any) {
      console.error('Error in chat:', err);
      setIsTyping(false);
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Ask SOE</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div 
          ref={chatContainerRef}
          className="h-80 overflow-y-auto border rounded p-4 mb-4 bg-card space-y-4"
        >
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              Start a conversation by typing a message below.
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`mb-2 p-3 rounded-lg ${
                msg.sender === 'soe' 
                  ? 'bg-primary/10 ml-4' 
                  : 'bg-muted mr-4'
              }`}
            >
              <div className="font-semibold">
                {msg.sender === 'soe' ? 'SOE:' : 'You:'}
              </div>
              <div className="whitespace-pre-wrap mt-1">{msg.text}</div>
              
              {msg.systemSources && msg.systemSources.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Sources: {msg.systemSources.join(', ')}
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-center text-primary">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-sm">SOE is thinking...</span>
            </div>
          )}
          
          {error && (
            <div className="p-3 rounded bg-destructive/10 text-destructive text-sm">
              Error: {error}
            </div>
          )}
        </div>
        
        {/* Prompt suggestions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {PROMPT_SUGGESTIONS.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="flex items-center"
                onClick={() => handleSuggestionClick(suggestion.text)}
                disabled={isTyping}
              >
                {suggestion.icon}
                {suggestion.text}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="w-full flex gap-2">
          <Input
            type="text"
            placeholder="Ask SOE..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="flex-1"
            disabled={isTyping}
          />
          <Button 
            type="submit" 
            disabled={!userInput.trim() || isTyping}
          >
            {isTyping ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : 'Send'}
          </Button>
        </form>
        
        {/* Always visible prompt suggestions */}
        <div className="flex flex-wrap gap-2 w-full">
          {PROMPT_SUGGESTIONS.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className="flex items-center text-xs"
              onClick={() => handleSuggestionClick(suggestion.text)}
              disabled={isTyping}
            >
              {suggestion.icon}
              {suggestion.text}
            </Button>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}