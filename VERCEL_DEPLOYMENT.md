# Price Database — Vercel deployment

## Architecture
- React + Vite frontend is built into `dist/`.
- Express API is exported as a Vercel Serverless Function from `api/index.ts`.
- Firebase Google sign-in returns a Firebase ID token. The backend verifies it with Firebase Admin.
- Google Sheets and Drive requests run server-side with `GOOGLE_SERVICE_ACCOUNT_JSON`.
- Employee accounts never receive Google Sheets credentials or direct spreadsheet access.

## Required Vercel Environment Variables
Set these in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if needed):

1. `FIREBASE_PROJECT_ID` = `gen-lang-client-0583332366` (must match `firebase-applet-config.json`).
2. `GOOGLE_SERVICE_ACCOUNT_JSON` = the complete JSON key for a service account belonging to that Firebase/Google Cloud project. Paste the JSON as one value.
3. `SPREADSHEET_ID` = the ID of the private Google Spreadsheet.
4. `SUPER_ADMIN_EMAIL` = the administrator's exact Google email.

Then redeploy.

## Google Cloud / Sheets setup
1. Enable **Google Sheets API** and **Google Drive API** in the service account's Google Cloud project.
2. Create/download a service-account JSON key. Keep it server-side only.
3. Copy its `client_email`.
4. Open the central Google Spreadsheet → Share → add that service-account `client_email` as **Editor**.
5. Do not share the spreadsheet with Employee accounts.
6. The configured `SUPER_ADMIN_EMAIL` must have direct Editor access to the spreadsheet in the browser. When the app creates a new spreadsheet, the code attempts to share it with the Super Admin only.

## Firebase setup
1. Firebase Console → Authentication → Sign-in method → enable Google.
2. Authentication → Settings → Authorized domains → add `rrd-database.vercel.app`.
3. Ensure the service account JSON belongs to the same Firebase project ID shown in `firebase-applet-config.json`.

## Deploy
- Commit `vercel.json`, `api/index.ts`, and the updated source files.
- Import/connect the GitHub repository in Vercel.
- Framework preset: Other (or Vite if detected); Build Command: `npm run build`; Output Directory: `dist`.
- Vercel should detect `api/index.ts` as a Node serverless function.

## Important limitations / notes
- Vercel instances are ephemeral. `SPREADSHEET_ID` should be set in Vercel Environment Variables. The Admin "configure spreadsheet" action updates the current warm instance only; after changing the spreadsheet, update `SPREADSHEET_ID` in Vercel and redeploy to make it persistent.
- The existing app uses in-memory arrays as a fallback/cache. Those arrays are not durable on Vercel. Google Sheets must be reachable; do not rely on mock/in-memory data for production records.
- Google Sheets API failures are currently logged and some existing routes may still return cached data. Verify writes in the spreadsheet after initial deployment.
- Vercel request body limits can affect large base64 image uploads. Keep product images small.
- Do not commit service-account JSON, `.env`, or private credentials.
