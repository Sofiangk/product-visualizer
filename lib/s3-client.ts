import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
  throw new Error("Missing AWS Configuration");
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // Lightsail/S3 endpoint
  endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
  forcePathStyle: false, // Use virtual-hosted style (bucket.s3.region.amazonaws.com)
});

export const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

export async function checkFileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

export function getPublicUrl(key: string): string {
  // Construct standard S3 public URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
