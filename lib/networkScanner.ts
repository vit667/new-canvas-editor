import type { ScannedHost } from '@/types/canvas';

/**
 * Сканирование сети через WebSocket сервер (использует nmap)
 */
export async function scanNetwork(networkRange: string): Promise<ScannedHost[]> {
  return new Promise((resolve, reject) => {
    const requestId = `network_scan_${Date.now()}_${Math.random()}`;
    
    // Получаем WebSocket URL
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
      reject(new Error('Network scan timeout'));
    }, 120000); // 2 минуты таймаут

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'scan_network',
        data: {
          networkRange,
          requestId,
        },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'scan_network_result' && message.requestId === requestId) {
          clearTimeout(timeout);
          ws.close();
          resolve(message.data.map((h: any) => ({
            ip: h.ip,
            hostname: h.hostname,
            mac: h.mac,
            status: h.status || 'up',
          })));
        } else if (message.type === 'scan_network_error' && message.requestId === requestId) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(message.error || 'Network scan failed'));
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

