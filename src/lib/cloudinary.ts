import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
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

export async function uploadImageBuffer(
  buffer: Buffer,
  options?: { folder?: string; publicId?: string }
): Promise<CloudinaryUploadResult> {
  ensureCloudinaryConfigured();

  const folder = options?.folder ?? getCloudinaryUploadFolder();

  return new Promise((resolve, reject) => {
    let callbackCalled = false;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options?.publicId,
        resource_type: "image",
      },
      (error, result) => {
        callbackCalled = true;
        
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }

        try {
          resolve(toUploadResult(result));
        } catch (parseError) {
          reject(parseError);
        }
      }
    );

    // Handle stream errors
    uploadStream.on("error", (error) => {
      if (!callbackCalled) {
        reject(error);
      }
    });

    // Write buffer to stream
    uploadStream.write(buffer, (error) => {
      if (error && !callbackCalled) {
        reject(error);
      }
    });

    // End the stream
    uploadStream.end();
  });
}

export async function deleteImageByPublicId(publicId: string): Promise<void> {
  ensureCloudinaryConfigured();

  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

export { isCloudinaryConfigured };
