# 🎯 Complete Step-by-Step "Click-by-Click" Hosting Guide

This guide is designed for anyone to follow, even if you've never hosted a website before. Follow every bullet point exactly.

---

## � Phase 0: Push Files to GitHub (CRITICAL)
Before Render can see your logic, you must upload the new files I created.

1.  Open your **Terminal**.
2.  Paste these commands one by one:
    ```bash
    git add .
    git commit -m "Add Dockerfile and Cloud Sync logic"
    git push origin main
    ```
    *(If your main branch is called `master`, use `git push origin master` instead).*

---

## �🛠️ Phase 1: Create your Cloud Database (Supabase)
This is where your records will be stored forever.

1.  **Sign Up**: Go to [Supabase.com](https://supabase.com) and click **"Start your project"**.
2.  **Login**: Use your GitHub account or Email to sign in.
3.  **New Project**: Click the green **"New Project"** button.
4.  **Organization**: Click on your name (the default organization).
5.  **Project Details**:
    *   **Name**: Type `NexoGenixCRM`
    *   **Database Password**: Click **"Generate a password"**. **COPY THIS PASSWORD AND SAVE IT IN A NOTEPAD.**
    *   **Region**: Select the one closest to you (e.g., "South Asia (Mumbai)" or "East US").
    *   **Pricing Plan**: Ensure "Free" is selected.
6.  **Create**: Click **"Create new project"**.
    *   *Wait 2-3 minutes for the database to provision.*
7.  **Get your URI**:
    *   Once the dashboard loads, look at the left sidebar and click the **Gear icon (Project Settings)**.
    *   Click on **"Database"**.
    *   Scroll down to **"Connection string"**.
    *   Click the **"URI"** tab.
    *   It will look like this: `postgresql://postgres:[YOUR-PASSWORD]@aws-0-...`
    *   **Action**: Copy this entire line to your notepad.
    *   **Action**: Replace `[YOUR-PASSWORD]` with the password you saved in Step 5.

---

## 🏗️ Phase 2: Host your Server (Render)
This connects your app to your database.

1.  **GitHub**: Make sure your code is in a GitHub repository. (If you haven't done this, I can help you with commands).
2.  **Sign Up**: Go to [Render.com](https://render.com) and click **"GET STARTED"**. Sign in with GitHub.
3.  **New Service**: Click the blue **"New +"** button at the top right, then select **"Web Service"**.
4.  **Connect Repo**:
    *   You will see a list of your GitHub repositories.
    *   Find the repo for this project and click **"Connect"**.
5.  **Configuration**:
    *   **Name**: `nexogenix-server`
    *   **Region**: Select the same region you used in Supabase (e.g., Oregon or Frankfurt).
    *   **Branch**: `main`
    *   **Runtime**: Select **"Docker"**.
6.  **Environment Variables**:
    *   Scroll down to the **"Advanced"** section.
    *   Click **"Add Environment Variable"**.
    *   **Key**: `DATABASE_URL`
    *   **Value**: Paste that long URI you prepared in Phase 1 (the one with your password in it).
7.  **Deploy**: Click **"Create Web Service"** at the bottom.
    *   *Wait 5 minutes.* Render will show a console log. When you see "NexoGenix Central Server running on http://0.0.0.0:3000", it's live!
8.  **Copy URL**: At the top of the Render page (under the service name), you will see a link like `https://nexogenix-server.onrender.com`. **Copy this link.**

---

## 🔗 Phase 3: Connect your App
1.  Open your **NexoGenix Desktop App** on your computer.
2.  Log in (using `admin@nexcrm.com` / `password`).
3.  Click on **"Settings"** in the left sidebar.
4.  Find the **"Synchronization"** or **"Cloud Config"** section.
5.  **Enable Cloud Sync**: Set the toggle to ON.
6.  **Server Address**: Paste your **Render URL** (e.g., `https://nexogenix-server.onrender.com`).
7.  Click **"Save & Connect"**.
8.  Look at the top navbar. If you see a **Green Dot** or **"Cluster Synced"**, you are officially connected to the cloud!

---

## 🔄 Phase 4: Moving your local data (If needed)
If you have already added data to your desktop app and want to move it to the new cloud server:
1.  Open your terminal in the project folder.
2.  Run this exact command (Replace the URI with yours):
    ```bash
    DATABASE_URL="your_supabase_uri_here" node server/migrate-to-cloud.js
    ```
3.  Your data will "upload" to the cloud instantly.

---

### ✅ You are finished!
You now have a globally accessible, free CRM with a persistent database. Any record you add will be saved both on your computer and in the cloud.
