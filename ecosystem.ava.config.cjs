/** PM2: ava.nmiczd.ru на 127.0.0.1:3010 */
module.exports = {
  apps: [
    {
      name: "ava-nmiczd",
      cwd: "/var/www/ava.nmiczd.ru",
      script: "npm",
      args: "run start:prod",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
