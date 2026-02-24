import express from "express";
import { v4 as uuidv4 } from "uuid";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Auth middleware — skip /health, require Bearer token on all other routes
const RENDER_SECRET = process.env.RENDER_SECRET || "vimimo-dev-secret";

app.use((req, res, next) => {
  if (req.path === "/health") return next();

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${RENDER_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

interface RenderJob {
  id: string;
  status: "bundling" | "rendering" | "done" | "error";
  progress: number;
  outputPath: string | null;
  error: string | null;
  createdAt: number;
}

const renders = new Map<string, RenderJob>();
let bundlePath: string | null = null;

// Bundle on startup
async function initBundle() {
  console.log("Bundling Remotion project...");
  bundlePath = await bundle({
    entryPoint: path.resolve(__dirname, "../src/index.ts"),
    onProgress: (p) => process.stdout.write(`\rBundling: ${(p * 100).toFixed(0)}%`),
  });
  console.log("\nBundle ready:", bundlePath);
}

// POST /renders - Start a new render
app.post("/renders", async (req, res) => {
  if (!bundlePath) {
    return res.status(503).json({ error: "Server still bundling, try again in a moment" });
  }

  const id = uuidv4();
  const outputDir = path.resolve(__dirname, "../out");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${id}.mp4`);

  const job: RenderJob = {
    id,
    status: "rendering",
    progress: 0,
    outputPath: null,
    error: null,
    createdAt: Date.now(),
  };
  renders.set(id, job);

  // Start render in background
  (async () => {
    try {
      const composition = await selectComposition({
        serveUrl: bundlePath!,
        id: req.body.compositionId || "PropertyShowcase",
        inputProps: req.body.inputProps || req.body,
      });

      await renderMedia({
        composition,
        serveUrl: bundlePath!,
        codec: "h264",
        outputLocation: outputPath,
        inputProps: req.body.inputProps || req.body,
        onProgress: ({ progress }) => {
          job.progress = Math.round(progress * 100);
        },
      });

      job.status = "done";
      job.outputPath = outputPath;
    } catch (err: any) {
      job.status = "error";
      job.error = err.message || String(err);
      console.error("Render error:", err);
    }
  })();

  res.json({ id, status: "rendering" });
});

// GET /renders/:id - Check status
app.get("/renders/:id", (req, res) => {
  const job = renders.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Render not found" });

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
  });
});

// GET /renders/:id/download - Download MP4
app.get("/renders/:id/download", (req, res) => {
  const job = renders.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Render not found" });
  if (job.status !== "done" || !job.outputPath) {
    return res.status(400).json({ error: "Render not ready", status: job.status });
  }
  res.download(job.outputPath, `vimimo-${job.id}.mp4`);
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", bundled: !!bundlePath, activeRenders: renders.size });
});

const PORT = parseInt(process.env.PORT || "8000", 10);

initBundle().then(() => {
  app.listen(PORT, () => {
    console.log(`VIMIMO Render Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to bundle:", err);
  process.exit(1);
});
