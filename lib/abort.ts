export function createLinkedAbortController(parentSignal: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  abort: (reason?: unknown) => void;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const forwardParentAbort = () => controller.abort(parentSignal?.reason);
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException("Provider request timed out.", "TimeoutError")),
    timeoutMs,
  );

  if (parentSignal?.aborted) {
    forwardParentAbort();
  } else {
    parentSignal?.addEventListener("abort", forwardParentAbort, { once: true });
  }

  return {
    signal: controller.signal,
    abort: (reason?: unknown) => controller.abort(reason),
    cleanup: () => {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener("abort", forwardParentAbort);
    },
  };
}
