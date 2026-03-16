module.exports = {
  apps: [
    {
      name: "aurora-app",
      cwd: "/var/www/aurora-app",
      script: "npm",
      args: "start",
      interpreter: "/usr/bin/node",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "500M",
      out_file: "/home/paul/.pm2/logs/aurora-app-out.log",
      error_file: "/home/paul/.pm2/logs/aurora-app-error.log",
      time: true
    }
  ]
};
