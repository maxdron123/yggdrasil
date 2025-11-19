/**
 * AWS Configuration Module
 *
 * This module provides environment-aware AWS configuration that automatically
 * switches between local DynamoDB (Docker) and production AWS DynamoDB based
 * on environment variables.
 *
 * Key Concept: Dual-Mode Configuration
 * - If DYNAMODB_ENDPOINT is set → Use DynamoDB Local (Docker)
 * - If DYNAMODB_ENDPOINT is not set → Use AWS DynamoDB (Production)
 *
 * This allows seamless development locally without AWS costs, then easy
 * deployment to production without code changes.
 */

/**
 * Environment Variables Reference:
 *
 * Local Development (.env.local):
 * - DYNAMODB_ENDPOINT=http://localhost:8000  (triggers local mode)
 * - AWS_REGION=us-east-1
 * - AWS_ACCESS_KEY_ID=local  (dummy value)
 * - AWS_SECRET_ACCESS_KEY=local  (dummy value)
 *
 * Production (.env.production):
 * - DYNAMODB_ENDPOINT=  (unset - triggers AWS mode)
 * - AWS_REGION=us-east-1
 * - AWS_ACCESS_KEY_ID=  (from IAM or environment)
 * - AWS_SECRET_ACCESS_KEY=  (from IAM or environment)
 */

// Environment detection
export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";

// DynamoDB Configuration
export const dynamoDBConfig = {
  /**
   * DynamoDB Endpoint
   *
   * Local: http://localhost:8000 (DynamoDB Local in Docker)
   * Production: undefined (uses default AWS endpoint)
   *
   * The presence of this value determines whether we're in local or AWS mode
   */
  endpoint: process.env.DYNAMODB_ENDPOINT,

  /**
   * AWS Region
   *
   * Required by AWS SDK even for local development.
   * DynamoDB Local doesn't care about region, but SDK validates it.
   *
   * Should match your production region for consistency.
   */
  region: process.env.AWS_REGION || "us-east-1",

  /**
   * Table Name
   *
   * Use the same table name in both local and production.
   * This makes it easier to migrate data and test queries.
   */
  tableName: process.env.DYNAMODB_TABLE_NAME || "Yggdrasil",

  /**
   * AWS Credentials
   *
   * Local: Dummy values (DynamoDB Local doesn't validate)
   * Production: Real credentials from IAM or environment
   *
   * Best Practice: Use IAM roles in production (no credentials needed)
   *
   * IMPORTANT: For DynamoDB Local, we MUST provide credentials even if they're
   * dummy values. Otherwise AWS SDK tries to load from credential provider chain
   * which fails in development. The endpoint override means these credentials
   * never get sent to AWS.
   */
  credentials: process.env.DYNAMODB_ENDPOINT
    ? {
        // Local development with dummy credentials
        // DynamoDB Local doesn't validate these, but SDK requires them
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fakeAccessKeyId",
        secretAccessKey:
          process.env.AWS_SECRET_ACCESS_KEY || "fakeSecretAccessKey",
      }
    : // Production uses default credential provider chain:
      // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
      // 2. IAM role (preferred for Amplify, EC2, ECS)
      // 3. AWS credentials file (~/.aws/credentials)
      undefined,
};

// S3 Configuration (for profile photos)
export const s3Config = {
  /**
   * S3 Endpoint
   *
   * Local: Can use LocalStack (http://localhost:4566) or file system
   * Production: undefined (uses default AWS S3 endpoint)
   */
  endpoint: process.env.S3_ENDPOINT,

  /**
   * S3 Region
   *
   * Should match DynamoDB region for simplicity
   */
  region: process.env.S3_REGION || process.env.AWS_REGION || "us-east-1",

  /**
   * Bucket Name
   *
   * Different buckets for local and production recommended
   */
  bucketName:
    process.env.S3_BUCKET_NAME ||
    (isDevelopment ? "yggdrasil-photos-local" : "yggdrasil-photos"),

  /**
   * Force path style for LocalStack
   *
   * LocalStack requires path-style URLs: http://localhost:4566/bucket/key
   * AWS S3 uses virtual-hosted style: http://bucket.s3.amazonaws.com/key
   */
  forcePathStyle: !!process.env.S3_ENDPOINT,
};

