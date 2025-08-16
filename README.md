# TechLeet Microservices Architecture

This project implements a microservices architecture for the TechLeet system using NestJS.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │
│  (Next.js)      │◄──►│   Port: 3030    │
└─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌
        
```

## Services

### 1. API Gateway (Port: 3030)
- **Purpose**: Central entry point for all client requests
- **Features**: 
  - Request routing to microservices
  - Authentication middleware
  - Rate limiting
  - Swagger documentation aggregation
  - CORS handling

### 2. User Service (Port: 3031)
- **Purpose**: User management and authentication
- **Features**:
  - Employee management
  - Authentication (JWT)
  - User profiles
  - Permissions management

### 3. Company Service (Port: 3032)
- **Purpose**: Company and organizational data management
- **Features**:
  - Company information
  - Departments
  - Positions
  - Organizational structure

### 4. Recruitment Service (Port: 3033)
- **Purpose**: Recruitment and hiring process management
- **Features**:
  - Job postings
  - Applications
  - Interview scheduling
  - Candidate management

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis
- pnpm

### Installation

1. **Clone and install dependencies**:
```bash
cd TechLeet-server-microservice
pnpm install:all
```

2. **Environment Setup**:
```bash
# Copy environment files for each service
cp api-gateway/.env.example api-gateway/.env
cp user-service/.env.example user-service/.env
cp company-service/.env.example company-service/.env
cp recruitment-service/.env.example recruitment-service/.env
```

3. **Database Setup**:
```bash
# Create shared database (currently all services use the same database)
createdb tech-leet
```

4. **Start all services**:
```bash
pnpm dev
```

### Individual Service Commands

```bash
# Start only API Gateway
pnpm dev:gateway

# Start only microservices (without gateway)
pnpm dev:services

# Build all services
pnpm build:all
```

## API Endpoints

### API Gateway Routes
- **Base URL**: `http://localhost:3030`
- **User Service**: `/api/v1/user-service/*`
- **Company Service**: `/api/v1/company-service/*`
- **Recruitment Service**: `/api/v1/recruitment-service/*`

### Documentation
- **API Gateway Swagger**: `http://localhost:3030/api`
- **User Service Swagger**: `http://localhost:3031/api`
- **Company Service Swagger**: `http://localhost:3032/api`
- **Recruitment Service Swagger**: `http://localhost:3033/api`

## Development

### Adding New Endpoints

1. **Add to respective service**:
```typescript
// In service controller
@Controller('example')
export class ExampleController {
  @Get()
  findAll() {
    return this.exampleService.findAll();
  }
}
```

2. **No changes needed in API Gateway** - routes automatically proxy

### Environment Variables

Each service uses its own `.env` file. Key variables:

- `PORT`: Service port number
- `HOST`: Service hostname
- `DB_*`: Database connection settings
- `REDIS_*`: Redis connection settings
- `JWT_SECRET`: JWT signing secret

## Monitoring

### Health Checks
- **API Gateway**: `http://localhost:3030/health`
- **User Service**: `http://localhost:3031/api/health`
- **Company Service**: `http://localhost:3032/api/health`
- **Recruitment Service**: `http://localhost:3033/api/health`

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3030-3033 are available
2. **Database connection**: Check PostgreSQL is running and databases exist
3. **Redis connection**: Ensure Redis server is running
4. **Environment variables**: Verify all `.env` files are properly configured

### Logs
Each service logs to console with color-coded output:
- 🟣 API Gateway (Magenta)
- 🟢 User Service (Green)
- 🔵 Company Service (Cyan)
- 🔵 Recruitment Service (Blue)

## Database Configuration

### **Current Setup:**
- ✅ **All Services**: `tech-leet` (shared database)
- 📝 **Note**: Currently all services use the same database for simplicity during development

### **Future Roadmap:**
- 🔄 **Database Separation**: Each service will have its own database
  - `tech-leet-user` for User Service
  - `tech-leet-company` for Company Service
  - `tech-leet-recruitment` for Recruitment Service
- 🔄 **Data Migration**: Scripts to migrate shared data to separate databases
- 🔄 **Cross-Service Communication**: Implement proper inter-service data access patterns
