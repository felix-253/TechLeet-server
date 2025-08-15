# TechLeet Kafka & Karaf Integration

This document describes the Kafka and Apache Karaf integration for the TechLeet microservices architecture.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Service  │    │ Company Service │    │Recruitment Svc  │
│                 │    │                 │    │                 │
│  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │
│  │   Kafka   │  │    │  │   Kafka   │  │    │  │   Kafka   │  │
│  │ Producer/ │  │    │  │ Producer/ │  │    │  │ Producer/ │  │
│  │ Consumer  │  │    │  │ Consumer  │  │    │  │ Consumer  │  │
│  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Kafka Cluster  │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │  Zookeeper  │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │   Topics    │ │
                    │ │ ─────────── │ │
                    │ │user-events  │ │
                    │ │company-evts │ │
                    │ │recruit-evts │ │
                    │ │notify-evts  │ │
                    │ │audit-events │ │
                    │ └─────────────┘ │
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │ Apache Karaf    │
                    │ OSGi Container  │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │Event Router │ │
                    │ │Processors   │ │
                    │ │Workflows    │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

## 🚀 Quick Start

### 1. Start Infrastructure

**Windows:**

```bash
cd background
./start-infrastructure.bat
```

**Linux/Mac:**

```bash
cd background
chmod +x start-infrastructure.sh
./start-infrastructure.sh
```

### 2. Verify Services

- **Kafka UI**: http://localhost:8080
- **Karaf Console**: http://localhost:8181/system/console
- **Redis**: localhost:6379 (password: techleet123)

## 📋 Topics & Events

### Kafka Topics

| Topic                 | Purpose                    | Partitions | Retention |
| --------------------- | -------------------------- | ---------- | --------- |
| `user-events`         | User lifecycle events      | 3          | 7 days    |
| `company-events`      | Company/department events  | 3          | 7 days    |
| `recruitment-events`  | Job postings, applications | 3          | 30 days   |
| `notification-events` | Email/push notifications   | 3          | 3 days    |
| `audit-events`        | Security & data auditing   | 3          | 90 days   |

### Event Types

#### User Events

- `user.created` - New user registration
- `user.updated` - Profile changes
- `user.deleted` - User deletion
- `user.login` - Login activity
- `user.logout` - Logout activity

#### Company Events

- `company.created` - New company
- `department.created` - New department
- `department.updated` - Department changes

#### Recruitment Events

- `job.posted` - New job posting
- `job.updated` - Job posting changes
- `application.submitted` - New application
- `application.reviewed` - Application status change

#### Notification Events

- `notification.email` - Email notifications
- `notification.push` - Push notifications
- `notification.sms` - SMS notifications

#### Audit Events

- `audit.security` - Security-related actions
- `audit.data` - Data access/changes
- `audit.system` - System events

## 🔧 Configuration

### Environment Variables

Add to your `.env` files:

```env
# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=user-service
KAFKA_GROUP_ID=user-service-group

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=techleet123
```

### Service Integration

#### 1. Add to your module:

```typescript
import { KafkaModule } from "./kafka/kafka.module";

@Module({
  imports: [
    // ... other imports
    KafkaModule,
  ],
})
export class AppModule {}
```

#### 2. Use in your service:

```typescript
import { KafkaService } from "./kafka/kafka.service";
import {
  PublishEvent,
  KAFKA_TOPICS,
  EVENT_TYPES,
} from "./kafka/decorators/publish-event.decorator";

@Injectable()
export class UserService {
  constructor(private kafkaService: KafkaService) {}

  @PublishEvent({
    topic: KAFKA_TOPICS.USER_EVENTS,
    eventType: EVENT_TYPES.USER_CREATED,
    keyExtractor: (result) => `user-${result.employeeId}`,
    dataExtractor: (result) => ({
      employeeId: result.employeeId,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
    }),
  })
  async createUser(userData: CreateUserDto) {
    // Your user creation logic
    const user = await this.userRepository.save(userData);

    // Event will be automatically published by the interceptor
    return user;
  }

  // Manual event publishing
  async sendNotification(userId: number, message: string) {
    await this.kafkaService.publishEvent(
      KAFKA_TOPICS.NOTIFICATION_EVENTS,
      `notification-${userId}`,
      {
        eventType: EVENT_TYPES.EMAIL_NOTIFICATION,
        recipientId: userId,
        data: {
          subject: "Important Update",
          template: "user-notification",
          variables: { message },
        },
        timestamp: new Date().toISOString(),
        service: "user-service",
      }
    );
  }
}
```

