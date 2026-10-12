import { WebStorageStateStore } from 'oidc-client-ts';
import type { AuthProviderProps } from 'react-oidc-context';

// OIDC client settings for the public PFDB SPA (the Zitadel pfdb-web app). The
// client ID is a public identifier (safe to ship to the browser); this is a
// public PKCE client, so there is no secret here. Override the authority/client
// at build time with VITE_OIDC_AUTHORITY / VITE_OIDC_CLIENT_ID if needed.
export const oidcConfig: AuthProviderProps = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY ?? 'https://auth.pfdatabase.com',
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID ?? '394712072014790658',
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: 'code',
  // The id_token carries the project roles (the app's "User roles inside ID
  // Token" setting); offline_access gets a refresh token for silent renewal.
  scope: 'openid profile email offline_access',
  // Persist the session across reloads/tabs instead of the default sessionStorage.
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  automaticSilentRenew: true,
  // Strip the ?code/&state params after processing. The actual return-home is
  // done by AuthCallback via React Router so the SPA route updates (a raw
  // history change here wouldn't tell the router to navigate).
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

export interface LinkProvider {
  key: string;
  label: string;
}

// Providers a user can sign in with and link to their account from the
// Account page. The worker runs the linking (see api/profile startLink); keys
// must match the worker's ZITADEL_IDP_* names.
export const linkProviders: LinkProvider[] = [
  { key: 'discord', label: 'Discord' },
  { key: 'twitch', label: 'Twitch' },
  { key: 'google', label: 'Google' },
];
