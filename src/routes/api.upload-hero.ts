import { createFileRoute } from "@tanstack/react-router";
import { put } from "@vercel/blob";
import { requireAdminUser } from "@/lib/auth.server";

export const Route = createFileRoute("/api/upload-hero")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminUser();
        } catch {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }
        const formData = await request.formData();
        const keys = Array.from(formData.keys());
        if (keys.length !== 1 || keys[0] !== "file") return Response.json({ error: "Invalid upload payload." }, { status: 400 });
        const file = formData.get("file");
        if (!(file instanceof File)) return Response.json({ error: "Image file is required." }, { status: 400 });
        const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
        const maxBytes = 5 * 1024 * 1024;
        if (!allowedMimeTypes.has(file.type)) return Response.json({ error: "Only JPG, PNG or WebP images are allowed." }, { status: 415 });
        if (!/^.{1,180}$/.test(file.name) || !/^[a-zA-Z0-9._-]+$/.test(file.name)) return Response.json({ error: "Invalid file name." }, { status: 400 });
        if (file.size <= 0 || file.size > maxBytes) return Response.json({ error: "Image must be between 1 byte and 5MB." }, { status: 413 });

        // Never trust the browser-provided MIME type: verify the actual file signature.
        const bytes = new Uint8Array(await file.arrayBuffer());
        const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
        const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
        const detectedMime = isJpeg ? "image/jpeg" : isPng ? "image/png" : isWebp ? "image/webp" : null;
        if (!detectedMime || detectedMime !== file.type) return Response.json({ error: "The uploaded file is not a valid supported image." }, { status: 415 });

        const extension = detectedMime === "image/jpeg" ? "jpg" : detectedMime === "image/png" ? "png" : "webp";
        const blobPath = `homepage-hero/${crypto.randomUUID()}.${extension}`;
        const uploadFile = new File([bytes], `hero.${extension}`, { type: detectedMime });
        try {
          const blob = await put(blobPath, uploadFile, { access: "public", addRandomSuffix: false });
          return Response.json({ url: blob.url });
        } catch (error) {
          console.error("[AdverX] hero image upload failed", error);
          return Response.json({ error: "Unable to upload the hero image. Please try again." }, { status: 500 });
        }
      },
    },
  },
});
