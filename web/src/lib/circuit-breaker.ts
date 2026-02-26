import OpenAI from "openai";
import Replicate from "replicate";
import { getSupabase } from "./supabase";

// =============================================
// Constants
// =============================================

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ALERT_DEBOUNCE_MS = 15 * 60 * 1000; // 15 minutes
const COST_THRESHOLD_USD = parseFloat(process.env.COST_THRESHOLD_USD || "10.0");
const REMOTION_URL = process.env.REMOTION_SERVER_URL || "http://localhost:8000";
const RENDER_SECRET = process.env.RENDER_SECRET || "vimimo-dev-secret";
const ADMIN_EMAIL = "claoviasafeplace@gmail.com";

// =============================================
// Types
// =============================================

export type ServiceName = "openai" | "replicate" | "replicate_video" | "remotion";

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerRow {
  service: string;
  state: CircuitState;
  consecutive_failures: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  opened_at: string | null;
  last_alert_at: string | null;
  failure_reason: string | null;
  updated_at: string;
}

export interface ServiceHealth {
  service: string;
  healthy: boolean;
  circuitState: CircuitState;
  consecutiveFailures: number;
  lastFailureAt: string | null;
  error?: string;
}

export interface HealthReport {
  healthy: boolean;
  timestamp: string;
  services: Record<string, ServiceHealth>;
}

export interface PreCheckResult {
  available: ServiceName[];
  degraded: ServiceName[];
}

// Estimated cost per API call in USD
const COST_MAP: Record<string, number> = {
  "gpt-4o-vision": 0.03,
  "gpt-4o-text": 0.01,
  "flux-kontext-pro": 0.05,
  "kling-v2.1-pro": 0.50,
};

// =============================================
// Custom Errors
// =============================================

export class CircuitOpenError extends Error {
  constructor(public service: ServiceName) {
    super(`Circuit breaker OPEN for ${service} — service unavailable`);
    this.name = "CircuitOpenError";
  }
}

export class PaymentRequiredError extends Error {
  constructor(public service: ServiceName) {
    super(`402 Payment Required for ${service} — quota exhausted`);
    this.name = "PaymentRequiredError";
  }
}

export class CostThresholdError extends Error {
  constructor(
    public projectId: string,
    public currentCost: number,
    public threshold: number,
  ) {
    super(
      `Cost threshold exceeded for project ${projectId}: $${currentCost.toFixed(2)} >= $${threshold.toFixed(2)}`,
    );
    this.name = "CostThresholdError";
  }
}

// =============================================
// In-memory cache (30s TTL per service)
// =============================================

const cache = new Map<string, { row: CircuitBreakerRow; ts: number }>();
const CACHE_TTL_MS = 30_000;

function getCached(service: ServiceName): CircuitBreakerRow | null {
  const entry = cache.get(service);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(service);
    return null;
  }
  return entry.row;
}

function setCache(service: ServiceName, row: CircuitBreakerRow) {
  cache.set(service, { row, ts: Date.now() });
}

function invalidateCache(service: ServiceName) {
  cache.delete(service);
}

// =============================================
// Circuit Breaker — state management
// =============================================

export async function getCircuitState(
  service: ServiceName,
): Promise<CircuitBreakerRow> {
  const cached = getCached(service);
  if (cached) return cached;

  const db = getSupabase();
  const { data } = await db
    .from("circuit_breaker_state")
    .select("*")
    .eq("service", service)
    .single();

  if (!data) {
    // Seed if missing
    const row: CircuitBreakerRow = {
      service,
      state: "closed",
      consecutive_failures: 0,
      last_failure_at: null,
      last_success_at: null,
      opened_at: null,
      last_alert_at: null,
      failure_reason: null,
      updated_at: new Date().toISOString(),
    };
    await db.from("circuit_breaker_state").upsert({ ...row });
    setCache(service, row);
    return row;
  }

  setCache(service, data as CircuitBreakerRow);
  return data as CircuitBreakerRow;
}

