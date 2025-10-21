import { useEffect, useRef, useState } from 'react';

export interface SSEOptions {
  url: string;
  enabled?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
}

/**
 * Custom hook for Server-Sent Events (SSE)
 *
 * @param options - SSE configuration options
 * @returns Object containing connection status and latest data
 */
export function useSSE<T = any>(options: SSEOptions) {
  const {
    url,
    enabled = true,
    onMessage,
    onError,
    reconnectInterval = 3000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const connect = () => {
      try {
        // Close existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        // Create new EventSource
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const parsedData = JSON.parse(event.data);
            setData(parsedData);

            if (onMessage) {
              onMessage(parsedData);
            }
          } catch (err) {
            console.error('Failed to parse SSE message:', err);
          }
        };

        eventSource.onerror = (err) => {
          setIsConnected(false);
          setError(err);

          if (onError) {
            onError(err);
          }

          // Close and attempt reconnect
          eventSource.close();

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, reconnectInterval);
        };
      } catch (err) {
        console.error('Failed to create EventSource:', err);
      }
    };

    connect();

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsConnected(false);
    };
  }, [url, enabled, reconnectInterval, onMessage, onError]);

  return {
    data,
    isConnected,
    error,
  };
}
