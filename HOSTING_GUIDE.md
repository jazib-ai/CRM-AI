# 🚀 Step-by-Step Free Hosting Guide

Follow these steps to host your application in the cloud for free.

## Phase 1: Set Up Your Database (Supabase)
1. **Create Account**: Go to [Supabase.com](https://supabase.com) and sign up for a free account.
2. **New Project**: Click **New Project** and name it (e.g., `NexoGenix-DB`).
3. **Password**: Set a strong database password and **save it**.
4. **Get Connection String**:
   - Go to **Project Settings** (gear icon) -> **Database**.
   - Find the **Connection String** section.
   - Select **URI** and copy the string (it looks like `postgresql://postgres:[PASSWORD]@...`).
   - Replace `[PASSWORD]` with the password you created in step 3.

---

## Phase 2: Host Your Server (Render)
1. **Prepare GitHub**: Ensure your code is pushed to a GitHub repository.
2. **Create Account**: Sign up at [Render.com](https://render.com) (no credit card required).
3. **New Web Service**: Click **New +** -> **Web Service**.
4. **Connect GitHub**: Search for your repository and click **Connect**.
5. **Configure Settings**:
   - **Name**: `nexogenix-server`
   - **Environment**: `Docker` (Render will automatically detect your `Dockerfile`)
   - **Instance Type**: `Free`
6. **Environment Variables**:
   - Scroll down to **Advanced** -> **Add Environment Variable**.
   - **Key**: `DATABASE_URL`
   - **Value**: Paste the URI from Supabase (Phase 1, Step 4).
7. **Deploy**: Click **Create Web Service**. It will take 2-5 minutes to build.

---

## Phase 3: Connect the App
Once Render gives you a URL (e.g., `https://nexogenix-server.onrender.com`):
1. Open your Desktop App.
2. Go to **Settings** -> **Synchronization**.
3. Enable **Cloud Sync**.
4. Paste your **Render URL** into the Server Address field.
5. Click **Save & Restart**.

---

## Phase 4: Migration (Optional)
If you have local records you want to move to the cloud:
1. Open your terminal in the project folder.
2. Run this command:
   ```bash
   DATABASE_URL="your_supabase_uri" node server/migrate-to-cloud.js
   ```

> [!NOTE]
> **Important**: The Render free tier "sleeps" after 15 minutes of inactivity. When you first open the app after a break, the first sync might take 30 seconds while the server wakes up.
