import type { ScannedPort } from '@/types/canvas';

/**
 * Сканирование портов через WebSocket сервер (использует nmap или fallback)
 */
export async function scanPorts(host: string, ports?: number[]): Promise<ScannedPort[]> {
  return new Promise((resolve, reject) => {
    const requestId = `scan_${Date.now()}_${Math.random()}`;
    
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
      reject(new Error('Scan timeout'));
    }, 60000); // 60 секунд таймаут

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'scan_ports',
        data: {
          host,
          ports,
          requestId,
        },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'scan_ports_result' && message.requestId === requestId) {
          clearTimeout(timeout);
          ws.close();
          resolve(message.data.map((p: any) => ({
            port: p.port,
            protocol: p.protocol || 'tcp',
            service: p.service,
            status: p.status || 'open',
          })));
        } else if (message.type === 'scan_ports_error' && message.requestId === requestId) {
          clearTimeout(timeout);
          ws.close();
          reject(new Error(message.error || 'Scan failed'));
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


