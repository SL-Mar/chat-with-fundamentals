const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001';

export function createChatWebSocket(
  universeId: string,
  onLog: (msg: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): WebSocket {
  const ws = new WebSocket(`${WS_URL}/api/universes/${universeId}/chat/ws`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'log') {
      onLog(data.message);
    } else if (data.type === 'done') {
      onDone();
    } else if (data.type === 'error') {
      onError(data.message);
    }
  };

  ws.onerror = () => onError('WebSocket connection error');
  ws.onclose = () => onDone();

  return ws;
}
