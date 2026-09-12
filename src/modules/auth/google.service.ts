import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppError } from '../../common/errors/app-error.js';

const GOOGLE_CERTS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  jwks ??= createRemoteJWKSet(GOOGLE_CERTS_URL);
  return jwks;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(
  idToken: string,
  audience?: string,
): Promise<GoogleProfile> {
  let payload;
  try {
    payload = await jwtVerify(idToken, getJwks(), {
      ...(audience ? { audience } : {}),
      issuer: GOOGLE_ISSUERS,
    });
  } catch {
    throw AppError.unauthorized('Invalid or expired Google credential.');
  }

  const result = payload.payload;
  const sub = typeof result.sub === 'string' ? result.sub : '';
  const email = typeof result.email === 'string' ? result.email : '';
  const emailVerified = result.email_verified === true;
  const displayName =
    typeof result.name === 'string' && result.name.length > 0 ? result.name : undefined;
  const picture =
    typeof result.picture === 'string' && result.picture.length > 0 ? result.picture : undefined;

  if (!sub || !email || !emailVerified) {
    throw AppError.unauthorized('Google account must have a verified email address.');
  }

  return {
    sub,
    email,
    emailVerified,
    ...(displayName ? { displayName } : {}),
    ...(picture ? { picture } : {}),
  } satisfies GoogleProfile;
}
