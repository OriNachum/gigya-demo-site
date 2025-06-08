// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'please_change_this_secret_in_production',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// --- Data for Candies ---
let candiesData = [];
try {
    candiesData = require('./data/candies.json');
} catch (err) {
    candiesData = [];
}

// --- API Routes ---
app.get('/api/client-config', (req, res) => {
    res.json({
        rpSiteApiKey: process.env.RP_SITE_API_KEY,
        opProviderName: process.env.OP_PROVIDER_NAME,
        opUserinfoEndpointUrl: process.env.OP_USERINFO_ENDPOINT_URL
    });
});

app.get('/api/candies', (req, res) => {
    res.json(candiesData);
});

// --- OIDC Authentication Routes ---
app.get('/auth/callback', async (req, res) => {
    const authorizationCode = req.query.code;
    if (!authorizationCode) {
        return res.status(400).send('Authorization code is missing.');
    }
    const tokenRequestBody = new URLSearchParams();
    tokenRequestBody.append('grant_type', 'authorization_code');
    tokenRequestBody.append('code', authorizationCode);
    tokenRequestBody.append('redirect_uri', process.env.RP_REDIRECT_URI);
    tokenRequestBody.append('client_id', process.env.OP_CLIENT_ID_FOR_RP);
    tokenRequestBody.append('client_secret', process.env.OP_CLIENT_SECRET_FOR_RP);
    try {
        const tokenResponse = await axios.post(
            process.env.OP_TOKEN_ENDPOINT_URL,
            tokenRequestBody.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const { access_token, refresh_token } = tokenResponse.data;
        let redirectUrl = `/catalog.html?access_token=${encodeURIComponent(access_token)}`;
        if (refresh_token) {
            redirectUrl += `&refresh_token=${encodeURIComponent(refresh_token)}`;
        }
        if (req.session) {
            req.session.isOidcAuthenticated = true;
        }
        res.redirect(redirectUrl);
    } catch (error) {
        res.status(500).send('Failed to obtain tokens from the identity provider.');
    }
});

app.get('/auth/logout', (req, res) => {
    if (req.session) {
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            res.redirect('/login.html');
        });
    } else {
        res.clearCookie('connect.sid');
        res.redirect('/login.html');
    }
});

// --- Basic Routes for HTML pages ---
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/catalog.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
});

app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Vikis Sweets Shop listening at http://localhost:${port}`);
}); 