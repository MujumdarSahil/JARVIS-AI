import "@testing-library/jest-dom";
import { vi } from "vitest";

// Polyfill window.matchMedia for JSDOM
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Polyfill HTMLCanvasElement.prototype.getContext for JSDOM using Proxy
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => {
  return new Proxy({}, {
    get: (_target, prop) => {
      if (prop === "createRadialGradient" || prop === "createLinearGradient") {
        return () => ({ addColorStop: vi.fn() });
      }
      return vi.fn();
    },
  });
}) as any;
