/// <reference types="vite/client" />

// In production, this comes from the build environment.
// Locally it defaults to the local backend port.
export const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
