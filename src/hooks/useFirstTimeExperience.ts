/**
 * @deprecated Onboarding state is now tracked in Supabase via `profile_status`.
 * See AppContainer.tsx which uses /api/user/data to fetch profile_status.
 * This hook is kept only as a no-op stub for test compatibility.
 */
export const useFirstTimeExperience = () => ({
  isFirstTime: false,
  hasChecked: true,
  markAsVisited: () => {},
  resetFirstTime: () => {},
});