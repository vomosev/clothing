module.exports = {
  apps: [
    {
      name: 'clothing',
      script: 'server/index.js',
      cwd: '/home/arx-app/backends/clothing',
      env: {
        NODE_ENV: 'production',
        PORT: 4118,
      },
    },
  ],
};