module.exports = {
  apps: [
    {
      name: "aurora-app-dev",
      cwd: "/var/www/aurora-app-dev",
      script: "node_modules/.bin/next",
      args: "start -p 3001",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      max_memory_restart: "500M",
      out_file: "/home/paul/.pm2/logs/aurora-app-dev-out.log",
      error_file: "/home/paul/.pm2/logs/aurora-app-dev-error.log",
      time: true
    }
  ]
};
