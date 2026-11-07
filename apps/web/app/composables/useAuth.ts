import type { AuthResponse, Role, User } from '~/types';

/** Where each role lands after signing in. */
export const homeForRole: Record<Role, string> = {
  ADMIN: '/admin',
  COMPANY: '/company/products',
  CUSTOMER: '/',
  COURIER: '/courier',
};

export function useAuth() {
  const token = useCookie<string | null>('iwear_token', { maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });
  const user = useState<User | null>('auth-user', () => null);
  const api = useApi();

  function signIn(response: AuthResponse, next?: string) {
    token.value = response.accessToken;
    user.value = response.user;
    // Only follow local paths, never another site.
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined;
    return navigateTo(safeNext ?? homeForRole[response.user.role]);
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      user.value = await api<User>('/auth/me');
    } catch {
      token.value = null;
      user.value = null;
    }
    return user.value;
  }

  return {
    user,
    isLoggedIn: computed(() => !!user.value),
    fetchMe,
    login: async (email: string, password: string, next?: string) =>
      signIn(await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }), next),
    register: async (body: Record<string, unknown>, next?: string) =>
      signIn(await api<AuthResponse>('/auth/register', { method: 'POST', body }), next),
    registerCompany: async (body: Record<string, unknown>) =>
      signIn(await api<AuthResponse>('/auth/register/company', { method: 'POST', body })),
    logout() {
      token.value = null;
      user.value = null;
      return navigateTo('/login');
    },
  };
}
