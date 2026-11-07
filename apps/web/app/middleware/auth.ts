import type { Role } from '~/types';

declare module '#app' {
  interface PageMeta {
    /** Roles allowed on this page. Any signed-in user when empty. */
    roles?: Role[];
  }
}

/** Sends visitors to /login, and users with the wrong role to their own home. */
export default defineNuxtRouteMiddleware((to) => {
  const { user } = useAuth();
  if (!user.value) return navigateTo({ path: '/login', query: { next: to.fullPath } });

  const roles = to.meta.roles;
  if (roles?.length && !roles.includes(user.value.role)) {
    return navigateTo(homeForRole[user.value.role]);
  }
});
