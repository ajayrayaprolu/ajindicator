//======================================================
// AJ-INSTITUTIONAL SERVER STARTUP
// File: C:\AI-Institutional\start-server.js
//
// Startup order:
//   1. Clean up existing Node.js listeners on required ports
//   2. Start backend and verify HTTPS
//   3. Start Vite and verify HTTPS
//   4. Start proxy and verify HTTPS
//   5. Display the ready banner
//   6. Open broker login routes
//
// Complete subprocess logs:
//   .logs\backend.log
//   .logs\vite.log
//   .logs\proxy.log
//
// Delta Exchange:
//   No startup status checks or automatic login popup.
//   Existing backend session and master-data workflow unchanged.
//======================================================

import { spawn, execFileSync } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import https from "node:https";

//------------------------------------------------------
// CONFIGURATION
//------------------------------------------------------

const root = process.cwd();
const logDir = path.join(root, ".logs");

const PORTS_TO_CLEAN = [3001, 5173, 443];

const BACKEND_URL = "https://localhost:3001";
const VITE_URL = "https://localhost:5173";
const PROXY_URL = "https://ajtrade.in";

const BACKEND_HEALTH_URL = `${BACKEND_URL}/health`;

const BACKEND_TIMEOUT_MS = 60000;
const SERVICE_TIMEOUT_MS = 30000;
const RETRY_INTERVAL_MS = 500;

mkdirSync(logDir, { recursive: true });

const npmCli = process.env.npm_execpath;

if (!npmCli) {
    console.error(
        "[STARTUP ERROR] Run this application using npm run server."
    );
    process.exit(1);
}

//------------------------------------------------------
// PROCESS TRACKING
//------------------------------------------------------

const children = [];
const logStreams = [];

let shuttingDown = false;

const ANSI_GREEN = "\x1b[32m";
const ANSI_RED = "\x1b[31m";
const ANSI_RESET = "\x1b[0m";

const shownAliceBlueSyncDone = new Set();

function showConsoleLine(originalLine) {
    let line = originalLine;

    // Display each AliceBlue completion message only once per server run.
    const syncMatch = line.match(
        /^\s*\[ALICEBLUE SYNC\]\s*(intraday|daily \(EOD\)): done\./i
    );

    if (syncMatch) {
        const label = syncMatch[1].toLowerCase();

        if (shownAliceBlueSyncDone.has(label)) {
            return;
        }

        shownAliceBlueSyncDone.add(label);
        line = `[ALICEBLUE SYNC] ${syncMatch[1]}: done.`;
    }

    const isFailure =
        /\b(ERROR|FAILED|FAILURE|FATAL|EXCEPTION)\b/i.test(line) ||
        /\bfetch failed\b/i.test(line);

    const isSuccess =
        /\b(READY|LOADED|CONNECTED|LISTENING|DONE|SUCCESSFUL)\b/i.test(line);

    if (isFailure) {
        console.log(`${ANSI_RED}${line}${ANSI_RESET}`);
    } else if (isSuccess) {
        console.log(`${ANSI_GREEN}${line}${ANSI_RESET}`);
    } else {
        console.log(line);
    }
}

//------------------------------------------------------
// QUIETLY FIND EXISTING LISTENERS
//
// Windows: inspect owners of the required TCP ports.
// Node.js listeners are stopped before startup.
// Non-Node listeners are not killed.
//------------------------------------------------------

function getWindowsPortListeners() {
    const script = `
        $ports = @(${PORTS_TO_CLEAN.join(",")})
        $items = @(
            Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
            Where-Object { $ports -contains $_.LocalPort } |
            Select-Object -ExpandProperty OwningProcess -Unique |
            ForEach-Object {
                $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $_" -ErrorAction SilentlyContinue

                if ($null -ne $proc) {
                    [PSCustomObject]@{
                        Pid = [int]$proc.ProcessId
                        Name = [string]$proc.Name
                        CommandLine = [string]$proc.CommandLine
                    }
                }
            }
        )
        ConvertTo-Json -InputObject $items -Compress
    `;

    const output = execFileSync(
        "powershell.exe",
        [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script
        ],
        {
            cwd: root,
            encoding: "utf8",
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"]
        }
    ).trim();

    if (!output) {
        return [];
    }

    const parsed = JSON.parse(output);

    return Array.isArray(parsed) ? parsed : [parsed];
}

