# Google sign-up and sign-in — Electrical Workbench

## Current scope
Google OpenID Connect login is available to the **web portal** after OAuth credentials are configured. New Google users are created at Tier 1. Returning Google users are matched by the immutable Google \`sub\` claim, not by matching email alone.

Existing password users can keep their exact username, saved projects and subscription by signing in with password, opening **Dashboard → Profile & Settings → Google sign-in**, re-entering the current password, and authorizing a Google account with the same verified email. Both password and Google then remain available. A Google-only user cannot change a password they do not have.

Native Android and Windows desktop clients currently retain their existing password login workflows. A browser's OAuth session cannot safely be assumed to authenticate native HTTP/API clients; a separate authorization-code + PKCE or authorized session-token exchange is required before claiming native support.

## Google Cloud Console (required)
1. In Google Cloud Console, select the intended project. Configure **Google Auth Platform → Branding / Audience** and publish it or add the desired Google addresses as **Test users** when in testing mode.
2. In **Clients**, create an **OAuth client ID** of type **Web application**.
3. Add this exact **Authorized redirect URI**:
   \`https://remote-javafx-portal.onrender.com/login/oauth2/code/google\`
4. If configuring an Authorized JavaScript origin, use:
   \`https://remote-javafx-portal.onrender.com\`
   (This is a server-side flow, so JS origin is not required for sign-in.)
5. Restrict scopes to \`openid\`, \`profile\` and \`email\`. Do not request access to Gmail or Drive.
6. Copy the resulting **Client ID** and **Client Secret** to the service's secret environment settings, not to GitHub, screenshots, chat, or source files.

## Render configuration (required)
On the Render workspace containing the existing \`remote-javafx-portal\` web service, set these **secret** environment variables:

- \`GOOGLE_CLIENT_ID\` — the Web application OAuth client ID.
- \`GOOGLE_CLIENT_SECRET\` — the corresponding OAuth client secret.

Redeploy the web service. Do **not** replace or reset \`DATABASE_URL\`, SMTP, Stripe, or existing application secrets. All new Google users use the current \`client_account\` table and existing PostgreSQL service.

\`application.yml\` sets \`server.forward-headers-strategy: framework\` so the HTTPS public Render host is used when Spring Security generates the callback.

## Production verification
1. In a private browser window, open \`https://remote-javafx-portal.onrender.com/api/public/auth-options\`. It should report \`"google":true\` only after both credentials are configured.
2. Open the login page and verify **Continue with Google** appears.
3. Sign up using a Google account not already associated with a local password account; verify it reaches the dashboard with Tier 1 and retains its data on next sign-in.
4. For an existing password account: sign in with password, verify Profile email is the correct Google address, use **Connect Google account**, re-enter current password, authorize Google, confirm username/tier/saved work unchanged, sign out, sign in again via Google.
5. Confirm a disabled account stays disabled; a mismatched Google email cannot silently attach itself to a password account.
6. If Google reports \`redirect_uri_mismatch\`, verify the **exact callback URI** above and the OAuth client belongs to the correct Cloud project. Check Render's public domain and no trailing slash.
7. If the button does not appear, check service environment variables without logging their secret values and confirm Google OAuth consent-screen audience/test users.

Google \`email_verified\` and \`sub\` are required; OAuth authorization state is managed by Spring Security. The code never stores a Google access token or account password in browser local storage.

## Account safety
- Google does not overwrite a password account merely because it presents the same email address.
- Existing disabled accounts cannot be re-enabled through Google sign-in.
- Google subject values have a unique database index and cannot be claimed by two local users.
- Explicit linking requires the current password and a short-lived, single-use server-session marker.
- The app uses the existing local username as the authenticated principal to preserve all project, feature and billing associations.
- Neither Google Client Secret nor Google tokens should ever be committed to this repository.
