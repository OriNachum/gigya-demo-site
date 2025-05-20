require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const RP_SITE_API_KEY = process.env.RP_SITE_API_KEY;
const OP_SITE_API_KEY = process.env.OP_SITE_API_KEY;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/oidc/callback';
const OIDC_BASE = `https://accounts.us1.gigya.com/oidc/op/v1.0/${OP_SITE_API_KEY}`;
const CLIENT_ID = process.env.CLIENT_ID;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/', async (req, res) => {
  const access_token = req.cookies.access_token;
  let user = null;
  if (access_token) {
    try {
      const userinfoRes = await axios.get(`${OIDC_BASE}/userinfo`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      user = userinfoRes.data;
    } catch (err) {
      // ignore, treat as not logged in
    }
  }
  res.render('index', { user });
});

// OIDC Login
app.get('/login', (req, res) => {
  console.log('--- /login called ---');
  console.log('CLIENT_ID length:', CLIENT_ID?.length);
  console.log('OP_SITE_API_KEY length:', OP_SITE_API_KEY?.length);
  console.log('REDIRECT_URI:', REDIRECT_URI);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: 'openid profile email',
    redirect_uri: REDIRECT_URI,
    state: 'xyz',
  });
  const authUrl = `${OIDC_BASE}/authorize?${params.toString()}`;
  console.log('Redirecting to:', authUrl);
  res.redirect(authUrl);
});

// OIDC Callback
app.get('/oidc/callback', async (req, res) => {
  console.log('--- /oidc/callback called ---');
  const { code, error, error_description } = req.query;
  if (error) {
    console.error('OIDC error:', error, error_description);
    return res.status(400).send(`OIDC error: ${error} - ${error_description}`);
  }
  if (!code) {
    console.error('Missing code in callback');
    return res.status(400).send('Missing code');
  }
  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    });
    console.log('Token request params:', params.toString());
    const tokenRes = await axios.post(`${OIDC_BASE}/token`, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    console.log('Token response:', tokenRes.data);
    const { access_token, refresh_token, id_token } = tokenRes.data;
    res.cookie('access_token', access_token, { httpOnly: true, secure: false });
    res.cookie('refresh_token', refresh_token, { httpOnly: true, secure: false });
    res.redirect('/');
  } catch (err) {
    console.error('Token exchange failed:', err.stack || err);
    res.status(500).send('Token exchange failed: ' + err.message);
  }
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.redirect('/');
});

// Profile (userinfo)
app.get('/profile', async (req, res) => {
  const access_token = req.cookies.access_token;
  if (!access_token) return res.redirect('/login');
  try {
    const userinfoRes = await axios.get(`${OIDC_BASE}/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    res.render('profile', { profile: userinfoRes.data });
  } catch (err) {
    res.status(500).send('Failed to fetch profile: ' + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Vikis sweets shop listening at http://localhost:${PORT}`);
}); 