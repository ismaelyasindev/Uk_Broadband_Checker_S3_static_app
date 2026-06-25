/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ORIGIN_VERIFY_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
