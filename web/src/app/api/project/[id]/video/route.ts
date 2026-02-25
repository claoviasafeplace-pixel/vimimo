import { NextResponse, type NextRequest } from "next/server";
import { requireProjectOwner } from "@/lib/api-auth";

const RENDER_SECRET = process.env.RENDER_SECRET || "vimimo-dev-secret";

/**
 * Proxy for Remotion render downloads.
 * Needed because the VPS requires Authorization header that browsers can't send via <video src>.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;

  // Auth: only project owner can stream video
  const authResult = await requireProjectOwner(projectId);
  if (authResult.error) return authResult.error;

  const project = authResult.project;

  // Determine which video URL to proxy
  const videoUrl = project.studioMontageUrl || project.finalVideoUrl;
  if (!videoUrl) {
    return NextResponse.json({ error: "Aucune vidéo disponible" }, { status: 404 });
  }

  // Only proxy VPS URLs (Supabase URLs are already public)
  const isVpsUrl = videoUrl.includes(process.env.REMOTION_SERVER_URL || "NOOP");
  if (!isVpsUrl) {
    // Redirect to the public URL directly
    return NextResponse.redirect(videoUrl);
  }

  // Proxy the request with auth header
  const upstream = await fetch(videoUrl, {
    headers: { Authorization: `Bearer ${RENDER_SECRET}` },
    signal: AbortSignal.timeout(120_000),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Erreur vidéo: ${upstream.status}` },
      { status: upstream.status },
    );
  }

  // Stream the response
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "video/mp4",
      "Content-Length": upstream.headers.get("Content-Length") || "",
      "Cache-Control": "public, max-age=3600",
      "Accept-Ranges": "bytes",
    },
  });
}
