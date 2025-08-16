module.exports = {
  apps: [
    {
      name: 'api-gateway',
      cwd: './api-gateway', // Change the current working directory to the service folder
      script: 'pnpm',
      env_file: '/root/TechLeet-server-microservice/api-gateway/.env',
      args: 'run start:prod', // Pass the script name as arguments
    },
    {
      name: 'user-service',
      cwd: './user-service',
      script: 'pnpm',
      env_file: '/root/TechLeet-server-microservice/user-service/.env',
      args: 'run start:prod',
    },
    {
      name: 'company-service',
      cwd: './company-service',
      script: 'pnpm',
      env_file: '/root/TechLeet-server-microservice/company-service/.env',
      args: 'run start:prod',
    },
    {
      name: 'recruitment-service',
      cwd: './recruitment-service',
      script: 'pnpm',
      env_file: '/root/TechLeet-server-microservice/recruitment-service/.env',
      args: 'run start:prod',
    },
  ],
};