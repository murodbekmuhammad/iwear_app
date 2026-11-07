// Restores the signed-in user from the token cookie on first load.
export default defineNuxtPlugin(async () => {
  const { user, fetchMe } = useAuth();
  if (!user.value) await fetchMe();
});
