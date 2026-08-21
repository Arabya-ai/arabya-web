// PM2 process file for Contabo / VPS Node hosting.
// Usage (after npm ci && npm run build):
//   pm2 start deploy/contabo/ecosystem.config.cjs
//   pm2 save

module.exports = {
  apps: [
    {
      name: "arabya-web",
      cwd: "/var/www/arabya-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      // Contabo VPS: allow headroom for Quran JSON + study routes
      max_memory_restart: "1500M",
      // Prevent infinite crash-loops that present as public 503
      min_uptime: "10s",
      max_restarts: 15,
      exp_backoff_restart_delay: 2000,
      kill_timeout: 8000,
      time: true,
    },
  ],
};
