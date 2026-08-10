import { prisma } from "../src/lib/prisma";

async function main() {
  const keys = [
    "social_facebook_url",
    "social_instagram_url",
    "social_tiktok_url",
    "social_youtube_url",
    "social_snapchat_url",
    "social_x_url",
  ];

  console.log("Deleting test social keys:", keys);
  const result = await prisma.setting.deleteMany({
    where: { key: { in: keys } },
  });
  console.log("Deleted count:", result.count);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
