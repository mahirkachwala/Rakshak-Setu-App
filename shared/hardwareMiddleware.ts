const DEFAULT_TIMEOUT_MS = 8000;

export type HardwareMiddlewareConfig = {
  baseUrl: string;
  integrationKey: string | null;
  timeoutMs: number;
};

export function getHardwareMiddlewareConfig(): HardwareMiddlewareConfig {
  const baseUrl = (
    process.env.HARDWARE_MIDDLEWARE_BASE_URL ||
    process.env.MIDDLEWARE_BASE_URL ||
    process.env.APP_MIDDLEWARE_BASE_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  const integrationKey = (
    process.env.MIDDLEWARE_INTEGRATION_KEY ||
    process.env.APP_INTEGRATION_KEY ||
    ""
  ).trim() || null;

  const timeoutMs = Number(process.env.HARDWARE_MIDDLEWARE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

  return {
    baseUrl,
    integrationKey,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

async function fetchHardwareMiddleware(pathname: string) {
  const config = getHardwareMiddlewareConfig();

  if (!config.baseUrl) {
    throw new Error(
      "Hardware middleware is not configured on this machine. Set HARDWARE_MIDDLEWARE_BASE_URL to the hardware PC middleware base URL.",
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (config.integrationKey) {
    headers["x-integration-key"] = config.integrationKey;
  }

  const response = await fetch(`${config.baseUrl}${pathname}`, {
    headers,
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Hardware middleware request failed (${response.status}) for ${pathname}: ${text.slice(0, 240)}`,
    );
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `Hardware middleware returned non-JSON content for ${pathname}.`,
    );
  }
}

export async function fetchHardwareMiddlewareInfo() {
  return fetchHardwareMiddleware("/api/middleware/v1/info");
}

export async function lookupHardwareContainerPin(containerPin: string) {
  return fetchHardwareMiddleware(
    `/api/middleware/v1/pins/${encodeURIComponent(containerPin)}`,
  );
}
