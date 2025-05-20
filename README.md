# Vikis Sweets Shop

A cute candies shop demo site implementing SAP CDC (Gigya) as a Relying Party (RP) with OIDC login via another SAP CDC site (OP).

## Features
- Login via SAP CDC (Gigya) OIDC flow
- After login, see a candies catalog (no login button/text after login)
- 2 regular candies (visible to all)
- 2 special candies (visible only to "Sweet shop" club members)
- Secrets managed via `.env`
- Node.js/Express backend, static frontend

## Setup
1. Copy `.env_sample` to `.env` and fill in your SAP CDC credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Notes
- You must login via the Gigya OIDC flow to see the candies catalog.
- After login, only the candies content is shown (no login button/text).
- See `docs/gemini-guide.md` for full implementation details.