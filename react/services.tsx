
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AuthToken, User, ApiError, ToastMessage, ToastType, TickData, OrderUpdateData } from './types';
import { AUTH_TOKEN_KEY, API_ENDPOINTS, WEBSOCKET_URLS, DEFAULT_TOAST_DURATION } from './constants';

// --- Auth Service ---
interface AuthContextType {
  token: string | null;
  user: User | null; // Simplified user, can be expanded
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null); // Replace with actual user fetching if needed
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      // Potentially fetch user details here if token exists
      // For now, just set a dummy user if token is present
      setUser({ username: 'admin' }); 
    } else {
      setUser(null);
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(API_ENDPOINTS.TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        let errorMessage = "Login failed. Please check your credentials.";
        if(errorData.detail && typeof errorData.detail === 'string') errorMessage = errorData.detail;
        throw new Error(errorMessage);
      }

      const data: AuthToken = await response.json();
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setUser({ username }); // Set user, or fetch more details
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error("Login error:", error);
      throw error; // Rethrow to be caught by the form
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --- API Fetch Utility ---
export const apiFetch = async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, { ...options, headers });

  if (response.status === 204) { // No Content
    return null as unknown as T; // Or handle appropriately
  }
  
  const responseData = await response.json();

  if (!response.ok) {
    const error: ApiError = responseData;
     let message = "An API error occurred.";
     if (error.detail && typeof error.detail === 'string') {
       message = error.detail;
     } else if (Array.isArray(error.detail) && error.detail[0]?.msg) {
       message = error.detail[0].msg;
     } else if (error.message) {
       message = error.message;
     }
    console.error('API Error:', endpoint, response.status, error);
    throw new Error(message);
  }
  return responseData as T;
};

// --- Toast Service ---
interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: ToastType = ToastType.INFO) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, DEFAULT_TOAST_DURATION);
  };

  const removeToast = (id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  const getToastColors = (type: ToastType) => {
    switch (type) {
      case ToastType.SUCCESS: return "bg-green-500 text-white";
      case ToastType.ERROR: return "bg-red-500 text-white";
      case ToastType.WARNING: return "bg-yellow-500 text-black";
      case ToastType.INFO: return "bg-sky-500 text-white";
      default: return "bg-gray-700 text-white";
    }
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] space-y-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-md shadow-lg text-sm font-medium ${getToastColors(toast.type)} animate-fadeIn`}
          >
            {toast.message}
            <button onClick={() => removeToast(toast.id)} className="ml-4 text-current opacity-70 hover:opacity-100 font-bold">&times;</button>
          </div>
        ))}
      </div>
      {/* Basic CSS for fadeIn animation for toasts if not covered by Tailwind */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};


// --- WebSocket Service ---
interface WebSocketContextType {
  tickData: TickData | null;
  orderUpdateData: OrderUpdateData | null;
  isTicksConnected: boolean;
  isOrdersConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tickData, setTickData] = useState<TickData | null>(null);
  const [orderUpdateData, setOrderUpdateData] = useState<OrderUpdateData | null>(null);
  const [isTicksConnected, setIsTicksConnected] = useState(false);
  const [isOrdersConnected, setIsOrdersConnected] = useState(false);
  const { token } = useAuth(); // Get token to potentially pass if WS requires auth

  const setupWebSocket = useCallback((url: string, onMessage: (data: any) => void, setConnected: (status: boolean) => void) => {
    // Ensure token is available before connecting, if your WebSocket needs it.
    // For this example, assuming WebSocket doesn't need JWT in URL/protocol for simplicity,
    // but in production, this is common.
    // if (!token) return; // Uncomment if WS connection depends on auth

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`WebSocket connected to ${url}`);
      setConnected(true);
      // Example: Send auth token if required by your WS protocol
      // if (token) ws.send(JSON.stringify({ type: 'auth', token: token }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        onMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error on ${url}:`, error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected from ${url}`);
      setConnected(false);
      // Optional: implement reconnection logic here
      // setTimeout(() => setupWebSocket(url, onMessage, setConnected), 5000);
    };

    return ws; // Return a cleanup function
  }, [/* token */]); // Add token to dependency array if used for connection

  useEffect(() => {
    const ticksWs = setupWebSocket(WEBSOCKET_URLS.TICKS, (message) => {
      if (message.type === 'tick' && message.data) {
        setTickData(message.data as TickData);
      }
    }, setIsTicksConnected);
    
    const ordersWs = setupWebSocket(WEBSOCKET_URLS.ORDERS, (message) => {
      if (message.type === 'order' && message.data) {
        setOrderUpdateData(message.data as OrderUpdateData);
      }
    }, setIsOrdersConnected);

    return () => {
      ticksWs?.close();
      ordersWs?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupWebSocket /* token might be a dependency here if setupWebSocket uses it */]);


  return (
    <WebSocketContext.Provider value={{ tickData, orderUpdateData, isTicksConnected, isOrdersConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
