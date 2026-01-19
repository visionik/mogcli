# mog — Microsoft Graph CLI

A command-line interface for Microsoft 365: Mail, Calendar, OneDrive, To-Do, and Contacts.

Modeled after [gog](https://github.com/slashbaseide/gog) for consistent patterns across Google and Microsoft CLIs.

## Features

- **Mail** — Search, send, drafts, attachments, folders
- **Calendar** — Events, create, update, delete, respond to invites
- **OneDrive** — List, search, upload, download, move, rename, copy
- **To-Do** — Tasks, lists, add, update, complete, undo
- **Contacts** — List, search, create, update, delete

**Extras:**
- **Slug system** — 8-character shorthand for Microsoft's long GUIDs
- **AI-friendly** — `--ai-help` outputs comprehensive documentation for LLMs
- **gog-compatible** — Same flags and patterns where applicable

## Installation

```bash
# Clone the repo
git clone https://github.com/visionik/mogcli.git
cd mogcli

# Install dependencies
npm install

# Link globally
npm link
```

## Setup

### 1. Create an Azure AD App

1. Go to [Azure Portal](https://portal.azure.com) → **App registrations** → **New registration**
2. Name: `mog CLI` (or any name)
3. Supported account types: Select based on your needs
4. Redirect URI: Leave blank (uses device code flow)

### 2. Add API Permissions

Add these **Delegated** permissions:

| Permission | Description |
|------------|-------------|
| `User.Read` | Sign in and read user profile |
| `offline_access` | Maintain access (refresh tokens) |
| `Mail.ReadWrite` | Read and write mail |
| `Mail.Send` | Send mail |
| `Calendars.ReadWrite` | Full calendar access |
| `Files.ReadWrite.All` | Full OneDrive access |
| `Contacts.Read` | Read contacts |
| `Contacts.ReadWrite` | Full contacts access |
| `People.Read` | Read people |
| `Tasks.ReadWrite` | Read and write tasks |

### 3. Authenticate

```bash
mog auth login --client-id YOUR_CLIENT_ID
```

This opens a browser for Microsoft login. Tokens are stored at `~/.config/mog/tokens.json`.

### 4. Verify

```bash
mog auth status
```

## Usage

### Global Options

```
--json       Output JSON (best for scripting)
--plain      Stable text output (TSV, no colors)
--verbose    Show full IDs and extra details
--force      Skip confirmations
--no-input   Never prompt (CI mode)
--ai-help    Comprehensive docs for LLMs
```

### Mail

```bash
mog mail search "from:someone"          # Search messages
mog mail search "*" --max 10            # Recent messages
mog mail get <id>                       # Read a message
mog mail send --to a@b.com --subject "Hi" --body "Hello"
mog mail folders                        # List folders

# Drafts
mog mail drafts list
mog mail drafts create --to a@b.com --subject "Draft" --body "..."
mog mail drafts send <draftId>
mog mail drafts delete <draftId>

# Attachments
mog mail attachment list <messageId>
mog mail attachment download <messageId> <attachmentId> --out ./file.pdf
```

### Calendar

```bash
mog cal list                            # Upcoming events
mog cal list --from 2025-01-01 --to 2025-01-31
mog cal calendars                       # List calendars

mog cal create --summary "Meeting" \
  --from 2025-01-15T10:00:00 \
  --to 2025-01-15T11:00:00

mog cal update <eventId> --summary "New Title"
mog cal get <eventId>
mog cal delete <eventId>

# Respond to invites
mog cal respond <eventId> accept
mog cal respond <eventId> decline --comment "Can't make it"
mog cal respond <eventId> tentative
```

### OneDrive

```bash
mog drive ls                            # Root folder
mog drive ls /Documents                 # Specific path
mog drive search "report"               # Search files
mog drive get <itemId>                  # File metadata

mog drive download <itemId> --out ./file.pdf
mog drive upload ./doc.pdf
mog drive upload ./doc.pdf --folder <folderId> --name "renamed.pdf"

mog drive mkdir "New Folder"
mog drive move <itemId> <destinationId>
mog drive rename <itemId> "new-name.pdf"
mog drive copy <itemId> --name "copy.pdf"
mog drive rm <itemId>
```

### To-Do

```bash
mog todo lists                          # List task lists
mog todo list                           # Tasks in default list
mog todo list <listId>                  # Tasks in specific list
mog todo list --all                     # Include completed

mog todo add "Buy milk"
mog todo add "Call mom" --due tomorrow --notes "Birthday planning"
mog todo add "Review PR" --list Work --due monday --important

mog todo update <taskId> --title "New title" --due friday
mog todo done <taskId>
mog todo undo <taskId>
mog todo delete <taskId>
```

### Contacts

```bash
mog contacts list
mog contacts search "john"
mog contacts get <contactId>

mog contacts create --name "John Doe" --email "john@example.com" --phone "555-1234"
mog contacts update <contactId> --email "new@example.com"
mog contacts delete <contactId>
```

## Slugs

Microsoft Graph uses very long GUIDs. mog generates 8-character slugs for convenience:

```
Full:  AQMkADAwATMzAGZmAS04MDViLTRiNzgt...
Slug:  a3f2c891
```

- All commands output slugs by default
- All commands accept either slugs or full IDs
- Use `--verbose` to also see full IDs
- Slugs are cached in `~/.config/mog/slugs.json`
- `mog auth logout` clears the cache

## For AI Agents

Run `mog --ai-help` for comprehensive, machine-readable documentation including:

- All commands and options
- Date/time format specifications
- Positive and negative examples
- Exit codes and piping patterns
- Troubleshooting guide

This follows the [dashdash](https://github.com/visionik/dashdash) specification.

## Configuration

| File | Purpose |
|------|---------|
| `~/.config/mog/tokens.json` | OAuth tokens (sensitive) |
| `~/.config/mog/settings.json` | Client ID and settings |
| `~/.config/mog/slugs.json` | ID-to-slug cache |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MOG_CLIENT_ID` | Azure AD client ID (alternative to --client-id) |

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run fmt

# All checks
npm run check
```

## License

MIT
