import chalk from 'chalk';
import { readFileSync, createWriteStream } from 'fs';
import { basename } from 'path';
import { pipeline } from 'stream/promises';
import {
  listItems,
  searchFiles,
  getItem,
  downloadFile,
  uploadFile,
  createFolder,
  deleteItem,
  moveItem,
  renameItem,
  copyItem,
} from '../api/drive.js';
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
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatItem(item) {
  const isFolder = !!item.folder;
  const icon = isFolder ? chalk.blue('📁') : '📄';
  const name = isFolder ? chalk.blue(item.name) : item.name;
  const size = isFolder
    ? chalk.dim(`${item.folder.childCount} items`)
    : chalk.dim(formatSize(item.size));
  const date = chalk.dim(formatDate(item.lastModifiedDateTime));

  return `${icon} ${name.padEnd(40)} ${size.padEnd(12)} ${date}`;
}

export async function driveLs(path, options) {
  try {
    const items = await listItems(path, { max: parseInt(options.max) });

    if (options.json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log(chalk.yellow('Folder is empty'));
      return;
    }

    console.log(chalk.bold(`Contents of ${path || 'root'}`));
    console.log('');

    // Folders first, then files
    const folders = items.filter((i) => i.folder);
    const files = items.filter((i) => !i.folder);

    for (const item of [...folders, ...files]) {
      console.log(formatItem(item));
      console.log(chalk.dim(`  ID: ${formatId(item.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`  Full: ${item.id}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${folders.length} folder(s), ${files.length} file(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveSearch(query, options) {
  try {
    const items = await searchFiles(query, { max: parseInt(options.max) });

    if (options.json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      console.log(chalk.yellow('No files found'));
      return;
    }

    console.log(chalk.bold(`Search results for "${query}"`));
    console.log('');

    for (const item of items) {
      console.log(formatItem(item));
      if (item.parentReference?.path) {
        console.log(chalk.dim(`  Path: ${item.parentReference.path.replace('/drive/root:', '')}`));
      }
      console.log(chalk.dim(`  ID: ${formatId(item.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`  Full: ${item.id}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${items.length} result(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveGet(itemId, options) {
  try {
    const item = await getItem(resolveId(itemId));

    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    console.log(chalk.bold(item.name));
    console.log('');

    const isFolder = !!item.folder;
    console.log(`  Type: ${isFolder ? 'Folder' : 'File'}`);
    if (!isFolder && item.size) {
      console.log(`  Size: ${formatSize(item.size)}`);
    }
    if (isFolder && item.folder?.childCount !== undefined) {
      console.log(`  Items: ${item.folder.childCount}`);
    }
    console.log(`  Modified: ${formatDate(item.lastModifiedDateTime)}`);
    if (item.createdDateTime) {
      console.log(`  Created: ${formatDate(item.createdDateTime)}`);
    }
    if (item.webUrl) {
      console.log(`  URL: ${chalk.dim(item.webUrl)}`);
    }
    if (item.parentReference?.path) {
      console.log(`  Path: ${chalk.dim(item.parentReference.path.replace('/drive/root:', ''))}`);
    }
    console.log(`  ID: ${chalk.dim(formatId(item.id))}`);
    if (options.verbose) {
      console.log(`  Full: ${chalk.dim(item.id)}`);
    }
    if (item.file?.mimeType) {
      console.log(`  MIME: ${chalk.dim(item.file.mimeType)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveDownload(itemId, options) {
  try {
    console.log(chalk.dim('Downloading...'));

    const response = await downloadFile(resolveId(itemId));
    const outPath = options.out;

    // Stream to file
    const fileStream = createWriteStream(outPath);
    await pipeline(response.body, fileStream);

    console.log(chalk.green('✓ Downloaded'));
    console.log(`  Saved to: ${outPath}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveUpload(localPath, options) {
  try {
    const content = readFileSync(localPath);
    const name = options.name || basename(localPath);

    console.log(chalk.dim(`Uploading ${name}...`));

    const item = await uploadFile(content, {
      name,
      folder: options.folder ? resolveId(options.folder) : undefined,
    });

    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    console.log(chalk.green('✓ Uploaded'));
    console.log(`  Name: ${chalk.cyan(item.name)}`);
    console.log(`  Size: ${formatSize(item.size)}`);
    console.log(`  ID: ${chalk.dim(formatId(item.id))}`);
    if (item.webUrl) {
      console.log(`  URL: ${chalk.dim(item.webUrl)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveMkdir(name, options) {
  try {
    const folder = await createFolder(name, options.parent ? resolveId(options.parent) : undefined);

    if (options.json) {
      console.log(JSON.stringify(folder, null, 2));
      return;
    }

    console.log(chalk.green('✓ Folder created'));
    console.log(`  Name: ${chalk.cyan(folder.name)}`);
    console.log(`  ID: ${chalk.dim(formatId(folder.id))}`);
    if (options.verbose) {
      console.log(`  Full: ${chalk.dim(folder.id)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveRm(itemId, _options) {
  try {
    await deleteItem(resolveId(itemId));

    console.log(chalk.green('✓ Deleted'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveMove(itemId, destinationId, options) {
  try {
    const item = await moveItem(resolveId(itemId), resolveId(destinationId));

    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    console.log(chalk.green('✓ Moved'));
    console.log(`  Name: ${chalk.cyan(item.name)}`);
    if (item.parentReference?.path) {
      console.log(`  To: ${chalk.dim(item.parentReference.path.replace('/drive/root:', ''))}`);
    }
    console.log(`  ID: ${chalk.dim(formatId(item.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveRename(itemId, newName, options) {
  try {
    const item = await renameItem(resolveId(itemId), newName);

    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }

    console.log(chalk.green('✓ Renamed'));
    console.log(`  Name: ${chalk.cyan(item.name)}`);
    console.log(`  ID: ${chalk.dim(formatId(item.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveCopy(itemId, options) {
  try {
    const result = await copyItem(resolveId(itemId), {
      name: options.name,
      destinationFolderId: options.folder ? resolveId(options.folder) : undefined,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.green('✓ Copy initiated'));
    if (options.name) {
      console.log(`  New name: ${chalk.cyan(options.name)}`);
    }
    console.log(chalk.dim('  (Copy operation runs in background)'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
