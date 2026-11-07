/** Turns an uploaded file path (/uploads/x.jpg) into a full URL on the API server. */
export function useMediaUrl() {
  const apiBase = useRuntimeConfig().public.apiBase;
  const origin = new URL(apiBase).origin;
  return (path: string | null | undefined) => (path ? (path.startsWith('http') ? path : origin + path) : undefined);
}
