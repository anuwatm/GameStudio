const encoder = new TextEncoder();
const decoder = new TextDecoder();
let wasm;
const ready = (async () => {
  const response = await fetch(new URL("./sf_wasm.wasm", import.meta.url));
  if (!response.ok) throw new Error(`Core WASM HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  ({ instance: { exports: wasm } } = await WebAssembly.instantiate(bytes, {
    storyflow: {
      random_fill(pointer, length) {
        const bytes = new Uint8Array(wasm.memory.buffer, pointer, length);
        for (let offset = 0; offset < length; offset += 65536) {
          crypto.getRandomValues(bytes.subarray(offset, Math.min(offset + 65536, length)));
        }
      },
    },
  }));
})();
// The first request still receives the actual initialization error.
ready.catch(() => {});
self.onmessage = async ({ data }) => {
  try {
    await ready;
    const input = encoder.encode(JSON.stringify(data));
    const pointer = wasm.sf_alloc(input.length);
    new Uint8Array(wasm.memory.buffer, pointer, input.length).set(input);
    const result = wasm.sf_dispatch(pointer, input.length);
    const offset = Number(result & 0xffffffffn);
    const length = Number(result >> 32n);
    self.postMessage(JSON.parse(decoder.decode(new Uint8Array(wasm.memory.buffer, offset, length))));
  } catch (error) {
    self.postMessage({ contractVersion: 1, requestId: data?.requestId ?? "",
      kind: "error", error: { code: "WORKER_ERROR", message: String(error) } });
  }
};
