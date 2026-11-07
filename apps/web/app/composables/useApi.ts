/**
 * Calls the Iwear API with the signed-in user's token.
 * Usage: const api = useApi(); await api<User>('/auth/me')
 */
export function useApi() {
  const config = useRuntimeConfig();
  const token = useCookie<string | null>('iwear_token');

  return <T>(path: string, options: Parameters<typeof $fetch>[1] = {}) =>
    $fetch<T>(path, {
      baseURL: config.public.apiBase,
      ...options,
      headers: {
        ...(options.headers as Record<string, string> | undefined),
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      },
    });
}

/** Pulls a readable message out of an API error. */
export function apiErrorMessage(error: unknown): string {
  const data = (error as { data?: { message?: string | string[] } })?.data;
  if (Array.isArray(data?.message)) return data.message.join('. ');
  return data?.message ?? 'Something went wrong. Please try again.';
}
