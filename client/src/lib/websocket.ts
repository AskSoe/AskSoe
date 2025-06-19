// WebSocket client for real-time updates
// This creates a singleton WebSocket connection that can be shared across components

class WebSocketClient {
  private static instance: WebSocketClient;
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private connectAttempts: number = 0;

  // Get singleton instance
  public static getInstance(): WebSocketClient {
    if (!WebSocketClient.instance) {
      WebSocketClient.instance = new WebSocketClient();
    }
    return WebSocketClient.instance;
  }

  // Initialize WebSocket connection
  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) return;
    
    this.isConnecting = true;
    this.connectAttempts++;

    try {
      // Determine base URL and WebSocket protocol
      const isSecure = window.location.protocol === "https:";
      const protocol = isSecure ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log(`Attempting to connect to WebSocket at ${wsUrl} (attempt ${this.connectAttempts})`);
      
      // Add a delay for the first connection attempt in case the server is not ready yet
      setTimeout(() => {
        // Set a connection timeout to avoid blocking the application
        const connectionTimeout = setTimeout(() => {
          console.warn("WebSocket connection attempt timed out");
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            this.socket.close();
            this.socket = null;
          }
          this.isConnecting = false;
          
          // Dispatch a connection failure event so components can handle it
          if (this.messageHandlers.has("connection_failed")) {
            this.messageHandlers.get("connection_failed")?.forEach(handler => 
              handler({ reason: "timeout", timestamp: Date.now() })
            );
          }
        }, 5000); // 5 second timeout
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          console.log("WebSocket connection established successfully");
          this.isConnecting = false;
          this.connectAttempts = 0;
          clearTimeout(connectionTimeout);
          
          // Clear reconnect timer if it exists
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          
          // Dispatch a connection success event
          if (this.messageHandlers.has("connection_success")) {
            this.messageHandlers.get("connection_success")?.forEach(handler => 
              handler({ timestamp: Date.now() })
            );
          }
          
          // Send a ping immediately to test the connection
          this.send("ping", { timestamp: Date.now() });
        };
        
        this.socket.onmessage = (event) => {
          try {
            console.log("WebSocket message received:", event.data);
            const data = JSON.parse(event.data);
            const { type, payload } = data;
            
            console.log(`Processed WebSocket message of type: ${type}`);
            
            if (this.messageHandlers.has(type)) {
              this.messageHandlers.get(type)?.forEach(handler => handler(payload));
            }
          } catch (error) {
            console.error("Error processing WebSocket message:", error);
          }
        };
        
        this.socket.onclose = (event) => {
          console.log(`WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          
          // Dispatch a connection closed event
          if (this.messageHandlers.has("connection_closed")) {
            this.messageHandlers.get("connection_closed")?.forEach(handler => 
              handler({ code: event.code, reason: event.reason, timestamp: Date.now() })
            );
          }
          
          this.reconnect();
        };
        
        this.socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          
          // Dispatch a connection error event
          if (this.messageHandlers.has("connection_error")) {
            this.messageHandlers.get("connection_error")?.forEach(handler => 
              handler({ error: "WebSocket connection error", timestamp: Date.now() })
            );
          }
          
          // If we get an error, we'll close the socket and try to reconnect
          if (this.socket) {
            this.socket.close();
            this.socket = null;
          }
          
          this.reconnect();
        };
      }, this.connectAttempts === 1 ? 2000 : 0); // Only add delay on first attempt
      
    } catch (error: any) {
      console.error("Error creating WebSocket:", error);
      this.isConnecting = false;
      
      // Dispatch a connection error event
      if (this.messageHandlers.has("connection_error")) {
        this.messageHandlers.get("connection_error")?.forEach(handler => 
          handler({ error: "Failed to create WebSocket", timestamp: Date.now() })
        );
      }
      
      // Don't try to reconnect immediately, wait a bit
      setTimeout(() => this.reconnect(), 1000);
    }
  }
  
  // Reconnect after a delay
  private reconnect(): void {
    if (this.reconnectTimer) return;
    
    const delay = Math.min(5000, 1000 * this.connectAttempts); // Increase delay with attempts, max 5s
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
  
  // Close the connection
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isConnecting = false;
    this.connectAttempts = 0;
  }
  
  // Add event handler for a specific message type
  public on(type: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    
    this.messageHandlers.get(type)?.push(handler);
  }
  
  // Remove event handler for a specific message type
  public off(type: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(type)) return;
    
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  // Send a message to the server
  public send(type: string, payload: any): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, attempting to connect...");
      this.connect();
      setTimeout(() => this.send(type, payload), 1000);
      return;
    }
    
    try {
      this.socket.send(JSON.stringify({ type, payload }));
    } catch (error: any) {
      console.error("Error sending WebSocket message:", error);
    }
  }
  
  // Check if the socket is connected
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const webSocketClient = WebSocketClient.getInstance();

// Export a hook to use in React components
export function useWebSocket() {
  return webSocketClient;
}