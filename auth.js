const { OAuth2 } = require('googleapis').google.auth;
const REDIRECT_URL = 'https://developers.google.com/oauthplayground';

module.exports = async (user, client_id, client_secret, refresh_token) => {
  let auth = new OAuth2(client_id, client_secret, REDIRECT_URL);

  auth.setCredentials({
    'refresh_token': refresh_token
  });

  return {
    'type': 'OAuth2',
    'user': user,
    'clientId': client_id,
    'clientSecret': client_secret,
    'refreshToken': refresh_token,
    'accessToken': (await auth.getAccessToken()).token
  };
}
