import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export function getSocket() {
  const token = localStorage.getItem("token");

  return io(SOCKET_URL, {
    path: "/socket.io",
    auth: {
      token: token ? `Bearer ${token}` : ""
    }
  });
}
