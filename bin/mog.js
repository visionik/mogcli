#!/usr/bin/env node

import { program } from 'commander';
import { login, logout, status } from '../src/commands/auth.js';
import {
  listLists,
  listTasks,
  addTask,
  editTask,
  markComplete,
  markUncomplete,
  removeTask,
} from '../src/commands/todo.js';
import {
  mailSearch,
  mailSend,
  mailGet,
  mailFolders,
  draftsList,
  draftsCreate,
  draftsSend,
  draftsDelete,
  attachmentList,
  attachmentDownload,
} from '../src/commands/mail.js';
import {
  calList,
  calCreate,
  calUpdate,
  calGet,
  calDelete,
  calCalendars,
  calRespond,
} from '../src/commands/cal.js';
import {
  driveLs,
  driveSearch,
  driveGet,
  driveDownload,
  driveUpload,
  driveMkdir,
  driveRm,
  driveMove,
  driveRename,
  driveCopy,
} from '../src/commands/drive.js';
import {
  contactsList,
  contactsSearch,
  contactsGet,
  contactsCreate,
  contactsUpdate,
  contactsDelete,
} from '../src/commands/contacts.js';
import { wordList, wordGet, wordExport, wordCopy, wordCreate } from '../src/commands/word.js';
import { printAiHelp } from '../src/ai-help.js';

// Handle --ai-help before commander parses (eager processing)
if (process.argv.includes('--ai-help')) {
  printAiHelp();
  process.exit(0);
}

program
  .name('mog')
  .description(
    "Microsoft Graph CLI - Mail, Calendar, Drive, To-Do, Contacts\n\n💡 LLMs/agents: run 'mog --ai-help' for detailed usage guidance."
  )
  .version('1.0.0')
  // Global options (like gog)
  .option('--json', 'Output JSON to stdout (best for scripting)')
  .option('--plain', 'Output stable, parseable text to stdout (TSV; no colors)')
  .option('--verbose', 'Enable verbose logging')
  .option('--force', 'Skip confirmations for destructive commands')
  .option('--no-input', 'Never prompt; fail instead (useful for CI)')
  .option('--ai-help', 'Show comprehensive usage guide for LLMs/agents');

// Helper to merge global options into command options
function withGlobalOpts(action) {
  return (arg1, arg2, cmd) => {
    // Handle variable argument commands
    const command = cmd || arg2 || arg1;
    const opts = command.opts ? command.opts() : {};
    const globalOpts = program.opts();
    const merged = { ...globalOpts, ...opts };

    // Determine args based on command signature
    if (cmd) {
      return action(arg1, arg2, merged);
    } else if (arg2 && arg2.opts) {
      return action(arg1, merged);
    } else if (arg1 && arg1.opts) {
      return action(merged);
    }
    return action(arg1, merged);
  };
}

// ============ Auth ============
const auth = program.command('auth').description('Manage authentication');

auth
  .command('login')
  .description('Start device code authentication flow')
  .option('--client-id <id>', 'Azure AD application client ID')
  .option('--no-browser', 'Do not open browser automatically')
  .action(withGlobalOpts(login));

auth
  .command('logout')
  .description('Clear stored authentication tokens')
  .action(withGlobalOpts(logout));

auth.command('status').description('Show authentication status').action(withGlobalOpts(status));

// ============ Mail ============
const mail = program.command('mail').alias('email').description('Outlook mail');

mail
  .command('search <query>')
  .description('Search messages')
  .option('--max <n>', 'Maximum results', '25')
  .option('--folder <name>', 'Mail folder', 'Inbox')
  .action(withGlobalOpts(mailSearch));

mail
  .command('send')
  .description('Send an email')
  .requiredOption('--to <email>', 'Recipient email (comma-separated for multiple)')
  .requiredOption('--subject <text>', 'Email subject')
  .option('--body <text>', 'Plain text body')
  .option('--body-file <path>', 'Read body from file (use - for stdin)')
  .option('--body-html <html>', 'HTML body')
  .option('--cc <email>', 'CC recipients (comma-separated)')
  .option('--bcc <email>', 'BCC recipients (comma-separated)')
  .option('--reply-to-message-id <id>', 'Reply to message ID')
  .action(withGlobalOpts(mailSend));

mail
  .command('get <messageId>')
  .description('Get a specific message')
  .action(withGlobalOpts(mailGet));

mail.command('folders').description('List mail folders').action(withGlobalOpts(mailFolders));

// Mail drafts subcommands
const drafts = mail.command('drafts').description('Draft operations');

drafts
  .command('list')
  .description('List drafts')
  .option('--max <n>', 'Maximum results', '25')
  .action(withGlobalOpts(draftsList));

