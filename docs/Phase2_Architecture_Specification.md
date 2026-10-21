# JARVIS Phase 2 Architecture Specification
## Assistant Core • LangGraph • Zero-Paid Model Routing • 3D Hologram

### 1. Overview
Phase 2 establishes the core intelligence engine of JARVIS while upholding the local-first, zero-paid-spend architecture. The assistant transitions from Phase 1 intake into autonomous stateful execution powered by LangGraph, free-tier provider adapters (Groq, Gemini, OpenRouter), live Server-Sent Events (SSE), and a cinematic 3D procedural hologram.

---

### 2. LangGraph Task Lifecycle
The task lifecycle is bounded and stateful:
```
[User Directive]
       ↓
[plan_task] ---------> Formulates bounded execution plan based on category
       ↓
[select_model] ------> Evaluates allowlist & selects primary eligible free route
       ↓ (Conditional check)
       ├─ If no free routes available: jumps to [finalize_task] with classified failure
       └─ If route selected: proceeds to [execute_model]
       ↓
[execute_model] -----> Dispatches prompt to provider adapter with bounded fallback
       ↓ (Conditional check)
       ├─ If execution failed: jumps to [finalize_task]
       └─ If successful: proceeds to [validate_response]
       ↓
[validate_response] -> Validates non-empty output, structure, and integrity
       ↓
[finalize_task] -----> Updates MongoDB document with result, provider, and events
```

### 3. Strict Zero-Paid-Spend Policy
1. **Hardcoded Route Allowlist**: Every provider call is checked against `FREE_ROUTE_ALLOWLIST`.
2. **OpenRouter `:free` Rule**: Any OpenRouter model ID without an explicit `:free` suffix is rejected immediately prior to network dispatch.
3. **Paid Fallback Blocked**: If all free routes are exhausted or hit rate limits, the system raises `NoEligibleFreeRouteError` and reports failure. It never falls back to a paid route.
4. **Credential Security**: API keys (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPEN_ROUTER_API_KEY`) reside exclusively in backend `.env` and are never exposed to logs or client bundles.

### 4. 3D Hologram
The JARVIS holographic core is rendered via high-performance procedural 3D geometry on HTML5 canvas:
- Golden-ratio icosahedron wireframe rotating across multiple gimbal axes.
- Central breathing luminous core with dynamic radial glow.
- Segmented outer HUD arcs with technical tick marks.
- Floating holographic particle field.
- Visual state modulation reflecting assistant status (`idle`, `planning`, `running`, `completed`, `failed`).
- Fully isolated, `pointer-events-none`, with graceful fallback for reduced-motion and non-WebGL environments.
