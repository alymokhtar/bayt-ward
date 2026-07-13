import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import https from "https";
import {
  getCloudinaryApiKey,
  getCloudinaryApiSecret,
  getCloudinaryCloudName,
  getCloudinaryUploadFolder,
  isCloudinaryConfigured,
} from "@/lib/env";

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
};

let configured = false;
let cloudinaryTimeOffsetSeconds: number | null = null;

function ensureCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  if (configured) return;

  cloudinary.config({
    cloud_name: getCloudinaryCloudName(),
    api_key: getCloudinaryApiKey(),
    api_secret: getCloudinaryApiSecret(),
    secure: true,
  });

  configured = true;
}

async function getCloudinaryTimestamp(): Promise<number> {
  if (cloudinaryTimeOffsetSeconds !== null) {
    return Math.floor(Date.now() / 1000 + cloudinaryTimeOffsetSeconds);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.cloudinary.com",
        path: "/",
        method: "HEAD",
        timeout: 10000,
      },
      (res) => {
        const dateHeader = res.headers.date;
        if (!dateHeader) {
          reject(new Error("CLOUDINARY_SERVER_DATE_MISSING"));
          return;
        }

        const serverTime = Date.parse(dateHeader);
        if (Number.isNaN(serverTime)) {
          reject(new Error("CLOUDINARY_SERVER_DATE_INVALID"));
          return;
        }

        cloudinaryTimeOffsetSeconds = Math.floor(serverTime / 1000) - Math.floor(Date.now() / 1000);
        console.log("STEP 3: resolveCloudinaryTimestamp", {
          serverTimeUTC: new Date(serverTime).toISOString(),
          localTimeUTC: new Date().toISOString(),
          offsetSeconds: cloudinaryTimeOffsetSeconds,
        });
        resolve(Math.floor(serverTime / 1000));
      }
    );

    req.on("error", (error) => {
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy(new Error("CLOUDINARY_SERVER_TIME_TIMEOUT"));
    });

    req.end();
  });
}

function toUploadResult(response: UploadApiResponse): CloudinaryUploadResult {
  const url = response.secure_url || response.url;
  if (!url || !response.public_id) {
    throw new Error("CLOUDINARY_UPLOAD_INCOMPLETE");
  }

  return {
    url,
    publicId: response.public_id,
  };
}

export async function resolveCloudinaryTimestamp(): Promise<number> {
  return getCloudinaryTimestamp();
}

export async function uploadImageBuffer(
  buffer: Buffer,
  options?: { folder?: string; publicId?: string; contentType?: string }
): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfigured();

  const folder = options?.folder ?? getCloudinaryUploadFolder();
  const contentType = options?.contentType ?? "image/png";
  const timestamp = new Date().toISOString();

  console.log("STEP 4: uploadImageBuffer start", {
    folder,
    publicId: options?.publicId,
    contentType,
    timestamp,
  });

  const cloudinaryTimestamp = await resolveCloudinaryTimestamp();
  const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;

  console.log("STEP 4: uploadImageBuffer request params", {
    folder,
    publicId: options?.publicId,
    contentType,
    timestamp: cloudinaryTimestamp,
  });

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: options?.publicId,
    resource_type: "image",
    overwrite: true,
    timestamp: cloudinaryTimestamp,
  });

  console.log("STEP 5: uploadImageBuffer result", {
    url: result.secure_url || result.url,
    publicId: result.public_id,
    responseTime: new Date().toISOString(),
  });

  return toUploadResult(result);
}

export async function deleteImageByPublicId(publicId: string): Promise<void> {
  ensureCloudinaryConfigured();

  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export { isCloudinaryConfigured };
