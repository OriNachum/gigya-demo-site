# Vikis Sweets Shop: Node.js & SAP CDC Integration Guide

This guide will walk you through setting up "Vikis Sweets Shop," a Node.js website that integrates with SAP Customer Data Cloud (CDC / Gigya) for user authentication via OpenID Connect (OIDC).

**Key Features to be Implemented:**
* SAP CDC as a Relying Party (RP).
* OIDC flow with another SAP CDC site as the OpenID Provider (OP).
* Storage of `access_token` and `refresh_token` (client-side for `access_token` demonstration).
* Login page using SAP CDC Screen-Sets.
* Candies catalog with:
    * 2 regular candies.
    * 2 special candies for "Sweet shop" club members.
* "Send candy to a friend" button and form, visible only to members of the "SAP CDC" organization group.
* "Show profile information" button calling the OIDC `getUserInfo` endpoint.
* Secrets managed via a `.env` file.

**Tech Stack:**
* Node.js
* Express.js (for routing and static file serving)
* SAP CDC (Gigya)

---

## Section 1: Prerequisites

1.  **Node.js and npm:** Ensure you have Node.js (which includes npm) installed. You can download it from [nodejs.org](https://nodejs.org/).
2.  **SAP CDC Account:** You need access to an SAP CDC account with permissions to:
    * Create and configure at least two sites (one for RP, one for OP).
    * Access the Admin Console for these sites.
    * Create User Keys/Secrets for API access.
    * Modify site schemas and OIDC configurations.
3.  **Text Editor/IDE:** A code editor like VS Code, Sublime Text, or WebStorm.

---

## Section 2: Project Setup

### 2.1. Directory Structure

Create the following directory structure for your project:

```

vikis-sweets-shop/
├── data/
│   └── candies.json
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── images/
│   │   ├── candy1.png
│   │   ├── candy2.png
│   │   ├── special\_candy1.png
│   │   └── special\_candy2.png
│   ├── js/
│   │   ├── auth.js
│   │   ├── catalog.js
│   │   └── ui.js
│   ├── login.html
│   └── catalog.html
├── .env
├── .gitignore
├── package.json
└── server.js

````

### 2.2. Initialize Project and Install Dependencies

1.  Navigate to the `vikis-sweets-shop` directory in your terminal.
2.  Initialize your Node.js project:
    ```bash
    npm init -y
    ```
3.  Install necessary npm packages:
    * `express`: Web framework for Node.js.
    * `dotenv`: To load environment variables from a `.env` file.
    * `axios`: For making HTTP requests (to the OP's token endpoint).
    * `body-parser`: Middleware to parse incoming request bodies.
    * `express-session`: For managing user sessions.

    ```bash
    npm install express dotenv axios body-parser express-session
    ```

### 2.3. Environment Variables (`.env` file)

Create a file named `.env` in the root of your `vikis-sweets-shop` directory. **Do not commit this file to version control.**

```ini
# Vikis Sweets Shop - Relying Party (RP) Configuration
RP_SITE_API_KEY=YOUR_RP_SITE_API_KEY
RP_REDIRECT_URI=http://localhost:3000/auth/callback

# OpenID Provider (OP) Site Configuration
OP_SITE_API_KEY=YOUR_OP_SITE_API_KEY
OP_SITE_DATA_CENTER=us1 # Ensure this matches your OP site's data center
OP_ISSUER_URL=[https://fidm.us1.gigya.com/oidc/op/v1.0/YOUR_OP_SITE_API_KEY](https://fidm.us1.gigya.com/oidc/op/v1.0/YOUR_OP_SITE_API_KEY)
OP_TOKEN_ENDPOINT_URL=[https://fidm.us1.gigya.com/oidc/op/v1.0/YOUR_OP_SITE_API_KEY/token](https://fidm.us1.gigya.com/oidc/op/v1.0/YOUR_OP_SITE_API_KEY/token)
OP_USERINFO_ENDPOINT_URL=[https://fidm.us1.gigya.com/oidc/op/v1.0/YOUR_OP_SITE_API_KEY/userinfo](https://fidm.us1.gigya.com/oidc/op/v1.0/YOUR_OP_SITE_API_KEY/userinfo)

# Client Credentials for RP at OP Site
# These are generated when you register the RP as a client in the OP site's OIDC settings
OP_CLIENT_ID_FOR_RP=YOUR_CLIENT_ID_FROM_OP_FOR_THIS_RP
OP_CLIENT_SECRET_FOR_RP=YOUR_CLIENT_SECRET_FROM_OP_FOR_THIS_RP

# SAP CDC User Key and Secret (for server-side calls to RP site, if needed for other Gigya APIs)
# Create these in your RP Site: Access Management > Applications
USER_KEY=YOUR_CDC_USER_KEY_FOR_RP_SITE
USER_SECRET=YOUR_CDC_USER_SECRET_FOR_RP_SITE

# Application Configuration
PORT=3000
SESSION_SECRET=a_very_secret_key_for_sessions_CHANGE_ME # Change this to a random string
````

**Action:** Replace placeholder values (like `YOUR_RP_SITE_API_KEY`) with your actual SAP CDC credentials and configurations as you set them up.

### 2.4. `.gitignore` file

Create a `.gitignore` file in the root directory:

```
node_modules/
.env
npm-debug.log
*.log
```

### 2.5. `package.json` (Example)

Your `package.json` will look something like this. Add a `start` script:

```json
{
  "name": "vikis-sweets-shop",
  "version": "1.0.0",
  "description": "Vikis Sweets Shop with SAP CDC Integration",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "axios": "^1.0.0",
    "body-parser": "^1.20.0",
    "dotenv": "^16.0.0",
    "express": "^4.18.0",
    "express-session": "^1.17.0"
  }
}
```

**(Note: Use actual installed versions for dependencies by running `npm list` after installation to check versions if needed.)**

-----

## Section 3: SAP CDC Configuration (Admin Console Steps)

You'll need two SAP CDC sites:

1.  **OP Site (OpenID Provider):** This site will authenticate users and issue tokens.
2.  **RP Site (Vikis Sweets Shop - Relying Party):** This is your Node.js application's corresponding site.

**Important:** Both sites *must* be in the same data center (e.g., `us1`) as per your requirement.

### 3.1. General Notes

  * **Data Center:** When creating your sites in the SAP CDC Console, select `US1` as the data center.
  * **API Keys:** Note down the API Key for both the OP site and the RP site. You'll use these in your `.env` file.

### 3.2. Configuring the OIDC Provider (OP) Site

1.  **Access SAP CDC Console:** Log in and select your OP Site.
2.  **Navigate to OIDC OP Settings:** Go to `Identity` \> `Connect` (or `Outbound Federation` in some UIs) \> `OIDC OP`.
3.  **Configure OP Settings:**
      * **Enable OIDC Provider:** Ensure the "Enable as OIDC Provider" (or similar) option is checked.
      * **Issuer URL:** This will be auto-generated based on your API Key and data center (e.g., `https://fidm.us1.gigya.com/oidc/op/v1.0/YOUR_OP_SITE_API_KEY`). Verify this matches `OP_ISSUER_URL` in your `.env`.
      * **Proxy Page URL:** Set up a proxy page as recommended by SAP CDC documentation, especially for handling third-party cookie restrictions. For local development, this might be less critical but is vital for production.
      * **Supported Signing Algorithms:** Ensure `RS256` is selected.
4.  **Register Vikis Sweets Shop (RP) as an OIDC Client:**
      * Under the "Clients" or "Relying Parties" section, click "Add Client" (or similar).
      * **Client Name:** e.g., "Vikis Sweets Shop RP"
      * **Client Type:** `Confidential` (since your Node.js backend can securely store a secret).
      * **Client ID:** This will be auto-generated by SAP CDC. Note this down for `OP_CLIENT_ID_FOR_RP` in your `.env`.
      * **Client Secret:** Click to generate a secret. Note this down for `OP_CLIENT_SECRET_FOR_RP` in your `.env`.
      * **Response Types:** Select `code` (for Authorization Code Flow).
      * **Grant Types:** Select `authorization_code` and `refresh_token`.
      * **Redirect URIs:** Add the exact redirect URI for your local Node.js application: `http://localhost:3000/auth/callback`. This must match `RP_REDIRECT_URI` in your `.env`.
      * **Allowed Scopes:** Ensure `openid`, `profile`, `email` are available. You can add custom scopes later if needed.
      * **Token Settings:** Configure ID token and Access token lifetimes as appropriate.
5.  **Save Configuration.**

### 3.3. Configuring the Relying Party (RP) Site (Vikis Sweets Shop)

1.  **Access SAP CDC Console:** Log in and select your RP Site (Vikis Sweets Shop).
2.  **Navigate to External Identity Providers:** Go to `Identity` \> `Connect` (or `Inbound Federation`) \> `External Identity Providers`.
3.  **Add OIDC Provider:**
      * Click "Add" or "Configure New OIDC OP".
      * **Provider Name:** Give it a unique internal name, e.g., `MyMainOIDCProvider`. This name will be used in the Screen-Set configuration.
      * **Issuer URL:** Enter the Issuer URL of your OP Site (from `OP_ISSUER_URL` in `.env`).
      * **Client ID:** Enter the `OP_CLIENT_ID_FOR_RP` (the Client ID you got when configuring the OP site).
      * **Client Secret:** Enter the `OP_CLIENT_SECRET_FOR_RP`.
      * **Endpoints:** SAP CDC will attempt to auto-discover the Authorization, Token, and UserInfo endpoints from the Issuer URL's metadata (`.well-known/openid-configuration`). Verify these match the URLs in your `.env`.
          * `OP_TOKEN_ENDPOINT_URL`
          * `OP_USERINFO_ENDPOINT_URL`
      * **Scopes Requested:** Enter `openid profile email`.
      * **User Identifier Location:** Typically `Subject identifier (sub)`.
      * **Map Claims:** Map standard OIDC claims (like `email`, `given_name`, `family_name`) to your RP site's schema fields (e.g., `profile.email`, `profile.firstName`, `profile.lastName`).
4.  **Save Configuration.**

### 3.4. Setting up "Club Members" (Schema on RP Site)

1.  **Access RP Site Console:** Select your RP Site.
2.  **Schema Editor:** Navigate to `Identity` \> `Schema`.
3.  **Add Custom Field:**
      * Under the `profile` object, find the `data` object.
      * Click "Add Field" to `data`.
      * **Field Name:** `isSweetShopClubMember`
      * **Type:** `Boolean`
      * **User Access:** `Read-only` (client can read, but not write).
      * **Write Access:** `Server Only` (prevents client-side modification, can be set by server API or admin).
4.  **Save Schema.**
5.  **To add a user to the club (manually for testing):**
      * Go to `Identity Access` \> `Search` for a test user.
      * Edit the user's profile and set `data.isSweetShopClubMember` to `true`.

### 3.5. Setting up "SAP CDC" Organizational Group (Simplified Approach on RP Site)

The "Organizations model" in SAP CDC is for B2B scenarios. For this requirement, we'll simulate it by checking for a specific attribute that denotes membership. A true B2B setup involves more complex Organization Management.

1.  **Access RP Site Console:** Select your RP Site.
2.  **Schema Editor:** Navigate to `Identity` \> `Schema`.
3.  **Add Custom Field:**
      * Under `profile.data`, click "Add Field".
      * **Field Name:** `isSAPCDCOrgMember`
      * **Type:** `Boolean`
      * **User Access:** `Read-only`.
      * **Write Access:** `Server Only`.
4.  **Save Schema.**
5.  **To mark a user as an "SAP CDC Org Member" (manually for testing):**
      * Go to `Identity Access` \> `Search` for a test user.
      * Edit the user's profile and set `data.isSAPCDCOrgMember` to `true`.

-----

## Section 4: Frontend Implementation

### 4.1. `public/images/`

Create some placeholder images for your candies (e.g., 100x100px PNGs):

  * `candy1.png`
  * `candy2.png`
  * `special_candy1.png`
  * `special_candy2.png`
    (You can use any small images for testing.)

### 4.2. `public/css/styles.css`

Create a basic stylesheet:

```css
body { 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    margin: 0; 
    padding: 0; 
    background-color: #fffaf0; /* Light floral white */
    color: #4a3b31; /* Dark coffee brown */
    line-height: 1.6; 
}
header { 
    background-color: #ffdab9; /* Peach puff */
    color: #4a3b31; 
    padding: 1.2em 0; 
    text-align: center; 
    border-bottom: 4px solid #ffb366; /* Lighter peach */
}
header h1 { 
    margin: 0; 
    font-size: 2.5em; 
    font-family: 'Brush Script MT', 'Comic Sans MS', cursive; /* Cute font */
}
nav {
    background-color: #ffe4c4; /* Bisque */
    padding: 0.5em 0;
}
nav ul { 
    list-style-type: none; 
    padding: 0; 
    text-align: center; 
    margin: 0;
}
nav ul li { 
    display: inline; 
    margin: 0 15px; 
}
nav ul li a { 
    color: #4a3b31; 
    text-decoration: none; 
    font-weight: bold; 
    padding: 8px 12px; 
    border-radius: 4px; 
    transition: background-color 0.3s, color 0.3s; 
}
nav ul li a:hover, .nav-link.active { 
    background-color: #ff7f50; /* Coral */
    color: white; 
}
.container { 
    width: 90%; 
    max-width: 1000px; 
    margin: 25px auto; 
    padding: 25px; 
    background-color: #ffffff; 
    border-radius: 10px; 
    box-shadow: 0 5px 15px rgba(0,0,0,0.08); 
}
h2 { 
    color: #d2691e; /* Chocolate */
    font-size: 1.8em; 
    border-bottom: 2px solid #ffdab9; 
    padding-bottom: 0.3em; 
    margin-top: 0; 
    margin-bottom: 1em;
}
h3 { 
    color: #8b4513; /* Saddle brown */
    font-size: 1.4em; 
    margin-top: 1.5em; 
    margin-bottom: 0.7em;
}
.candy-catalog, .user-profile, .send-candy-form { 
    margin-bottom: 25px; 
}
.candy-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
    gap: 20px; 
}
.candy-item { 
    border: 1px solid #ffe4c4; /* Bisque */
    padding: 18px; 
    border-radius: 8px; 
    background-color: #fff8f0; /* Lighter floral white */
    text-align: center; 
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out; 
}
.candy-item:hover { 
    transform: translateY(-5px); 
    box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
}
.candy-item img { 
    max-width: 120px; 
    height: 120px; 
    object-fit: cover; 
    border-radius: 6px; 
    margin-bottom: 12px; 
    border: 2px solid #ffdab9; 
}
.candy-item h4 { 
    margin-top: 0; 
    margin-bottom: 8px; 
    color: #8b5a2b; /* Darker saddle brown */
    font-size: 1.2em; 
}
.price { 
    font-weight: bold; 
    color: #c04000; /* Sienna */
    font-size: 1.1em; 
    margin-bottom: 10px; 
}
button, input[type="submit"] { 
    background-color: #ff7f50; /* Coral */
    color: white; 
    border: none; 
    padding: 12px 20px; 
    text-align: center; 
    text-decoration: none; 
    display: inline-block; 
    font-size: 1em; 
    border-radius: 5px; 
    cursor: pointer; 
    transition: background-color 0.3s ease; 
    margin-top: 5px; 
}
button:hover, input[type="submit"]:hover { 
    background-color: #ff6347; /* Tomato */
}
button.secondary { 
    background-color: #ffdab9; /* Peach puff */
    color: #4a3b31; 
}
button.secondary:hover { 
    background-color: #ffb366; /* Lighter peach */
}
#loginContainer { 
    padding: 20px; 
    border: 2px dashed #ffdab9; 
    margin-top: 20px; 
    border-radius: 8px; 
    background-color: #fff8f0; 
}
#sendCandyFormContainer, #profileInfoContainer { 
    padding: 20px; 
    border: 1px solid #ffe4c4; 
    margin-top: 20px; 
    border-radius: 8px; 
    background-color: #fff8f0; 
}
input[type="text"], textarea { 
    width: calc(100% - 24px); /* Account for padding and border */
    padding: 10px; 
    margin-bottom: 12px; 
    border: 1px solid #ffb366; 
    border-radius: 4px; 
    box-sizing: border-box; 
}
label { 
    display: block; 
    margin-bottom: 6px; 
    font-weight: bold; 
    color: #8b4513; 
}
.hidden { 
    display: none !important; 
}
.user-info { 
    text-align: right; 
    margin-bottom: 15px; 
    font-style: italic; 
    color: #8b5a2b; 
}
pre { 
    background-color: #fdf5e6; /* Old Lace, for code blocks */
    padding: 15px; 
    border-radius: 5px; 
    overflow-x: auto; 
    border: 1px solid #eee; 
    color: #333;
    font-family: 'Courier New', Courier, monospace;
}
```

### 4.3. `public/login.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Vikis Sweets Shop</title>
    <link rel="stylesheet" href="/css/styles.css">
    <script id="gigya-sdk-script" src=""></script>
</head>
<body>
    <header>
        <h1>Vikis Sweets Shop</h1>
        <nav>
            <ul>
                <li><a href="/">Home (Catalog)</a></li>
                <li><a href="/login.html" class="nav-link active">Login</a></li>
            </ul>
        </nav>
    </header>
    <div class="container">
        <h2>Login or Register</h2>
        <div id="loginContainer">
            <p>Loading login options...</p>
        </div>
    </div>

    <script>
        // Client-side configuration store
        const clientLoginConfig = {
            RP_SITE_API_KEY: '', // To be fetched from backend
            OP_PROVIDER_NAME: 'MyMainOIDCProvider' // Must match the name used in RP site's OIDC Provider configuration
        };

        async function fetchClientConfigAndLoadGigyaLogin() {
            try {
                const response = await fetch('/api/client-config'); // Endpoint defined in server.js
                if (!response.ok) {
                    throw new Error(`Failed to fetch client config: ${response.statusText}`);
                }
                const config = await response.json();
                clientLoginConfig.RP_SITE_API_KEY = config.rpSiteApiKey;

                if (!clientLoginConfig.RP_SITE_API_KEY) {
                    throw new Error('RP Site API Key not received from backend.');
                }

                // Now set the Gigya SDK script source
                const sdkScript = document.getElementById('gigya-sdk-script');
                sdkScript.src = `https://cdns.gigya.com/js/gigya.js?apiKey=${clientLoginConfig.RP_SITE_API_KEY}`;
                
                // Initialize ScreenSet after SDK script loads
                sdkScript.onload = initializeLoginScreenSet;
                sdkScript.onerror = () => {
                    console.error('Gigya SDK failed to load.');
                    document.getElementById('loginContainer').innerHTML = '<p>Error loading login services. Please try again later.</p>';
                };

            } catch (error) {
                console.error("Error in fetchClientConfigAndLoadGigyaLogin:", error);
                document.getElementById('loginContainer').innerHTML = '<p>Error loading login configuration. Please check console and try again later.</p>';
            }
        }
        
        function initializeLoginScreenSet() {
            // Ensure Gigya SDK is loaded
            if (typeof gigya === 'undefined') {
                console.error('Gigya SDK not loaded when trying to initialize ScreenSet.');
                document.getElementById('loginContainer').innerHTML = '<p>Login services are currently unavailable. Gigya SDK did not load.</p>';
                return;
            }

            // Define the custom OIDC button
            const oidcButton = [{
                providerName: clientLoginConfig.OP_PROVIDER_NAME, // This is crucial
                type: 'oidc', // Specifies OIDC flow
                buttonText: 'Login with Company Account', // Customize button text
                cssClass: 'gigya-oidc-button' // Optional: for custom styling
            }];

            gigya.accounts.showScreenSet({
                screenSet: 'Default-RegistrationLogin', // Use your RP site's screen-set
                startScreen: 'gigya-login-screen',
                containerID: 'loginContainer',
                customButtons: oidcButton,
                sessionExpiration: -1, // Session managed by OIDC provider tokens or server session
                // OIDC flow redirects to /auth/callback (handled by backend).
                // Backend then redirects to /catalog.html on success.
                // onLogin here handles native Gigya login success, not OIDC post-redirect.
                onLogin: function(eventObj) {
                    // This event fires for non-OIDC logins completed directly by the screen-set
                    if (eventObj.context.provider !== clientLoginConfig.OP_PROVIDER_NAME && eventObj.UID) {
                         console.log('Native Gigya Login successful (not OIDC):', eventObj);
                        // Store session info if needed, then redirect
                        window.location.href = '/catalog.html';
                    }
                },
                onError: function(eventObj) {
                    console.error('ScreenSet Error:', eventObj);
                    // Display a user-friendly error message
                    alert(`Login Error: ${eventObj.errorMessage || 'An unknown error occurred.'}`);
                }
            });
        }

        // Fetch config and initialize when the DOM is ready
        document.addEventListener('DOMContentLoaded', fetchClientConfigAndLoadGigyaLogin);
    </script>
</body>
</html>
```

### 4.4. `public/catalog.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candies - Vikis Sweets Shop</title>
    <link rel="stylesheet" href="/css/styles.css">
    <script id="gigya-sdk-script-catalog" src=""></script>
</head>
<body>
    <header>
        <h1>Vikis Sweets Shop</h1>
        <nav>
            <ul>
                <li><a href="/catalog.html" class="nav-link active">Candies</a></li>
                <li><a id="loginLogoutLink" class="nav-link" href="/login.html">Login</a></li>
                <li><button id="showProfileBtn" class="hidden secondary">Show Profile</button></li>
            </ul>
        </nav>
    </header>

    <div class="container">
        <div id="userInfo" class="user-info">
            <p>Welcome, <span id="userName">Guest</span>!</p>
        </div>

        <div id="regularCandies" class="candy-catalog">
            <h2>Regular Candies</h2>
            <div class="candy-grid">
                </div>
        </div>

        <div id="specialCandies" class="candy-catalog hidden">
            <h2>Club Member Specials!</h2>
            <div class="candy-grid">
                </div>
        </div>
        
        <button id="sendCandyToFriendBtn" class="hidden">Send Candy to a Friend</button>
        <div id="sendCandyFormContainer" class="send-candy-form hidden">
            <h3>Send a Treat!</h3>
            <form id="sendCandyForm">
                <div>
                    <label for="friendName">Friend's Name:</label>
                    <input type="text" id="friendName" name="friendName" required>
                </div>
                <div>
                    <label for="friendAddress">Friend's Address:</label>
                    <textarea id="friendAddress" name="friendAddress" rows="3" required></textarea>
                </div>
                <div>
                    <label for="candyMessage">Message:</label>
                    <textarea id="candyMessage" name="candyMessage" rows="3"></textarea>
                </div>
                <button type="submit">Send Treat</button>
                <button type="button" id="cancelSendCandyBtn" class="secondary">Cancel</button>
            </form>
        </div>
        
        <div id="profileInfoContainer" class="user-profile hidden">
            <h3>Your Profile Information (from OIDC UserInfo)</h3>
            <pre id="oidcProfileData">Profile data will appear here...</pre>
        </div>
    </div>

    <script>
        // Client-side configuration store for catalog page
        const clientCatalogConfig = {
            RP_SITE_API_KEY: '', // To be fetched from backend
            OP_USERINFO_ENDPOINT_URL: '', // To be fetched from backend
            accessToken: null, // To store OIDC access token from URL
            refreshToken: null // To store OIDC refresh token from URL (handle with care)
        };
    </script>
    <script src="/js/ui.js"></script>
    <script src="/js/catalog.js"></script>
    <script src="/js/auth.js"></script>
    <script>
         async function fetchClientConfigAndLoadGigyaCatalog() {
            try {
                const response = await fetch('/api/client-config');
                if (!response.ok) {
                    throw new Error(`Failed to fetch client config: ${response.statusText}`);
                }
                const config = await response.json();
                clientCatalogConfig.RP_SITE_API_KEY = config.rpSiteApiKey;
                clientCatalogConfig.OP_USERINFO_ENDPOINT_URL = config.opUserinfoEndpointUrl;

                if (!clientCatalogConfig.RP_SITE_API_KEY) {
                     throw new Error('RP Site API Key not received for catalog page.');
                }
                if (!clientCatalogConfig.OP_USERINFO_ENDPOINT_URL) {
                    console.warn('OP UserInfo Endpoint URL not received. "Show Profile" may not work.');
                }


                const sdkScript = document.getElementById('gigya-sdk-script-catalog');
                sdkScript.src = `https://cdns.gigya.com/js/gigya.js?apiKey=${clientCatalogConfig.RP_SITE_API_KEY}`;
                
                sdkScript.onload = () => {
                    console.log('Gigya SDK loaded on catalog page.');
                    // Check initial login state. This will also parse tokens from URL if present.
                    checkLoginStateAndTokens(); 
                };
                sdkScript.onerror = () => console.error('Gigya SDK failed to load on catalog page.');

            } catch (error) {
                console.error("Error in fetchClientConfigAndLoadGigyaCatalog:", error);
                // Handle error, maybe show a message to the user
            }
        }
        // Fetch config and initialize when the DOM is ready
        document.addEventListener('DOMContentLoaded', fetchClientConfigAndLoadGigyaCatalog);
    </script>
</body>
</html>
```

### 4.5. `public/js/ui.js` (UI Helper Functions)

```javascript
// public/js/ui.js

function updateLoginStateUI(isLoggedIn, userData) {
    const loginLogoutLink = document.getElementById('loginLogoutLink');
    const userNameSpan = document.getElementById('userName');
    const showProfileBtn = document.getElementById('showProfileBtn');

    if (!loginLogoutLink || !userNameSpan || !showProfileBtn) {
        console.error("One or more UI elements for login state not found.");
        return;
    }

    if (isLoggedIn && userData) {
        loginLogoutLink.textContent = 'Logout';
        loginLogoutLink.href = '#'; 
        // Remove previous onclick before adding a new one to prevent multiple handlers
        loginLogoutLink.onclick = null; 
        loginLogoutLink.onclick = (event) => { event.preventDefault(); handleLogout(); };
        
        userNameSpan.textContent = userData.profile?.firstName || userData.profile?.email || 'Valued Customer';
        showProfileBtn.classList.remove('hidden');
    } else {
        loginLogoutLink.textContent = 'Login';
        loginLogoutLink.href = '/login.html';
        loginLogoutLink.onclick = null; // Remove any existing click handler
        userNameSpan.textContent = 'Guest';
        showProfileBtn.classList.add('hidden');
        
        // Hide sections that require login
        const specialCandiesSection = document.getElementById('specialCandies');
        if (specialCandiesSection) specialCandiesSection.classList.add('hidden');
        
        const sendCandyBtn = document.getElementById('sendCandyToFriendBtn');
        if (sendCandyBtn) sendCandyBtn.classList.add('hidden');
        
        toggleSendCandyForm(false); // Ensure form is hidden
        
        const profileInfoContainer = document.getElementById('profileInfoContainer');
        if (profileInfoContainer) profileInfoContainer.classList.add('hidden');
    }
}

function displayCandies(candies, containerId, title) {
    const sectionContainer = document.getElementById(containerId);
    if (!sectionContainer) {
        console.error(`Candy container with id '${containerId}' not found.`);
        return;
    }
    const gridContainer = sectionContainer.querySelector('.candy-grid');
    if (!gridContainer) {
        console.error(`Candy grid within '${containerId}' not found.`);
        return;
    }

    gridContainer.innerHTML = ''; // Clear previous items
    
    if (!candies || candies.length === 0) {
        if (containerId === 'specialCandies') {
            gridContainer.innerHTML = '<p>No special treats for you yet! Become a club member to unlock exclusive sweets.</p>';
        } else {
            gridContainer.innerHTML = '<p>No candies to show at the moment. Check back soon!</p>';
        }
        return;
    }

    candies.forEach(candy => {
        const candyDiv = document.createElement('div');
        candyDiv.className = 'candy-item';
        candyDiv.innerHTML = `
            <img src="${candy.imageUrl}" alt="${candy.name}">
            <h4>${candy.name}</h4>
            <p class="price">$${typeof candy.price === 'number' ? candy.price.toFixed(2) : 'N/A'}</p>
            <p>${candy.description || ''}</p>
        `;
        gridContainer.appendChild(candyDiv);
    });
}

function toggleSendCandyForm(show) {
    const formContainer = document.getElementById('sendCandyFormContainer');
    if (!formContainer) return;

    if (show) {
        formContainer.classList.remove('hidden');
    } else {
        formContainer.classList.add('hidden');
        const form = document.getElementById('sendCandyForm');
        if (form) form.reset();
    }
}

function displayOidcProfileInfo(data) {
    const container = document.getElementById('profileInfoContainer');
    const preElement = document.getElementById('oidcProfileData');
    if (container && preElement) {
        preElement.textContent = JSON.stringify(data, null, 2);
        container.classList.remove('hidden');
    } else {
        console.error("Profile info container or pre element not found.");
    }
}
```

### 4.6. `public/js/catalog.js`

```javascript
// public/js/catalog.js

async function fetchAndDisplayCandies(userData) {
    try {
        const response = await fetch('/api/candies');
        if (!response.ok) {
            throw new Error(`Failed to fetch candies: ${response.status} ${response.statusText}`);
        }
        const allCandies = await response.json();

        const regularCandiesData = allCandies.filter(c => c.type === 'regular');
        displayCandies(regularCandiesData, 'regularCandies', 'Regular Candies');

        const specialCandiesSection = document.getElementById('specialCandies');
        if (specialCandiesSection) {
            if (userData && userData.data && userData.data.isSweetShopClubMember === true) {
                const specialCandiesData = allCandies.filter(c => c.type === 'special_club');
                displayCandies(specialCandiesData, 'specialCandies', 'Club Member Specials!');
                specialCandiesSection.classList.remove('hidden');
            } else {
                specialCandiesSection.classList.add('hidden');
            }
        } else {
            console.error("Special candies section not found.");
        }

    } catch (error) {
        console.error('Error fetching or displaying candies:', error);
        const regularCandiesContainer = document.getElementById('regularCandies')?.querySelector('.candy-grid');
        if (regularCandiesContainer) {
            regularCandiesContainer.innerHTML = '<p>Could not load candies at this time. Please try refreshing the page.</p>';
        }
    }
}

function setupSendCandyInteraction(userData) {
    const sendCandyBtn = document.getElementById('sendCandyToFriendBtn');
    const cancelSendCandyBtn = document.getElementById('cancelSendCandyBtn');
    const sendCandyFormEl = document.getElementById('sendCandyForm');

    if (!sendCandyBtn || !cancelSendCandyBtn || !sendCandyFormEl) {
        console.warn("Send candy UI elements not all found. Interaction may not work.");
        return;
    }

    if (userData && userData.data && userData.data.isSAPCDCOrgMember === true) {
        sendCandyBtn.classList.remove('hidden');
    } else {
        sendCandyBtn.classList.add('hidden');
    }

    sendCandyBtn.addEventListener('click', () => {
        toggleSendCandyForm(true);
    });

    cancelSendCandyBtn.addEventListener('click', () => {
        toggleSendCandyForm(false);
    });

    sendCandyFormEl.addEventListener('submit', (event) => {
        event.preventDefault();
        const friendName = document.getElementById('friendName').value;
        const friendAddress = document.getElementById('friendAddress').value;
        const message = document.getElementById('candyMessage').value;
        
        // For now, just log it. In a real app, send this to the backend.
        console.log('Simulating sending candy to:', { friendName, friendAddress, message });
        alert(`Simulated sending candy to ${friendName}! (Check browser console for details)`);
        toggleSendCandyForm(false);
    });
}

// Initial load on catalog page is typically triggered by checkLoginStateAndTokens in auth.js
```

### 4.7. `public/js/auth.js`

```javascript
// public/js/auth.js

// This function is called after Gigya SDK is loaded on catalog.html
// It also handles the scenario where the user lands on catalog.html after OIDC redirect
async function checkLoginStateAndTokens() {
    // Check if tokens are in URL parameters (from OIDC redirect via server)
    const urlParams = new URLSearchParams(window.location.search);
    const accessTokenFromUrl = urlParams.get('access_token');
    const refreshTokenFromUrl = urlParams.get('refresh_token');

    if (accessTokenFromUrl) {
        clientCatalogConfig.accessToken = decodeURIComponent(accessTokenFromUrl);
        if (refreshTokenFromUrl) {
            // SECURITY WARNING: Refresh tokens on client-side are risky.
            // This is for demonstration of the requirement.
            // In production, refresh tokens should ideally be HttpOnly cookies managed by backend.
            clientCatalogConfig.refreshToken = decodeURIComponent(refreshTokenFromUrl);
            console.warn("Refresh Token present on client-side. Ensure secure handling or backend management in production.");
        }
        console.log("OIDC Access Token received from URL and stored in client config.");
        
        // Clean tokens from URL for security and aesthetics
        window.history.replaceState({}, document.title, "/catalog.html");
        
        // Now that we have tokens (from OIDC flow), fetch Gigya account info to confirm session
        // and get profile data for conditional UI.
        fetchGigyaAccountInfo(true); // Pass true to indicate it's after an OIDC redirect
    } else {
        // No tokens in URL, check existing Gigya session normally
        fetchGigyaAccountInfo(false);
    }

    // Setup profile button regardless of initial token state (it checks for token internally)
    setupProfileButton();
}


function fetchGigyaAccountInfo(isAfterOidcRedirect = false) {
     if (typeof gigya === 'undefined' || !clientCatalogConfig.RP_SITE_API_KEY) {
        console.warn('Gigya SDK not ready or API key missing when calling getAccountInfo.');
        // If SDK isn't ready, assume guest state for now
        updateLoginStateUI(false, null);
        fetchAndDisplayCandies(null); // Show only regular candies
        setupSendCandyInteraction(null); // Setup with no user data
        return;
    }

    gigya.accounts.getAccountInfo({
        include: 'profile,data', // Request data needed for conditional logic
        callback: function(response) {
            if (response.errorCode === 0 && response.UID) {
                // Successfully got Gigya account info (user is logged into Gigya RP site)
                console.log('Gigya getAccountInfo successful:', response);
                updateLoginStateUI(true, response); // Pass the Gigya user object
                fetchAndDisplayCandies(response);   // Load candies based on Gigya profile
                setupSendCandyInteraction(response);// Setup interactions based on Gigya profile
            } else {
                // Error or not logged in (errorCode 206001)
                if (!isAfterOidcRedirect && response.errorCode !== 206001 /* Not logged in */) {
                     // Log unexpected errors unless it's just "not logged in" on a normal page load
                     console.error('Error fetching Gigya account info:', response);
                } else if (response.errorCode === 206001) {
                    console.log('User not logged in (Gigya).');
                }
                
                // Set UI to logged-out state
                updateLoginStateUI(false, null);
                fetchAndDisplayCandies(null); // Load candies for guest
                setupSendCandyInteraction(null); // Setup interactions for guest

                // If OIDC tokens were present but getAccountInfo failed (e.g., user not linked in Gigya),
                // it implies the OIDC login didn't fully establish a usable Gigya session.
                // Clear the OIDC tokens as they might not correspond to a valid Gigya user context here.
                if(clientCatalogConfig.accessToken && response.errorCode !== 0) {
                    clientCatalogConfig.accessToken = null;
                    clientCatalogConfig.refreshToken = null;
                    console.log("Cleared OIDC tokens due to getAccountInfo failure or no linked Gigya account after OIDC redirect.");
                }
            }
        }
    });
}

async function handleLogout(event) {
    if(event) event.preventDefault(); // Prevent default if called from an anchor click
    console.log('Logout initiated by user...');
    
    // Clear client-side OIDC tokens
    clientCatalogConfig.accessToken = null;
    clientCatalogConfig.refreshToken = null;

    if (typeof gigya !== 'undefined' && typeof gigya.accounts !== 'undefined') {
        gigya.accounts.logout({
            callback: function(response) {
                if (response.errorCode !== 0) {
                    console.error('Gigya logout error:', response);
                }
                // Regardless of Gigya logout success/failure, proceed to backend logout
                // The backend will handle session clearing and potentially OIDC OP logout redirection.
                window.location.href = '/auth/logout';
            }
        });
    } else {
        // Fallback if Gigya SDK not loaded or accounts object not available
        console.warn("Gigya SDK not available for logout, redirecting to backend logout directly.");
        window.location.href = '/auth/logout';
    }
}

function setupProfileButton() {
    const showProfileBtn = document.getElementById('showProfileBtn');
    if (!showProfileBtn) {
        console.warn("Show Profile button not found.");
        return;
    }

    showProfileBtn.addEventListener('click', async () => {
        if (!clientCatalogConfig.accessToken) {
            alert('No OIDC access token available. Please log in via the OIDC provider to use this feature.');
            return;
        }
        if (!clientCatalogConfig.OP_USERINFO_ENDPOINT_URL) {
            alert('UserInfo endpoint URL is not configured. Cannot fetch OIDC profile.');
            return;
        }

        try {
            console.log("Fetching UserInfo from:", clientCatalogConfig.OP_USERINFO_ENDPOINT_URL);
            console.log("Using Access Token:", clientCatalogConfig.accessToken.substring(0,20) + "..."); // Log snippet for verification

            const response = await fetch(clientCatalogConfig.OP_USERINFO_ENDPOINT_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${clientCatalogConfig.accessToken}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text(); // Get error response body
                throw new Error(`Failed to fetch UserInfo: ${response.status} ${response.statusText}. Details: ${errorText}`);
            }
            const userInfoData = await response.json();
            console.log('UserInfo data received:', userInfoData);
            displayOidcProfileInfo(userInfoData); // Function from ui.js

        } catch (error) {
            console.error('Error calling UserInfo endpoint:', error);
            alert(`Error fetching OIDC profile: ${error.message}. Check console for more details.`);
            const profileInfoContainer = document.getElementById('profileInfoContainer');
            if(profileInfoContainer) profileInfoContainer.classList.add('hidden');
        }
    });
}
```

-----

## Section 5: Backend Implementation (`server.js`)

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const axios = require('axios');
// const bodyParser = require('body-parser'); // express.json() and express.urlencoded() are built-in with modern Express
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'please_change_this_secret_in_production',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (requires HTTPS)
        httpOnly: true, // Helps prevent XSS
        sameSite: 'lax' // Helps prevent CSRF
    } 
}));

// --- Data for Candies ---
// In a real app, this might come from a database
let candiesData = [];
try {
    candiesData = require('./data/candies.json');
} catch (err) {
    console.error("Error loading candies.json:", err);
    // Initialize with empty array or default data if file not found/corrupt
}


// --- API Routes ---

// Endpoint to provide client-side configuration (e.g., API keys that are safe for client)
app.get('/api/client-config', (req, res) => {
    res.json({
        rpSiteApiKey: process.env.RP_SITE_API_KEY, // RP Site API Key is safe for client-side Gigya SDK init
        opUserinfoEndpointUrl: process.env.OP_USERINFO_ENDPOINT_URL
        // DO NOT send sensitive keys like client secrets or USER_SECRET here
    });
});


app.get('/api/candies', (req, res) => {
    res.json(candiesData);
});

// --- OIDC Authentication Routes ---

// This is the Redirect URI registered with the OIDC Provider (OP)
app.get('/auth/callback', async (req, res) => {
    const authorizationCode = req.query.code;
    const state = req.query.state; // If you implement state parameter for CSRF protection

    if (!authorizationCode) {
        console.error('Authorization code is missing in /auth/callback.');
        return res.status(400).send('Authorization code is missing.');
    }

    console.log('Received authorization code:', authorizationCode);
    // TODO: Validate state parameter here if you used one in the authorization request.
    // E.g., if (req.session.oidcState !== state) { return res.status(403).send('Invalid state parameter.'); }

    const tokenRequestBody = new URLSearchParams();
    tokenRequestBody.append('grant_type', 'authorization_code');
    tokenRequestBody.append('code', authorizationCode);
    tokenRequestBody.append('redirect_uri', process.env.RP_REDIRECT_URI);
    tokenRequestBody.append('client_id', process.env.OP_CLIENT_ID_FOR_RP);
    tokenRequestBody.append('client_secret', process.env.OP_CLIENT_SECRET_FOR_RP);

    try {
        console.log('Requesting tokens from OP Token Endpoint:', process.env.OP_TOKEN_ENDPOINT_URL);
        const tokenResponse = await axios.post(
            process.env.OP_TOKEN_ENDPOINT_URL,
            tokenRequestBody.toString(), //axios sends URLSearchParams as 'application/x-www-form-urlencoded'
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, refresh_token, id_token, expires_in } = tokenResponse.data;
        
        console.log('Access Token received. Length:', access_token ? access_token.length : 'N/A');
        // console.log('Refresh Token:', refresh_token); // Be careful logging sensitive tokens
        // console.log('ID Token:', id_token); // You should validate the ID token on the server

        // For this exercise, we are passing tokens to the client via URL parameters.
        // This allows the client-side JS to pick them up and use the access_token for getUserInfo.
        // SECURITY NOTE: 
        // 1. Exposing refresh_token to the client via URL is highly risky and not recommended for production.
        // 2. Access tokens in URL can be logged in browser history/server logs.
        // A more secure method for web apps involves HttpOnly cookies for tokens,
        // or a Backend-for-Frontend (BFF) pattern where tokens are managed server-side.
        
        let redirectUrl = `/catalog.html?access_token=${encodeURIComponent(access_token)}`;
        if (refresh_token) {
            // Only include refresh_token if explicitly required by the exercise and acknowledge risk.
            redirectUrl += `&refresh_token=${encodeURIComponent(refresh_token)}`;
        }
        
        // Store some indication of login in server session if needed for backend checks
        if (req.session) {
            req.session.isOidcAuthenticated = true;
            // You might store validated ID token claims here if needed for backend logic
            // req.session.userInfo = validatedIdTokenClaims; 
        }
        
        res.redirect(redirectUrl);

    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error('Error exchanging authorization code for tokens:', JSON.stringify(errorDetails, null, 2));
        let clientErrorMessage = 'Failed to obtain tokens from the identity provider. Please try logging in again.';
        if (error.response && error.response.data && error.response.data.error_description) {
            clientErrorMessage += ` Details: ${error.response.data.error_description}`;
        }
        res.status(500).send(`${clientErrorMessage} Check server logs for more technical details.`);
    }
});

app.get('/auth/logout', (req, res) => {
    // Clear local server session
    if (req.session) {
        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying server session:", err);
            }
        });
    }
    
    // Clear any session cookies explicitly
    res.clearCookie('connect.sid'); // Default name for express-session cookie
    
    // For OIDC Single Log-Out (SLO), you would redirect to the OP's end_session_endpoint.
    // This requires the id_token_hint and post_logout_redirect_uri.
    // Example (conceptual - ensure OP_ISSUER_URL is correct and id_token_hint is available):
    // const idTokenHint = req.session.id_token; // If you stored it
    // if (idTokenHint && process.env.OP_ISSUER_URL) {
    //     const postLogoutRedirect = encodeURIComponent('http://localhost:3000/login.html'); // Where OP redirects after its logout
    //     const opLogoutUrl = `${process.env.OP_ISSUER_URL}/endsession?id_token_hint=${idTokenHint}&post_logout_redirect_uri=${postLogoutRedirect}`;
    //     return res.redirect(opLogoutUrl);
    // }
    
    // Simplified logout: just redirect to the login page. Client-side Gigya logout should also be called.
    res.redirect('/login.html');
});


// --- Basic Routes for HTML pages ---
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/catalog.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
});

// Default route to catalog page
app.get('/', (req, res) => {
    res.redirect('/catalog.html');
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Vikis Sweets Shop listening at http://localhost:${port}`);
    console.log('Important: Ensure your RP Redirect URI in the SAP CDC OP site\'s client configuration is set to: ' + process.env.RP_REDIRECT_URI);
    if (!process.env.RP_SITE_API_KEY || !process.env.OP_SITE_API_KEY || !process.env.OP_CLIENT_ID_FOR_RP || !process.env.OP_CLIENT_SECRET_FOR_RP) {
        console.warn('WARNING: One or more critical OIDC/API keys are missing in your .env file! The application may not function correctly.');
    }
});
```

### 5.1. `data/candies.json`

Create this file with your candy data:

```json
[
    {
        "id": "c1",
        "name": "Rainbow Lollipop Swirl",
        "imageUrl": "/images/candy1.png",
        "price": 2.50,
        "type": "regular",
        "description": "A vibrant swirl of fruity delight that will make your taste buds dance with joy!"
    },
    {
        "id": "c2",
        "name": "Velvet Choco Dream Bar",
        "imageUrl": "/images/candy2.png",
        "price": 3.75,
        "type": "regular",
        "description": "Luxuriously creamy milk chocolate embracing a dreamy, gooey caramel core."
    },
    {
        "id": "s1",
        "name": "Golden Gummy Gem (Club)",
        "imageUrl": "/images/special_candy1.png",
        "price": 5.99,
        "type": "special_club",
        "description": "An exclusive golden gummy bear, sparkling with edible glitter. A treasure for club members only!"
    },
    {
        "id": "s2",
        "name": "Mystic Truffle Elixir (Club)",
        "imageUrl": "/images/special_candy2.png",
        "price": 7.25,
        "type": "special_club",
        "description": "A rich, dark chocolate truffle infused with a hint of exotic raspberry. A luxurious treat for our valued members."
    }
]
```

-----

## Section 6: Running and Testing the Application

1.  **Fill `.env`:** Ensure all `YOUR_...` placeholders in your `.env` file are correctly filled with your SAP CDC site details.
2.  **Start the Server:**
    ```bash
    npm start
    ```
    You should see `Vikis Sweets Shop listening at http://localhost:3000`.
3.  **Test the OIDC Flow:**
      * Open your browser and go to `http://localhost:3000/login.html`.
      * The SAP CDC login screen-set should appear.
      * Click the "Login with Company Account" (or similarly named OIDC) button.
      * You should be redirected to your OP Site's login page.
      * Log in with a test user account from your OP site.
      * After successful authentication at the OP, you should be redirected back to your Node.js app's `/auth/callback`.
      * The backend will exchange the code for tokens and then redirect you to `/catalog.html` with `access_token` (and `refresh_token`) in the URL parameters.
      * The `catalog.html` JavaScript should pick these up and store them in `clientCatalogConfig`.
4.  **Test Conditional Features:**
      * **Club Member Candies:**
          * Log in with a user who is *not* a club member (\<code\>data.isSweetShopClubMember\</code\> is `false` or not set on their RP profile). Special candies should be hidden.
          * Log in with a user who *is* a club member. Special candies should be visible.
      * **"Send Candy to a Friend" Button:**
          * Log in with a user who is *not* an "SAP CDC Org Member" (\<code\>data.isSAPCDCOrgMember\</code\> is `false`). The button should be hidden.
          * Log in with a user who *is* an "SAP CDC Org Member". The button should be visible. Test opening and canceling the form.
5.  **Test "Show Profile" Button:**
      * After logging in via OIDC, the "Show Profile" button should appear.
      * Clicking it should call the OIDC `getUserInfo` endpoint using the stored `access_token` and display the returned JSON.
6.  **Test Logout:**
      * Click the "Logout" link. You should be logged out of the RP site and ideally redirected to the login page after backend processing.

-----

## Section 7: Key Considerations and Next Steps

  * **Token Security:**
      * The method used here (passing tokens in URL parameters for client-side JS to pick up) is for demonstration, especially to allow the client to directly call `getUserInfo`.
      * **Access Tokens:** If client-accessible, they should be short-lived.
      * **Refresh Tokens:** **Never store refresh tokens in client-side JavaScript accessible storage (like `localStorage` or global JS variables) in a production environment.** They are powerful credentials. They should be stored securely, ideally server-side (e.g., in an `HttpOnly`, `Secure` cookie or a backend database associated with a server session).
      * For web applications, consider using the **Backend for Frontend (BFF)** pattern or storing tokens in `HttpOnly`, `Secure` cookies managed by the server. This prevents XSS attacks from stealing tokens.
  * **ID Token Validation:** The `id_token` received during the token exchange should be validated on the backend (check signature, issuer, audience, expiry, nonce if used).
  * **State Parameter:** Implement and validate the `state` parameter in the OIDC flow to prevent Cross-Site Request Forgery (CSRF) attacks. The `server.js` has a placeholder comment for this.
  * **Error Handling:** Add more robust error handling on both client and server sides. Display user-friendly error messages.
  * **HTTPS:** In production, always use HTTPS. Set `cookie: { secure: true }` for sessions.
  * **Refresh Token Flow:** Implement a backend endpoint (e.g., `/auth/refresh-token`) that uses the `refresh_token` (if stored securely server-side) to get a new `access_token` from the OP.
  * **OIDC Single Log-Out (SLO):** For a complete logout experience, implement SLO by redirecting to the OP's `end_session_endpoint` with appropriate parameters (like `id_token_hint` and `post_logout_redirect_uri`).
  * **Production Deployment:** Consider hosting platforms like SAP BTP Cloud Foundry, Heroku, AWS Elastic Beanstalk, Azure App Service, etc. Securely manage environment variables on the platform.
  * **SAP CDC Proxy Page:** For production, correctly configure and host the SAP CDC proxy page if required by your data center/setup, especially for cross-domain scenarios or ITP/ETP browser restrictions.
