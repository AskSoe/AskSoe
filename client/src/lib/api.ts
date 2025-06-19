import { apiRequest } from "@/lib/queryClient";

/**
 * API utility functions for interacting with the backend services
 */

// Conversation endpoints
export async function fetchConversations(): Promise<Conversation[]> {
  const response = await apiRequest("GET", "/api/conversations", undefined);
  return response.json();
}

export async function fetchConversation(id: number): Promise<Conversation> {
  const response = await apiRequest("GET", `/api/conversations/${id}`, undefined);
  return response.json();
}

export async function createConversation(title: string): Promise<Conversation> {
  const response = await apiRequest("POST", "/api/conversations", { title });
  return response.json();
}

export async function updateConversation(
  id: number,
  title: string
): Promise<Conversation> {
  const response = await apiRequest("PUT", `/api/conversations/${id}`, { title });
  return response.json();
}

export async function deleteConversation(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/conversations/${id}`, undefined);
}

// Message endpoints
export async function fetchMessages(conversationId: number): Promise<Message[]> {
  const response = await apiRequest(
    "GET",
    `/api/conversations/${conversationId}/messages`,
    undefined
  );
  return response.json();
}

export async function sendMessage(
  content: string,
  conversationId?: number
): Promise<{ userMessage: Message; processingMessage: Message; conversationId: number }> {
  const response = await apiRequest("POST", "/api/messages", {
    content,
    conversationId,
  });
  return response.json();
}

// System endpoints
export async function fetchSystems(): Promise<System[]> {
  const response = await apiRequest("GET", "/api/systems", undefined);
  return response.json();
}

export async function connectSystem(system: {
  name: string;
  type: string;
  connectionDetails: Record<string, any>;
}): Promise<System> {
  const response = await apiRequest("POST", "/api/systems", system);
  return response.json();
}

export async function updateSystem(
  id: number,
  system: Partial<System>
): Promise<System> {
  const response = await apiRequest("PUT", `/api/systems/${id}`, system);
  return response.json();
}

export async function disconnectSystem(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/systems/${id}`, undefined);
}

// LLM Provider endpoints
export async function fetchLlmProviders(): Promise<LlmProvider[]> {
  const response = await apiRequest("GET", "/api/llm-providers", undefined);
  return response.json();
}

export async function fetchActiveLlmProvider(): Promise<LlmProvider> {
  const response = await apiRequest(
    "GET",
    "/api/llm-providers/active",
    undefined
  );
  return response.json();
}

export async function addLlmProvider(provider: {
  name: string;
  type: string;
  apiKey?: string;
  settings?: Record<string, any>;
  isActive?: boolean;
}): Promise<LlmProvider> {
  const response = await apiRequest("POST", "/api/llm-providers", provider);
  return response.json();
}

export async function updateLlmProvider(
  id: number,
  provider: Partial<LlmProvider>
): Promise<LlmProvider> {
  const response = await apiRequest(
    "PUT",
    `/api/llm-providers/${id}`,
    provider
  );
  return response.json();
}

export async function activateLlmProvider(id: number): Promise<LlmProvider> {
  const response = await apiRequest(
    "POST",
    `/api/llm-providers/${id}/activate`,
    {}
  );
  return response.json();
}
