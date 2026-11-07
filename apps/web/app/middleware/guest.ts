/** Keeps signed-in users away from the login and sign-up pages. */
export default defineNuxtRouteMiddleware(() => {
  const { user } = useAuth();
  if (user.value) return navigateTo(homeForRole[user.value.role]);
});
