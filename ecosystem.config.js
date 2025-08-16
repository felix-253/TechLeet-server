module.exports = {
  apps: [
    {
      name: 'api-gateway',
      cwd: './api-gateway', // Change the current working directory to the service folder
      script: 'pnpm',
      args: 'run start:prod', // Pass the script name as arguments
    },
    {
      name: 'user-service',
      cwd: './user-service',
      script: 'pnpm',
      args: 'run start:prod',
    },
    {
      name: 'company-service',
      cwd: './company-service',
      script: 'pnpm',
      args: 'run start:prod',
    },
    {
      name: 'recruitment-service',
      cwd: './recruitment-service',
      script: 'pnpm',
      args: 'run start:prod',
    },
  ],
};