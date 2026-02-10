import "dotenv/config";
import cloudinary from "./cloudinary.js";

async function main() {
  const res = await cloudinary.api.ping();
  console.log("✅ Cloudinary OK:", res);
}

main().catch((err) => {
  console.error("❌ Cloudinary FAIL:", err?.message || err);
  process.exit(1);
});
