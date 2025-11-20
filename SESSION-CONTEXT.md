# Yggdrasil - DynamoDB Migration to AWS

**Date:** November 19, 2025  
**Task:** Migrate DynamoDB from local Docker to AWS (keep application running locally)  
**Status:** Ready to migrate

---

## Migration Overview

**Current setup:**

- Application: Running locally on Next.js dev server (localhost:3000)
- Database: Local DynamoDB in Docker (localhost:8000)
- Data: 30 items (1 user, 1 tree, 10 persons, 18 relationships)

**Goal:**

- Application: Keep running locally
- Database: Migrate to AWS DynamoDB
- Data: Transfer existing data to AWS (optional)

**Why this works:**
The app was built with dual-environment support. It automatically switches between local and AWS based on the `DYNAMODB_ENDPOINT` environment variable.

---

## Step 1: Create DynamoDB Table on AWS

### 1.1 Access AWS Console

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Navigate to **DynamoDB** service
3. Select your preferred region (e.g., `us-east-1`)

### 1.2 Create Table

Click **"Create table"** and configure:

**Basic Settings:**

- **Table name:** `Yggdrasil` (or your preferred name)
- **Partition key:** `PK` (Type: String)
- **Sort key:** `SK` (Type: String)

**Table Settings:**

- **Table class:** DynamoDB Standard
- **Capacity mode:** On-demand
- **Encryption:** Use AWS owned key (free)

**Secondary Indexes:**
Click **"Create global index"** three times for these GSIs:

**GSI1:**

- Index name: `GSI1`
- Partition key: `GSI1PK` (String)
- Sort key: `GSI1SK` (String)
- Projected attributes: All

**GSI2:**

- Index name: `GSI2`
- Partition key: `GSI2PK` (String)
- Sort key: `GSI2SK` (String)
- Projected attributes: All

**GSI3:**

- Index name: `GSI3`
- Partition key: `GSI3PK` (String)
- Sort key: `GSI3SK` (String)
- Projected attributes: All

**Tags (optional):**

- Key: `Project`, Value: `Yggdrasil`
- Key: `Environment`, Value: `Development`

Click **"Create table"** - takes about 1-2 minutes to become active.

---

## Step 2: Create IAM User for Application Access

### 2.1 Navigate to IAM

1. Go to **IAM** service in AWS Console
2. Click **"Users"** in left sidebar
3. Click **"Create user"**

### 2.2 Configure User

**Step 1: User details**

- User name: `yggdrasil-app`
- Check ☑ "Provide user access to AWS Management Console" - **OPTIONAL**
- Select "I want to create an IAM user"

Click **"Next"**

**Step 2: Set permissions**

- Select **"Attach policies directly"**
- Search and select: `AmazonDynamoDBFullAccess`

  _(Alternative: Create custom policy with least privilege - see below)_

Click **"Next"**

**Step 3: Review and create**

- Review settings
- Click **"Create user"**

### 2.3 Create Access Keys

1. Click on the newly created user `yggdrasil-app`
2. Go to **"Security credentials"** tab
3. Scroll to **"Access keys"** section
4. Click **"Create access key"**
5. Select use case: **"Application running outside AWS"**
6. Click **"Next"**
7. Description: `Yggdrasil local development`
8. Click **"Create access key"**

**⚠️ IMPORTANT:**

- Copy **Access key ID** (starts with AKIA...)
- Copy **Secret access key** (shown only once!)
- Download CSV or save these somewhere secure
- You'll need these for `.env.local`

### 2.4 (Optional) Custom Policy for Least Privilege

