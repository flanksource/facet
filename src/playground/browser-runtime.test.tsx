import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const roots = vi.hoisted(() => [] as { unmount: ReturnType<typeof vi.fn> }[]);
vi.mock("react-dom", () => ({
  flushSync: (callback: () => void) => callback(),
}));
vi.mock("@flanksource/page-runtime/host", () => ({ PageFrame: () => null }));
vi.mock("react-dom/client", () => ({
  createRoot: () => {
    const root = {
      unmount: vi.fn(),
      render: (
        element: ReactElement<{
          onBridge: (value: unknown) => void;
          onMessage: (value: { type: "status"; state: "ready" }) => void;
        }>,
      ) => {
        const ready = () =>
          element.props.onMessage({ type: "status", state: "ready" });
        element.props.onBridge({
          send: ready,
          request: async () => ({
            message: { type: "snapshot", html: "<html>Preview</html>" },
          }),
        });
        queueMicrotask(ready);
      },
    };
    roots.push(root);
    return root;
  },
}));

import { createBrowserPreview } from "./browser-runtime";

describe("browser preview instances", () => {
  it("updates and disposes one editor without unmounting another editor", async () => {
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
    const first = createBrowserPreview(),
      second = createBrowserPreview();
    const a = document.createElement("div"),
      b = document.createElement("div");
    document.body.append(a, b);
    const options = {
      runtimeOrigin: "http://127.0.0.1:9999",
      code: "export default () => null",
      ext: "jsx",
      header: "",
      footer: "",
      css: "",
      data: null,
      dependencies: {},
      format: "html" as const,
      onStatus: vi.fn(),
      onError: vi.fn(),
    };
    await first.render({ ...options, container: a });
    await second.render({ ...options, container: b });
    await first.render({
      ...options,
      code: "export default () => <h1>Draft</h1>",
      container: a,
    });
    expect(roots).toHaveLength(2);
    first.dispose();
    await Promise.resolve();
    expect(roots[0]!.unmount).toHaveBeenCalledOnce();
    expect(roots[1]!.unmount).not.toHaveBeenCalled();
    expect(b.querySelector("a")?.download).toBe("report.html");
    second.dispose();
    a.remove();
    b.remove();
    vi.unstubAllGlobals();
  });
});
