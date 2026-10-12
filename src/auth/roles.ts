import type { User } from 'oidc-client-ts';

// Zitadel puts the user's pfdb-site project roles in the id_token as an object
// keyed by role name: { "admins": { "<org id>": "<org domain>" }, ... }.
const ROLES_CLAIM = 'urn:zitadel:iam:org:project:roles';

export const ADMIN_ROLE = 'admins';
// Verify mode is for mods only (not admins, unless they're also mods).
export const MOD_ROLE = 'mods';

export function hasRole(user: User | null | undefined, role: string): boolean {
  const claim = user?.profile?.[ROLES_CLAIM];
  return !!claim && typeof claim === 'object' && !Array.isArray(claim) && role in claim;
}