drafts
  .command('create')
  .description('Create a draft')
  .requiredOption('--to <email>', 'Recipient email (comma-separated for multiple)')
  .requiredOption('--subject <text>', 'Email subject')
  .option('--body <text>', 'Plain text body')
  .option('--body-file <path>', 'Read body from file (use - for stdin)')
  .option('--body-html <html>', 'HTML body')
  .option('--cc <email>', 'CC recipients (comma-separated)')
  .action(withGlobalOpts(draftsCreate));

drafts.command('send <draftId>').description('Send a draft').action(withGlobalOpts(draftsSend));

drafts
  .command('delete <draftId>')
  .alias('rm')
  .description('Delete a draft')
  .action(withGlobalOpts(draftsDelete));

// Mail attachment subcommands
const attachment = mail
  .command('attachment')
  .alias('attachments')
  .description('Attachment operations');

attachment
  .command('list <messageId>')
  .description('List attachments for a message')
  .action(withGlobalOpts(attachmentList));

attachment
  .command('download <messageId> <attachmentId>')
  .description('Download an attachment')
  .option('--out <path>', 'Output file path (default: attachment name)')
  .action(withGlobalOpts(attachmentDownload));

// ============ Calendar ============
const cal = program.command('cal').alias('calendar').description('Outlook calendar');

cal
  .command('list')
  .alias('events')
  .description('List events')
  .option('--from <iso>', 'Start date (ISO format, or: today, tomorrow, monday)')
  .option('--to <iso>', 'End date (ISO format, or relative)')
  .option('--max <n>', 'Maximum results', '25')
  .option('--calendar <id>', 'Calendar ID (default: primary)')
  .action(withGlobalOpts(calList));

cal
  .command('create')
  .description('Create an event')
  .requiredOption('--summary <text>', 'Event summary/title')
  .requiredOption('--from <iso>', 'Start time (ISO format)')
  .requiredOption('--to <iso>', 'End time (ISO format)')
  .option('--description <text>', 'Event description')
  .option('--location <text>', 'Event location')
  .option('--calendar <id>', 'Calendar ID (default: primary)')
  .option('--attendees <emails>', 'Attendee emails (comma-separated)')
  .action(withGlobalOpts(calCreate));

cal
  .command('get <eventId>')
  .alias('event')
  .description('Get event details')
  .option('--calendar <id>', 'Calendar ID')
  .action(withGlobalOpts(calGet));

cal
  .command('update <eventId>')
  .description('Update an event')
  .option('--summary <text>', 'Event summary/title')
  .option('--from <iso>', 'Start time (ISO format)')
  .option('--to <iso>', 'End time (ISO format)')
  .option('--description <text>', 'Event description')
  .option('--location <text>', 'Event location')
  .option('--calendar <id>', 'Calendar ID')
  .action(withGlobalOpts(calUpdate));

cal
  .command('delete <eventId>')
  .alias('rm')
  .description('Delete an event')
  .option('--calendar <id>', 'Calendar ID')
  .action(withGlobalOpts(calDelete));

cal
  .command('respond <eventId> <response>')
  .description('Respond to an event invitation (accept, tentative, decline)')
  .option('--comment <text>', 'Add a comment with your response')
  .option('--calendar <id>', 'Calendar ID')
  .action(withGlobalOpts(calRespond));

cal.command('calendars').description('List calendars').action(withGlobalOpts(calCalendars));

// ============ Drive (OneDrive) ============
const drive = program.command('drive').description('OneDrive files');

drive
  .command('ls [path]')
  .description('List files and folders')
  .option('--max <n>', 'Maximum results', '50')
  .action(withGlobalOpts(driveLs));

drive
  .command('search <query>')
  .description('Search files')
  .option('--max <n>', 'Maximum results', '25')
  .action(withGlobalOpts(driveSearch));

drive
  .command('get <itemId>')
  .description('Get file/folder metadata')
  .action(withGlobalOpts(driveGet));

drive
  .command('download <itemId>')
  .description('Download a file')
  .requiredOption('--out <path>', 'Output file path')
  .action(withGlobalOpts(driveDownload));

drive
  .command('upload <localPath>')
  .description('Upload a file')
  .option('--folder <folderId>', 'Destination folder ID')
  .option('--name <name>', 'Remote file name')
  .action(withGlobalOpts(driveUpload));

drive
  .command('mkdir <name>')
  .description('Create a folder')
  .option('--parent <folderId>', 'Parent folder ID')
  .action(withGlobalOpts(driveMkdir));

drive
  .command('rm <itemId>')
  .alias('delete')
  .description('Delete a file or folder')
  .action(withGlobalOpts(driveRm));

drive
  .command('move <itemId> <destinationId>')
  .description('Move a file or folder to another folder')
  .action(withGlobalOpts(driveMove));

