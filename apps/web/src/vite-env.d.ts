/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** `true` → call the page's own origin through the Vite dev proxy (see config/env.ts). */
  readonly VITE_API_SAME_ORIGIN?: string;
}
