/**
 * Client-generated operation id, sent as p_client_op_id to write RPCs.
 *
 * One id per intended business operation. Retrying the same operation reuses the
 * id, so the server recognises the replay and returns the original result
 * instead of applying the write twice. A new operation means a new id.
 */
export function newOperationId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;

  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }

  // crypto.randomUUID is only exposed in secure contexts. A shop self-hosting
  // over plain http on a LAN address would get undefined, so fall back to
  // getRandomValues and shape the bytes as a v4 UUID ourselves.
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}