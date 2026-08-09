const axios = require('axios');
const env = require('../config/env');

// Manual OAuth2 authorization-code flow (no session/passport — this API is stateless/JWT-based).

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

function buildGoogleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: env.oauth.google.clientId,
    redirect_uri: env.oauth.google.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function exchangeGoogleCode(code) {
  const { data: tokenData } = await axios.post(GOOGLE_TOKEN_URL, {
    code,
    client_id: env.oauth.google.clientId,
    client_secret: env.oauth.google.clientSecret,
    redirect_uri: env.oauth.google.callbackUrl,
    grant_type: 'authorization_code',
  });

  const { data: profile } = await axios.get(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  return {
    providerId: profile.sub,
    email: profile.email,
    emailVerified: !!profile.email_verified,
    firstName: profile.given_name || profile.name?.split(' ')[0] || 'User',
    lastName: profile.family_name || profile.name?.split(' ').slice(1).join(' ') || '',
    avatarUrl: profile.picture || null,
  };
}

function buildGithubAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: env.oauth.github.clientId,
    redirect_uri: env.oauth.github.callbackUrl,
    scope: 'read:user user:email',
    state,
  });
  return `${GITHUB_AUTH_URL}?${params.toString()}`;
}

async function exchangeGithubCode(code) {
  const { data: tokenData } = await axios.post(
    GITHUB_TOKEN_URL,
    {
      code,
      client_id: env.oauth.github.clientId,
      client_secret: env.oauth.github.clientSecret,
      redirect_uri: env.oauth.github.callbackUrl,
    },
    { headers: { Accept: 'application/json' } }
  );

  const authHeader = { Authorization: `Bearer ${tokenData.access_token}` };
  const { data: profile } = await axios.get(GITHUB_USER_URL, { headers: authHeader });
  const { data: emails } = await axios.get(GITHUB_EMAILS_URL, { headers: authHeader });
  const primary = emails.find((e) => e.primary) || emails[0];

  const [firstName, ...rest] = (profile.name || profile.login || 'User').split(' ');

  return {
    providerId: String(profile.id),
    email: primary?.email,
    emailVerified: !!primary?.verified,
    firstName,
    lastName: rest.join(' '),
    avatarUrl: profile.avatar_url || null,
  };
}

module.exports = { buildGoogleAuthUrl, exchangeGoogleCode, buildGithubAuthUrl, exchangeGithubCode };
