#!/usr/bin/env node

import { program } from 'commander';
import { login, logout, status } from '../src/commands/auth.js';
import { listLists, listTasks, addTask, markComplete, removeTask } from '../src/commands/todo.js';
import { mailSearch, mailSend, mailGet, mailFolders } from '../src/commands/mail.js';
import { calList, calCreate, calGet, calDelete, calCalendars } from '../src/commands/cal.js';
import { driveLs, driveSearch, driveDownload, driveUpload, driveMkdir, driveRm } from '../src/commands/drive.js';
import { contactsList, contactsSearch, contactsGet } from '../src/commands/contacts.js';

program
  .name('mic')
  .description('Microsoft Graph CLI - Mail, Calendar, Drive, To-Do, and more')
  .version('1.0.0');

// ============ Auth ============
const auth = program
  .command('auth')
  .description('Manage authentication');

auth
  .command('login')
  .description('Start device code authentication flow')
  .option('--client-id <id>', 'Azure AD application client ID')
  .option('--no-browser', 'Do not open browser automatically')
  .action(login);

auth
  .command('logout')
  .description('Clear stored authentication tokens')
  .action(logout);

auth
  .command('status')
  .description('Show authentication status')
  .action(status);

// ============ Mail ============
const mail = program
  .command('mail')
  .description('Outlook mail');

mail
  .command('search <query>')
  .description('Search messages')
  .option('--max <n>', 'Maximum results', '25')
  .option('--folder <name>', 'Mail folder', 'Inbox')
  .option('--json', 'Output as JSON')
  .action(mailSearch);

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
  .option('--json', 'Output as JSON')
  .action(mailSend);

mail
  .command('get <messageId>')
  .description('Get a specific message')
  .option('--json', 'Output as JSON')
  .action(mailGet);

mail
  .command('folders')
  .description('List mail folders')
  .option('--json', 'Output as JSON')
  .action(mailFolders);

// ============ Calendar ============
const cal = program
  .command('cal')
  .description('Outlook calendar');

cal
  .command('list')
  .description('List events')
  .option('--from <iso>', 'Start date (ISO format)')
  .option('--to <iso>', 'End date (ISO format)')
  .option('--max <n>', 'Maximum results', '25')
  .option('--calendar <id>', 'Calendar ID (default: primary)')
  .option('--json', 'Output as JSON')
  .action(calList);

cal
  .command('create')
  .description('Create an event')
  .requiredOption('--subject <text>', 'Event subject')
  .requiredOption('--start <iso>', 'Start time (ISO format)')
  .requiredOption('--end <iso>', 'End time (ISO format)')
  .option('--body <text>', 'Event description')
  .option('--location <text>', 'Event location')
  .option('--calendar <id>', 'Calendar ID (default: primary)')
  .option('--attendees <emails>', 'Attendee emails (comma-separated)')
  .option('--json', 'Output as JSON')
  .action(calCreate);

cal
  .command('get <eventId>')
  .description('Get event details')
  .option('--calendar <id>', 'Calendar ID')
  .option('--json', 'Output as JSON')
  .action(calGet);

cal
  .command('delete <eventId>')
  .description('Delete an event')
  .option('--calendar <id>', 'Calendar ID')
  .action(calDelete);

cal
  .command('calendars')
  .description('List calendars')
  .option('--json', 'Output as JSON')
  .action(calCalendars);

// ============ Drive (OneDrive) ============
const drive = program
  .command('drive')
  .description('OneDrive files');

drive
  .command('ls [path]')
  .description('List files and folders')
  .option('--max <n>', 'Maximum results', '50')
  .option('--json', 'Output as JSON')
  .action(driveLs);

drive
  .command('search <query>')
  .description('Search files')
  .option('--max <n>', 'Maximum results', '25')
  .option('--json', 'Output as JSON')
  .action(driveSearch);

drive
  .command('download <itemId>')
  .description('Download a file')
  .requiredOption('--out <path>', 'Output file path')
  .action(driveDownload);

drive
  .command('upload <localPath>')
  .description('Upload a file')
  .option('--folder <folderId>', 'Destination folder ID')
  .option('--name <name>', 'Remote file name')
  .option('--json', 'Output as JSON')
  .action(driveUpload);

drive
  .command('mkdir <name>')
  .description('Create a folder')
  .option('--parent <folderId>', 'Parent folder ID')
  .option('--json', 'Output as JSON')
  .action(driveMkdir);

drive
  .command('rm <itemId>')
  .description('Delete a file or folder')
  .action(driveRm);

// ============ Contacts ============
const contacts = program
  .command('contacts')
  .description('People and contacts');

contacts
  .command('list')
  .description('List contacts')
  .option('--max <n>', 'Maximum results', '50')
  .option('--json', 'Output as JSON')
  .action(contactsList);

contacts
  .command('search <query>')
  .description('Search contacts')
  .option('--max <n>', 'Maximum results', '25')
  .option('--json', 'Output as JSON')
  .action(contactsSearch);

contacts
  .command('get <contactId>')
  .description('Get contact details')
  .option('--json', 'Output as JSON')
  .action(contactsGet);

// ============ To-Do ============
const todo = program
  .command('todo')
  .description('Microsoft To-Do tasks');

todo
  .command('lists')
  .description('List all task lists')
  .option('--json', 'Output as JSON')
  .action(listLists);

todo
  .command('tasks [listId]')
  .description('List tasks in a list (default: Tasks)')
  .option('--all', 'Include completed tasks')
  .option('-v, --verbose', 'Show task IDs and notes')
  .option('--json', 'Output as JSON')
  .action(listTasks);

todo
  .command('add <title>')
  .description('Add a new task')
  .option('--list <name>', 'Task list name')
  .option('--due <date>', 'Due date (today, tomorrow, monday, +3d, or ISO date)')
  .option('--note <text>', 'Task note/body')
  .option('--important', 'Mark as important')
  .option('--json', 'Output as JSON')
  .action(addTask);

todo
  .command('complete <taskId>')
  .alias('done')
  .description('Mark a task as complete')
  .option('--list <name>', 'Task list name')
  .action(markComplete);

todo
  .command('delete <taskId>')
  .alias('rm')
  .description('Delete a task')
  .option('--list <name>', 'Task list name')
  .action(removeTask);

program.parse();
