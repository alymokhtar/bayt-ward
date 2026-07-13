import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { getCloudinaryApiKey, getCloudinaryApiSecret, getCloudinaryCloudName, getCloudinaryUploadFolder } from "@/lib/env";
import { resolveCloudinaryTimestamp } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function GET() {
  const cloudName = getCloudinaryCloudName();
  const apiKey = getCloudinaryApiKey();
  const apiSecret = getCloudinaryApiSecret();
  const uploadFolder = getCloudinaryUploadFolder();
  const localTime = new Date().toISOString();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const imageBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVQYV2NgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=",
    "base64"
  );

  try {
    const cloudinaryTimestamp = await resolveCloudinaryTimestamp();
    const dataUri = `data:image/png;base64,${imageBuffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: uploadFolder,
      resource_type: "image",
      overwrite: true,
      tags: ["debug-upload"],
      timestamp: cloudinaryTimestamp,
    });

    const media = await prisma.productMedia.create({
      data: {
        productColorId: (await prisma.productColor.findFirst({ select: { id: true } }))?.id ?? "",
        url: result.secure_url || result.url,
        publicId: result.public_id,
        sortOrder: 0,
        isPrimary: true,
        isActive: true,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      localTime,
      cloudinaryTimestamp,
      result,
      media,
    }, null, 2), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      localTime,
      error,
    }, null, 2), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
