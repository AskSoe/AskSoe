import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get API base URL from environment variable, fallback to relative URLs for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to build full URL
function buildApiUrl(path: string): string {
  if (API_BASE_URL) {
    // Remove leading slash from path if it exists
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_BASE_URL}/${cleanPath}`;
  }
  // Fallback to relative URL for development
  return path;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse error as JSON first
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorJson = await res.json();
        
        // Handle different error formats
        if (errorJson.error) {
          throw new Error(`${res.status}: ${errorJson.error}`);
        } else if (errorJson.message) {
          throw new Error(`${res.status}: ${errorJson.message}`);
        } else {
          throw new Error(`${res.status}: ${JSON.stringify(errorJson)}`);
        }
      } else {
        // Fallback to plain text
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    } catch (parseError) {
      // If JSON parsing failed, use status text
      if (parseError instanceof Error && parseError.message.includes('JSON')) {
        throw new Error(`${res.status}: ${res.statusText} (Invalid response format)`);
      }
      // Re-throw the already formatted error
      throw parseError;
    }
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  try {
    const fullUrl = buildApiUrl(url);
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    
    // Handle empty responses
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const jsonData = await res.json();
      return jsonData as T;
    } else if (res.status === 204) {
      // No content responses
      return {} as T;
    } else {
      const text = await res.text();
      if (!text) return {} as T;
      
      // Try to parse as JSON if possible
      try {
        return JSON.parse(text) as T;
      } catch (e) {
        return text as unknown as T;
      }
    }
  } catch (error) {
    console.error(`API request error (${method} ${url}):`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
  method?: string;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, method = "GET" }) =>
  async ({ queryKey }) => {
    try {
      const fullUrl = buildApiUrl(queryKey[0] as string);
      console.log(`Fetching with ${method}:`, fullUrl);
      const res = await fetch(fullUrl, {
        method,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      // Handle empty responses and different content types
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        console.log(`Query response for ${fullUrl}:`, data);
        return data;
      } else if (res.status === 204) {
        // No content responses
        console.log(`Query response for ${fullUrl}: No content (204)`);
        return {} as any;
      } else {
        const text = await res.text();
        if (!text) {
          console.log(`Query response for ${fullUrl}: Empty response`);
          return {} as any;
        }
        
        // Try to parse as JSON if possible
        try {
          const data = JSON.parse(text);
          console.log(`Query response for ${fullUrl}:`, data);
          return data;
        } catch (e) {
          console.log(`Query response for ${fullUrl} (text):`, text);
          return text as unknown as any;
        }
      }
    } catch (error) {
      console.error(`Error fetching ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});