drive
  .command('rename <itemId> <newName>')
  .description('Rename a file or folder')
  .action(withGlobalOpts(driveRename));

drive
  .command('copy <itemId>')
  .description('Copy a file')
  .option('--name <name>', 'New name for the copy')
  .option('--folder <folderId>', 'Destination folder ID')
  .action(withGlobalOpts(driveCopy));

// ============ Contacts ============
const contacts = program.command('contacts').alias('people').description('People and contacts');

contacts
  .command('list')
  .description('List contacts')
  .option('--max <n>', 'Maximum results', '50')
  .option('-v, --verbose', 'Show IDs and company')
  .action(withGlobalOpts(contactsList));

contacts
  .command('search <query>')
  .description('Search contacts')
  .option('--max <n>', 'Maximum results', '25')
  .option('-v, --verbose', 'Show IDs')
  .action(withGlobalOpts(contactsSearch));

contacts
  .command('get <contactId>')
  .description('Get contact details')
  .action(withGlobalOpts(contactsGet));

contacts
  .command('create')
  .description('Create a new contact')
  .option('--name <name>', 'Contact name')
  .option('--email <email>', 'Email address')
  .option('--phone <phone>', 'Phone number')
  .option('--company <company>', 'Company name')
  .option('--title <title>', 'Job title')
  .action(withGlobalOpts(contactsCreate));

contacts
  .command('update <contactId>')
  .description('Update a contact')
  .option('--name <name>', 'Contact name')
  .option('--email <email>', 'Email address')
  .option('--phone <phone>', 'Phone number')
  .option('--company <company>', 'Company name')
  .option('--title <title>', 'Job title')
  .action(withGlobalOpts(contactsUpdate));

contacts
  .command('delete <contactId>')
  .alias('rm')
  .description('Delete a contact')
  .action(withGlobalOpts(contactsDelete));

// ============ Word (Docs) ============
const word = program.command('word').alias('docs').description('Word documents');

word
  .command('list')
  .description('List Word documents')
  .option('--max <n>', 'Maximum results', '50')
  .action(withGlobalOpts(wordList));

word.command('get <docId>').description('Get document metadata').action(withGlobalOpts(wordGet));

word
  .command('export <docId>')
  .description('Export a document')
  .requiredOption('--out <path>', 'Output file path')
  .option('--format <format>', 'Export format: docx, pdf', 'docx')
  .action(withGlobalOpts(wordExport));

word
  .command('copy <docId>')
  .description('Copy a document')
  .requiredOption('--name <name>', 'Name for the copy')
  .option('--folder <folderId>', 'Destination folder ID')
  .action(withGlobalOpts(wordCopy));

word
  .command('create')
  .description('Create a new Word document')
  .requiredOption('--title <name>', 'Document name')
  .option('--folder <folderId>', 'Destination folder ID')
  .action(withGlobalOpts(wordCreate));

// ============ To-Do (Tasks) ============
const todo = program.command('todo').alias('tasks').description('Microsoft To-Do tasks');

todo.command('lists').description('List all task lists').action(withGlobalOpts(listLists));

todo
  .command('list [listId]')
  .alias('tasks')
  .description('List tasks in a list (default: Tasks)')
  .option('--all', 'Include completed tasks')
  .option('-v, --verbose', 'Show task IDs and notes')
  .action(withGlobalOpts(listTasks));

todo
  .command('add <title>')
  .alias('create')
  .description('Add a new task')
  .option('--list <name>', 'Task list name')
  .option('--due <date>', 'Due date (today, tomorrow, monday, +3d, or ISO date)')
  .option('--notes <text>', 'Task notes/description')
  .option('--important', 'Mark as important')
  .action(withGlobalOpts(addTask));

todo
  .command('update <taskId>')
  .description('Update a task')
  .option('--list <name>', 'Task list name')
  .option('--title <text>', 'New task title')
  .option('--notes <text>', 'Task notes/description')
  .option('--due <date>', 'Due date (today, tomorrow, monday, +3d, or ISO date)')
  .option('--important', 'Mark as important')
  .option('--no-important', 'Remove important flag')
  .action(withGlobalOpts(editTask));

todo
  .command('done <taskId>')
  .alias('complete')
  .description('Mark a task as complete')
  .option('--list <name>', 'Task list name')
  .action(withGlobalOpts(markComplete));

todo
  .command('undo <taskId>')
  .alias('uncomplete')
  .description('Mark a task as incomplete')
  .option('--list <name>', 'Task list name')
  .action(withGlobalOpts(markUncomplete));

todo
  .command('delete <taskId>')
  .alias('rm')
  .description('Delete a task')
  .option('--list <name>', 'Task list name')
  .action(withGlobalOpts(removeTask));

program.parse();
