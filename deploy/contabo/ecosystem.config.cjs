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
      max_memory_restart: "900M",
      time: true,
    },
  ],
};