export async function recordSuccess(service: ServiceName): Promise<void> {
  invalidateCache(service);
  const db = getSupabase();
  await db
    .from("circuit_breaker_state")
    .update({
      state: "closed",
      consecutive_failures: 0,
      last_success_at: new Date().toISOString(),
      failure_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("service", service);
}

export async function recordFailure(
  service: ServiceName,
  error: unknown,
): Promise<void> {
  invalidateCache(service);

  const is402 = isPaymentRequired(error);
  const reason = error instanceof Error ? error.message : String(error);

  const row = await getCircuitState(service);
  const newFailures = row.consecutive_failures + 1;
  const shouldTrip = is402 || newFailures >= FAILURE_THRESHOLD;

  const now = new Date().toISOString();
  const db = getSupabase();
  await db
    .from("circuit_breaker_state")
    .update({
      state: shouldTrip ? "open" : row.state,
      consecutive_failures: newFailures,
      last_failure_at: now,
      opened_at: shouldTrip ? now : row.opened_at,
      failure_reason: reason.slice(0, 500),
      updated_at: now,
    })
    .eq("service", service);

  // Alert on trip
  if (shouldTrip) {
    const alertType = is402 ? "payment_required" : "circuit_tripped";
    await sendAlert(alertType, service, reason).catch((e) =>
      console.error("[circuit-breaker] alert send failed:", e),
    );
  }
}

export async function checkCircuit(service: ServiceName): Promise<void> {
  const row = await getCircuitState(service);

  if (row.state === "closed") return;

  if (row.state === "open") {
    // Check cooldown
    if (row.opened_at) {
      const elapsed = Date.now() - new Date(row.opened_at).getTime();
      if (elapsed >= COOLDOWN_MS) {
        // Transition to half_open for probing
        invalidateCache(service);
        const db = getSupabase();
        await db
          .from("circuit_breaker_state")
          .update({
            state: "half_open",
            updated_at: new Date().toISOString(),
          })
          .eq("service", service);
        return; // allow probe
      }
    }
    throw new CircuitOpenError(service);
  }

  // half_open → allow (probe request)
}

// =============================================
// Main wrapper
// =============================================

export async function withCircuitBreaker<T>(
  service: ServiceName,
  fn: () => Promise<T>,
): Promise<T> {
  // In mock mode, skip circuit breaker entirely
  if (process.env.USE_MOCK_AI === "true") {
    return fn();
  }
  await checkCircuit(service);

  try {
    const result = await fn();
    await recordSuccess(service);
    return result;
  } catch (error) {
    if (isPaymentRequired(error)) {
      await recordFailure(service, error);
      throw new PaymentRequiredError(service);
    }
    await recordFailure(service, error);
    throw error;
  }
}

// =============================================
// Health Probes
// =============================================

async function probeOpenAI(): Promise<ServiceHealth> {
  const service = "openai" as const;
  try {
    const client = new OpenAI({ timeout: 10_000 });
    await client.models.list();
    return { service, healthy: true, circuitState: "closed", consecutiveFailures: 0, lastFailureAt: null };
  } catch (e) {
    return {
      service,
      healthy: false,
      circuitState: "open",
      consecutiveFailures: 0,
      lastFailureAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function probeReplicate(): Promise<ServiceHealth> {
  const service = "replicate" as const;
  try {
    const client = new Replicate();
    await client.collections.get("text-to-image");
    return { service, healthy: true, circuitState: "closed", consecutiveFailures: 0, lastFailureAt: null };
  } catch (e) {
    return {
      service,
      healthy: false,
      circuitState: "open",
      consecutiveFailures: 0,
      lastFailureAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function probeRemotion(): Promise<ServiceHealth> {
  const service = "remotion" as const;
  try {
    const response = await fetch(`${REMOTION_URL}/health`, {
      headers: { Authorization: `Bearer ${RENDER_SECRET}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { service, healthy: true, circuitState: "closed", consecutiveFailures: 0, lastFailureAt: null };
  } catch (e) {
    return {
      service,
      healthy: false,
      circuitState: "open",
      consecutiveFailures: 0,
      lastFailureAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function probeSupabase(): Promise<ServiceHealth> {
  const service = "supabase";
  try {
    const db = getSupabase();
    const { error } = await db.from("users").select("id", { head: true });
    if (error) throw error;
    return { service, healthy: true, circuitState: "closed", consecutiveFailures: 0, lastFailureAt: null };
  } catch (e) {
    return {
      service,
      healthy: false,
      circuitState: "open",
      consecutiveFailures: 0,
      lastFailureAt: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function runHealthCheck(): Promise<HealthReport> {
  const [openai, replicate, remotion, supabase] = await Promise.allSettled([
    probeOpenAI(),
    probeReplicate(),
    probeRemotion(),
    probeSupabase(),
  ]);

  // Also read circuit breaker state from DB
  const [cbOpenai, cbReplicate, cbReplicateVideo, cbRemotion] =
    await Promise.allSettled([
      getCircuitState("openai"),
      getCircuitState("replicate"),
      getCircuitState("replicate_video"),
      getCircuitState("remotion"),
    ]);

  function mergeHealth(
    probeResult: PromiseSettledResult<ServiceHealth>,
    cbResult: PromiseSettledResult<CircuitBreakerRow>,
    serviceName: string,
  ): ServiceHealth {
    const probe: ServiceHealth =
      probeResult.status === "fulfilled"
        ? probeResult.value
        : {
            service: serviceName,
            healthy: false,
            circuitState: "open" as CircuitState,
            consecutiveFailures: 0,
            lastFailureAt: new Date().toISOString(),
            error: probeResult.reason?.message || "Probe failed",
          };

    if (cbResult.status === "fulfilled") {
      const cb = cbResult.value;
      probe.circuitState = cb.state;
      probe.consecutiveFailures = cb.consecutive_failures;
      probe.lastFailureAt = cb.last_failure_at;
    }

    return probe;
  }

  const services: Record<string, ServiceHealth> = {
    openai: mergeHealth(openai, cbOpenai, "openai"),
    replicate: mergeHealth(replicate, cbReplicate, "replicate"),
    replicate_video: {
      service: "replicate_video",
      healthy:
        replicate.status === "fulfilled" ? replicate.value.healthy : false,
      circuitState:
        cbReplicateVideo.status === "fulfilled"
          ? cbReplicateVideo.value.state
          : "closed",
      consecutiveFailures:
        cbReplicateVideo.status === "fulfilled"
          ? cbReplicateVideo.value.consecutive_failures
          : 0,
      lastFailureAt:
        cbReplicateVideo.status === "fulfilled"
          ? cbReplicateVideo.value.last_failure_at
          : null,
    },
    remotion: mergeHealth(remotion, cbRemotion, "remotion"),
    supabase:
      supabase.status === "fulfilled"
        ? supabase.value
        : {
            service: "supabase",
            healthy: false,
            circuitState: "closed" as CircuitState,
            consecutiveFailures: 0,
            lastFailureAt: new Date().toISOString(),
            error: "Probe failed",
          },
  };

  const healthy = Object.values(services).every((s) => s.healthy);

  return { healthy, timestamp: new Date().toISOString(), services };
}

// =============================================
// Pipeline Pre-Check
// =============================================

export async function pipelinePreCheck(
  requiredServices: ServiceName[],
): Promise<PreCheckResult> {
  // In mock mode, all services are available
  if (process.env.USE_MOCK_AI === "true") {
    return { available: [...requiredServices], degraded: [] };
  }
  const available: ServiceName[] = [];
  const degraded: ServiceName[] = [];

  await Promise.all(
    requiredServices.map(async (service) => {
      const row = await getCircuitState(service);
      if (row.state === "closed" || row.state === "half_open") {
        available.push(service);
      } else {
        // open — check cooldown
        if (row.opened_at) {
          const elapsed = Date.now() - new Date(row.opened_at).getTime();
          if (elapsed >= COOLDOWN_MS) {
            available.push(service); // will transition to half_open
          } else {
            degraded.push(service);
          }
        } else {
          degraded.push(service);
        }
      }
    }),
  );

  return { available, degraded };
}

// =============================================
// Cost Guard
// =============================================

export async function costGuard(
  projectId: string,
  operation: string,
): Promise<void> {
  // In mock mode, skip cost guard
  if (process.env.USE_MOCK_AI === "true") return;
  const { getProject } = await import("./store");
  const project = await getProject(projectId);
  if (!project) return;

  const currentCost = project.apiCostUsd || 0;
  const operationCost = COST_MAP[operation] || 0;

  if (currentCost + operationCost > COST_THRESHOLD_USD) {
    await sendAlert(
      "cost_threshold",
      "openai" as ServiceName,
      `Project ${projectId}: $${currentCost.toFixed(2)} + $${operationCost.toFixed(2)} > $${COST_THRESHOLD_USD.toFixed(2)}`,
    ).catch((e) => console.error("[cost-guard] alert failed:", e));

    throw new CostThresholdError(
      projectId,
      currentCost + operationCost,
      COST_THRESHOLD_USD,
    );
  }
}

export async function trackCost(
  projectId: string,
  operation: string,
): Promise<void> {
  const { getProject, saveProject } = await import("./store");
  const project = await getProject(projectId);
  if (!project) return;

  const cost = COST_MAP[operation] || 0;
  project.apiCostUsd = (project.apiCostUsd || 0) + cost;
  await saveProject(project);
}

// =============================================
// Alert emails (Resend)
// =============================================

type AlertType = "circuit_tripped" | "payment_required" | "cost_threshold";

async function sendAlert(
  type: AlertType,
  service: ServiceName,
  details: string,
): Promise<void> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) {
    console.warn("[circuit-breaker] No AUTH_RESEND_KEY — skipping alert email");
    return;
  }

  // Debounce: check last_alert_at for this service
  const row = await getCircuitState(service);
  if (row.last_alert_at) {
    const elapsed = Date.now() - new Date(row.last_alert_at).getTime();
    if (elapsed < ALERT_DEBOUNCE_MS) return;
  }

  const subjects: Record<AlertType, string> = {
    circuit_tripped: `[VIMIMO] Circuit Breaker OPEN — ${service}`,
    payment_required: `[VIMIMO] 402 Payment Required — ${service}`,
    cost_threshold: `[VIMIMO] Cost threshold exceeded`,
  };

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "VIMIMO Alerts <onboarding@resend.dev>",
        to: ADMIN_EMAIL,
        subject: subjects[type],
        text: `Alert: ${type}\nService: ${service}\nDetails: ${details}\nTime: ${new Date().toISOString()}`,
      }),
    });

    // Update last_alert_at for debounce
    invalidateCache(service);
    const db = getSupabase();
    await db
      .from("circuit_breaker_state")
      .update({
        last_alert_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("service", service);
  } catch (e) {
    console.error("[circuit-breaker] Resend API error:", e);
  }
}

// =============================================
// Helpers
// =============================================

function isPaymentRequired(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status =
    (err as { status?: number }).status ??
    (err as { statusCode?: number }).statusCode ??
    (err as { response?: { status?: number } }).response?.status;
  return status === 402;
}
