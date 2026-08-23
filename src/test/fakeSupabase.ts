export interface RecordedFromCall {
  table: string;
  op: string;
  payload?: unknown;
}

export interface FakeSupabase {
  supabase: Record<string, unknown> & {
    from: (table: string) => unknown;
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: string; error: null }>;
  };
  rpcCalls: { fn: string; args: Record<string, unknown> }[];
  fromCalls: RecordedFromCall[];
  setFromResult: (table: string, result: { data: unknown; error: unknown }) => void;
  reset: () => void;
}

export function createFakeSupabase(): FakeSupabase {
  let rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  let fromCalls: RecordedFromCall[] = [];
  const results = new Map<string, { data: unknown; error: unknown }>();

  function makeBuilder(table: string): Record<string, unknown> & Promise<unknown> {
    const builder: Record<string, unknown> = {};
    const chainMethods = [
      "select",
      "eq",
      "neq",
      "is",
      "not",
      "or",
      "ilike",
      "order",
      "limit",
      "range",
      "gte",
      "lte",
      "in",
      "single",
      "maybeSingle",
    ];
    for (const method of chainMethods) {
      builder[method] = () => builder;
    }
    builder["insert"] = (payload: unknown) => {
      fromCalls.push({ table, op: "insert", payload });
      return builder;
    };
    builder["update"] = (payload: unknown) => {
      fromCalls.push({ table, op: "update", payload });
      return builder;
    };
    builder["delete"] = () => {
      fromCalls.push({ table, op: "delete" });
      return builder;
    };
    builder["then"] = (
      onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(results.get(table) ?? { data: [], error: null }).then(onFulfilled, onRejected);
    builder["catch"] = (onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(results.get(table) ?? { data: [], error: null }).catch(onRejected);
    builder["finally"] = (handler: () => void) =>
      Promise.resolve(results.get(table) ?? { data: [], error: null }).finally(handler);
    return builder as Record<string, unknown> & Promise<unknown>;
  }

  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
      rpc: (fn: string, args: Record<string, unknown> = {}) => {
        rpcCalls.push({ fn, args });
        return Promise.resolve({ data: `id-${rpcCalls.length}`, error: null });
      },
    },
    get rpcCalls() {
      return rpcCalls;
    },
    get fromCalls() {
      return fromCalls;
    },
    setFromResult(table, result) {
      results.set(table, result);
    },
    reset() {
      rpcCalls = [];
      fromCalls = [];
      results.clear();
    },
  };
}
