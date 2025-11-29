/**
 * PM2 Ecosystem Configuration File
 * For production deployment and process management
 *
 * Usage:
 *   Development: pm2 start ecosystem.config.js
 *   Production:  pm2 start ecosystem.config.js --env production
 *   Monitoring:  pm2 monit
 *   Logs:        pm2 logs
 *   Restart:     pm2 restart all
 *   Stop:        pm2 stop all
 */

module.exports = {
  apps: [
    {
      name: 'quickbite-backend',
      script: './Backend/server.js',
      cwd: './Backend',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Enable cluster mode for load balancing
      watch: false, // Disable in production
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000
    }
  ]
};
