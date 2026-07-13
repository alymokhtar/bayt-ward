import { v2 as cloudinary } from "cloudinary";
import {
  getCloudinaryApiKey,
  getCloudinaryApiSecret,
  getCloudinaryCloudName,
  getCloudinaryUploadFolder,
} from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const cloudName = getCloudinaryCloudName();
  const apiKey = getCloudinaryApiKey();
  const apiSecret = getCloudinaryApiSecret();
  const uploadFolder = getCloudinaryUploadFolder();
  const localTime = new Date().toISOString();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  try {
    const result = await cloudinary.api.ping();

    return new Response(JSON.stringify({
      success: true,
      cloudName,
      apiKeyPreview: apiKey.slice(0, 4),
      hasApiSecret: Boolean(apiSecret),
      uploadFolder: Boolean(uploadFolder),
      localTime,
      timeZone,
      ping: result,
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      cloudName,
      apiKeyPreview: apiKey.slice(0, 4),
      hasApiSecret: Boolean(apiSecret),
      uploadFolder: Boolean(uploadFolder),
      error,
    }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
