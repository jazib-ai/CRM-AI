# NexoGenix CRM - Desktop Application

## Quick Start Guide

### Prerequisites

**You must have Node.js installed:**
- Download from: https://nodejs.org/
- Install version 18 or higher
- Verify installation: Open terminal and run `node --version`

### Installation Steps

1. **Open Terminal/Command Prompt**
   - Windows: Press `Win + R`, type `cmd`, press Enter
   - Mac: Press `Cmd + Space`, type `terminal`, press Enter
   - Linux: Press `Ctrl + Alt + T`

2. **Navigate to Project Folder**
   ```bash
   cd "c:/Users/Jazib Khan/.gemini/antigravity/playground/outer-lagoon"
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```
   This will download all required packages (may take a few minutes).

4. **Run the Application**
   ```bash
   npm start
   ```
   The application will launch and show the setup wizard.

### First Time Setup

When the application launches for the first time:

1. **Welcome Screen**
   - Click "Next"

2. **Database Location**
   - Use default location (recommended)
   - Or click "Browse..." to choose custom location
   - Click "Next"

3. **Create Admin Account**
   - Enter your full name
   - Enter your email address
   - Create a password (minimum 8 characters)
   - Confirm password
   - Click "Next"

4. **Complete**
   - Review your settings
   - Click "Launch CRM"

5. **Login**
   - Use the email and password you just created
   - Start using NexoGenix CRM!

### Building Installers (Optional)

To create installable packages:

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

Installers will be created in the `dist/` folder.

### Your Data

**Database Location:**
- Default: `%APPDATA%/NexoGenix/nexogenix.db` (Windows)
- Default: `~/Library/Application Support/NexoGenix/nexogenix.db` (Mac)
- Default: `~/.config/NexoGenix/nexogenix.db` (Linux)

**Backups:**
- Automatic backups every hour
- Located in `.backups/` folder next to database
- Manual backup: Settings → Backup Database

**Security:**
- Database is encrypted
- Passwords are hashed with bcrypt
- Data is never automatically deleted

### Troubleshooting

**"npm is not recognized"**
- Node.js is not installed or not in PATH
- Install Node.js from https://nodejs.org/
- Restart your terminal after installation

**"Cannot find module"**
- Run `npm install` again
- Make sure you're in the correct folder

**Setup wizard doesn't appear**
- Delete config file and restart:
  - Windows: `%APPDATA%/nexogenix-crm/config.json`
  - Mac: `~/Library/Application Support/nexogenix-crm/config.json`
  - Linux: `~/.config/nexogenix-crm/config.json`

**Forgot password**
- No password recovery available
- You'll need to reset the database
- Make sure to export your data first (if possible)

### Need More Help?

See [`README.md`](file:///c:/Users/Jazib%20Khan/.gemini/antigravity/playground/outer-lagoon/README.md) for detailed documentation.

---

**Enjoy using NexoGenix CRM!** 🚀
