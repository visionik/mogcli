import chalk from 'chalk';
import { readFileSync } from 'fs';
import { searchMessages, getMessages, getMessage, getFolders, sendMail } from '../api/mail.js';

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function formatMessage(msg) {
  const read = msg.isRead ? ' ' : chalk.blue('●');
  const attach = msg.hasAttachments ? chalk.yellow('📎') : '  ';
  const from = msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Unknown';
  const date = formatDate(msg.receivedDateTime);
  const subject = msg.subject || '(no subject)';
  
  return `${read} ${attach} ${chalk.dim(date.padEnd(8))} ${chalk.cyan(from.substring(0, 20).padEnd(20))} ${subject}`;
}

export async function mailSearch(query, options) {
  try {
    const messages = await searchMessages(query, {
      max: parseInt(options.max),
      folder: options.folder
    });
    
    if (options.json) {
      console.log(JSON.stringify(messages, null, 2));
      return;
    }
    
    if (messages.length === 0) {
      console.log(chalk.yellow('No messages found'));
      return;
    }
    
    console.log(chalk.bold(`Search results for "${query}"`));
    console.log('');
    
    for (const msg of messages) {
      console.log(formatMessage(msg));
      if (options.verbose) {
        console.log(chalk.dim(`  ID: ${msg.id}`));
      }
    }
    
    console.log('');
    console.log(chalk.dim(`${messages.length} message(s)`));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function mailSend(options) {
  try {
    let body = options.body;
    let isHtml = false;
    
    if (options.bodyHtml) {
      body = options.bodyHtml;
      isHtml = true;
    } else if (options.bodyFile) {
      if (options.bodyFile === '-') {
        // Read from stdin
        const chunks = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks).toString('utf8');
      } else {
        body = readFileSync(options.bodyFile, 'utf8');
      }
    }
    
    if (!body) {
      console.error(chalk.red('Error: Must provide --body, --body-file, or --body-html'));
      process.exit(1);
    }
    
    await sendMail({
      to: options.to,
      subject: options.subject,
      body,
      isHtml,
      cc: options.cc,
      bcc: options.bcc,
      replyToMessageId: options.replyToMessageId
    });
    
    if (options.json) {
      console.log(JSON.stringify({ success: true }));
      return;
    }
    
    console.log(chalk.green('✓ Email sent'));
    console.log(`  To: ${chalk.cyan(options.to)}`);
    console.log(`  Subject: ${options.subject}`);
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function mailGet(messageId, options) {
  try {
    const msg = await getMessage(messageId);
    
    if (options.json) {
      console.log(JSON.stringify(msg, null, 2));
      return;
    }
    
    console.log(chalk.bold(msg.subject || '(no subject)'));
    console.log('');
    console.log(`From: ${chalk.cyan(msg.from?.emailAddress?.name || '')} <${msg.from?.emailAddress?.address}>`);
    console.log(`To: ${msg.toRecipients?.map(r => r.emailAddress?.address).join(', ')}`);
    console.log(`Date: ${new Date(msg.receivedDateTime).toLocaleString()}`);
    console.log('');
    console.log(msg.body?.content || '');
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function mailFolders(options) {
  try {
    const folders = await getFolders();
    
    if (options.json) {
      console.log(JSON.stringify(folders, null, 2));
      return;
    }
    
    console.log(chalk.bold('Mail Folders'));
    console.log('');
    
    for (const folder of folders) {
      const unread = folder.unreadItemCount > 0 ? chalk.blue(` (${folder.unreadItemCount})`) : '';
      console.log(`  ${chalk.cyan(folder.displayName)}${unread}`);
      console.log(`    ${chalk.dim(folder.totalItemCount)} items, ID: ${chalk.dim(folder.id.substring(0, 20))}...`);
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
