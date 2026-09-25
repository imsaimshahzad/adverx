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
        if (!["image/jpeg","image/png","image/webp"].includes(file.type)) return Response.json({ error: "Only JPG, PNG or WebP images are allowed." }, { status: 415 });
        if (!/^.{1,180}$/.test(file.name) || !/^[a-zA-Z0-9._-]+$/.test(file.name)) return Response.json({ error: "Invalid file name." }, { status: 400 });
        if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Image must be 5MB or smaller." }, { status: 413 });
        const blob = await put(`homepage-hero/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, file, { access: "public", addRandomSuffix: false });
        return Response.json({ url: blob.url });
      },
    },
  },
});