function getPortForPid(pid) {
    const script = `
        $pidToFind = ${Number(pid)}
        $ports = @(${PORTS_TO_CLEAN.join(",")})
        $result = @(
            Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
            Where-Object {
                $_.OwningProcess -eq $pidToFind -and
                $ports -contains $_.LocalPort
            } |
            Select-Object -ExpandProperty LocalPort -Unique
        )
        ConvertTo-Json -InputObject $result -Compress
    `;

    const output = execFileSync(
        "powershell.exe",
        [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            script
        ],
        {
            cwd: root,
            encoding: "utf8",
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"]
        }
    ).trim();

    if (!output) {
        return [];
    }

    const parsed = JSON.parse(output);
    const values = Array.isArray(parsed) ? parsed : [parsed];

    return values.map(Number);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupOccupiedPorts() {
    // Automatic port cleanup is Windows-specific.
    if (process.platform !== "win32") {
        return;
    }

    let listeners;

    try {
        listeners = getWindowsPortListeners();
    } catch {
        throw new Error(
            "Unable to inspect occupied ports. " +
            "Check Windows PowerShell permissions and retry."
        );
    }

    if (listeners.length === 0) {
        return;
    }

    const blockers = listeners.filter(
        item => !/^node\.exe$/i.test(item.Name ?? "")
    );

    if (blockers.length > 0) {
        const details = blockers
            .map(item => `${item.Name} (PID ${item.Pid})`)
            .join(", ");

        throw new Error(
            "A required port is occupied by a non-Node process: " +
            `${details}. Stop that service manually and retry.`
        );
    }

    // Stop each existing Node.js listener and its child processes.
    const pids = [
        ...new Set(
            listeners
                .map(item => Number(item.Pid))
                .filter(pid => Number.isInteger(pid) && pid > 0)
        )
    ];

    for (const pid of pids) {
        // Never terminate this startup process itself.
        if (pid === process.pid) {
            continue;
        }

        try {
            execFileSync(
                "taskkill.exe",
                ["/PID", String(pid), "/T", "/F"],
                {
                    cwd: root,
                    windowsHide: true,
                    stdio: "ignore"
                }
            );
        } catch {
            // The process may already have exited.
        }
    }

    // Give Windows time to release terminated listeners.
    const deadline = Date.now() + 10000;

    while (Date.now() < deadline) {
        let remaining;

        try {
            remaining = getWindowsPortListeners();
        } catch {
            throw new Error(
                "Unable to verify port cleanup. Startup aborted."
            );
        }

        if (remaining.length === 0) {
            return;
        }

        await sleep(250);
    }

    let remaining;

    try {
        remaining = getWindowsPortListeners();
    } catch {
        throw new Error(
            "Unable to verify that required ports were released."
        );
    }

    if (remaining.length > 0) {
        const details = remaining
            .map(item => `${item.Name} (PID ${item.Pid})`)
            .join(", ");

        throw new Error(
            `Unable to release required ports: ${details}`
        );
    }
}

//------------------------------------------------------
// SELECTED CONSOLE OUTPUT
//
// Full subprocess output is written to log files.
// Delta Exchange output is intentionally excluded from
// the selected broker/master status console filters.
// Its backend workflow remains unchanged.
//------------------------------------------------------

function shouldShowOnConsole(line) {
    return (
        /\[STARTUP\]/i.test(line) ||
        /\[PROXY\]/i.test(line) ||
        /\[BACKEND\]/i.test(line) ||
        /\[FYERS\]|\[ALICEBLUE\]|\[ZERODHA\]|\[INDSTOCKS\]/i.test(line) ||
        /MARKET.?DATA/i.test(line) ||
        /MASTER.?CONTRACT/i.test(line) ||
        /INSTRUMENT.?MASTER/i.test(line) ||
        /INSTRUMENT.?CACHE/i.test(line) ||
        /INSTRUMENT.?SYNCHRON/i.test(line) ||
        /VITE\s+v\d/i.test(line) ||
        /Local\s*:/i.test(line) ||
        /Network\s*:/i.test(line) ||
        /press\s+h\s*\+\s*enter/i.test(line) ||
        /BROKER.*(READY|LOADED|CONNECTED|FAILED|ERROR)/i.test(line) ||
        /(?:FYERS|ALICEBLUE|ZERODHA|INDSTOCKS).*?(?:MASTER|INSTRUMENT|CONTRACT|READY|LOADED|CONNECTED|FAILED|ERROR)/i.test(line) ||
        /(?:MASTER|INSTRUMENT|CONTRACT).*?(?:FYERS|ALICEBLUE|ZERODHA|INDSTOCKS)/i.test(line) ||
        /SERVICES READY/i.test(line) ||
        /LISTENING/i.test(line) ||
        /DEP0190/i.test(line) ||
        /\bWARN(?:ING)?\b/i.test(line) ||
        /\bERROR\b/i.test(line) ||
        /\bFATAL\b/i.test(line)
    );
}

//------------------------------------------------------
// CAPTURE OUTPUT
//------------------------------------------------------

function captureOutput(stream, log, processName) {
    let pending = "";

    stream.on("data", chunk => {
        const output = chunk.toString();

        log.write(output);

        pending += output;

        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? "";

        for (const line of lines) {
			if (shouldShowOnConsole(line)) {
				showConsoleLine(line);
			}
        }
    });

    stream.on("end", () => {
		if (pending && shouldShowOnConsole(pending)) {
			showConsoleLine(pending);
		}

        pending = "";
    });

    stream.on("error", error => {
        console.error(
            `[${processName}] Output stream error: ${error.message}`
        );
    });
}

//------------------------------------------------------
// START A CHILD PROCESS
//------------------------------------------------------

function startProcess(name, args) {
    const logFile = path.join(
        logDir,
        `${name.toLowerCase()}.log`
    );

    const log = createWriteStream(
        logFile,
        { flags: "a" }
    );

    logStreams.push(log);

    const child = spawn(
        process.execPath,
        [npmCli, "--silent", ...args],
        {
            cwd: root,
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
            shell: false
        }
    );

    captureOutput(child.stdout, log, name);
    captureOutput(child.stderr, log, name);

    child.on("error", error => {
        const message =
            `[${name}] Process start error: ` +
            `${error.stack ?? error.message}`;

        log.write(`\n${message}\n`);
        console.error(message);
    });

    child.on("exit", (code, signal) => {
        const message =
            `[${name}] Process exited: ` +
            `code=${code}, signal=${signal ?? "none"}`;

        log.write(`\n${message}\n`);

        if (!shuttingDown) {
            console.error(message);
        }
    });

    children.push({ name, child });

    return child;
}

//------------------------------------------------------
// WAIT FOR HTTPS
//------------------------------------------------------

function waitForHttps(url, name, timeoutMs) {
    return new Promise((resolve, reject) => {
        const started = Date.now();
        let settled = false;

        function finish(error) {
            if (settled) {
                return;
            }

            settled = true;

            if (error) {
                reject(error);
            } else {
                resolve();
            }
        }

        function retry(message) {
            if (settled) {
                return;
            }

            if (Date.now() - started >= timeoutMs) {
                finish(
                    new Error(
                        `${name} failed readiness check: ${message}`
                    )
                );

                return;
            }

            setTimeout(check, RETRY_INTERVAL_MS);
        }

        function check() {
            if (settled) {
                return;
            }

            const request = https.get(
                url,
                {
                    timeout: 2000,
                    rejectUnauthorized: false
                },
                response => {
                    const status = response.statusCode ?? 0;
                    response.resume();

                    if (status >= 200 && status < 400) {
                        finish();
                        return;
                    }

                    retry(`HTTP ${status}`);
                }
            );

            request.on("error", () => {
                retry("HTTPS endpoint not responding");
            });

            request.on("timeout", () => {
                request.destroy();
            });
        }

        check();
    });
}

//------------------------------------------------------
// OPEN URL IN DEFAULT BROWSER
//------------------------------------------------------

function openUrl(url) {
    let command;
    let args;

    if (process.platform === "win32") {
        command = "cmd.exe";
        args = ["/d", "/c", "start", "", url];
    } else if (process.platform === "darwin") {
        command = "open";
        args = [url];
    } else {
        command = "xdg-open";
        args = [url];
    }

    const opener = spawn(
        command,
        args,
        {
            cwd: root,
            stdio: "ignore",
            windowsHide: true,
            shell: false
        }
    );

    opener.on("error", error => {
        const message =
            `[STARTUP] Unable to open broker URL: ${error.message}`;

        console.error(message);

        const log = createWriteStream(
            path.join(logDir, "startup.log"),
            { flags: "a" }
        );

        log.end(`${message}\n`);
    });
}

//------------------------------------------------------
// SHUTDOWN
//------------------------------------------------------

function stopAll() {
    shuttingDown = true;

    for (const { child } of children) {
        if (child.exitCode === null && !child.killed) {
            child.kill();
        }
    }

    for (const log of logStreams) {
        if (!log.destroyed) {
            log.end();
        }
    }
}

process.on("SIGINT", () => {
    stopAll();
    process.exit(0);
});

process.on("SIGTERM", () => {
    stopAll();
    process.exit(0);
});

//------------------------------------------------------
// MAIN STARTUP SEQUENCE
//------------------------------------------------------

async function main() {
    try {
        // Remove stale Node.js listeners before starting services.
        await cleanupOccupiedPorts();

        console.log("[STARTUP] Starting BACKEND...");
        startProcess("BACKEND", ["run", "backend"]);

        await waitForHttps(
            BACKEND_HEALTH_URL,
            "Backend",
            BACKEND_TIMEOUT_MS
        );

        console.log("[STARTUP] BACKEND READY");

        console.log("[STARTUP] Starting VITE...");
        startProcess("VITE", ["run", "dev"]);

        await waitForHttps(
            VITE_URL,
            "Vite",
            SERVICE_TIMEOUT_MS
        );

        console.log("[STARTUP] VITE READY");

        console.log("[STARTUP] Starting PROXY...");
        startProcess("PROXY", ["run", "proxy"]);

        await waitForHttps(
            `${PROXY_URL}/`,
            "Proxy",
            SERVICE_TIMEOUT_MS
        );

        console.log("[STARTUP] PROXY READY");

        // All three services passed their HTTPS readiness checks.
        console.log("");
        console.log("========================================");
        console.log(" AJ-INSTITUTIONAL HTTPS SERVICES READY");
        console.log("========================================");
        console.log(`1. BACKEND : ${BACKEND_URL}`);
        console.log(`2. VITE    : ${VITE_URL}`);
        console.log(`3. PROXY   : ${PROXY_URL}`);
        console.log("4. PORT 443: PROXY HTTPS ENDPOINT");
        console.log("========================================");
        console.log("Frontend requests can now safely start.");
        console.log("========================================");
        console.log("");

        // Open broker login routes only after all services are ready.
        openUrl(`${BACKEND_URL}/api/fyers/login`);
        openUrl(`${BACKEND_URL}/api/aliceblue/login`);
        openUrl(`${BACKEND_URL}/api/zerodha/login`);

        // Keep the startup supervisor alive.
        await new Promise(() => {});

    } catch (error) {
        console.error(
            `[STARTUP ERROR] ${error.message}`
        );

        console.error(
            "[STARTUP ERROR] Services were not all started successfully."
        );

        stopAll();
        process.exit(1);
    }
}

main();