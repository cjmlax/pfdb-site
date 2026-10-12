import { useAuth } from 'react-oidc-context';
import { hasRole, MOD_ROLE } from '../auth/roles';

export function useModToken(): { idToken: string | undefined; isMod: boolean } {
  const auth = useAuth();
  const idToken = auth.user?.id_token;
  return { idToken, isMod: auth.isAuthenticated && !!idToken && hasRole(auth.user, MOD_ROLE) };
}