#### 3. Add the interceptor globally:

```typescript
// main.ts
import { EventPublisherInterceptor } from "./kafka/interceptors/event-publisher.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add the event publisher interceptor
  app.useGlobalInterceptors(app.get(EventPublisherInterceptor));

  await app.listen(3001);
}
```

## 🐳 Docker Services

### Kafka Cluster

- **Image**: `confluentinc/cp-kafka:7.4.0`
- **Ports**: 9092 (external), 29092 (internal)
- **Volume**: Persistent data storage

### Zookeeper

- **Image**: `confluentinc/cp-zookeeper:7.4.0`
- **Ports**: 2181
- **Purpose**: Kafka cluster coordination

### Kafka UI

- **Image**: `provectuslabs/kafka-ui:latest`
- **Ports**: 8080
- **Purpose**: Topic management and monitoring

### Apache Karaf

- **Image**: `apache/karaf:4.4.4`
- **Ports**: 8101 (SSH), 8181 (HTTP), 1099 (JMX)
- **Purpose**: OSGi runtime for enterprise integration

### Redis

- **Image**: `redis:7-alpine`
- **Ports**: 6379
- **Purpose**: Caching and session storage

## 🔍 Monitoring & Debugging

### Kafka UI Dashboard

Access http://localhost:8080 to:

- View topics and partitions
- Monitor message throughput
- Browse message contents
- Manage consumer groups

### Karaf Console

Access via SSH or Web Console:

```bash
# SSH Access
ssh -p 8101 karaf@localhost
Password: karaf

# Web Console
http://localhost:8181/system/console
```

### Message Tracing

```bash
# View messages in real-time
docker exec -it techleet-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic user-events \
  --from-beginning

# List all topics
docker exec techleet-kafka kafka-topics \
  --list --bootstrap-server localhost:9092

# Describe a topic
docker exec techleet-kafka kafka-topics \
  --describe --topic user-events --bootstrap-server localhost:9092
```

## 🛠️ Development Commands

```bash
# Start all services
docker-compose -f background/kafka.docker-compose.yaml up -d

# Stop all services
docker-compose -f background/kafka.docker-compose.yaml down

# View logs
docker-compose -f background/kafka.docker-compose.yaml logs -f kafka

# Reset Kafka data (WARNING: Deletes all messages)
docker-compose -f background/kafka.docker-compose.yaml down -v
```

## 🔒 Security Considerations

1. **Authentication**: Currently disabled for development. Enable SASL for production.
2. **Authorization**: Configure ACLs for topic access control.
3. **Encryption**: Enable SSL/TLS for production deployments.
4. **Network**: Use internal networks for service communication.

## 📚 Best Practices

1. **Event Sourcing**: Use events as the source of truth
2. **Idempotency**: Ensure event handlers are idempotent
3. **Schema Evolution**: Version your event schemas
4. **Error Handling**: Implement dead letter queues
5. **Monitoring**: Track message lag and throughput
6. **Partitioning**: Use meaningful partition keys

## 🚨 Troubleshooting

### Common Issues

**Kafka Connection Refused:**

```bash
# Check if Kafka is running
docker ps | grep techleet-kafka

# Check Kafka logs
docker logs techleet-kafka
```

**Consumer Lag:**

```bash
# Check consumer group status
docker exec techleet-kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe --group user-service-group
```

**Topic Not Found:**

```bash
# Recreate topics
./background/start-infrastructure.sh
```

## 📖 Additional Resources

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [Apache Karaf Guide](https://karaf.apache.org/manual/latest/)
- [KafkaJS Library](https://kafka.js.org/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/basics)
