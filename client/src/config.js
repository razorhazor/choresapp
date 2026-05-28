// Base URL of the Express API.
// - Dev (default): the backend runs cross-origin on :3001.
// - Docker / single-origin builds: set VITE_API_BASE=/api at build time so the
//   client calls the same origin that serves it (no CORS needed).
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

// Currency symbol for rewards. Change to '$' or any symbol as needed.
export const CURRENCY = '£';

export function formatReward(amount) {
  return `${CURRENCY}${Number(amount || 0).toFixed(2)}`;
}

// Turns a 'YYYY-MM' month key into a readable label like "May 2026".
export function formatMonth(ym) {
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}
