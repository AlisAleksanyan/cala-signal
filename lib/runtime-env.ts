import type { D1Database } from "./scout-security";

export interface ServerBindings {
  DB?: D1Database;
  SCOUT_TOKEN_SECRET?: string;
}

declare global {
  // Populated by the Worker entry point before the app router handles a request.
  // Bindings are isolate-scoped and never serialized to the client.
  var __CALA_SIGNAL_BINDINGS__: ServerBindings | undefined;
}

export function setServerBindings(bindings: ServerBindings): void {
  globalThis.__CALA_SIGNAL_BINDINGS__ = bindings;
}

export function getServerBindings(): ServerBindings {
  return globalThis.__CALA_SIGNAL_BINDINGS__ ?? {};
}
