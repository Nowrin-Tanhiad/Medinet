/**
 * Resolves API URL for both Vite Dev server (http://localhost:3000)
 * and Apache production build (http://localhost/Medinet/dist/ or http://localhost/Medinet/)
 */
export function getApiUrl(filename: string): string {
  // Remove leading slash if any
  const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;
  const endpoint = cleanFilename.startsWith('api/') ? cleanFilename.slice(4) : cleanFilename;

  // If path contains /Medinet (e.g. http://localhost/Medinet/dist/)
  if (window.location.pathname.toLowerCase().includes('medinet')) {
    return `/Medinet/api/${endpoint}`;
  }

  // Fallback for Vite dev server or root domain
  return `api/${endpoint}`;
}
