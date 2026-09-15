//================================
// NPM Server Startup Process
//================================

import { spawn } from "child_process";
import https from "https";

const npmCommand =
    process.platform === "win32"
        ? "npm.cmd"
        : "npm";

const children = [];

function startProcess(name, args) {
    console.log(
        `\n[STARTUP] Starting ${name}...`
    );

	const child =
		spawn(
			npmCommand,
			[
				"--silent",
				...args
			],
			{
				stdio: "inherit",
				shell:
					process.platform === "win32",
				// CRITICAL: this was "false" before, which is exactly what
				// caused a separate visible console window to pop up for
				// EVERY child process (backend, vite, proxy) on Windows -
				// three windows per start, every single time, and they
				// don't close because they're the actual running servers,
				// not throwaway wrappers. "true" suppresses the window
				// while stdio: "inherit" still pipes output back to
				// whatever console (or log file) started this script.
				windowsHide: true,
			}
		);

    children.push({
        name,
        child
    });

    child.on(
        "exit",
        (code, signal) => {
            console.log(
                `[STARTUP] ${name} exited. code=${code} signal=${signal ?? "none"}`
            );
        }
    );

    child.on(
        "error",
        error => {
            console.error(
                `[STARTUP] ${name} failed to start:`,
                error.message
            );
        }
    );

    return child;
}

function waitForHttps(
    url,
    name,
    timeoutMs = 60000
) {
    return new Promise(
        (resolve, reject) => {
            const startTime = Date.now();

            function check() {
                const request = https.get(
                    url,
                    {
                        timeout: 2000,
                        rejectUnauthorized: false,
                    },
                    response => {
                        const status =
                            response.statusCode ?? 0;

                        response.resume();

                        console.log(
                            `[STARTUP] ${name} responding: HTTPS ${status}`
                        );

                        if (
                            status >= 200 &&
                            status < 400
                        ) {
                            resolve();
                            return;
                        }

                        if (
                            Date.now() -
                            startTime >=
                            timeoutMs
                        ) {
                            reject(
                                new Error(
                                    `${name} returned HTTP ${status} instead of a ready response`
                                )
                            );
                            return;
                        }

                        setTimeout(
                            check,
                            500
                        );
                    }
                );

                request.on(
                    "error",
                    () => {
                        if (
                            Date.now() -
                            startTime >=
                            timeoutMs
                        ) {
                            reject(
                                new Error(
                                    `${name} did not become ready within ${timeoutMs / 1000}s`
                                )
                            );
                            return;
                        }

                        setTimeout(
                            check,
                            500
                        );
                    }
                );

                request.on(
                    "timeout",
                    () => {
                        request.destroy();
                    }
                );
            }

            check();
        }
    );
}

function wait(ms) {
    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}

function stopAll() {
    console.log(
        "\n[STARTUP] Stopping all services..."
    );

    for (
        const entry of children
    ) {
        if (
            !entry.child.killed
        ) {
            console.log(
                `[STARTUP] Stopping ${entry.name}...`
            );

            entry.child.kill();
        }
    }
}

process.on(
    "SIGINT",
    () => {
        stopAll();
        process.exit(0);
    }
);

process.on(
    "SIGTERM",
    () => {
        stopAll();
        process.exit(0);
    }
);

async function main() {
    try {
        console.log(
            "========================================"
        );

        console.log(
            " AI-INSTITUTIONAL CONTROLLED STARTUP"
        );

        console.log(
            "========================================"
        );

        startProcess(
            "BACKEND",
            ["run", "backend"]
        );

        console.log(
            "[STARTUP] Waiting for BACKEND https://localhost:3001 ..."
        );

        await waitForHttps(
            "https://localhost:3001/api/fyers/status",
            "BACKEND",
            60000
        );

        console.log(
            "[STARTUP] BACKEND READY"
        );

        await wait(3000);

        startProcess(
            "VITE",
            ["run", "dev"]
        );

        console.log(
            "[STARTUP] Waiting for VITE https://localhost:5173 ..."
        );

        await waitForHttps(
            "https://localhost:5173/",
            "VITE",
            30000
        );

        console.log(
            "[STARTUP] VITE READY"
        );

        await wait(3000);

        startProcess(
            "PROXY",
            ["run", "proxy"]
        );

		console.log(
			"[STARTUP] Waiting for PROXY https://ajtrade.in ..."
		);
		
		await waitForHttps(
			"https://ajtrade.in/",
			"PROXY",
			30000,
		);
		
		console.log(
			"[STARTUP] PROXY READY"
		);

		console.log(
			"\n========================================"
		);
		
		console.log(
			" AJ-INSTITUTIONAL HTTPS SERVICES READY"
		);
		
		console.log(
			"========================================"
		);
		
		console.log(
			" 1. BACKEND      : https://localhost:3001"
		);
		
		console.log(
			" 2. VITE & TARGET: https://localhost:5173"
		);
		
		console.log(
			" 3. PROXY        : https://ajtrade.in"
		);
		
		console.log(
			" 4. PORT 443     : LISTENING"
		);
		
		console.log(
			"========================================"
		);
		
		console.log(
			" Frontend requests can now safely start."
		);
		
		console.log(
			"========================================\n"
		);

        await new Promise(
            () => {}
        );
    }
    catch (error) {
        console.error(
            "\n[STARTUP] STARTUP FAILED:",
            error instanceof Error
                ? error.message
                : error
        );

        stopAll();

        process.exit(1);
    }
}

main();
