import fs from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

import type { Logger } from "pino";

export function shortErr(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message || err.name || "unknown error";
    return msg.slice(0, 2000);
  }

  try {
    return JSON.stringify(err).slice(0, 2000);
  } catch {
    return String(err).slice(0, 2000);
  }
}

export async function withTimeout<T>(
  ms: number,
  fn: () => Promise<T>,
): Promise<T> {
  return await Promise.race([
    fn(),
    (async () => {
      await delay(ms);
      throw new Error(`job timeout after ${ms}ms`);
    })(),
  ]);
}

export async function safeCleanup(dir: string, log: Logger) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    log.warn({ err, dir }, "failed to cleanup temp dir");
  }
}
