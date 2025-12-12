// src/utils/SocketManager.js
// Shared socket manager with auto-reconnect, .on() returning unsubscribe, and emit with ack timeout.
// SINGLE SOURCE OF TRUTH for all socket connections in the application.

import { io } from "socket.io-client";

/**
 * Get the socket URL based on environment configuration
 *
 * Priority:
 * 1. VITE_SOCKET_URL (explicit socket URL) - highest priority
 * 2. Derived from VITE_API_URL (extract origin, remove /api/admin path)
 * 3. Current window origin (for production when UI is on subpath like /mgmt)
 *    - If UI is at https://www.api.com/mgmt, socket connects to https://www.api.com
 * 4. Development fallback - use default API port (4000) if on localhost
 *
 * Production Example:
 * - API URL: https://www.api.com
 * - UI URL: https://www.api.com/mgmt
 * - Set: VITE_API_URL=https://www.api.com/api/admin
 * - Socket will automatically connect to: https://www.api.com
 *
 * Development Example (different ports):
 * - API URL: http://localhost:4000
 * - UI URL: http://localhost:5173
 * - Set: VITE_API_URL=http://localhost:4000/api/admin
 * - Socket will automatically connect to: http://localhost:4000
 *
 * Environment Variables:
 * - VITE_API_URL: Full API base URL (e.g., https://www.api.com/api/admin or http://localhost:4000/api/admin)
 * - VITE_SOCKET_URL: (Optional) Explicit socket URL if different from API origin
 * - VITE_API_PORT: (Optional) API port for development (default: 4000)
 */
function getSocketUrl() {
  // 1. Check for explicit socket URL (highest priority)
  if (import.meta.env.VITE_SOCKET_URL) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL.trim();
    console.info("📡 Using explicit VITE_SOCKET_URL:", socketUrl);
    return socketUrl;
  }

  // 2. Derive from API URL if set (works for both production and development)
  if (import.meta.env.VITE_API_URL) {
    try {
      const apiUrl = new URL(import.meta.env.VITE_API_URL);
      // Remove /api/admin or any path, keep only origin
      const socketUrl = apiUrl.origin;
      console.info("📡 Derived socket URL from VITE_API_URL:", socketUrl);
      return socketUrl;
    } catch (e) {
      console.warn("⚠️ Invalid VITE_API_URL, trying other methods", e);
    }
  }

  // 3. For production: Use current window origin (works when UI is on subpath)
  // e.g., if UI is at https://www.api.com/mgmt, socket connects to https://www.api.com
  if (typeof window !== "undefined") {
    const origin = window.location.origin;

    // 3a. If not localhost, use origin directly (production)
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      console.info("📡 Using window.location.origin (production):", origin);
      return origin;
    }

    // 3b. For localhost development: If UI and API are on different ports,
    // use the API port from env or default to 4000
    const apiPort = import.meta.env.VITE_API_PORT || "4000";
    const socketUrl = `http://localhost:${apiPort}`;
    console.info(
      "📡 Using localhost with API port (development):",
      socketUrl,
      "(UI is on",
      origin,
      ")"
    );
    return socketUrl;
  }

  // 4. Fallback for SSR or edge cases
  const apiPort = import.meta.env.VITE_API_PORT || "4000";
  const fallback = `http://localhost:${apiPort}`;
  console.info("📡 Using fallback socket URL:", fallback);
  return fallback;
}

class SocketManager {
  constructor() {
    this.url = getSocketUrl();
    this.socket = null;
    this.connected = false;
    this._listeners = new Map(); // event -> Set(callback)
    this._connectCallbacks = new Set(); // callbacks for connect events
    this._disconnectCallbacks = new Set(); // callbacks for disconnect events
    this._connect();
  }

  _connect() {
    if (this.socket) return;
    const token = localStorage.getItem("token");

    // Log socket connection details for debugging
    console.info("🔌 Connecting to socket:", this.url);

    this.socket = io(this.url, {
      auth: { token },
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
      // Force new connection if URL changes (useful for development)
      forceNew: false
    });

    this.socket.on("connect", () => {
      this.connected = true;
      console.info("Socket connected", this.socket.id);
      // Notify all connect callbacks
      this._connectCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error("Error in connect callback:", e);
        }
      });
    });

    this.socket.on("disconnect", (reason) => {
      this.connected = false;
      console.warn("Socket disconnected:", reason);
      // Notify all disconnect callbacks
      this._disconnectCallbacks.forEach((cb) => {
        try {
          cb(reason);
        } catch (e) {
          console.error("Error in disconnect callback:", e);
        }
      });
    });

    this.socket.on("connect_error", (err) => {
      console.warn("Socket connect_error:", err?.message || err);
    });

    // rebind saved listeners (useful if socket reconnects to a new instance)
    this.socket.on("reconnect", () => {
      console.info("Socket reconnected, rebinding listeners");
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

  // Check if socket is connected
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  // Add connect listener
  onConnect(cb) {
    this._connectCallbacks.add(cb);
    if (this.connected) {
      // If already connected, call immediately
      try {
        cb();
      } catch (e) {
        console.error("Error in connect callback:", e);
      }
    }
    return () => {
      this._connectCallbacks.delete(cb);
    };
  }

  // Add disconnect listener
  onDisconnect(cb) {
    this._disconnectCallbacks.add(cb);
    return () => {
      this._disconnectCallbacks.delete(cb);
    };
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
