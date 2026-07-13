// WebSocket connection manager — maps userId → Set of open connections
const clients = new Map();

function register(userId, ws) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(ws);
}

function unregister(userId, ws) {
  if (clients.has(userId)) {
    clients.get(userId).delete(ws);
    if (clients.get(userId).size === 0) clients.delete(userId);
  }
}

function send(userId, data) {
  const conns = clients.get(userId);
  if (!conns) return;
  const msg = JSON.stringify(data);
  conns.forEach(ws => {
    try {
      if (ws.readyState === 1) ws.send(msg); // 1 = OPEN
    } catch {}
  });
}

module.exports = { register, unregister, send };
