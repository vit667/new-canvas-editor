/**
 * Утилиты для сетевых операций через WebSocket сервер
 */

/**
 * Ping хоста
 */
export async function pingHost(host: string): Promise<{ output: string; success: boolean }> {
  return new Promise((resolve, reject) => {
    const requestId = `ping_${Date.now()}_${Math.random()}`;
    
    let wsUrl: string;
    if (process.env.NEXT_PUBLIC_WS_URL) {
      wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    const ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Ping timeout'));
    }, 15000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'ping',
        data: {
          host,
          requestId,
        },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'ping_result' && message.requestId === requestId) {
          clearTimeout(timeout);
          ws.close();
          resolve(message.data);
        }
      } catch (error) {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      ws.close();
      reject(error);
    };
  });
}

/**
 * HTTP запрос (curl альтернатива)
 */
export async function httpRequest(
  url: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body?: string
): Promise<{ statusCode: number; headers: Record<string, string>; body: string; success: boolean }> {
  return new Promise((resolve, reject) => {
    const requestId = `http_${Date.now()}_${Math.random()}`;
    
    let wsUrl: string;
    if (process.env.NEXT_PUBLIC_WS_URL) {
      wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    const ws = new WebSocket(wsUrl);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('HTTP request timeout'));
    }, 30000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'http_request',
        data: {
          url,
          method,
          headers,
          body,
          requestId,
        },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'http_request_result' && message.requestId === requestId) {
          clearTimeout(timeout);
          ws.close();
          resolve(message.data);
        } else if (message.type === 'http_request_error' && message.requestId === requestId) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(message.error || 'HTTP request failed'));
        }
      } catch (error) {
        clearTimeout(timeout);
        ws.close();
        reject(error);
      }
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      ws.close();
      reject(error);
    };
  });
}

