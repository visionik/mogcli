import chalk from 'chalk';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import {
  listDocuments,
  getDocument,
  downloadDocument,
  copyDocument,
  createDocument,
} from '../api/word.js';
import { formatId, resolveId } from '../ids.js';

function formatSize(bytes) {
  if (!bytes) {
    return '-';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============ List ============

export async function wordList(options) {
  try {
    const docs = await listDocuments({ max: parseInt(options.max) || 50 });

    if (options.json) {
      console.log(JSON.stringify(docs, null, 2));
      return;
    }

    if (docs.length === 0) {
      console.log(chalk.yellow('No Word documents found'));
      return;
    }

    console.log(chalk.bold('Word Documents'));
    console.log('');

    for (const doc of docs) {
      const size = chalk.dim(formatSize(doc.size));
      const date = chalk.dim(formatDate(doc.lastModifiedDateTime));
      console.log(`📄 ${chalk.cyan(doc.name)}  ${size}  ${date}`);
      console.log(chalk.dim(`   ID: ${formatId(doc.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`   Full: ${doc.id}`));
        if (doc.webUrl) {
          console.log(chalk.dim(`   URL: ${doc.webUrl}`));
        }
      }
    }

    console.log('');
    console.log(chalk.dim(`${docs.length} document(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Get ============

export async function wordGet(docId, options) {
  try {
    const doc = await getDocument(resolveId(docId));

    if (options.json) {
      console.log(JSON.stringify(doc, null, 2));
      return;
    }

    console.log(chalk.bold(doc.name));
    console.log('');
    console.log(`Size: ${formatSize(doc.size)}`);
    console.log(`Modified: ${formatDate(doc.lastModifiedDateTime)}`);
    console.log(`Created: ${formatDate(doc.createdDateTime)}`);
    if (doc.webUrl) {
      console.log(`URL: ${chalk.dim(doc.webUrl)}`);
    }
    console.log(`ID: ${chalk.dim(formatId(doc.id))}`);
    if (options.verbose) {
      console.log(`Full ID: ${chalk.dim(doc.id)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Export ============

export async function wordExport(docId, options) {
  try {
    const format = options.format || 'docx';
    const validFormats = ['docx', 'pdf'];

    if (!validFormats.includes(format.toLowerCase())) {
      console.error(chalk.red(`Error: Invalid format. Use: ${validFormats.join(', ')}`));
      process.exit(1);
    }

    if (!options.out) {
      console.error(chalk.red('Error: --out is required'));
      process.exit(1);
    }

    console.log(chalk.dim(`Exporting as ${format}...`));

    const convertFormat = format.toLowerCase() === 'pdf' ? 'pdf' : null;
    const response = await downloadDocument(resolveId(docId), convertFormat);

    const fileStream = createWriteStream(options.out);
    await pipeline(response.body, fileStream);

    if (options.json) {
      console.log(JSON.stringify({ success: true, path: options.out, format }));
      return;
    }

    console.log(chalk.green('✓ Exported'));
    console.log(`  Format: ${format}`);
    console.log(`  Saved to: ${options.out}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Copy ============

export async function wordCopy(docId, options) {
  try {
    if (!options.name) {
      console.error(chalk.red('Error: --name is required'));
      process.exit(1);
    }

    const name = options.name.endsWith('.docx') ? options.name : `${options.name}.docx`;

    const result = await copyDocument(resolveId(docId), {
      name,
      parentId: options.folder ? resolveId(options.folder) : undefined,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.green('✓ Copy initiated'));
    console.log(`  New name: ${chalk.cyan(name)}`);
    console.log(chalk.dim('  (Copy operation runs in background)'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Create ============

export async function wordCreate(options) {
  try {
    if (!options.title) {
      console.error(chalk.red('Error: --title is required'));
      process.exit(1);
    }

    const doc = await createDocument(
      options.title,
      options.folder ? resolveId(options.folder) : undefined
    );

    if (options.json) {
      console.log(JSON.stringify(doc, null, 2));
      return;
    }

    console.log(chalk.green('✓ Document created'));
    console.log(`  Name: ${chalk.cyan(doc.name)}`);
    console.log(`  ID: ${chalk.dim(formatId(doc.id))}`);
    if (doc.webUrl) {
      console.log(`  URL: ${chalk.dim(doc.webUrl)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
