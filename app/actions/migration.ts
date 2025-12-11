"use server";

import { s3Client, BUCKET_NAME, checkFileExists, getPublicUrl } from "@/lib/s3-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage"; // For efficient streaming uploads (optional, using simple put for now)
import crypto from 'crypto';
import path from 'path';

function generateHash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex').substring(0, 8);
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

async function fetchImage(url: string, retries = 2): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
        if (retries > 0 && response.status !== 404) {
            console.log(`Retry fetch for ${url}, ${retries} remaining`);
            await new Promise(res => setTimeout(res, 1000));
            return fetchImage(url, retries - 1);
        }
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { buffer, contentType };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    if (retries > 0) {
        await new Promise(res => setTimeout(res, 1000));
        return fetchImage(url, retries - 1);
    }
    return null;
  }
}

async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  try {
    // Check if exists first
    const exists = await checkFileExists(key);
    if (exists) {
        // console.log(`File exists, skipping upload: ${key}`);
        return getPublicUrl(key);
    }

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read', // Make it public
    });

    await s3Client.send(command);
    return getPublicUrl(key);
  } catch (error) {
    console.error(`S3 Upload Error for ${key}:`, error);
    throw error;
  }
}

export type MigrationResult = {
  success: boolean;
  newUrl?: string;
  error?: string;
  skipped?: boolean;
};

export async function migrateImage(
  url: string, 
  productId: string, 
  category: string, 
  type: 'main' | 'additional', 
  index: number = 0
): Promise<MigrationResult> {
  // Skip if already an S3 URL
  if (url.includes(BUCKET_NAME!) && url.includes('amazonaws.com')) {
    return { success: true, newUrl: url, skipped: true };
  }
  
  // Skip invalid URLs
  if (!url || !url.startsWith('http')) {
      return { success: false, error: 'Invalid URL' };
  }

  const imageData = await fetchImage(url);
  if (!imageData) {
    return { success: false, error: 'Failed to download image' };
  }

  const { buffer, contentType } = imageData;
  const hash = generateHash(buffer);
  const ext = contentType.split('/')[1] || 'jpg';
  const catSlug = slugify(category || 'uncategorized');
  
  // Naming: category/productID_type_index_hash.ext
  // e.g. mom-baby/101_additional_1_af32b1.jpg
  // For main image, index is ignored in filename usually, but we can include it or just _main
  const typeSuffix = type === 'main' ? 'main' : `additional_${index + 1}`;
  const key = `${catSlug}/${productId}_${typeSuffix}_${hash}.${ext}`;

  try {
    const s3Url = await uploadToS3(buffer, key, contentType);
    return { success: true, newUrl: s3Url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
