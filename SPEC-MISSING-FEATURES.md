# MOG Feature Parity Specification

## Overview

This document specifies the features missing from MOG compared to GOG (Google Workspace CLI) and provides an implementation plan for adding them using Microsoft Graph APIs.

**Current MOG Features:**
- ✅ Mail (Outlook)
- ✅ Calendar (Outlook)
- ✅ Drive (OneDrive)
- ✅ Contacts
- ✅ To-Do (Tasks)

**Missing Features (vs GOG):**
- ❌ Excel (equivalent to Google Sheets)
- ❌ Word (equivalent to Google Docs)
- ❌ PowerPoint (equivalent to Google Slides)
- ❌ OneNote (equivalent to Google Keep)
- ❌ Groups (equivalent to Google Groups)

---

## 1. Excel Online (Sheets Equivalent)

### GOG Sheets Capabilities
```bash
gog sheets list                           # List spreadsheets
gog sheets get <id>                       # Get spreadsheet info
gog sheets read <id> <range>              # Read cell range (A1:C10)
gog sheets write <id> <range> --values    # Write to cells
gog sheets append <id> <range> --values   # Append rows
gog sheets create --title "Name"          # Create new spreadsheet
```

### Microsoft Graph API Endpoints

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List workbooks | `/me/drive/root/search(q='.xlsx')` | GET |
| Get workbook | `/me/drive/items/{id}/workbook` | GET |
| List worksheets | `/me/drive/items/{id}/workbook/worksheets` | GET |
| Read range | `/me/drive/items/{id}/workbook/worksheets/{sheet}/range(address='{range}')` | GET |
| Write range | `/me/drive/items/{id}/workbook/worksheets/{sheet}/range(address='{range}')` | PATCH |
| Append rows | `/me/drive/items/{id}/workbook/tables/{table}/rows/add` | POST |
| Create workbook | `/me/drive/root/children` (upload .xlsx template) | POST |
| Create worksheet | `/me/drive/items/{id}/workbook/worksheets/add` | POST |
| List tables | `/me/drive/items/{id}/workbook/tables` | GET |
| Get used range | `/me/drive/items/{id}/workbook/worksheets/{sheet}/usedRange` | GET |

### Required Permissions
- `Files.ReadWrite.All` (already in MOG)

### Proposed MOG Commands
```bash
mog excel list                                    # List .xlsx files in OneDrive
mog excel sheets <workbook>                       # List worksheets
mog excel read <workbook> [sheet] [range]         # Read cells (default: used range)
mog excel write <workbook> <sheet> <range> --values '[[1,2],[3,4]]'
mog excel append <workbook> <table> --values '[[1,2,3]]'
mog excel create --title "Budget 2026"            # Create new workbook
mog excel add-sheet <workbook> --name "Q1"        # Add worksheet
mog excel tables <workbook>                       # List tables
mog excel export <workbook> --format csv          # Export as CSV
```

### Technical Considerations
1. **Session Management**: Excel API supports persistent and non-persistent sessions
   - Use `createSession` for batch operations
   - Include `Workbook-Session-Id` header for session continuity
2. **Rate Limiting**: Excel API has specific throttling limits
   - Implement exponential backoff
   - Batch reads/writes when possible
3. **Large Ranges**: Use pagination for large data sets
4. **File Creation**: Must upload a template .xlsx file (can embed minimal template in code)

### Implementation Effort
- **Estimated Time**: 2-3 days
- **Complexity**: Medium
- **Files to Create**:
  - `src/commands/excel.js`
  - `src/api/excel.js`
  - `src/api/excel.test.js`

---

## 2. Word Online (Docs Equivalent)

### GOG Docs Capabilities
```bash
gog docs list                    # List documents
gog docs cat <id>                # Output document as plain text
gog docs export <id> --format    # Export as PDF, docx, txt, html
gog docs copy <id> --name "Copy" # Duplicate document
```

### Microsoft Graph API Endpoints

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List documents | `/me/drive/root/search(q='.docx')` | GET |
| Get document | `/me/drive/items/{id}` | GET |
| Download/Export | `/me/drive/items/{id}/content` | GET |
| Export as PDF | `/me/drive/items/{id}/content?format=pdf` | GET |
| Copy document | `/me/drive/items/{id}/copy` | POST |
| Create document | `/me/drive/root/children` (upload .docx) | POST |

**Note**: Microsoft Graph doesn't provide a rich document editing API like Google Docs. Operations are limited to:
- Read/download document content
- Export to different formats
- Copy/move documents
- Upload new documents

For text extraction, you can:
- Download and parse .docx (XML-based)
- Use `/content?format=pdf` and extract text from PDF
- Use Microsoft's Content Services API (limited)

### Required Permissions
- `Files.ReadWrite.All` (already in MOG)

### Proposed MOG Commands
```bash
mog word list                              # List .docx files
mog word get <doc>                         # Get document metadata
mog word cat <doc>                         # Extract plain text (best effort)
mog word export <doc> --format pdf         # Export as PDF
mog word export <doc> --format docx        # Download original
mog word copy <doc> --name "Copy of Doc"   # Duplicate
mog word create --title "Report"           # Create from template
```

