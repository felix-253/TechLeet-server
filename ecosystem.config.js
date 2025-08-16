// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './api-gateway/dist/main.js',
    },
    {
      name: 'user-service',
      script: './user-service/dist/main.js',
    },
    {
      name: 'company-service',
      script: './company-service/dist/main.js',
    },
    {
      name: 'recruitment-service',
      script: './recruitment-service/dist/main.js',
    },
  ],
};