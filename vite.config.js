import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            "react",
            "react-dom",
            "recharts",
            "@tanstack/react-query",
            "socket.io-client",
            "react-toastify",
            "@fullcalendar/react",
            "@fullcalendar/daygrid",
            "@fullcalendar/timegrid"
          ]
        }
      }
    }
  }
});
