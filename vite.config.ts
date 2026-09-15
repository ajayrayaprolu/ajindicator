//====================================
// .\vite.config.ts
//====================================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

const ROOT = import.meta.dirname;

const TLS_KEY =
    path.resolve(ROOT, "certs", "ajtrade-key.pem");

const TLS_CERT =
    path.resolve(ROOT, "certs", "ajtrade.pem");

export default defineConfig({
    plugins: [react()],

    resolve: {
        alias: {
            "~": path.resolve(ROOT, "node_modules"),
            "@": path.resolve(ROOT, "src"),
        },
    },

    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,

        https: {
            key: fs.readFileSync(TLS_KEY),
            cert: fs.readFileSync(TLS_CERT),
        },

        proxy: {
            "/api": {
                target: "https://localhost:3001",
                changeOrigin: true,
                secure: false,
            },
        },

		hmr: {
			protocol: "wss",
			host: "ajtrade.in",
			port: 5173,
			clientPort: 443,
		},

        allowedHosts: [
            "ajtrade.in",
            "www.ajtrade.in",
            "localhost",
            "127.0.0.1",
        ],
    },

    build: {
        chunkSizeWarningLimit: 1600,
    },
});
