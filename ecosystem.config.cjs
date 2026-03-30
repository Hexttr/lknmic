/** PM2: lk.nmiczd.ru на 127.0.0.1:3010 (не трогает другие приложения) */
module.exports = {
  apps: [
    {
      name: "lk-nmiczd",
      cwd: "/var/www/lk.nmiczd.ru",
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
