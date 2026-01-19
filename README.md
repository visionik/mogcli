# mic

A command-line interface for Microsoft 365, powered by Microsoft Graph API.

Like [gog](https://gogcli.sh) but for Microsoft.

## Features

- 📧 **Mail** — Search, send, reply, drafts
- 📅 **Calendar** — Events, create, delete
- 📁 **Drive** — OneDrive files, search, upload, download
- 👥 **Contacts** — List, search contacts
- ✅ **To-Do** — Tasks, lists, complete, delete

## Quick Start

```bash
# Install
cd mic && npm link

# Authenticate (one-time)
mic auth login --client-id YOUR_CLIENT_ID

# Use it
mic mail search "from:boss"
mic cal list
mic drive ls
mic todo tasks
```

## Setup

### 1. Register an Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name:** `mic-cli`
   - **Supported account types:** "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI:** Leave blank
5. Click **Register**
6. Copy the **Application (client) ID**

### 2. Configure API Permissions

In your app registration, go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**:

- `Mail.ReadWrite`
- `Mail.Send`
- `Calendars.ReadWrite`
- `Files.ReadWrite.All`
- `Contacts.Read`
- `People.Read`
- `Tasks.ReadWrite`
- `User.Read`
- `offline_access`

### 3. Enable Public Client Flow

1. Go to **Authentication**
2. Under **Advanced settings**, set **Allow public client flows** to **Yes**
3. Click **Save**

### 4. Install

```bash
cd mic
npm install
npm link
```

## Usage

### Authentication

```bash
mic auth login --client-id YOUR_CLIENT_ID
mic auth status
mic auth logout
```

### Mail

```bash
# Search
mic mail search "subject:meeting"
mic mail search "from:alice" --max 10
mic mail search "has:attachment" --folder Inbox

# Send
mic mail send --to bob@example.com --subject "Hello" --body "Hi Bob!"
mic mail send --to bob@example.com --subject "Report" --body-file ./report.txt
mic mail send --to bob@example.com --subject "HTML" --body-html "<h1>Hello</h1>"

# Multi-line via stdin
mic mail send --to bob@example.com --subject "Notes" --body-file - <<EOF
Hi Bob,

Here are my notes.

Best,
Alice
EOF

# Read message
mic mail get MESSAGE_ID

# List folders
mic mail folders
```

### Calendar

```bash
# List events
mic cal list
mic cal list --from 2026-01-20T00:00:00 --to 2026-01-27T00:00:00

# Create event
mic cal create --subject "Team Sync" --start 2026-01-20T10:00:00 --end 2026-01-20T11:00:00
mic cal create --subject "Lunch" --start 2026-01-20T12:00:00 --end 2026-01-20T13:00:00 --location "Cafe"

# View event
mic cal get EVENT_ID

# Delete event
mic cal delete EVENT_ID

# List calendars
mic cal calendars
```

### Drive (OneDrive)

```bash
# List files
mic drive ls
mic drive ls /Documents
mic drive ls FOLDER_ID

# Search
mic drive search "report"
mic drive search "*.pdf"

# Download
mic drive download ITEM_ID --out ./file.pdf

# Upload
mic drive upload ./report.pdf
mic drive upload ./data.xlsx --folder FOLDER_ID

# Create folder
mic drive mkdir "New Folder"
mic drive mkdir "Subfolder" --parent FOLDER_ID

# Delete
mic drive rm ITEM_ID
```

### Contacts

```bash
# List
mic contacts list
mic contacts list --max 100

# Search
mic contacts search "alice"
mic contacts search "example.com"

# View
mic contacts get CONTACT_ID
```

### To-Do

```bash
# Lists
mic todo lists

# Tasks
mic todo tasks
mic todo tasks "Shopping"
mic todo tasks --all  # Include completed

# Add
mic todo add "Buy milk"
mic todo add "Call Bob" --due tomorrow
mic todo add "Meeting prep" --due monday --important
mic todo add "Groceries" --list "Shopping"

# Complete
mic todo complete TASK_ID
mic todo done TASK_ID

# Delete
mic todo delete TASK_ID
mic todo rm TASK_ID
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MIC_CLIENT_ID` | Azure AD application client ID |

## JSON Output

All commands support `--json` for machine-readable output:

```bash
mic mail search "test" --json
mic cal list --json
mic drive ls --json
mic contacts list --json
mic todo tasks --json
```

## Token Storage

Tokens are stored in `~/.config/mic/tokens.json`. Refresh tokens are used automatically.

## Comparison with gog

| gog | mic | Notes |
|-----|-----|-------|
| `gog gmail search` | `mic mail search` | |
| `gog gmail send` | `mic mail send` | |
| `gog calendar events` | `mic cal list` | |
| `gog calendar create` | `mic cal create` | Uses `--subject` not `--summary` |
| `gog drive list` | `mic drive ls` | |
| `gog drive upload` | `mic drive upload` | |
| `gog contacts list` | `mic contacts list` | |
| N/A | `mic todo` | Microsoft To-Do |

## License

MIT
