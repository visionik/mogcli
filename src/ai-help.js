/**
 * AI Help content following dashdash specification.
 * https://github.com/visionik/dashdash
 */

export const AI_HELP_CONTENT = `---
abt: https://github.com/visionik/dashdash
sub: true
ver: https://github.com/visionik/dashdash/blob/main/README.md#v1.0.0
acl: interact
web: https://outlook.com
cli: none
mcp: none
api: https://learn.microsoft.com/en-us/graph/api/overview
---

# mog - Microsoft Graph CLI

CLI for Microsoft 365: Mail, Calendar, OneDrive, To-Do, Contacts.

Modeled after \`gog\` (Google Workspace CLI) for consistent patterns.

## Overview

mog provides command-line access to Microsoft 365 services via Microsoft Graph API:
- **mail** - Outlook mail (search, send, folders)
- **cal** - Outlook calendar (events, create, delete)
- **drive** - OneDrive files (list, search, upload, download)
- **todo** - Microsoft To-Do tasks (lists, add, complete)
- **contacts** - People and contacts (list, search)

## Setup/Prerequisites

### 1. Create Azure AD App

1. Go to https://portal.azure.com → App registrations → New registration
2. Name: "mog CLI" (or any name)
3. Supported account types: "Personal Microsoft accounts only" (or include org accounts)
4. Redirect URI: Leave blank (uses device code flow)

### 2. Add API Permissions

In your app registration, add these **Delegated** permissions:
- \`User.Read\` - Sign in and read user profile
- \`offline_access\` - Maintain access (refresh tokens)
- \`Mail.ReadWrite\` - Read and write mail
- \`Mail.Send\` - Send mail
- \`Calendars.ReadWrite\` - Full calendar access
- \`Files.ReadWrite.All\` - Full OneDrive access
- \`Contacts.Read\` - Read contacts
- \`People.Read\` - Read people
- \`Tasks.ReadWrite\` - Read and write tasks

### 3. Authenticate

\`\`\`bash
mog auth login --client-id YOUR_CLIENT_ID
\`\`\`

Opens browser for Microsoft login. Tokens stored at \`~/.config/mog/tokens.json\`.

### 4. Verify

\`\`\`bash
mog auth status
\`\`\`

## Slug System

Microsoft Graph uses very long GUIDs (100+ characters). mog generates 8-character slugs:

\`\`\`
Full:  AQMkADAwATMzAGZmAS04MDViLTRiNzgt...
Slug:  a3f2c891
\`\`\`

**Behavior:**
- All commands output slugs by default
- All commands accept either slugs or full IDs
- Slugs cached in \`~/.config/mog/slugs.json\`
- Use \`--verbose\` to also see full IDs
- \`mog auth logout\` clears slug cache

## Command Reference

### Global Options

| Option | Description |
|--------|-------------|
| \`--json\` | Output JSON to stdout (best for scripting) |
| \`--plain\` | Output stable, parseable text (TSV; no colors) |
| \`--verbose\` | Show full IDs and extra details |
| \`--force\` | Skip confirmations for destructive commands |
| \`--no-input\` | Never prompt; fail instead (CI mode) |
| \`--help\` | Show help for command |

### Mail Commands

| Command | Description |
|---------|-------------|
| \`mog mail search <query>\` | Search messages |
| \`mog mail get <messageId>\` | Get message content |
| \`mog mail send\` | Send an email |
| \`mog mail folders\` | List mail folders |

**mail search options:**
- \`--max <n>\` - Maximum results (default: 25)
- \`--folder <id>\` - Mail folder ID or slug

**mail send options:**
- \`--to <email>\` - Recipient (required, comma-separated for multiple)
- \`--subject <text>\` - Subject (required)
- \`--body <text>\` - Plain text body
- \`--body-file <path>\` - Read body from file (use \`-\` for stdin)
- \`--body-html <html>\` - HTML body
- \`--cc <email>\` - CC recipients
- \`--bcc <email>\` - BCC recipients
- \`--reply-to-message-id <id>\` - Reply to message

### Calendar Commands

| Command | Description |
|---------|-------------|
| \`mog cal list\` | List upcoming events |
| \`mog cal create\` | Create an event |
| \`mog cal get <eventId>\` | Get event details |
| \`mog cal delete <eventId>\` | Delete an event |
| \`mog cal calendars\` | List calendars |

**cal list options:**
- \`--from <iso>\` - Start date (ISO format, or: today, tomorrow, monday)
- \`--to <iso>\` - End date
- \`--max <n>\` - Maximum results (default: 25)
- \`--calendar <id>\` - Calendar ID or slug

**cal create options:**
- \`--summary <text>\` - Event title (required)
- \`--from <iso>\` - Start time (required)
- \`--to <iso>\` - End time (required)
- \`--description <text>\` - Event description
- \`--location <text>\` - Event location
- \`--calendar <id>\` - Calendar ID
- \`--attendees <emails>\` - Attendee emails (comma-separated)

### Drive Commands

| Command | Description |
|---------|-------------|
| \`mog drive ls [path]\` | List files and folders |
| \`mog drive search <query>\` | Search files |
| \`mog drive download <itemId>\` | Download a file |
| \`mog drive upload <localPath>\` | Upload a file |
| \`mog drive mkdir <name>\` | Create a folder |
| \`mog drive rm <itemId>\` | Delete file or folder |

**drive ls options:**
- \`--max <n>\` - Maximum results (default: 50)

**drive download options:**
- \`--out <path>\` - Output file path (required)

**drive upload options:**
- \`--folder <id>\` - Destination folder ID or slug
- \`--name <name>\` - Remote file name

**drive mkdir options:**
- \`--parent <id>\` - Parent folder ID or slug

### Contacts Commands

| Command | Description |
|---------|-------------|
| \`mog contacts list\` | List contacts |
| \`mog contacts search <query>\` | Search contacts |
| \`mog contacts get <contactId>\` | Get contact details |

**contacts list/search options:**
- \`--max <n>\` - Maximum results (default: 50/25)

### To-Do Commands

| Command | Description |
|---------|-------------|
| \`mog todo lists\` | List all task lists |
| \`mog todo list [listId]\` | List tasks in a list |
| \`mog todo add <title>\` | Add a new task |
| \`mog todo done <taskId>\` | Mark task complete |
| \`mog todo delete <taskId>\` | Delete a task |

**todo list options:**
- \`--all\` - Include completed tasks

**todo add options:**
- \`--list <name|id>\` - Task list name or ID/slug
- \`--due <date>\` - Due date (see Date Formats below)
- \`--notes <text>\` - Task notes
- \`--important\` - Mark as important

**todo done/delete options:**
- \`--list <name|id>\` - Task list name or ID/slug

## Date/Time Formats

### ✅ SUPPORTED DATE FORMATS

**Relative dates (for --due):**
- \`today\` - Today
- \`tomorrow\` - Tomorrow
- \`monday\`, \`tuesday\`, etc. - Next occurrence of that day
- \`next week\` - 7 days from now
- \`+3d\` or \`+3days\` - N days from now

**ISO dates:**
- \`2025-01-15\` - Date only
- \`2025-01-15T10:00:00\` - Date and time (local timezone)
- \`2025-01-15T10:00:00Z\` - UTC

### ❌ UNSUPPORTED DATE FORMATS

- \`Jan 15, 2025\` - Use ISO format instead
- \`15/01/2025\` - Ambiguous, use ISO format
- \`in 3 days\` - Use \`+3d\` instead

## Output Formats

⚠️ **Best Practice: Always Use --json for Programmatic Access**

\`\`\`bash
# ✅ RECOMMENDED for scripting/parsing:
mog mail search "from:boss" --json
mog todo list --json

# ❌ NOT RECOMMENDED for parsing (colors, formatting):
mog mail search "from:boss"
\`\`\`

**JSON output includes:**
- Full Microsoft Graph response data
- All fields, not just displayed ones
- Consistent structure for parsing

## Examples

### Mail

\`\`\`bash
# Search recent mail
mog mail search "*" --max 10

# Search by sender
mog mail search "from:john@example.com"

# Read a message (using slug)
mog mail get a3f2c891

# Send plain text email
mog mail send --to bob@example.com --subject "Hello" --body "Hi Bob!"

# Send with body from file
mog mail send --to bob@example.com --subject "Report" --body-file ./report.txt

# Send HTML email
mog mail send --to bob@example.com --subject "Hello" --body-html "<p>Hi <b>Bob</b>!</p>"

# Reply to a message
mog mail send --to bob@example.com --subject "Re: Hello" --body "Thanks!" --reply-to-message-id a3f2c891
\`\`\`

### Calendar

\`\`\`bash
# List upcoming events
mog cal list

# List events for date range
mog cal list --from 2025-01-01 --to 2025-01-31

# Create an event
mog cal create --summary "Team Meeting" --from 2025-01-15T10:00:00 --to 2025-01-15T11:00:00

# Create with location and attendees
mog cal create --summary "Lunch" --from 2025-01-15T12:00:00 --to 2025-01-15T13:00:00 \\
  --location "Cafe" --attendees "alice@example.com,bob@example.com"

# Delete an event
mog cal delete a3f2c891
\`\`\`

### Drive

\`\`\`bash
# List root folder
mog drive ls

# List specific folder
mog drive ls /Documents

# Search files
mog drive search "report"

# Download a file
mog drive download a3f2c891 --out ./downloaded.pdf

# Upload a file
mog drive upload ./document.pdf

# Upload to specific folder
mog drive upload ./document.pdf --folder b2d4e6f8 --name "renamed.pdf"

# Create folder
mog drive mkdir "New Folder"

# Delete file
mog drive rm a3f2c891
\`\`\`

### To-Do

\`\`\`bash
# List all task lists
mog todo lists

# List tasks in default list
mog todo list

# List tasks in specific list (by slug or name)
mog todo list b4c5984b
mog todo list Shopping

# Include completed tasks
mog todo list --all

# Add a task
mog todo add "Buy milk"

# Add with due date
mog todo add "Call mom" --due tomorrow

# Add to specific list with importance
mog todo add "Review PR" --list Work --due monday --important

# Complete a task
mog todo done a3f2c891

# Delete a task
mog todo delete a3f2c891
\`\`\`

### Contacts

\`\`\`bash
# List all contacts
mog contacts list

# Search contacts
mog contacts search "john"

# Get contact details
mog contacts get a3f2c891
\`\`\`

## Troubleshooting

### Error: "Token expired"

Tokens auto-refresh, but if you see this error:
\`\`\`bash
mog auth logout
mog auth login --client-id YOUR_CLIENT_ID
\`\`\`

### Error: "Invalid request" with slug

The slug might not be in the cache. Use the full ID or re-run the list command to populate the cache.

### Error: "Insufficient privileges"

Your Azure AD app is missing required permissions. Check the Setup section and add missing scopes.

### Error: "Resource not found"

The ID (or slug) doesn't exist, or you don't have permission to access it.

## Rate Limits

Microsoft Graph API rate limits:
- **Per user:** 10,000 requests per 10 minutes
- **Per app:** Varies by tenant

**Handling:**
- mog does not currently implement automatic retry
- If rate limited, wait and retry manually

## gog Compatibility

mog follows gog (Google Workspace CLI) patterns where applicable:

| Feature | mog | gog |
|---------|-----|-----|
| Calendar title | \`--summary\` | \`--summary\` |
| Calendar time | \`--from\`, \`--to\` | \`--from\`, \`--to\` |
| Task notes | \`--notes\` | \`--notes\` |
| Output format | \`--json\`, \`--plain\` | \`--json\`, \`--plain\` |
| Max results | \`--max\` | \`--max\` |
| Verbose | \`--verbose\` | \`--verbose\` |

## Configuration

| File | Purpose |
|------|---------|
| \`~/.config/mog/tokens.json\` | OAuth tokens (sensitive) |
| \`~/.config/mog/settings.json\` | Client ID and settings |
| \`~/.config/mog/slugs.json\` | ID-to-slug mappings |

## Environment Variables

| Variable | Description |
|----------|-------------|
| \`MOG_CLIENT_ID\` | Azure AD client ID (alternative to --client-id) |

## Quick Reference Card

| Task | Command |
|------|---------|
| Search mail | \`mog mail search "query"\` |
| Send email | \`mog mail send --to X --subject Y --body Z\` |
| List events | \`mog cal list\` |
| Create event | \`mog cal create --summary X --from Y --to Z\` |
| List files | \`mog drive ls\` |
| Upload file | \`mog drive upload ./file.pdf\` |
| Download file | \`mog drive download ID --out ./file.pdf\` |
| List tasks | \`mog todo list\` |
| Add task | \`mog todo add "title"\` |
| Complete task | \`mog todo done ID\` |
| List contacts | \`mog contacts list\` |

## Negative Examples

### ❌ DO NOT

\`\`\`bash
# Wrong: --subject for calendar (use --summary)
mog cal create --subject "Meeting" --from ... --to ...

# Wrong: --start/--end for calendar (use --from/--to)
mog cal create --summary "Meeting" --start 2025-01-15 --end 2025-01-15

# Wrong: --note singular for tasks (use --notes)
mog todo add "Task" --note "Details"

# Wrong: --limit for max results (use --max)
mog mail search "query" --limit 10
\`\`\`

### ✅ CORRECT

\`\`\`bash
mog cal create --summary "Meeting" --from 2025-01-15T10:00:00 --to 2025-01-15T11:00:00
mog todo add "Task" --notes "Details"
mog mail search "query" --max 10
\`\`\`

## Exit Codes

| Code | Meaning |
|------|---------|
| \`0\` | Success |
| \`1\` | Error (API error, invalid input, auth failure, etc.) |

**Examples:**

\`\`\`bash
# Check if command succeeded
mog todo add "Task" && echo "Created" || echo "Failed"

# Capture exit code
mog mail send --to x@y.com --subject "Hi" --body "Hello"
if [ $? -eq 0 ]; then
  echo "Email sent"
else
  echo "Send failed"
fi
\`\`\`

## Stdin/Stdout Piping

### Reading from stdin

Use \`--body-file -\` to read message body from stdin:

\`\`\`bash
# Pipe file content
cat body.txt | mog mail send --to a@b.com --subject "Report" --body-file -

# Heredoc
mog mail send --to a@b.com --subject "Hello" --body-file - <<EOF
Hi there,

This is a multi-line message.

Best regards
EOF

# Command output
echo "Server status: $(uptime)" | mog mail send --to admin@example.com --subject "Status" --body-file -

# Generate and send
./generate-report.sh | mog mail send --to team@example.com --subject "Daily Report" --body-file -
\`\`\`

### JSON output for piping

Use \`--json\` for machine-readable output:

\`\`\`bash
# Get task IDs
mog todo list --json | jq -r '.[].id'

# Get unread mail count
mog mail folders --json | jq '.[] | select(.displayName=="Inbox") | .unreadItemCount'

# Export calendar events
mog cal list --json > events.json

# Chain commands
mog todo list --json | jq -r '.[] | select(.importance=="high") | .title'
\`\`\`

### Combining stdin and stdout

\`\`\`bash
# Process and forward
mog mail search "report" --json | jq '.[0].id' | xargs -I{} mog mail get {}

# Batch operations
mog todo list --json | jq -r '.[].id' | while read id; do
  mog todo done "$id"
done
\`\`\`

## Interactive Mode / TTY Detection

mog does **not** currently implement TTY detection for interactive mode.

**Behavior:**
- All commands work identically in terminal and non-terminal contexts
- No interactive prompts (use \`--force\` to skip confirmations)
- No progress bars or spinners (safe for piping)

**CI/Automation best practices:**

\`\`\`bash
# Always use --json for parsing
mog mail search "query" --json

# Use --force to skip any confirmations
mog drive rm a3f2c891 --force

# Use --no-input to fail instead of prompting
mog auth login --client-id $CLIENT_ID --no-input
\`\`\`

**Environment hints:**

\`\`\`bash
# Disable colors in non-TTY contexts
NO_COLOR=1 mog mail search "query"

# Or use --plain for stable output
mog todo list --plain
\`\`\`
`;

export function printAiHelp() {
  console.log(AI_HELP_CONTENT);
}
