/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** `true` → call the page's own origin through the Vite dev proxy (see config/env.ts). */
  readonly VITE_API_SAME_ORIGIN?: string;
  /** Set by `npm run dev`: the LAN address a localhost page moves to, so payment returns keep the session (devOrigin.ts). */
  readonly VITE_DEV_CANONICAL_ORIGIN?: string;
  /** OAuth client ID of the web app for sign-in with Google (same value as GOOGLE_CLIENT_ID of the API). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}
