import type { NextFunction, Request, Response } from "express";
import { readFileSync } from "node:fs";

export type ApiKey = { key: string; label: string; tier: "free" | "pro" };

declare module "express-serve-static-core" {
  interface Request {
    apiKey: ApiKey;
  }
}

/** Loads the key file once; unknown or missing keys are rejected with 401. */
export function apiKeyAuth(keysPath: string) {
  const keys = (JSON.parse(readFileSync(keysPath, "utf8")) as ApiKey[]).map((k) => [k.key, k] as const);
  const byKey = new Map(keys);
  return (req: Request, res: Response, next: NextFunction): void => {
    const presented = req.header("x-api-key");
    const found = presented ? byKey.get(presented) : undefined;
    if (!found) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "a valid X-Api-Key header is required" });
      return;
    }
    req.apiKey = found;
    next();
  };
}
