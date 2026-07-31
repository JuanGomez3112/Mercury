import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { putMedia, extFor } from "@/lib/s3";

const MAX_IMG = 10 * 1024 * 1024;  // 10 MB
const MAX_VID = 50 * 1024 * 1024;  // 50 MB
const MAX_FILES = 10;

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulario inválido" }, { status: 400 });

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "Sin archivos" }, { status: 400 });
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Máximo ${MAX_FILES} archivos` }, { status: 400 });
  }

  const urls: string[] = [];
  for (const file of files) {
    if (!extFor(file.type)) {
      return NextResponse.json({ error: `Tipo no permitido: ${file.type}` }, { status: 400 });
    }
    const isVideo = file.type.startsWith("video/");
    const cap = isVideo ? MAX_VID : MAX_IMG;
    if (file.size > cap) {
      return NextResponse.json({ error: isVideo ? "Video mayor a 50 MB" : "Imagen mayor a 10 MB" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    urls.push(await putMedia(buf, file.type, session.sub));
  }

  return NextResponse.json({ ok: true, urls });
}
