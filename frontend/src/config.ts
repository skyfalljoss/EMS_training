/// <reference types="vite/client" />

interface ViteEnv {
  VITE_API_URL?: string
}

const env = (import.meta as unknown as { env: ViteEnv }).env

export const VITE_API_URL: string =
  env.VITE_API_URL ?? 'http://localhost:8000'
