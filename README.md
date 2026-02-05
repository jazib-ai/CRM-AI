# NexoGenix CRM - Desktop Application

A powerful, secure, and installable CRM desktop application built with Electron and SQLite.

## Features

- ✅ **Installable Desktop App** - Windows, Mac, and Linux support
- 🔐 **Secure Local Database** - SQLite with encryption
- 👤 **Multi-User Support** - Role-based access control
- 📊 **Contact Management** - Track contacts, companies, and deals
- 👔 **HRMS Module** - Manage client engagements and resources
- 💾 **Automatic Backups** - Never lose your data
- 📤 **Import/Export** - JSON data portability

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Development Mode

Run the application in development mode:

```bash
npm start
```

### Build Installers

Build installers for your platform:

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# All platforms
npm run build
```

The installers will be created in the `dist/` directory.

## First Run Setup

When you launch NexoGenix for the first time, you'll be guided through a setup wizard:

1. **Welcome** - Introduction to the application
2. **Database Location** - Choose where to store your data
   - Default: `%APPDATA%/NexoGenix/data` (Windows)
   - Default: `~/Library/Application Support/NexoGenix/data` (Mac)
   - Default: `~/.config/NexoGenix/data` (Linux)
   - Custom: Choose any folder on your computer
3. **Admin Account** - Create your administrator account
   - Full Name
   - Email Address
   - Password (minimum 8 characters)
4. **Complete** - Launch the application

## Database Security

- **Encryption**: All data is stored in an encrypted SQLite database
- **Password Hashing**: User passwords are hashed using bcrypt
- **File Permissions**: Database files are protected with user-only access
- **Automatic Backups**: Backups are created hourly in `.backups` folder
- **Data Protection**: Data is never automatically deleted

## Usage

### Login

After setup, use your admin credentials to log in.

### Managing Data

- **Contacts**: Add, edit, and track customer contacts
- **Companies**: Organize contacts by company
- **HRMS**: Manage client engagements and resource allocation
- **Activities**: Log calls, emails, and notes

### Backup & Restore

- **Automatic Backups**: Created every hour
- **Manual Backup**: Settings → Backup Database
- **Export**: Export all data to JSON
- **Import**: Import data from JSON file

### Multi-User

Admins can create additional users:
1. Go to Settings
2. Click "Add User"
3. Enter user details and assign role
4. Share credentials with the new user

## Database Location

Your database is stored at the location you chose during setup. To find it:

1. Open the application
2. Go to Settings
3. Look for "Database Location"

**Important**: Keep this location backed up regularly!

## Troubleshooting

### Can't Login

- Ensure you're using the correct email and password
- Password is case-sensitive
- Try resetting the application (see below)

### Database Errors

- Check that the database file exists at the configured location
- Ensure you have write permissions to the database folder
- Try restoring from a backup

### Reset Application

To completely reset the application:

1. Close the application
2. Delete the database file
3. Delete the config file:
   - Windows: `%APPDATA%/nexogenix-crm/config.json`
   - Mac: `~/Library/Application Support/nexogenix-crm/config.json`
   - Linux: `~/.config/nexogenix-crm/config.json`
4. Restart the application - setup wizard will run again

## Development

### Project Structure

```
nexogenix-crm/
├── electron/               # Electron main process
│   ├── main.js            # Application entry point
│   ├── preload.js         # IPC bridge
│   ├── database.js        # SQLite handler
│   ├── setup-wizard.html  # Setup UI
│   └── setup-wizard.js    # Setup logic
├── js/                    # Application code
│   ├── services/          # Data and auth services
│   ├── views/             # UI views
│   └── components/        # Reusable components
├── css/                   # Stylesheets
├── build/                 # Build resources
│   └── icon.png          # Application icon
└── package.json          # Project configuration
```

### Technologies

- **Electron**: Desktop application framework
- **SQLite**: Local database
- **better-sqlite3**: SQLite bindings
- **bcrypt**: Password hashing
- **electron-store**: Configuration storage
- **electron-builder**: Installer creation

## Security Best Practices

1. **Strong Passwords**: Use passwords with 12+ characters
2. **Regular Backups**: Export your data weekly
3. **Update Regularly**: Keep the application updated
4. **Secure Location**: Store database in a secure folder
5. **User Permissions**: Only grant admin access when necessary

## Support

For issues or questions:
- Check the Troubleshooting section above
- Review the documentation
- Contact your system administrator

## License

MIT License - See LICENSE file for details

---

**NexoGenix CRM** - Powerful CRM for Modern Businesses
