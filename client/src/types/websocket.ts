// WebSocket Message Types

export type WebSocketMessageType = 
  | 'connection_established'
  | 'connection_success' 
  | 'connection_closed'
  | 'connection_error'
  | 'connection_failed'
  | 'pong'
  | 'ping'
  | 'message_update'
  | 'message_created'
  | 'message_stream'
  | 'assistant_typing'
  | 'conversation_updated'
  | 'system_connected'
  | 'system_disconnected';

// Connection Messages
export interface ConnectionEstablishedPayload {
  message: string;
  timestamp: number;
  server: string;
}

export interface ConnectionSuccessPayload {
  timestamp: number;
  clientCount: number;
}

export interface ConnectionClosedPayload {
  code: number;
  reason: string;
  timestamp: number;
}

export interface ConnectionErrorPayload {
  error: string;
  timestamp: number;
}

export interface PingPayload {
  timestamp: number;
}

export interface PongPayload {
  timestamp: number;
}

// Chat Messages
export interface MessageUpdatePayload {
  messageId: number;
  conversationId: number;
  content: string;
  status: string;
  timestamp: number;
}

export interface MessageCreatedPayload {
  messageId: number;
  conversationId: number;
  role: string;
  content: string;
  timestamp: number;
}

export interface MessageStreamPayload {
  messageId: number;
  conversationId: number;
  content: string;
  isComplete: boolean;
  timestamp: number;
}

export interface AssistantTypingPayload {
  conversationId: number;
  isTyping: boolean;
  timestamp: number;
}

// System Messages
export interface SystemConnectedPayload {
  systemId: number;
  systemName: string;
  systemType: string;
  timestamp: number;
}

export interface SystemDisconnectedPayload {
  systemId: number;
  systemName: string;
  timestamp: number;
}

// Union type for all possible payloads
export type WebSocketPayload = 
  | ConnectionEstablishedPayload
  | ConnectionSuccessPayload
  | ConnectionClosedPayload
  | ConnectionErrorPayload
  | PingPayload
  | PongPayload
  | MessageUpdatePayload
  | MessageCreatedPayload
  | MessageStreamPayload
  | AssistantTypingPayload
  | SystemConnectedPayload
  | SystemDisconnectedPayload;

// WebSocket message structure
export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: WebSocketPayload;
}