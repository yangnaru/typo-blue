import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ENDPOINT_URL = process.env.R2_ENDPOINT_URL;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT_URL!,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(file: File, key: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    },
  });

  await upload.done();

  // Return the public URL
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string
): Promise<{ url: string }> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(r2Client, command, {
    expiresIn: 3600, // 1 hour
  });

  return { url };
}
