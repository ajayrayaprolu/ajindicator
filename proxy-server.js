//============================================
// Proxy Services for NodeJS : .\proxy-server.js
//============================================

import https from "https";
import fs from "fs";
import path from "path";

const ROOT = import.meta.dirname;

const TLS_KEY = path.resolve(
    ROOT,
    "certs",
    "ajtrade-key.pem"
);

const TLS_CERT = path.resolve(
    ROOT,
    "certs",
    "ajtrade.pem"
);

const TARGET_HOST = "127.0.0.1";
const TARGET_PORT = 5173;

const server = https.createServer(
    {
        key: fs.readFileSync(TLS_KEY),
        cert: fs.readFileSync(TLS_CERT)
    },
	
	(req, res) => {
	
		// console.log(
		//     "[PROXY REQUEST]",
		//     req.method,
		//     req.url,
		//     `Host=${req.headers.host}`
		// );
	
		const options = {
			hostname: TARGET_HOST,
			port: TARGET_PORT,
			path: req.url,
			method: req.method,
			rejectUnauthorized: false,
	
			headers: {
				...req.headers,
				host: "localhost:5173"
			}
		};
	
		const proxyReq = https.request(
			options,
			proxyRes => {
	
			// console.log(
			//     "[PROXY RESPONSE]",
			//     response.statusCode
			// );
	
				res.writeHead(
					proxyRes.statusCode ?? 502,
					proxyRes.headers
				);
	
				proxyRes.pipe(res);
			}
		);
	
		proxyReq.on(
			"error",
			error => {
	
				console.error(
					"[PROXY ERROR]",
					error.message
				);
	
				if (!res.headersSent) {
					res.writeHead(
						502,
						{
							"Content-Type":
								"text/plain"
						}
					);
				}
	
				res.end(
					"Proxy upstream error"
				);
			}
		);
	
		req.pipe(proxyReq);
	}
);

/*
 * Vite WebSocket / HMR
 */
server.on(
    "upgrade",
    (req, socket, head) => {

        const upstream = https.request(
            {
                hostname: TARGET_HOST,
                port: TARGET_PORT,
                path: req.url,
                method: "GET",

                rejectUnauthorized: false,

                headers: {
                    ...req.headers,
                    host: "ajtrade.in"
                }
            }
        );

        upstream.on(
            "upgrade",
            (proxyRes, proxySocket) => {

                socket.write(
                    "HTTP/1.1 101 Switching Protocols\r\n" +
                    Object.entries(
                        proxyRes.headers
                    )
                        .map(
                            ([key, value]) =>
                                `${key}: ${value}`
                        )
                        .join("\r\n") +
                    "\r\n\r\n"
                );

                proxySocket.pipe(socket);
                socket.pipe(proxySocket);
            }
        );

        upstream.on(
            "error",
            error => {

                console.error(
                    "[PROXY WS ERROR]",
                    error.message
                );

                socket.destroy();
            }
        );

        upstream.end();
    }
);

server.on(
    "error",
    error => {

        console.error(
            "[PROXY SERVER ERROR]",
            error.message
        );
    }
);

server.listen(
    443,
    "0.0.0.0",
    () => {
        console.log("[PROXY] Listening on HTTPS port 443");
    }
);