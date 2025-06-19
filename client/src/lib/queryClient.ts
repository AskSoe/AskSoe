import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
    const res = await fetch(url, {
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
      console.log(`Fetching with ${method}:`, queryKey[0]);
      const res = await fetch(queryKey[0] as string, {
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
        console.log(`Query response for ${queryKey[0]}:`, data);
        return data;
      } else if (res.status === 204) {
        // No content responses
        console.log(`Query response for ${queryKey[0]}: No content (204)`);
        return {} as T;
      } else {
        const text = await res.text();
        if (!text) {
          console.log(`Query response for ${queryKey[0]}: Empty response`);
          return {} as T;
        }
        
        // Try to parse as JSON if possible
        try {
          const data = JSON.parse(text);
          console.log(`Query response for ${queryKey[0]}:`, data);
          return data;
        } catch (e) {
          console.log(`Query response for ${queryKey[0]} (text):`, text);
          return text as unknown as T;
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
