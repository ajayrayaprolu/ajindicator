// ecosystem.config.cjs
//
// PM2 process definition for the AI-Institutional stack.
// Named .cjs explicitly so it's always loaded as CommonJS
// regardless of the project's package.json "type" setting.
//
// ARCHITECTURE (deliberately kept as ONE wrapped script, not
// split into separate pm2 apps for backend/vite/proxy):
// start-server.js already sequences backend -> vite -> proxy
// with proper health-gating between each (waitForHttps), and
// nodemon already handles backend file-watching internally.
// Splitting this into 3 separate pm2 apps would lose that
// sequencing and just be MORE moving parts to manage, not
// fewer - the opposite of what was asked for. This wraps the
// existing single script unchanged.
//
// The popup-window problem this used to have was NEVER about
// how many scripts orchestrate the startup - it was one Node
// child_process option (windowsHide) inside start-server.js
// itself, now fixed there. This file doesn't need to work
// around it.
//
// SETUP (one-time):
//   npm install -g pm2
//
// DAILY USE (from C:\AI-Institutional):
//   pm2 start ecosystem.config.cjs     start it (background, no window)
//   pm2 status                         is it running? (this replaces "eyeballing a popup window")
//   pm2 logs ai-institutional          tail the live console output on demand
//   pm2 restart ai-institutional       restart cleanly
//   pm2 stop ai-institutional          stop it
//   pm2 delete ai-institutional        remove it from pm2's tracking entirely
//
// AUTO-START ON WINDOWS BOOT (optional, separate step):
//   npm install -g pm2-windows-startup
//   pm2-startup install
//   pm2 save
// (plain "pm2 startup" is Linux-oriented; pm2-windows-startup
// is the Windows-specific equivalent - only set this up if you
// actually want it running before you log in, not required for
// the background/status/restart behavior above.)

module.exports = {
    apps: [
        {
            name: "ai-institutional",
            script: "start-server.js",
            cwd: "C:\\AI-Institutional",
            interpreter: "node",

            // start-server.js already handles backend/vite/proxy
            // lifecycle and SIGINT/SIGTERM cleanup internally -
            // let pm2 manage only the top-level process, not try
            // to reimplement what start-server.js already does.
            autorestart: true,
            max_restarts: 10,
            min_uptime: "15s",   // don't count a crash-within-15s toward a "successful" start
            restart_delay: 3000,

            watch: false,        // nodemon (inside "npm run backend") already handles file-watch; pm2 watching too would double-restart on every save

            env: {
                // "development", not "production" - this launches
                // "npm run dev" (Vite dev server) and nodemon, both
                // dev tools. Was mislabeled "production" before,
                // which didn't break anything functionally (Vite's
                // "dev" command forces dev mode regardless) but was
                // misleading in "pm2 status"/logs.
                NODE_ENV: "development"
            },

            out_file: "./logs/pm2-out.log",
            error_file: "./logs/pm2-error.log",
            merge_logs: true,
            time: true
        }
    ]
};
