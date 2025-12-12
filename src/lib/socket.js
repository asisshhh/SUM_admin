// DEPRECATED: Use SocketManager from ../utils/SocketManager.js instead
// This file is kept for backward compatibility but redirects to SocketManager

import Socket from "../utils/SocketManager";

/**
 * @deprecated Use Socket.getSocket() from SocketManager instead
 * This function is kept for backward compatibility
 */
export function getSocket() {
  console.warn(
    "getSocket() from lib/socket.js is deprecated. Use Socket.getSocket() from utils/SocketManager.js instead."
  );
  return Socket.getSocket();
}
