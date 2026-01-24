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

# mog — Microsoft Ops Gadget

CLI for Microsoft 365: Mail, Calendar, OneDrive, Contacts, Tasks, Word, PowerPoint, Excel, OneNote.

The Microsoft counterpart to \`gog\` (Google Ops Gadget). Same patterns, different cloud.

## Overview

mog provides command-line access to Microsoft 365 services via Microsoft Graph API:
- **mail** - Outlook mail (search, send, folders)
- **calendar** - Outlook calendar (events, create, delete, freebusy, acl)
- **drive** - OneDrive files (list, search, upload, download)
- **excel** - Excel spreadsheets (read, write, tables)
- **word** - Word documents (list, export, copy)
- **ppt** - PowerPoint presentations (list, export, copy)
- **onenote** - OneNote notebooks (notebooks, sections, pages, search)
- **tasks** - Microsoft To-Do tasks (lists, add, complete, clear)
- **contacts** - People and contacts (list, search, directory)

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
- \`Notes.ReadWrite\` - Read and write OneNote notebooks

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
| \`mog calendar list\` | List upcoming events |
| \`mog calendar create\` | Create an event |
| \`mog calendar get <eventId>\` | Get event details |
| \`mog calendar delete <eventId>\` | Delete an event |
| \`mog calendar calendars\` | List calendars |
| \`mog calendar freebusy <emails...>\` | Check availability for users |
| \`mog calendar acl [calendarId]\` | List calendar permissions |

**calendar list options:**
- \`--from <iso>\` - Start date (ISO format, or: today, tomorrow, monday)
- \`--to <iso>\` - End date
- \`--max <n>\` - Maximum results (default: 25)
- \`--calendar <id>\` - Calendar ID or slug

**calendar create options:**
- \`--summary <text>\` - Event title (required)
- \`--from <iso>\` - Start time (required)
- \`--to <iso>\` - End time (required)
- \`--description <text>\` - Event description
- \`--location <text>\` - Event location
- \`--calendar <id>\` - Calendar ID
- \`--attendees <emails>\` - Attendee emails (comma-separated)

**calendar freebusy options:**
- \`--start <iso>\` - Start time (default: now)
- \`--end <iso>\` - End time (default: 24 hours from now)

**Note:** Microsoft Graph does not expose a dedicated calendar colors API. Calendar colors are returned as part of calendar metadata via \`mog calendar calendars\`.

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

### Excel Commands

| Command | Description |
|---------|-------------|
| \`mog excel list\` | List Excel workbooks |
| \`mog excel metadata <workbookId>\` | List worksheets in a workbook |
| \`mog excel get <workbookId> [sheet] [range]\` | Read cells from a worksheet |
| \`mog excel update <workbookId> <sheet> <range> <values...>\` | Write values to cells |
| \`mog excel append <workbookId> <table> <values...>\` | Append a row to a table |
| \`mog excel create <title>\` | Create a new workbook |
| \`mog excel add-sheet <workbookId>\` | Add a worksheet |
| \`mog excel tables <workbookId>\` | List tables in a workbook |
| \`mog excel clear <workbookId> <sheet> <range>\` | Clear values in a range |
| \`mog excel copy <workbookId> <title>\` | Copy/duplicate a workbook |
| \`mog excel export <workbookId>\` | Export workbook as xlsx or csv |

**excel list options:**
- \`--max <n>\` - Maximum results (default: 50)

**excel get:**
- If only workbook given, reads used range of first sheet
- If range looks like "A1:C3" without sheet, reads from first sheet
- \`--json\` returns full range data

**excel update:**
- Values are positional and fill the range row by row
- Example: \`mog excel update wb1 Sheet1 A1:B2 val1 val2 val3 val4\`

**excel append:**
- Values are positional and become a single row
- Example: \`mog excel append wb1 TableName col1 col2 col3\`

**excel create:**
- Title is positional: \`mog excel create "My Workbook"\`
- \`--folder <id>\` - Destination folder ID or slug

**excel add-sheet options:**
- \`--name <name>\` - Worksheet name (auto-generated if omitted)

**excel clear:**
- Clears values but keeps formatting
- Example: \`mog excel clear wb1 Sheet1 A1:C10\`

**excel copy:**
- Title is positional: \`mog excel copy wb1 "Copy of Budget"\`
- \`--folder <id>\` - Destination folder ID or slug

**excel export options:**
- \`--out <path>\` - Output file path (required)
- \`--format <format>\` - Export format: xlsx, csv (default: xlsx)
- \`--sheet <name>\` - Sheet name for CSV export (default: first sheet)

### OneNote Commands

| Command | Description |
|---------|-------------|
| \`mog onenote notebooks\` | List all notebooks |
| \`mog onenote sections <notebookId>\` | List sections in a notebook |
| \`mog onenote pages <sectionId>\` | List pages in a section |
| \`mog onenote get <pageId>\` | Get page content (as text) |
| \`mog onenote create-notebook <name>\` | Create a new notebook |
| \`mog onenote create-section <notebookId> <name>\` | Create a section |
| \`mog onenote create-page <sectionId> <title> [content]\` | Create a page |
| \`mog onenote delete <pageId>\` | Delete a page |
| \`mog onenote search <query>\` | Search across all notes |

**onenote notebooks/sections/pages options:**
- \`--max <n>\` - Maximum results (default: 50)

**onenote get options:**
- \`--html\` - Output raw HTML instead of text

**onenote search options:**
- \`--max <n>\` - Maximum results (default: 25)

### Contacts Commands

| Command | Description |
|---------|-------------|
| \`mog contacts list\` | List contacts |
| \`mog contacts search <query>\` | Search contacts |
| \`mog contacts get <contactId>\` | Get contact details |
| \`mog contacts directory <query>\` | Search organizational directory |

**contacts list/search options:**
- \`--max <n>\` - Maximum results (default: 50/25)

**contacts directory options:**
- \`--max <n>\` - Maximum results (default: 25)
- Requires \`User.Read.All\` permission (may not work with personal accounts)

### Tasks Commands

| Command | Description |
|---------|-------------|
| \`mog tasks lists\` | List all task lists |
| \`mog tasks list [listId]\` | List tasks in a list |
| \`mog tasks add <title>\` | Add a new task |
| \`mog tasks done <taskId>\` | Mark task complete |
| \`mog tasks delete <taskId>\` | Delete a task |
| \`mog tasks clear [listId]\` | Clear completed tasks from a list |

**tasks list options:**
- \`--all\` - Include completed tasks

**tasks add options:**
- \`--list <name|id>\` - Task list name or ID/slug
- \`--due <date>\` - Due date (see Date Formats below)
- \`--notes <text>\` - Task notes
- \`--important\` - Mark as important

**tasks done/delete options:**
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
mog calendar list

# List events for date range
mog calendar list --from 2025-01-01 --to 2025-01-31

# Create an event
mog calendar create --summary "Team Meeting" --from 2025-01-15T10:00:00 --to 2025-01-15T11:00:00

# Create with location and attendees
mog calendar create --summary "Lunch" --from 2025-01-15T12:00:00 --to 2025-01-15T13:00:00 \\
  --location "Cafe" --attendees "alice@example.com,bob@example.com"

# Delete an event
mog calendar delete a3f2c891

# Check availability for users
mog calendar freebusy alice@example.com bob@example.com --start 2025-01-15T09:00:00 --end 2025-01-15T17:00:00

# List calendar permissions
mog calendar acl
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

### Tasks

\`\`\`bash
# List all task lists
mog tasks lists

# List tasks in default list
mog tasks list

# List tasks in specific list (by slug or name)
mog tasks list b4c5984b
mog tasks list Shopping

# Include completed tasks
mog tasks list --all

# Add a task
mog tasks add "Buy milk"

# Add with due date
mog tasks add "Call mom" --due tomorrow

# Add to specific list with importance
mog tasks add "Review PR" --list Work --due monday --important

# Complete a task
mog tasks done a3f2c891

# Delete a task
mog tasks delete a3f2c891

# Clear completed tasks from default list
mog tasks clear

# Clear completed tasks from specific list
mog tasks clear Shopping
\`\`\`

### Excel

\`\`\`bash
# List all Excel workbooks
mog excel list

# List worksheets in a workbook (metadata)
mog excel metadata a3f2c891

# Read used range of first sheet
mog excel get a3f2c891

# Read specific range
mog excel get a3f2c891 Sheet1 A1:C10

# Read entire sheet (used range)
mog excel get a3f2c891 "Q1 Data"

# Write values to cells (positional values fill row by row)
mog excel update a3f2c891 Sheet1 A1:B2 1 2 3 4

# Write strings
mog excel update a3f2c891 Sheet1 A1:B1 Name Value

# Append a row to a table (positional values)
mog excel append a3f2c891 SalesData 100 "Product A" 2025-01-15

# Create new workbook (positional title)
mog excel create "Budget 2025"

# Create in specific folder
mog excel create "Report" --folder b2d4e6f8

# Add a worksheet
mog excel add-sheet a3f2c891 --name "Q2"

# List tables
mog excel tables a3f2c891

# Clear values in a range (keeps formatting)
mog excel clear a3f2c891 Sheet1 A1:C10

# Copy/duplicate a workbook
mog excel copy a3f2c891 "Budget 2025 Copy"

# Copy to specific folder
mog excel copy a3f2c891 "Backup" --folder b2d4e6f8

# Export as XLSX
mog excel export a3f2c891 --out ./workbook.xlsx

# Export as CSV
mog excel export a3f2c891 --format csv --out ./data.csv

# Export specific sheet as CSV
mog excel export a3f2c891 --format csv --sheet "Q1 Data" --out ./q1.csv
\`\`\`

### OneNote

\`\`\`bash
# List all notebooks
mog onenote notebooks

# List sections in a notebook
mog onenote sections a3f2c891

# List pages in a section
mog onenote pages b4c5984b

# Get page content (as readable text)
mog onenote get c5d6e7f8

# Get page content as raw HTML
mog onenote get c5d6e7f8 --html

# Create a new notebook
mog onenote create-notebook "Work Notes"

# Create a section in a notebook
mog onenote create-section a3f2c891 "January"

# Create a page in a section (with content)
mog onenote create-page b4c5984b "Meeting Notes" "Notes from today's meeting"

# Create a page (empty)
mog onenote create-page b4c5984b "Quick Note"

# Delete a page
mog onenote delete c5d6e7f8

# Search across all notebooks
mog onenote search "meeting"

# Search with max results
mog onenote search "project" --max 10
\`\`\`

### Contacts

\`\`\`bash
# List all contacts
mog contacts list

# Search contacts
mog contacts search "john"

# Get contact details
mog contacts get a3f2c891

# Search organizational directory (requires User.Read.All permission)
mog contacts directory "john"
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
| List events | \`mog calendar list\` |
| Create event | \`mog calendar create --summary X --from Y --to Z\` |
| Check availability | \`mog calendar freebusy email1 email2 --start X --end Y\` |
| Calendar permissions | \`mog calendar acl\` |
| List files | \`mog drive ls\` |
| Upload file | \`mog drive upload ./file.pdf\` |
| Download file | \`mog drive download ID --out ./file.pdf\` |
| List workbooks | \`mog excel list\` |
| Read cells | \`mog excel get ID [sheet] [range]\` |
| Write cells | \`mog excel update ID sheet range val1 val2 ...\` |
| Clear cells | \`mog excel clear ID sheet range\` |
| Copy workbook | \`mog excel copy ID "New Title"\` |
| List notebooks | \`mog onenote notebooks\` |
| List sections | \`mog onenote sections ID\` |
| List pages | \`mog onenote pages ID\` |
| Get page | \`mog onenote get ID\` |
| Create page | \`mog onenote create-page SECTION "Title" "Content"\` |
| Search notes | \`mog onenote search "query"\` |
| List tasks | \`mog tasks list\` |
| Add task | \`mog tasks add "title"\` |
| Complete task | \`mog tasks done ID\` |
| Clear completed | \`mog tasks clear\` |
| List contacts | \`mog contacts list\` |
| Directory search | \`mog contacts directory "query"\` |

## Negative Examples

### ❌ DO NOT

\`\`\`bash
# Wrong: --subject for calendar (use --summary)
mog calendar create --subject "Meeting" --from ... --to ...

# Wrong: --start/--end for calendar (use --from/--to)
mog calendar create --summary "Meeting" --start 2025-01-15 --end 2025-01-15

# Wrong: --note singular for tasks (use --notes)
mog tasks add "Task" --note "Details"

# Wrong: --limit for max results (use --max)
mog mail search "query" --limit 10
\`\`\`

### ✅ CORRECT

\`\`\`bash
mog calendar create --summary "Meeting" --from 2025-01-15T10:00:00 --to 2025-01-15T11:00:00
mog tasks add "Task" --notes "Details"
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