// Cognito Configuration (Production only)
export const cognitoConfig = {
  /**
   * Cognito Region
   *
   * Where your Cognito User Pool is deployed
   */
  region:
    process.env.NEXT_PUBLIC_COGNITO_REGION ||
    process.env.AWS_REGION ||
    "us-east-1",

  /**
   * User Pool ID
   *
   * Get from AWS Console > Cognito > User Pools
   * Format: us-east-1_XXXXXXXXX
   */
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",

  /**
   * App Client ID
   *
   * Get from User Pool > App Integration > App clients
   */
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "",

  /**
   * Is Cognito Configured?
   *
   * In local development, we use NextAuth credentials provider
   * In production, we can use Cognito
   */
  isConfigured: !!(
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID &&
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
  ),
};

// NextAuth Configuration
export const authConfig = {
  /**
   * Secret for JWT encryption
   *
   * CRITICAL: Use a secure random string in production!
   * Generate with: openssl rand -base64 32
   */
  secret: process.env.NEXTAUTH_SECRET || "local-development-secret",

  /**
   * Application URL
   *
   * Used for callbacks and redirects
   */
  url:
    process.env.NEXTAUTH_URL ||
    (isDevelopment
      ? "http://localhost:3000"
      : "https://your-app.amplifyapp.com"),
};

// Application Configuration
export const appConfig = {
  /**
   * Environment
   */
  env: process.env.NODE_ENV || "development",

  /**
   * Debug Mode
   *
   * Enable verbose logging in development
   */
  debug: process.env.DEBUG === "true" || isDevelopment,

  /**
   * Is Running Locally?
   *
   * True if using DynamoDB Local (Docker)
   */
  isLocal: !!process.env.DYNAMODB_ENDPOINT,

  /**
   * Is Running in Production?
   */
  isProduction,

  /**
   * Is Running in Development?
   */
  isDevelopment,
};

// Helper function to validate configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required environment variables
  if (!dynamoDBConfig.region) {
    errors.push("AWS_REGION is required");
  }

  if (!dynamoDBConfig.tableName) {
    errors.push("DYNAMODB_TABLE_NAME is required");
  }

  if (isProduction) {
    // Production-specific validations
    if (authConfig.secret === "local-development-secret") {
      errors.push(
        "NEXTAUTH_SECRET must be set to a secure value in production"
      );
    }

    if (!authConfig.url || authConfig.url.includes("localhost")) {
      errors.push("NEXTAUTH_URL must be set to production URL");
    }

    if (!cognitoConfig.isConfigured) {
      console.warn(
        "Warning: Cognito not configured. Using credentials provider."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Log configuration on module load (only in development)
if (isDevelopment && appConfig.debug) {
  console.log("🔧 AWS Configuration Loaded:");
  console.log("- Environment:", appConfig.env);
  console.log("- DynamoDB Mode:", appConfig.isLocal ? "Local (Docker)" : "AWS");
  console.log("- DynamoDB Endpoint:", dynamoDBConfig.endpoint || "AWS Default");
  console.log("- DynamoDB Region:", dynamoDBConfig.region);
  console.log("- DynamoDB Table:", dynamoDBConfig.tableName);
  console.log("- S3 Bucket:", s3Config.bucketName);
  console.log(
    "- Cognito:",
    cognitoConfig.isConfigured ? "Configured" : "Not Configured"
  );

  const validation = validateConfig();
  if (!validation.valid) {
    console.error("❌ Configuration Errors:");
    validation.errors.forEach((error) => console.error(`  - ${error}`));
  } else {
    console.log("✅ Configuration Valid");
  }
}

// Export all configurations
export default {
  dynamoDB: dynamoDBConfig,
  s3: s3Config,
  cognito: cognitoConfig,
  auth: authConfig,
  app: appConfig,
  validateConfig,
};
