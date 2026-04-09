import type { Express } from "express";
import type { Server } from "http";

export function registerRoutes(server: Server, app: Express) {
  // All rendering is now client-side — no API routes needed.
  // Server only serves static files.
}
