# Docker Setup Guide for Yggdrasil

## Overview

This project uses Docker Compose to run AWS services locally for development. This eliminates the need to connect to AWS during development and avoids any costs.

## Services Running

### 1. DynamoDB Local

- **Port**: 8000
- **Container**: `yggdrasil-dynamodb`
- **Purpose**: Local DynamoDB database for development
- **Data Storage**: `./docker/dynamodb-data/` (persists between restarts)

### 2. DynamoDB Admin UI

- **Port**: 8001
- **Container**: `yggdrasil-dynamodb-admin`
- **Purpose**: Web interface to view and manage DynamoDB tables
- **Access**: http://localhost:8001

## Quick Start Commands

### Start Docker Services

```powershell
# Start all services in background
npm run docker:up

# Or using docker-compose directly
docker-compose up -d
```

### Stop Docker Services

```powershell
# Stop all services
npm run docker:down

# Or using docker-compose directly
docker-compose down
```

### View Logs

```powershell
# View logs from all services
npm run docker:logs

# View logs from specific service
docker logs yggdrasil-dynamodb
docker logs yggdrasil-dynamodb-admin
```

### Check Service Status

```powershell
# List running containers
docker ps

# Should show two containers:
# - yggdrasil-dynamodb (port 8000)
# - yggdrasil-dynamodb-admin (port 8001)
```

## Accessing Services

### DynamoDB Local

- **Endpoint**: http://localhost:8000
- **Region**: us-east-1 (can be any value for local)
- **Credentials**: Any dummy credentials work (e.g., "local" / "local")
- **Usage**: Connect via AWS SDK in your application

### DynamoDB Admin UI

1. Open browser to http://localhost:8001
2. You'll see a web interface showing all DynamoDB tables
3. Click on a table to view/edit items
4. Very helpful for debugging during development

## Data Persistence

### Where is data stored?

- DynamoDB data is stored in `./docker/dynamodb-data/`
- This directory is mounted as a Docker volume
- Data persists even when you stop containers

### Backup Local Data

```powershell
# Create backup of current data
npm run db:backup

# This creates a JSON file in `./backups/` folder
```

### Reset Database (Start Fresh)

```powershell
# Stop containers
npm run docker:down

# Delete data directory
Remove-Item -Recurse -Force ./docker/dynamodb-data

# Start containers again (will create fresh empty database)
npm run docker:up

# Setup tables again
npm run db:setup
```

## Troubleshooting

### Port Already in Use

If you get an error about ports 8000 or 8001 being in use:

```powershell
# Find process using port 8000
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess

# Kill the process or use different ports in docker-compose.yml
```

### Container Won't Start

```powershell
# Check logs for errors
docker logs yggdrasil-dynamodb

# Remove all containers and volumes
docker-compose down -v

# Restart
docker-compose up -d
```

### Can't Connect to DynamoDB

1. Verify container is running: `docker ps`
2. Check logs: `docker logs yggdrasil-dynamodb`
3. Test connection:

```powershell
# Using curl (if installed)
curl http://localhost:8000

# Should return DynamoDB's home page
```

## Docker Compose Configuration Explained

### docker-compose.yml Structure

```yaml
services:
  dynamodb-local:
    # Uses official Amazon DynamoDB Local image
    image: amazon/dynamodb-local:latest

    # Exposed on port 8000
    ports:
      - "8000:8000"

    # Command flags:
    # -sharedDb: All connections see the same data
    # -dbPath /data: Store data in /data directory
    command: "-jar DynamoDBLocal.jar -sharedDb -dbPath /data"

    # Mount local directory for data persistence
    volumes:
      - ./docker/dynamodb-data:/data

  dynamodb-admin:
    # Community-built admin interface
    image: aaronshaf/dynamodb-admin:latest

    # Exposed on port 8001
    ports:
      - "8001:8001"

    # Tell admin where to find DynamoDB
    environment:
      - DYNAMO_ENDPOINT=http://dynamodb-local:8000
```

### Why Docker Compose?

1. **Service Orchestration**: Starts multiple services with one command
2. **Networking**: Services can communicate by name (dynamodb-local)
3. **Volume Management**: Persists data automatically
4. **Reproducibility**: Same setup works on any machine

## Development Workflow

### Daily Development

```powershell
# 1. Start Docker services (only once)
npm run docker:up

# 2. Setup database (only first time or after reset)
npm run db:setup

# 3. Start Next.js dev server
npm run dev

# 4. Develop your application
# App connects to localhost:8000 for DynamoDB

# 5. View database in browser
# Open http://localhost:8001 to see your data

# 6. When done for the day
npm run docker:down
```

### Testing Different Scenarios

```powershell
# Seed database with sample family tree
npm run db:seed

# Make changes in your app
# ...

# Backup current state before trying something risky
npm run db:backup

# Try new feature
# ...

# If something breaks, restore from backup or reset
npm run docker:down
Remove-Item -Recurse -Force ./docker/dynamodb-data
npm run docker:up
npm run db:setup
```

## Environment Variables

### Local Development (.env.local)

```bash
# DynamoDB Local endpoint
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=us-east-1

# Dummy credentials (DynamoDB Local doesn't validate these)
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

# Table name
DYNAMODB_TABLE_NAME=Yggdrasil
```

### Production (.env.production)

```bash
# Real AWS DynamoDB
# DYNAMODB_ENDPOINT is not set (uses default AWS endpoint)
DYNAMODB_REGION=us-east-1

# Real AWS credentials (from IAM or environment)
# AWS_ACCESS_KEY_ID=<from-aws>
# AWS_SECRET_ACCESS_KEY=<from-aws>

# Same table name
DYNAMODB_TABLE_NAME=Yggdrasil
```

## Cost Savings

### Why Use Docker for Development?

1. **$0 Cost**: No AWS charges during development
2. **Faster**: No network latency to AWS
3. **Offline**: Works without internet connection
4. **Experimentation**: Reset database instantly, no data cleanup costs
5. **CI/CD**: Can run tests locally before deploying

### AWS Free Tier Limits (When You Deploy)

- **DynamoDB**: 25 GB storage, 25 read/write capacity units (always free)
- **S3**: 5 GB storage, 20,000 GET, 2,000 PUT requests/month (12 months free)
- **Cognito**: 50,000 monthly active users (always free)
- **Amplify**: 1,000 build minutes, 15 GB served/month (always free)

By developing locally, you preserve your free tier limits for production testing!

## Next Steps

1. ✅ Docker services running
2. → Set up DynamoDB tables (`npm run db:setup`)
3. → Seed sample data (`npm run db:seed`)
4. → Start Next.js dev server (`npm run dev`)
5. → Open http://localhost:3000 to see your app
6. → Open http://localhost:8001 to inspect database

## Additional Resources

- [DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [DynamoDB Admin GitHub](https://github.com/aaronshaf/dynamodb-admin)
