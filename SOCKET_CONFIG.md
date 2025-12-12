# Socket Connection Configuration

This document explains how to configure socket connections for different deployment scenarios.

## Environment Variables

### Required

- `VITE_API_URL`: Full API base URL
  - Development: `http://localhost:4000/api/admin`
  - Production: `https://www.api.com/api/admin`

### Optional

- `VITE_SOCKET_URL`: Explicit socket URL (only needed if socket is on different domain/port)
  - If not set, socket URL will be automatically derived from `VITE_API_URL` or `window.location.origin`

## Configuration Priority

The socket URL is determined in the following order:

1. **VITE_SOCKET_URL** (if explicitly set) - Highest priority
2. **Derived from VITE_API_URL** - Extracts origin from API URL
3. **window.location.origin** - Uses current page origin (works for subpath deployments)
4. **Fallback** - `http://localhost:4000` (development only)

## Production Setup Example

### Scenario: UI on Subpath

- **API URL**: `https://www.api.com`
- **UI URL**: `https://www.api.com/mgmt`

### Configuration

```env
VITE_API_URL=https://www.api.com/api/admin
# VITE_SOCKET_URL is optional - will automatically use https://www.api.com
```

### How It Works

1. SocketManager reads `VITE_API_URL=https://www.api.com/api/admin`
2. Extracts origin: `https://www.api.com`
3. Connects socket to: `https://www.api.com/socket.io`
4. Works correctly even though UI is served from `/mgmt` subpath

## Development Setup

### Same Port (API and UI on same origin)

```env
VITE_API_URL=http://localhost:4000/api/admin
# Socket will automatically connect to http://localhost:4000
```

### Different Ports (API and UI on different ports)

```env
VITE_API_URL=http://localhost:4000/api/admin
# Socket will automatically connect to http://localhost:4000
# Even if UI is running on http://localhost:5173
```

**Note:** The socket URL is derived from `VITE_API_URL`, so it will always use the API port, not the UI port. This ensures correct connection even when ports differ.

### Optional: Custom API Port

If your API runs on a different port (not 4000):

```env
VITE_API_URL=http://localhost:3000/api/admin
VITE_API_PORT=3000  # Optional, will be extracted from VITE_API_URL
```

## Custom Socket URL

If your socket server is on a different domain/port:

```env
VITE_API_URL=https://www.api.com/api/admin
VITE_SOCKET_URL=https://socket.example.com
```

## Notes

- Socket path is always `/socket.io` (configured in backend)
- Socket uses WebSocket transport for better performance
- Automatic reconnection is enabled
- Socket connection is shared across all components (single connection)
