import { auth } from "@admin/lib/auth";
import { getMediaFileService } from "@ecom/features/di/containers/MediaService";
import { createLogger } from "@ecom/lib/logger";
import { NextResponse } from "next/server";

const log = createLogger("UploadRoute");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderIdStr = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract image dimensions if applicable
    let width: number | undefined;
    let height: number | undefined;

    const folderId = folderIdStr ? Number.parseInt(folderIdStr, 10) : null;
    const userId = session.user.id ? Number.parseInt(session.user.id, 10) : undefined;

    const service = getMediaFileService();
    const result = await service.uploadFile({
      file: buffer,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      width,
      height,
      folderId,
      uploadedBy: userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    log.error("Upload error", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