### Technical Considerations
1. **Text Extraction**: .docx files are ZIP archives containing XML
   - Use a library like `mammoth` or `docx` to extract text
   - Or download and use system tools (`textutil` on macOS)
2. **No In-Place Editing**: Unlike Google Docs API, Graph doesn't support document editing
   - GOG has same limitation: "In-place edits require a Docs API client (not in gog)"
3. **Format Conversion**: Graph supports `?format=` parameter for some conversions

### Implementation Effort
- **Estimated Time**: 1-2 days
- **Complexity**: Low-Medium
- **Files to Create**:
  - `src/commands/word.js`
  - `src/api/word.js`
  - `src/api/word.test.js`

---

## 3. PowerPoint Online (Slides Equivalent)

### GOG Slides Capabilities
```bash
gog slides list                  # List presentations
gog slides get <id>              # Get presentation info
gog slides export <id> --format  # Export as PDF, pptx
gog slides copy <id> --name      # Duplicate presentation
```

### Microsoft Graph API Endpoints

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List presentations | `/me/drive/root/search(q='.pptx')` | GET |
| Get presentation | `/me/drive/items/{id}` | GET |
| Download | `/me/drive/items/{id}/content` | GET |
| Export as PDF | `/me/drive/items/{id}/content?format=pdf` | GET |
| Copy | `/me/drive/items/{id}/copy` | POST |
| Get thumbnails | `/me/drive/items/{id}/thumbnails` | GET |

### Required Permissions
- `Files.ReadWrite.All` (already in MOG)

### Proposed MOG Commands
```bash
mog ppt list                              # List .pptx files
mog ppt get <presentation>                # Get metadata
mog ppt export <presentation> --format pdf
mog ppt copy <presentation> --name "Copy"
mog ppt thumbnails <presentation>         # Get slide thumbnails
```

### Technical Considerations
1. **Limited API**: Similar to Word, no rich editing API
2. **Thumbnail Access**: Can get slide preview images
3. **Same patterns as Word**: Implementation will mirror word.js

### Implementation Effort
- **Estimated Time**: 1 day
- **Complexity**: Low
- **Files to Create**:
  - `src/commands/ppt.js`
  - `src/api/ppt.js`
  - `src/api/ppt.test.js`

---

## 4. OneNote (Keep Equivalent)

### GOG Keep Capabilities
```bash
gog keep list                    # List notes
gog keep get <id>                # Get note content
gog keep create --title --text   # Create note
gog keep delete <id>             # Delete note
```

**Note**: GOG Keep is Workspace-only (not available for consumer Gmail).

### Microsoft Graph API Endpoints

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List notebooks | `/me/onenote/notebooks` | GET |
| Get notebook | `/me/onenote/notebooks/{id}` | GET |
| List sections | `/me/onenote/notebooks/{id}/sections` | GET |
| List pages | `/me/onenote/sections/{id}/pages` | GET |
| Get page content | `/me/onenote/pages/{id}/content` | GET |
| Create notebook | `/me/onenote/notebooks` | POST |
| Create section | `/me/onenote/notebooks/{id}/sections` | POST |
| Create page | `/me/onenote/sections/{id}/pages` | POST |
| Update page | `/me/onenote/pages/{id}/content` | PATCH |
| Delete page | `/me/onenote/pages/{id}` | DELETE |

### Required Permissions (NEW)
- `Notes.Read` - Read notebooks
- `Notes.ReadWrite` - Full access
- `Notes.Create` - Create notebooks

**Must add to Azure AD app registration!**

### Proposed MOG Commands
```bash
mog onenote notebooks                           # List notebooks
mog onenote sections <notebook>                 # List sections
mog onenote pages <section>                     # List pages
mog onenote cat <page>                          # Get page content (HTML)
mog onenote create-notebook --name "Work Notes"
mog onenote create-section <notebook> --name "January"
mog onenote create-page <section> --title "Meeting Notes" --content "..."
mog onenote delete <page>
mog onenote search "query"                      # Search across notes
```

### Technical Considerations
1. **HTML Content**: OneNote pages are HTML
   - Store/display as HTML or convert to plain text
   - Page creation requires HTML body
2. **Hierarchical Structure**: Notebooks → Sections → Pages
   - Different from Keep's flat structure
3. **New Permissions**: Requires adding Notes.* scopes to Azure AD app
4. **Rich Content**: Supports images, attachments, ink

### Implementation Effort
- **Estimated Time**: 2-3 days
- **Complexity**: Medium
- **Files to Create**:
  - `src/commands/onenote.js`
  - `src/api/onenote.js`
  - `src/api/onenote.test.js`
- **Update**: `src/auth.js` to request Notes permissions

---

## 5. Microsoft 365 Groups (Groups Equivalent)

### GOG Groups Capabilities
```bash
gog groups list                  # List groups
gog groups get <id>              # Get group details
gog groups members <id>          # List members
gog groups add-member <id>       # Add member
gog groups remove-member <id>    # Remove member
```

