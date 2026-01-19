import chalk from 'chalk';
import { readFileSync, writeFileSync, createWriteStream } from 'fs';
import { basename } from 'path';
import { pipeline } from 'stream/promises';
import { listItems, searchFiles, getItem, downloadFile, uploadFile, createFolder, deleteItem } from '../api/drive.js';

function formatSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
}

function formatItem(item) {
  const isFolder = !!item.folder;
  const icon = isFolder ? chalk.blue('📁') : '📄';
  const name = isFolder ? chalk.blue(item.name) : item.name;
  const size = isFolder ? chalk.dim(`${item.folder.childCount} items`) : chalk.dim(formatSize(item.size));
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
    const folders = items.filter(i => i.folder);
    const files = items.filter(i => !i.folder);
    
    for (const item of [...folders, ...files]) {
      console.log(formatItem(item));
      if (options.verbose) {
        console.log(chalk.dim(`  ID: ${item.id}`));
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
      if (options.verbose) {
        console.log(chalk.dim(`  ID: ${item.id}`));
      }
    }
    
    console.log('');
    console.log(chalk.dim(`${items.length} result(s)`));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveDownload(itemId, options) {
  try {
    console.log(chalk.dim('Downloading...'));
    
    const response = await downloadFile(itemId);
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
      folder: options.folder
    });
    
    if (options.json) {
      console.log(JSON.stringify(item, null, 2));
      return;
    }
    
    console.log(chalk.green('✓ Uploaded'));
    console.log(`  Name: ${chalk.cyan(item.name)}`);
    console.log(`  Size: ${formatSize(item.size)}`);
    console.log(`  ID: ${chalk.dim(item.id)}`);
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
    const folder = await createFolder(name, options.parent);
    
    if (options.json) {
      console.log(JSON.stringify(folder, null, 2));
      return;
    }
    
    console.log(chalk.green('✓ Folder created'));
    console.log(`  Name: ${chalk.cyan(folder.name)}`);
    console.log(`  ID: ${chalk.dim(folder.id)}`);
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function driveRm(itemId, options) {
  try {
    await deleteItem(itemId);
    
    console.log(chalk.green('✓ Deleted'));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
