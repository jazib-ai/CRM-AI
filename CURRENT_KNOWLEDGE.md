# 🧠 NexoGenix CRM: Master Technical Manual & Hosting Guide

This document provides a deep-dive into the application's architecture, data synchronization logic, and comprehensive hosting procedures.

---

## 🏗️ Technical Architecture Overview

### 1. Multi-Environment Runtime
- **Desktop (Electron)**: Uses `electron/main.js` as the main process. It manages window lifecycle and provides native capabilities via IPC (Inter-Process Communication).
- **Web (Browser)**: The app can run in any modern browser by serving the root directory. It gracefully falls back to `localStorage` if Electron IPC is unavailable.

### 2. The Storage Hierarchy
I have implemented a tiered storage system to ensure speed and reliability:

| Layer | Technology | Primary Role |
| :--- | :--- | :--- |
| **UI State** | `window.NexoGenix.data` | In-memory cache for instant UI renders. |
| **Local Persistent** | SQLite (Electron) / LocalStorage (Web) | Saves data on your device for offline use. |
| **Cloud Sync** | PostgreSQL (PostgresDatabaseHandler) | Centralized source of truth for all users/devices. |

### 3. Unified Data Sync Engine (`SyncedDataStore.js`)
This is the "brain" of the application's data layer. It follows a **Write-Through** pattern:
1. **User Action**: You click "Save Contact".
2. **Local Commit**: Data is instantly saved to the local SQLite/LocalStorage. The UI updates immediately.
3. **Background Sync**: The app sends an asynchronous `POST/PUT` request to your Render server.
4. **Resilience**: If the internet is down, the background sync fails silently in the log but keeps the record locally.

---

## ☁️ Advanced Hosting Guide

### Phase 1: Database Setup (Supabase)
Supabase provides the PostgreSQL database where your "Real" records live.
1. **New Project**: Go to [Supabase](https://supabase.com).
2. **Database Settings**:
   - Go to **Settings** -> **Database**.
   - Copy the **URI Connection String** (Transaction mode, Port 5432).
   - Format: `postgresql://postgres.[YOUR-ID]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
3. **Important**: Ensure your password does not contain special characters that break URLs (like `@` or `#`).

### Phase 2: Server Deployment (Render)
The server acts as the bridge between your app and the database.
1. **Dockerfile Configuration**:
   - The project includes a `Dockerfile` that uses `node:18-slim`.
   - Render will build this automatically.
2. **Environment Variables**:
   Current Required Variables:
   - `DATABASE_URL`: Your Supabase URI.
   - `PORT`: 3000 (Render handles this automatically).
   - `NODE_ENV`: `production`.

### Phase 3: Application Configuration
1. **Connect the App**:
   - In the NexoGenix UI, navigate to **Settings** -> **Cloud Config**.
   - Input your Render Web Service URL (e.g., `https://crm-api.onrender.com`).
2. **Verification**:
   - Check the **Sync Indicator** in the top navbar.
   - A GREEN dot means "Cluster Synced" (Cloud connected).
   - A RED dot means "Local Only" (Offline or server sleeping).

---

## 🛠️ Maintenance & Troubleshooting

### Data Migration
To push your current local SQLite data to your new cloud database:
```bash
# In your terminal
export DATABASE_URL="your-supabase-uri"
node server/migrate-to-cloud.js
```

### Common Issues
- **"Server is Sleeping"**: Render's free tier spins down after 15 mins. Launching the app may show a delay while the "Sync Indicator" turns green. This is normal.
- **`ERR_DLOPEN_FAILED`**: This happens if the SQLite module wasn't built for your current environment. I have already fixed this for your current machine using `electron-rebuild`.
- **Database Connection Refused**: Ensure you are using the **Pooler** connection string from Supabase (Port 5432 or 6543) and that your password is correct.

---

## 📂 Key Files & Directories
- `electron/main.js`: Main Electron entry point.
- `server/server.js`: Cloud API layer.
- `server/database-postgres.js`: PostgreSQL connection logic.
- `js/services/SyncedDataStore.js`: The bridge between local and cloud storage.
- `js/app.js`: Application bootstrapper.