### Microsoft Graph API Endpoints

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List groups | `/me/memberOf` or `/groups` | GET |
| Get group | `/groups/{id}` | GET |
| List members | `/groups/{id}/members` | GET |
| Add member | `/groups/{id}/members/$ref` | POST |
| Remove member | `/groups/{id}/members/{userId}/$ref` | DELETE |
| Create group | `/groups` | POST |
| Delete group | `/groups/{id}` | DELETE |
| List group conversations | `/groups/{id}/conversations` | GET |
| Group calendar | `/groups/{id}/calendar/events` | GET |
| Group drive | `/groups/{id}/drive` | GET |

### Required Permissions (NEW)
- `Group.Read.All` - Read groups
- `Group.ReadWrite.All` - Full access
- `GroupMember.ReadWrite.All` - Manage members

**Requires admin consent for some operations!**

### Proposed MOG Commands
```bash
mog groups list                              # List my groups
mog groups get <group>                       # Group details
mog groups members <group>                   # List members
mog groups add-member <group> <user>         # Add member
mog groups remove-member <group> <user>      # Remove member
mog groups conversations <group>             # List conversations
mog groups calendar <group>                  # Group calendar events
mog groups drive <group>                     # Group files
```

### Technical Considerations
1. **Admin Consent**: Some operations require admin consent
   - May limit functionality for non-admin users
2. **Group Types**: Microsoft 365 groups, Security groups, Distribution lists
   - Focus on Microsoft 365 groups for GOG parity
3. **Unified Groups**: M365 groups include: mail, calendar, files, conversations
4. **Permission Complexity**: Most restrictive of all new features

### Implementation Effort
- **Estimated Time**: 2 days
- **Complexity**: Medium-High (permissions)
- **Files to Create**:
  - `src/commands/groups.js`
  - `src/api/groups.js`
  - `src/api/groups.test.js`

---

## Implementation Plan

### Phase 1: Quick Wins (Week 1)
1. **Word** - Low complexity, leverages existing Drive code
2. **PowerPoint** - Nearly identical to Word implementation

### Phase 2: High Value (Week 2)
3. **Excel** - Most complex but highest utility
   - Session management
   - Range operations
   - Table operations

### Phase 3: Complete Parity (Week 3)
4. **OneNote** - New permissions required
5. **Groups** - Admin consent considerations

### Priority Order (by value/effort ratio)
1. 🥇 **Excel** - High value for data workflows
2. 🥈 **Word** - Easy to implement
3. 🥉 **PowerPoint** - Easy, completes Office suite
4. **OneNote** - Useful but requires new permissions
5. **Groups** - Complex permissions, lower individual value

---

## Permission Summary

### Current MOG Permissions
```
User.Read
offline_access
Mail.ReadWrite
Mail.Send
Calendars.ReadWrite
Files.ReadWrite.All
Contacts.ReadWrite
Tasks.ReadWrite
```

### Additional Permissions Needed
```
# For OneNote
Notes.ReadWrite

# For Groups
Group.ReadWrite.All
GroupMember.ReadWrite.All
```

### Azure AD App Update Required
Users will need to:
1. Go to Azure Portal → App registrations → mog CLI
2. Add new API permissions
3. Re-authenticate with `mog auth login`

---

## File Structure After Implementation

```
src/
├── commands/
│   ├── auth.js
│   ├── cal.js
│   ├── contacts.js
│   ├── drive.js
│   ├── mail.js
│   ├── todo.js
│   ├── excel.js      # NEW
│   ├── word.js       # NEW
│   ├── ppt.js        # NEW
│   ├── onenote.js    # NEW
│   └── groups.js     # NEW
├── api/
│   ├── calendar.js
│   ├── contacts.js
│   ├── drive.js
│   ├── mail.js
│   ├── todo.js
│   ├── excel.js      # NEW
│   ├── word.js       # NEW
│   ├── ppt.js        # NEW
│   ├── onenote.js    # NEW
│   └── groups.js     # NEW
```

---

## Testing Strategy

Each new feature should include:
1. **Unit tests** for API layer (mocked HTTP)
2. **Integration tests** (optional, requires test account)
3. **Manual testing** checklist

Target: Maintain 85%+ coverage per warping standards.

---

## Documentation Updates

1. Update `README.md` with new commands
2. Update `--ai-help` output in `src/ai-help.js`
3. Update SKILL.md in clawdbot skills folder
4. Add examples for each new command

---

## Estimated Total Effort

| Feature | Days | Complexity |
|---------|------|------------|
| Word | 1-2 | Low |
| PowerPoint | 1 | Low |
| Excel | 2-3 | Medium |
| OneNote | 2-3 | Medium |
| Groups | 2 | Medium-High |
| **Total** | **8-11 days** | |

---

## Next Steps

1. [ ] Review and approve this specification
2. [ ] Update Azure AD app with new permissions
3. [ ] Implement Phase 1 (Word, PowerPoint)
4. [ ] Implement Phase 2 (Excel)
5. [ ] Implement Phase 3 (OneNote, Groups)
6. [ ] Update documentation
7. [ ] Release new version
