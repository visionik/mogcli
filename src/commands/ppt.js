import chalk from 'chalk';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import {
  listPresentations,
  getPresentation,
  downloadPresentation,
  copyPresentation,
  createPresentation,
} from '../api/ppt.js';
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

export async function pptList(options) {
  try {
    const presentations = await listPresentations({ max: parseInt(options.max) || 50 });

    if (options.json) {
      console.log(JSON.stringify(presentations, null, 2));
      return;
    }

    if (presentations.length === 0) {
      console.log(chalk.yellow('No PowerPoint presentations found'));
      return;
    }

    console.log(chalk.bold('PowerPoint Presentations'));
    console.log('');

    for (const ppt of presentations) {
      const size = chalk.dim(formatSize(ppt.size));
      const date = chalk.dim(formatDate(ppt.lastModifiedDateTime));
      console.log(`📊 ${chalk.cyan(ppt.name)}  ${size}  ${date}`);
      console.log(chalk.dim(`   ID: ${formatId(ppt.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`   Full: ${ppt.id}`));
        if (ppt.webUrl) {
          console.log(chalk.dim(`   URL: ${ppt.webUrl}`));
        }
      }
    }

    console.log('');
    console.log(chalk.dim(`${presentations.length} presentation(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Get ============

export async function pptGet(pptId, options) {
  try {
    const ppt = await getPresentation(resolveId(pptId));

    if (options.json) {
      console.log(JSON.stringify(ppt, null, 2));
      return;
    }

    console.log(chalk.bold(ppt.name));
    console.log('');
    console.log(`Size: ${formatSize(ppt.size)}`);
    console.log(`Modified: ${formatDate(ppt.lastModifiedDateTime)}`);
    console.log(`Created: ${formatDate(ppt.createdDateTime)}`);
    if (ppt.webUrl) {
      console.log(`URL: ${chalk.dim(ppt.webUrl)}`);
    }
    console.log(`ID: ${chalk.dim(formatId(ppt.id))}`);
    if (options.verbose) {
      console.log(`Full ID: ${chalk.dim(ppt.id)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Export ============

export async function pptExport(pptId, options) {
  try {
    const format = options.format || 'pptx';
    const validFormats = ['pptx', 'pdf'];

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
    const response = await downloadPresentation(resolveId(pptId), convertFormat);

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

export async function pptCopy(pptId, options) {
  try {
    if (!options.name) {
      console.error(chalk.red('Error: --name is required'));
      process.exit(1);
    }

    const name = options.name.endsWith('.pptx') ? options.name : `${options.name}.pptx`;

    const result = await copyPresentation(resolveId(pptId), {
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

export async function pptCreate(options) {
  try {
    if (!options.title) {
      console.error(chalk.red('Error: --title is required'));
      process.exit(1);
    }

    const ppt = await createPresentation(
      options.title,
      options.folder ? resolveId(options.folder) : undefined
    );

    if (options.json) {
      console.log(JSON.stringify(ppt, null, 2));
      return;
    }

    console.log(chalk.green('✓ Presentation created'));
    console.log(`  Name: ${chalk.cyan(ppt.name)}`);
    console.log(`  ID: ${chalk.dim(formatId(ppt.id))}`);
    if (ppt.webUrl) {
      console.log(`  URL: ${chalk.dim(ppt.webUrl)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
