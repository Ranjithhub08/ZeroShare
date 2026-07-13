// WebSocket singleton — real-time notifications
let ws = null;
const listeners = new Set();
let reconnectTimer = null;

export function connect(token) {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return;
  ws = new WebSocket(`ws://localhost:5001?token=${token}`);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      listeners.forEach(fn => fn(msg));
    } catch {}
  };

  ws.onclose = () => {
    ws = null;
    // Auto-reconnect after 4s if still logged in
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      const t = localStorage.getItem('zs_token');
      if (t) connect(t);
    }, 4000);
  };

  ws.onerror = () => ws?.close();
}

export function disconnect() {
  clearTimeout(reconnectTimer);
  if (ws) { ws.close(); ws = null; }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
