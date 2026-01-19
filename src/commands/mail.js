import chalk from 'chalk';
import { readFileSync } from 'fs';
import {
  searchMessages,
  getMessage,
  getFolders,
  sendMail,
  getDrafts,
  createDraft,
  sendDraft,
  deleteDraft,
  getAttachments,
  getAttachment,
} from '../api/mail.js';
import { writeFileSync } from 'fs';
import { formatId, resolveId } from '../ids.js';

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
      folder: options.folder ? resolveId(options.folder) : undefined,
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
      console.log(chalk.dim(`  ID: ${formatId(msg.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`  Full: ${msg.id}`));
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
      replyToMessageId: options.replyToMessageId ? resolveId(options.replyToMessageId) : undefined,
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
    const msg = await getMessage(resolveId(messageId));

    if (options.json) {
      console.log(JSON.stringify(msg, null, 2));
      return;
    }

    console.log(chalk.bold(msg.subject || '(no subject)'));
    console.log('');
    console.log(
      `From: ${chalk.cyan(msg.from?.emailAddress?.name || '')} <${msg.from?.emailAddress?.address}>`
    );
    console.log(`To: ${msg.toRecipients?.map((r) => r.emailAddress?.address).join(', ')}`);
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
      console.log(
        `    ${chalk.dim(folder.totalItemCount)} items, ID: ${chalk.dim(formatId(folder.id))}`
      );
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Drafts ============

export async function draftsList(options) {
  try {
    const drafts = await getDrafts({ max: parseInt(options.max) });

    if (options.json) {
      console.log(JSON.stringify(drafts, null, 2));
      return;
    }

    if (drafts.length === 0) {
      console.log(chalk.yellow('No drafts found'));
      return;
    }

    console.log(chalk.bold('Drafts'));
    console.log('');

    for (const draft of drafts) {
      const to =
        draft.toRecipients?.map((r) => r.emailAddress?.address).join(', ') || '(no recipients)';
      const date = formatDate(draft.createdDateTime);
      const subject = draft.subject || '(no subject)';

      console.log(
        `  ${chalk.dim(date.padEnd(8))} ${chalk.cyan(to.substring(0, 25).padEnd(25))} ${subject}`
      );
      console.log(chalk.dim(`    ID: ${formatId(draft.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`    Full: ${draft.id}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${drafts.length} draft(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function draftsCreate(options) {
  try {
    let body = options.body;
    let isHtml = false;

    if (options.bodyHtml) {
      body = options.bodyHtml;
      isHtml = true;
    } else if (options.bodyFile) {
      if (options.bodyFile === '-') {
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

    const draft = await createDraft({
      to: options.to,
      subject: options.subject,
      body,
      isHtml,
      cc: options.cc,
    });

    if (options.json) {
      console.log(JSON.stringify(draft, null, 2));
      return;
    }

    console.log(chalk.green('✓ Draft created'));
    console.log(`  To: ${chalk.cyan(options.to)}`);
    console.log(`  Subject: ${options.subject}`);
    console.log(`  ID: ${chalk.dim(formatId(draft.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function draftsSend(draftId, options) {
  try {
    await sendDraft(resolveId(draftId));

    if (options.json) {
      console.log(JSON.stringify({ success: true }));
      return;
    }

    console.log(chalk.green('✓ Draft sent'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function draftsDelete(draftId, options) {
  try {
    await deleteDraft(resolveId(draftId));

    if (options.json) {
      console.log(JSON.stringify({ success: true }));
      return;
    }

    console.log(chalk.green('✓ Draft deleted'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Attachments ============

export async function attachmentList(messageId, options) {
  try {
    const attachments = await getAttachments(resolveId(messageId));

    if (options.json) {
      console.log(JSON.stringify(attachments, null, 2));
      return;
    }

    if (attachments.length === 0) {
      console.log(chalk.yellow('No attachments'));
      return;
    }

    console.log(chalk.bold('Attachments'));
    console.log('');

    for (const att of attachments) {
      const size = att.size ? `(${Math.round(att.size / 1024)} KB)` : '';
      console.log(`  📎 ${chalk.cyan(att.name)} ${chalk.dim(size)}`);
      console.log(chalk.dim(`    ID: ${formatId(att.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`    Full: ${att.id}`));
        console.log(chalk.dim(`    Type: ${att.contentType}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${attachments.length} attachment(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function attachmentDownload(messageId, attachmentId, options) {
  try {
    const attachment = await getAttachment(resolveId(messageId), resolveId(attachmentId));

    if (!attachment.contentBytes) {
      console.error(
        chalk.red('Error: Attachment has no content (might be a reference attachment)')
      );
      process.exit(1);
    }

    const outPath = options.out || attachment.name;
    const buffer = Buffer.from(attachment.contentBytes, 'base64');
    writeFileSync(outPath, buffer);

    if (options.json) {
      console.log(JSON.stringify({ success: true, path: outPath, size: buffer.length }));
      return;
    }

    console.log(chalk.green('✓ Downloaded'));
    console.log(`  File: ${chalk.cyan(attachment.name)}`);
    console.log(`  Size: ${chalk.dim(Math.round(buffer.length / 1024) + ' KB')}`);
    console.log(`  Saved to: ${outPath}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
