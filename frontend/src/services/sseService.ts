type Listener = (data: any) => void;

class SseService {
  private es: EventSource | null = null;
  private listeners: Set<Listener> = new Set();
  private connectionCount = 0;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    this.connectionCount++;

    if (this.connectionCount === 1) {
      this.connect();
    }

    return () => {
      this.listeners.delete(listener);
      this.connectionCount--;
      if (this.connectionCount === 0) {
        this.disconnect();
      }
    };
  }

  private connect() {
    if (this.es) return;
    this.es = new EventSource('/api/proxy/live');
    this.es.addEventListener('live-chat', (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        this.listeners.forEach(l => l(payload));
      } catch (err) {
        console.error("Failed to parse SSE payload", err);
      }
    });
    this.es.onerror = () => {
      console.error("SSE connection error in sseService");
    };
  }

  private disconnect() {
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }
}

export const sseService = new SseService();
