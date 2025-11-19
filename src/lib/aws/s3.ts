/**
 * S3 Client Configuration
 *
 * This module sets up the S3 client for file storage (profile photos, documents).
 * It automatically configures based on environment (local file system vs AWS S3).
 *
 * Local Development Strategy:
 * - For simplicity, use file system storage in public/uploads/
 * - Alternatively, use LocalStack for S3 emulation
 *
 * Production Strategy:
 * - Use AWS S3 with signed URLs for secure access
 * - Implement proper CORS and bucket policies
 */

import { S3Client } from "@aws-sdk/client-s3";
import { s3Config, appConfig } from "./config";

/**
 * Create the S3 client
 *
 * Configuration:
 * - endpoint: Points to LocalStack (local) or AWS (production)
 * - region: AWS region
 * - forcePathStyle: Required for LocalStack
 */
export const s3Client = new S3Client({
  // Use local endpoint if S3_ENDPOINT is set, otherwise use AWS default
  ...(s3Config.endpoint && { endpoint: s3Config.endpoint }),

  // AWS region
  region: s3Config.region,

  // Force path style for LocalStack (s3.localhost.com/bucket vs bucket.s3.localhost.com)
  forcePathStyle: s3Config.forcePathStyle,

  // Credentials will use default chain (same as DynamoDB)
});

/**
 * Helper function to check if S3 is accessible
 *
 * @returns Promise<boolean> - true if S3 is accessible, false otherwise
 */
export async function checkS3Connection(): Promise<boolean> {
  try {
    const { ListBucketsCommand } = await import("@aws-sdk/client-s3");
    await s3Client.send(new ListBucketsCommand({}));

    if (appConfig.debug) {
      console.log("✅ S3 connection successful");
    }

    return true;
  } catch (error) {
    if (appConfig.debug) {
      console.warn(
        "⚠️ S3 connection failed (optional for local development):",
        error
      );
    }
    return false;
  }
}

/**
 * Helper function to check if a bucket exists
 *
 * @param bucketName - Name of the bucket to check
 * @returns Promise<boolean> - true if bucket exists, false otherwise
 */
export async function checkBucketExists(bucketName: string): Promise<boolean> {
  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));

    if (appConfig.debug) {
      console.log(`✅ Bucket "${bucketName}" exists`);
    }

    return true;
  } catch (error) {
    const err = error as { name?: string };
    if (err.name === "NotFound" || err.name === "NoSuchBucket") {
      if (appConfig.debug) {
        console.log(`⚠️ Bucket "${bucketName}" does not exist`);
      }
      return false;
    }

    console.error(`❌ Error checking bucket "${bucketName}":`, error);
    return false;
  }
}

/**
 * Generate a pre-signed URL for uploading a file
 *
 * This allows clients to upload files directly to S3 without
 * going through your server, reducing bandwidth and costs.
 *
 * @param key - S3 object key (file path)
 * @param expiresIn - URL expiration time in seconds (default 5 minutes)
 * @returns Promise<string> - Pre-signed upload URL
 */
export async function getUploadUrl(
  key: string,
  expiresIn: number = 300
): Promise<string> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const command = new PutObjectCommand({
    Bucket: s3Config.bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a pre-signed URL for downloading a file
 *
 * This allows users to access private files securely without
 * making your S3 bucket public.
 *
 * @param key - S3 object key (file path)
 * @param expiresIn - URL expiration time in seconds (default 1 hour)
 * @returns Promise<string> - Pre-signed download URL
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const command = new GetObjectCommand({
    Bucket: s3Config.bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Upload a file directly from server
 *
 * Use this when you need to upload from your server.
 * For client uploads, prefer getUploadUrl() with direct browser uploads.
 *
 * @param key - S3 object key (file path)
 * @param body - File content (Buffer or ReadableStream)
 * @param contentType - MIME type (e.g., 'image/jpeg')
 * @returns Promise<void>
 */
export async function uploadFile(
  key: string,
  body: Buffer | ReadableStream,
  contentType: string
): Promise<void> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
      Body: body as Buffer,
      ContentType: contentType,
    })
  );

  if (appConfig.debug) {
    console.log(`✅ Uploaded file: ${key}`);
  }
}

/**
 * Delete a file from S3
 *
 * @param key - S3 object key (file path)
 * @returns Promise<void>
 */
export async function deleteFile(key: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: s3Config.bucketName,
      Key: key,
    })
  );

  if (appConfig.debug) {
    console.log(`🗑️ Deleted file: ${key}`);
  }
}

/**
 * Log S3 client configuration (development only)
 */
if (appConfig.debug) {
  console.log("📦 S3 Client Configured:");
  console.log("- Mode:", s3Config.endpoint ? "LocalStack" : "AWS S3");
  console.log("- Endpoint:", s3Config.endpoint || "AWS Default");
  console.log("- Region:", s3Config.region);
  console.log("- Bucket:", s3Config.bucketName);
  console.log("- Path Style:", s3Config.forcePathStyle);

  // Note: S3 is optional for initial development
  console.log("💡 S3 is optional - you can start without it and add later");
}

// Export client and utilities
const s3Utils = {
  client: s3Client,
  checkConnection: checkS3Connection,
  checkBucketExists,
  getUploadUrl,
  getDownloadUrl,
  uploadFile,
  deleteFile,
};

export default s3Utils;
