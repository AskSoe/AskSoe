import { apiRequest } from "./queryClient";
import { type Document, type DocumentUploadRequest } from "../../shared/schema";

/**
 * Fetch all documents
 */
export async function fetchDocuments(): Promise<Document[]> {
  const response = await apiRequest("GET", "/api/documents");
  return await response.json();
}

/**
 * Fetch documents for a specific user
 */
export async function fetchUserDocuments(userId: number): Promise<Document[]> {
  const response = await apiRequest("GET", `/api/documents?userId=${userId}`);
  return await response.json();
}

/**
 * Fetch a specific document by ID
 */
export async function fetchDocument(id: number): Promise<Document> {
  const response = await apiRequest("GET", `/api/documents/${id}`);
  return await response.json();
}

/**
 * Fetch documents associated with a specific conversation
 */
export async function fetchConversationDocuments(conversationId: number): Promise<Document[]> {
  const response = await apiRequest("GET", `/api/conversations/${conversationId}/documents`);
  return await response.json();
}

/**
 * Upload a new document
 */
export async function uploadDocument(document: DocumentUploadRequest): Promise<Document> {
  const response = await apiRequest("POST", "/api/documents", document);
  return await response.json();
}

/**
 * Update an existing document
 */
export async function updateDocument(id: number, updates: Partial<DocumentUploadRequest>): Promise<Document> {
  const response = await apiRequest("PUT", `/api/documents/${id}`, updates);
  return await response.json();
}

/**
 * Delete a document
 */
export async function deleteDocument(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/documents/${id}`);
}