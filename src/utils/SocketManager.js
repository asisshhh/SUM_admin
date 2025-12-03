// src/utils/SocketManager.js
// Shared socket manager with auto-reconnect, .on() returning unsubscribe, and emit with ack timeout.

import { io } from "socket.io-client";

class SocketManager {
  constructor() {
    this.url = import.meta.env.VITE_SOCKET_URL;
    this.socket = null;
    this.connected = false;
    this._listeners = new Map(); // event -> Set(callback)
    this._connect();
  }

  _connect() {
    if (this.socket) return;
    const token = localStorage.getItem("token");
    this.socket = io(this.url, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity
    });

    this.socket.on("connect", () => {
      this.connected = true;
      console.info("Socket connected", this.socket.id);
    });

    this.socket.on("disconnect", (reason) => {
      this.connected = false;
      console.warn("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.warn("Socket connect_error:", err?.message || err);
    });

    // rebind saved listeners (useful if socket reconnects to a new instance)
    this.socket.on("reconnect", () => {
      for (const [event, set] of this._listeners.entries()) {
        for (const cb of set) {
          this.socket.on(event, cb);
        }
      }
    });
  }

  getSocket() {
    if (!this.socket) this._connect();
    return this.socket;
  }

  // Add listener; returns unsubscribe function
  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(cb);

    const s = this.getSocket();
    s.on(event, cb);

    return () => {
      try {
        s.off(event, cb);
      } catch (e) {}
      const set = this._listeners.get(event);
      if (set) {
        set.delete(cb);
        if (set.size === 0) this._listeners.delete(event);
      }
    };
  }

  // Emit with optional ack use; resolves with ack or fallback success
  emit(event, payload = {}, ackTimeout = 2500) {
    return new Promise((resolve) => {
      const s = this.getSocket();
      if (!s || !s.connected)
        return resolve({ success: false, error: "socket-not-connected" });

      let settled = false;
      try {
        s.timeout(ackTimeout).emit(event, payload, (err, ack) => {
          if (settled) return;
          settled = true;
          if (err)
            return resolve({ success: false, error: err.message || err });
          return resolve({ success: true, data: ack ?? null });
        });
      } catch (e) {
        if (settled) return;
        settled = true;
        return resolve({ success: false, error: e.message });
      }

      // fallback
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ success: true });
        }
      }, ackTimeout + 300);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this._listeners.clear();
    }
  }
}

export default new SocketManager();
