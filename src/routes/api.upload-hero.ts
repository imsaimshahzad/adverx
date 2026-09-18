import { createFileRoute } from "@tanstack/react-router";
import { put } from "@vercel/blob";

export const Route = createFileRoute("/api/upload-hero")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) return Response.json({ error: "Image file is required." }, { status: 400 });
        if (!file.type.startsWith("image/")) return Response.json({ error: "Only image files are allowed." }, { status: 415 });
        if (file.size > 5 * 1024 * 1024) return Response.json({ error: "Image must be 5MB or smaller." }, { status: 413 });
        const blob = await put(`homepage-hero/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, file, { access: "public", addRandomSuffix: false });
        return Response.json({ url: blob.url });
      },
    },
  },
});
