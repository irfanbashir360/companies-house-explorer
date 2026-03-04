# Deployment Checklist for Vercel

## ✅ Local Setup Complete

Your `.env.local` file has been created with your API key. This file is gitignored and won't be committed.

## 🚀 Deploy to Vercel

### Step 1: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Key**: `COMPANIES_HOUSE_API_KEY`
   - **Value**: `your_companies_house_api_key`
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**

Important:
- Paste the value as raw text only (no quotes).
- Do not include `\n` or trailing spaces.
- Redeploy after changing environment variables.

### Step 2: Deploy

**Option A: Using Vercel CLI**
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

**Option B: Using GitHub Integration**
1. Push your code to GitHub
2. Go to Vercel Dashboard
3. Click **Add New Project**
4. Import your GitHub repository
5. Vercel will automatically detect the settings
6. Make sure to add the environment variable in Step 1
7. Click **Deploy**

## 🔒 Security Features

✅ API key is stored in environment variables (never in code)
✅ All API calls go through server-side proxy (`/api/[...path].ts`)
✅ API key never exposed to client-side code
✅ Works in both development and production

## 📁 Important Files

- `/api/[...path].ts` - Vercel serverless function (handles API in production)
- `vite.config.ts` - Vite proxy (handles API in development)
- `.env.local` - Local environment variables (gitignored)
- `vercel.json` - Vercel configuration

## 🧪 Test After Deployment

1. Visit your deployed site
2. Try searching for a company
3. If you see errors, check:
   - Environment variable is set in Vercel
   - Environment variable is available for all environments
   - Redeploy after adding environment variables

## 📝 Notes

- The API key in `.env.local` is for local development only
- The API key in Vercel environment variables is for production
- Never commit `.env.local` to git (already in `.gitignore`)
- The API route automatically handles authentication