Instead of `AmazonDynamoDBFullAccess`, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchWriteItem",
        "dynamodb:BatchGetItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/Yggdrasil",
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/Yggdrasil/index/*"
      ]
    }
  ]
}
```

Replace `REGION` and `ACCOUNT_ID` with your values.

---

## Step 3: Update Local Environment Configuration

### 3.1 Backup Current Data (Optional)

If you want to keep your test data:

```bash
npm run db:backup
```

This creates: `backups/yggdrasil-backup-YYYYMMDD-HHMMSS.json`

### 3.2 Update `.env.local`

Open `c:\Users\Max\Documents\AWS\yggdrasil\.env.local` and modify:

**Before (Local Docker):**

```bash
# Database Configuration
DYNAMODB_ENDPOINT=http://localhost:8000
DYNAMODB_REGION=us-east-1
DYNAMODB_TABLE_NAME=Yggdrasil

# AWS Credentials (not needed for local)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Auth Configuration
NEXTAUTH_SECRET=your-existing-secret-keep-this
NEXTAUTH_URL=http://localhost:3000

# S3 Configuration (not used yet)
S3_BUCKET_NAME=yggdrasil-photos-local
S3_REGION=us-east-1
```

**After (AWS DynamoDB):**

```bash
# Database Configuration
# DYNAMODB_ENDPOINT=http://localhost:8000  <-- COMMENT OUT OR REMOVE
DYNAMODB_REGION=us-east-1                   <-- Your AWS region
DYNAMODB_TABLE_NAME=Yggdrasil               <-- Your table name

# AWS Credentials
AWS_REGION=us-east-1                        <-- Same as DYNAMODB_REGION
AWS_ACCESS_KEY_ID=AKIA...                   <-- From Step 2.3
AWS_SECRET_ACCESS_KEY=abc123...             <-- From Step 2.3

# Auth Configuration (KEEP THESE SAME)
NEXTAUTH_SECRET=your-existing-secret-keep-this
NEXTAUTH_URL=http://localhost:3000

# S3 Configuration (not used yet)
S3_BUCKET_NAME=yggdrasil-photos-local
S3_REGION=us-east-1
```

**Key Changes:**

1. ❌ Remove or comment out `DYNAMODB_ENDPOINT` line
2. ✅ Add your AWS credentials (Access Key ID and Secret)
3. ✅ Verify region matches where you created the table
4. ✅ Keep all other settings the same

### 3.3 Restart Dev Server

Stop the current dev server (Ctrl+C) and restart:

```bash
npm run dev
```

Watch the console output - you should see:

```
🔧 AWS Configuration Loaded:
- Environment: development
- DynamoDB Mode: AWS (Production)          <-- Changed!
- DynamoDB Region: us-east-1
- DynamoDB Table: Yggdrasil
✅ Configuration Valid
✅ DynamoDB connection successful
✅ Table "Yggdrasil" exists
```

If you see **"DynamoDB Mode: AWS (Production)"** instead of "Local (Docker)", you're connected to AWS! 🎉

---

## Step 4: Migrate Data to AWS (Optional)

You have two options:

### Option A: Start Fresh

The table is empty. Just create a new account and start using it.

### Option B: Transfer Existing Data

Create a migration script to copy your local data to AWS:

**Create:** `scripts/migrate-to-aws.ts`

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import * as fs from "fs";
import * as path from "path";

// Connect to AWS (using credentials from .env.local)
const awsClient = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const awsDocClient = DynamoDBDocumentClient.from(awsClient);

async function migrateData() {
  console.log("\n=== Migrating Data to AWS DynamoDB ===\n");

  // Find the most recent backup
  const backupsDir = path.join(process.cwd(), "backups");
  const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.error("❌ No backup files found. Run 'npm run db:backup' first.");
    process.exit(1);
  }

  const latestBackup = files.sort().reverse()[0];
  const backupPath = path.join(backupsDir, latestBackup);

  console.log(`📂 Loading backup: ${latestBackup}`);
  const data = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

  console.log(`📊 Found ${data.items.length} items to migrate\n`);

  // Batch write to AWS (25 items at a time - DynamoDB limit)
  const tableName = process.env.DYNAMODB_TABLE_NAME || "Yggdrasil";
  let migrated = 0;

  for (let i = 0; i < data.items.length; i += 25) {
    const batch = data.items.slice(i, i + 25);

    try {
      await awsDocClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: batch.map((item: any) => ({
              PutRequest: { Item: item },
            })),
          },
        })
      );

      migrated += batch.length;
      console.log(`✓ Migrated ${migrated}/${data.items.length} items`);
    } catch (error) {
      console.error(`❌ Error migrating batch:`, error);
    }
  }

  console.log(`\n✅ Migration complete! ${migrated} items transferred to AWS.`);
}

migrateData();
```

**Run migration:**

```bash
npx tsx scripts/migrate-to-aws.ts
```

---

## Step 5: Test the Connection

### 5.1 Test Authentication

1. Open http://localhost:3000
2. Sign in with: `demo@yggdrasil.local` / `demo123`
3. Should work if you migrated data, or create a new account if starting fresh

### 5.2 Test CRUD Operations

1. Create a new family tree
2. Add a person
3. Verify data appears in AWS:
   - Go to AWS Console → DynamoDB → Tables → Yggdrasil
   - Click "Explore table items"
   - Should see your data!

### 5.3 Verify in Console Output

Check the terminal where `npm run dev` is running:

```
✅ DynamoDB connection successful
✅ DynamoDB is accessible
✅ Table "Yggdrasil" exists
GET /api/trees 200
POST /api/persons 200
```

All operations should return 200 (success).

---

## Troubleshooting

### Connection Fails

**Error:** `ResourceNotFoundException: Requested resource not found`

- Check table name in `.env.local` matches AWS exactly
- Verify table status is ACTIVE in AWS Console

**Error:** `UnrecognizedClientException: The security token included in the request is invalid`

- Check AWS credentials are correct
- Ensure no extra spaces in `.env.local`
- Try regenerating access keys in IAM

**Error:** `AccessDeniedException: User is not authorized to perform: dynamodb:Query`

- IAM user needs proper permissions
- Attach `AmazonDynamoDBFullAccess` policy or custom policy

### Slow Performance

- Check you're in the right AWS region (closer = faster)
- On-demand mode has no performance limits
- Consider switching to provisioned capacity if needed

### Cost Concerns

- Check DynamoDB pricing page
- Set up CloudWatch billing alerts
- Use AWS Cost Explorer to monitor

---

## Reverting to Local (If Needed)

To switch back to local Docker:

1. Uncomment in `.env.local`:

   ```bash
   DYNAMODB_ENDPOINT=http://localhost:8000
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

That's it! The app automatically switches back to local mode.

---

## What Stays Local vs AWS

**Running on Your Machine:**

- ✅ Next.js dev server (localhost:3000)
- ✅ All React components and pages
- ✅ API routes (Next.js API)
- ✅ NextAuth.js authentication
- ✅ File system (.env.local, code, etc.)

**Running on AWS:**

- ☁️ DynamoDB table (data storage)
- ☁️ Global Secondary Indexes
- ☁️ IAM authentication for API calls

**Not Used Yet:**

- S3 (photo uploads)
- Cognito (will use for production auth later)
- CloudFront, Lambda, etc.

---

## Next Steps After Migration

Once you verify everything works with AWS DynamoDB:

1. **Update Documentation** - Note which environment you're using
2. **Set Up Billing Alerts** - Monitor AWS costs
3. **Plan Full Deployment** - Eventually deploy the entire app to Vercel/AWS
4. **Implement S3** - Add photo upload functionality
5. **Switch to Cognito** - Replace credentials auth with Cognito

---

## Cost Estimate

**DynamoDB On-Demand Pricing (us-east-1):**

- Write requests: $1.25 per million
- Read requests: $0.25 per million
- Storage: $0.25 per GB/month (first 25 GB free)

**Your usage (development/testing):**

- ~100 reads/day = 3,000/month = $0.00075
- ~50 writes/day = 1,500/month = $0.00188
- Storage: < 1 GB = FREE

**Estimated monthly cost: < $0.01** (essentially free for development)

**Note:** AWS Free Tier includes:

- 25 GB storage
- 25 read capacity units
- 25 write capacity units
- Good for 12 months

---

## Summary

✅ **Before Migration:**

- App: Local
- DB: Docker (localhost:8000)

✅ **After Migration:**

- App: Still local (localhost:3000)
- DB: AWS DynamoDB (cloud)

✅ **Benefits:**

- Real AWS environment for testing
- Data persists (no Docker issues)
- Practice for full deployment
- Extremely low cost (< $1/month)

✅ **No Changes Required:**

- Code works exactly the same
- Just environment variable changes
- Automatic switching between local/AWS

---

**Ready to migrate tomorrow!** 🚀
