# AWS Configuration Guide

## Overview

Yggdrasil uses a **dual-environment configuration system** that automatically switches between local Docker services (development) and AWS services (production) based on environment variables.

This approach allows you to:

- Develop locally without AWS costs
- Test with real DynamoDB locally
- Deploy to AWS without code changes
- Switch environments with a single variable

## Architecture

### Configuration Detection

The system detects the environment based on the presence of `DYNAMODB_ENDPOINT`:

```typescript
// Local Development
DYNAMODB_ENDPOINT=http://localhost:8000  → Uses DynamoDB Local (Docker)

// Production
DYNAMODB_ENDPOINT=                        → Uses AWS DynamoDB
```

### File Structure

```
src/lib/aws/
├── config.ts       # Central configuration (detects environment)
├── dynamodb.ts     # DynamoDB client setup
└── s3.ts           # S3 client setup (optional)
```

## Environment Files

### `.env.local` (Local Development)

```bash
# DynamoDB Local (Docker)
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
DYNAMODB_TABLE_NAME=Yggdrasil

# NextAuth
NEXTAUTH_SECRET=local-development-secret
NEXTAUTH_URL=http://localhost:3000

# App
NODE_ENV=development
DEBUG=true
```

**Key Points:**

- `DYNAMODB_ENDPOINT` presence triggers local mode
- Credentials are dummy values (DynamoDB Local doesn't validate)
- This file is in `.gitignore` - not committed
- Each developer can customize their local settings

### `.env.production` (AWS Production)

```bash
# AWS DynamoDB
# DYNAMODB_ENDPOINT=           # Leave empty/unset!
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=Yggdrasil

# AWS Credentials (optional - use IAM roles if possible)
# AWS_ACCESS_KEY_ID=<from-aws>
# AWS_SECRET_ACCESS_KEY=<from-aws>

# NextAuth (CRITICAL: Change these!)
NEXTAUTH_SECRET=<generate-secure-random-string>
NEXTAUTH_URL=https://your-app.amplifyapp.com

# Cognito
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_cognito_client_id

# S3
S3_BUCKET_NAME=yggdrasil-photos
S3_REGION=us-east-1

# App
NODE_ENV=production
DEBUG=false
```

**Key Points:**

- `DYNAMODB_ENDPOINT` must be empty/unset
- Use real AWS credentials or IAM roles
- **NEVER commit this file with real credentials**
- Use `.env.production.template` as a guide

## Configuration Modules

### `config.ts` - Central Configuration

Exports configuration objects for all AWS services:

```typescript
import config from "@/lib/aws/config";

// DynamoDB configuration
config.dynamoDB.endpoint; // Local: http://localhost:8000, AWS: undefined
config.dynamoDB.region; // us-east-1
config.dynamoDB.tableName; // Yggdrasil

// S3 configuration
config.s3.endpoint; // Local: http://localhost:4566, AWS: undefined
config.s3.bucketName; // yggdrasil-photos
config.s3.region; // us-east-1

// Cognito configuration
config.cognito.userPoolId; // AWS Cognito User Pool ID
config.cognito.clientId; // App Client ID
config.cognito.isConfigured; // true if Cognito is set up

// App configuration
config.app.isLocal; // true if using Docker
config.app.isProduction; // true if NODE_ENV=production
config.app.debug; // true in development
```

**Usage Example:**

```typescript
import { dynamoDBConfig } from "@/lib/aws/config";

console.log("Using DynamoDB at:", dynamoDBConfig.endpoint || "AWS");
console.log("Table name:", dynamoDBConfig.tableName);
```

### `dynamodb.ts` - DynamoDB Client

Provides two clients:

#### 1. Low-Level Client (Administrative)

```typescript
import { dynamoDBClient } from '@/lib/aws/dynamodb';
import { CreateTableCommand } from '@aws-sdk/client-dynamodb';

// Use for admin operations
await dynamoDBClient.send(new CreateTableCommand({ ... }));
```

#### 2. Document Client (Application)

```typescript
import { docClient } from "@/lib/aws/dynamodb";
import { PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Much simpler! Automatically converts JavaScript objects
await docClient.send(
  new PutCommand({
    TableName: "Yggdrasil",
    Item: {
      PK: "USER#123",
      SK: "PERSON#456",
      FirstName: "John",
      Age: 30, // No need to specify types!
    },
  })
);
```

**Why Document Client?**

Without Document Client (complex):

```typescript
{
  PK: { S: "USER#123" },
  SK: { S: "PERSON#456" },
  FirstName: { S: "John" },
  Age: { N: "30" }  // Numbers are strings!
}
```

With Document Client (simple):

```typescript
{
  PK: "USER#123",
  SK: "PERSON#456",
  FirstName: "John",
  Age: 30  // Native JavaScript types!
}
```

**Utility Functions:**

```typescript
import {
  checkDynamoDBConnection,
  checkTableExists,
  getTableInfo,
} from "@/lib/aws/dynamodb";

// Check if DynamoDB is accessible
const isConnected = await checkDynamoDBConnection();

// Check if a table exists
const exists = await checkTableExists("Yggdrasil");

// Get table information
const info = await getTableInfo("Yggdrasil");
console.log("Item count:", info.itemCount);
console.log("Size:", info.sizeBytes);
```

### `s3.ts` - S3 Client (Optional)

Provides S3 operations for file storage:

```typescript
import {
  getUploadUrl,
  getDownloadUrl,
  uploadFile,
  deleteFile,
} from "@/lib/aws/s3";

// Generate pre-signed URL for client upload
const uploadUrl = await getUploadUrl("photos/user123/profile.jpg");
// Client can now upload directly to S3

// Generate pre-signed URL for download
const downloadUrl = await getDownloadUrl("photos/user123/profile.jpg");
// User can access private file securely

// Upload from server
await uploadFile("photos/user123/profile.jpg", buffer, "image/jpeg");

// Delete file
await deleteFile("photos/user123/profile.jpg");
```

## How It Works

### 1. Application Startup

```typescript
// config.ts loads environment variables
import { dynamoDBConfig } from "@/lib/aws/config";

// Automatically detects mode
if (dynamoDBConfig.endpoint) {
  console.log("Running in LOCAL mode (Docker)");
  console.log("Endpoint:", dynamoDBConfig.endpoint);
} else {
  console.log("Running in AWS mode (Production)");
}
```

### 2. Client Creation

```typescript
// dynamodb.ts creates clients based on config
export const dynamoDBClient = new DynamoDBClient({
  // Only set endpoint if DYNAMODB_ENDPOINT exists
  ...(dynamoDBConfig.endpoint && { endpoint: dynamoDBConfig.endpoint }),
  region: dynamoDBConfig.region,
  ...(dynamoDBConfig.credentials && {
    credentials: dynamoDBConfig.credentials,
  }),
});
```

### 3. Application Usage

```typescript
// Your application code doesn't change!
import { docClient } from "@/lib/aws/dynamodb";

// Works in both local and production
await docClient.send(
  new GetCommand({
    TableName: "Yggdrasil",
    Key: { PK: "USER#123", SK: "PERSON#456" },
  })
);
```

## Development Workflow

### Daily Development (Local)

1. **Start Docker services**

   ```powershell
   npm run docker:up
   ```

2. **Verify environment**

   ```powershell
   # Check .env.local has DYNAMODB_ENDPOINT set
   cat .env.local
   ```

3. **Start Next.js dev server**

   ```powershell
   npm run dev
   ```

4. **Application automatically uses Docker**

   - Connects to `http://localhost:8000`
   - No AWS costs
   - No internet required

5. **View data in Admin UI**
   - Open http://localhost:8001
   - See all tables and items

### Production Deployment (AWS)

1. **Set up AWS services**

   - Create DynamoDB table
   - Create Cognito User Pool
   - Create S3 bucket

2. **Configure Amplify environment variables**

   - Go to Amplify Console
   - Add environment variables from `.env.production.template`
   - **DO NOT set `DYNAMODB_ENDPOINT`**

3. **Deploy application**

   ```powershell
   npm run build
   # Or push to GitHub (triggers Amplify build)
   ```

4. **Application automatically uses AWS**
   - No `DYNAMODB_ENDPOINT` = AWS mode
   - Uses real AWS services
   - Uses IAM role credentials

## Troubleshooting

### Local: "Cannot connect to DynamoDB"

**Problem:** App can't reach DynamoDB Local

**Solutions:**

1. Check Docker is running:

   ```powershell
   docker ps
   ```

2. Check DynamoDB container is up:

   ```powershell
   docker logs yggdrasil-dynamodb
   ```

3. Verify `.env.local` has correct endpoint:

   ```bash
   DYNAMODB_ENDPOINT=http://localhost:8000
   ```

4. Test connection manually:
   ```powershell
   curl http://localhost:8000
   ```

### Local: "Table does not exist"

**Problem:** Table hasn't been created yet

**Solution:**

```powershell
npm run db:setup
```

### Production: "Missing authentication token"

**Problem:** AWS credentials not configured

**Solutions:**

1. **Best Practice:** Use IAM roles (Amplify, EC2, ECS)

   - No credentials needed in environment
   - AWS automatically provides them

2. **Alternative:** Set environment variables in Amplify Console

   ```
   AWS_ACCESS_KEY_ID=<your-key>
   AWS_SECRET_ACCESS_KEY=<your-secret>
   ```

3. **Check IAM permissions:**
   - User/role needs `dynamodb:*` permissions
   - Attach `AmazonDynamoDBFullAccess` policy

### Production: "ResourceNotFoundException"

**Problem:** Table doesn't exist in AWS

**Solutions:**

1. Create table manually in AWS Console

2. Run setup script against AWS:

   ```powershell
   # Temporarily unset DYNAMODB_ENDPOINT
   $env:DYNAMODB_ENDPOINT = ""
   npm run db:setup
   ```

3. Deploy infrastructure as code (CDK/CloudFormation)

### "Invalid endpoint" or "Network error"

**Problem:** Wrong endpoint configuration

**Check:**

```typescript
// Add to your code temporarily
import config from "@/lib/aws/config";
console.log("Environment:", config.app.env);
console.log("DynamoDB endpoint:", config.dynamoDB.endpoint);
console.log("Is local?", config.app.isLocal);
```

## Best Practices

### Security

1. **Never commit credentials**

   - `.env.local` and `.env.production` are in `.gitignore`
   - Use `.env.*.template` files for documentation

2. **Use IAM roles in production**

   - Amplify provides IAM roles automatically
   - No need to store credentials

3. **Rotate secrets regularly**

   - Generate new `NEXTAUTH_SECRET` periodically
   - Update AWS access keys every 90 days

4. **Use AWS Secrets Manager**
   - Store sensitive values in AWS
   - Fetch at runtime instead of environment variables

### Performance

1. **Reuse clients**

   - Clients are created once at module load
   - Don't create new clients in functions

2. **Use Document Client**

   - Simpler code
   - Automatic type conversion
   - Better performance

3. **Enable debug logging in development**
   ```bash
   DEBUG=true
   ```

### Cost Optimization

1. **Develop locally**

   - No AWS charges during development
   - Preserve free tier for production testing

2. **Use on-demand billing**

   - No upfront capacity planning
   - Pay only for what you use

3. **Monitor usage**
   - Set up AWS Budgets
   - Alert at $5-10 threshold
   - Free tier: 25 GB + 25 WCU/RCU

## Configuration Validation

The system validates configuration on startup:

```typescript
import { validateConfig } from "@/lib/aws/config";

const validation = validateConfig();
if (!validation.valid) {
  console.error("Configuration errors:");
  validation.errors.forEach((error) => console.error(`- ${error}`));
}
```

**Checks:**

- Required variables are set
- Production has secure secrets
- URLs are appropriate for environment
- Cognito is configured (if using)

## Testing

### Test Local Configuration

```typescript
// test/config.test.ts
import config from "@/lib/aws/config";

describe("Local Configuration", () => {
  it("should use local DynamoDB", () => {
    expect(config.dynamoDB.endpoint).toBe("http://localhost:8000");
    expect(config.app.isLocal).toBe(true);
  });
});
```

### Test Production Configuration

```powershell
# Set production environment
$env:NODE_ENV = "production"
$env:DYNAMODB_ENDPOINT = ""

# Run tests
npm test
```

## Migration Path

### From Local to AWS

1. **Backup local data**

   ```powershell
   npm run db:backup
   ```

2. **Create AWS resources**

   - DynamoDB table
   - Cognito User Pool
   - S3 bucket

3. **Migrate data (optional)**

   ```powershell
   # Export from local
   npm run db:backup

   # Import to AWS
   # Set AWS credentials
   $env:DYNAMODB_ENDPOINT = ""
   npm run db:restore backups/backup-2025-11-17.json
   ```

4. **Update environment**

   - Remove `DYNAMODB_ENDPOINT` from `.env.production`
   - Set real AWS credentials

5. **Deploy**
   ```powershell
   npm run build
   npm run deploy
   ```

## Next Steps

1. ✅ Configuration system set up
2. → Create DynamoDB table setup scripts
3. → Define data schemas (Person, Relationship, Tree)
4. → Implement service layer (CRUD operations)
5. → Build API routes
6. → Create UI components

## Resources

- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [AWS Amplify Hosting](https://docs.amplify.aws/guides/hosting/nextjs/q/platform/js/)
