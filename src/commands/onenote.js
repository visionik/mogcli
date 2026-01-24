import chalk from 'chalk';
import {
  listNotebooks,
  getNotebook,
  listSections,
  listPages,
  getPage,
  getPageContent,
  createNotebook,
  createSection,
  createPage,
  deletePage,
  searchPages,
  htmlToText,
} from '../api/onenote.js';
import { formatId, resolveId } from '../ids.js';

function formatDate(dateStr) {
  if (!dateStr) {
    return '-';
  }
  return new Date(dateStr).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============ List Notebooks ============

export async function onenoteNotebooks(options) {
  try {
    const notebooks = await listNotebooks({ max: parseInt(options.max) || 50 });

    if (options.json) {
      console.log(JSON.stringify(notebooks, null, 2));
      return;
    }

    if (notebooks.length === 0) {
      console.log(chalk.yellow('No notebooks found'));
      return;
    }

    console.log(chalk.bold('OneNote Notebooks'));
    console.log('');

    for (const nb of notebooks) {
      const isDefault = nb.isDefault ? chalk.green(' (default)') : '';
      const date = chalk.dim(formatDate(nb.lastModifiedDateTime));
      console.log(`📓 ${chalk.cyan(nb.displayName)}${isDefault}  ${date}`);
      console.log(chalk.dim(`   ID: ${formatId(nb.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`   Full: ${nb.id}`));
        if (nb.userRole) {
          console.log(chalk.dim(`   Role: ${nb.userRole}`));
        }
      }
    }

    console.log('');
    console.log(chalk.dim(`${notebooks.length} notebook(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ List Sections ============

export async function onenoteSections(notebookId, options) {
  try {
    const sections = await listSections(resolveId(notebookId), { max: parseInt(options.max) || 50 });

    if (options.json) {
      console.log(JSON.stringify(sections, null, 2));
      return;
    }

    if (sections.length === 0) {
      console.log(chalk.yellow('No sections found in this notebook'));
      return;
    }

    console.log(chalk.bold('Sections'));
    console.log('');

    for (const sec of sections) {
      const isDefault = sec.isDefault ? chalk.green(' (default)') : '';
      const date = chalk.dim(formatDate(sec.lastModifiedDateTime));
      console.log(`📁 ${chalk.cyan(sec.displayName)}${isDefault}  ${date}`);
      console.log(chalk.dim(`   ID: ${formatId(sec.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`   Full: ${sec.id}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${sections.length} section(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ List Pages ============

export async function onenotePages(sectionId, options) {
  try {
    const pages = await listPages(resolveId(sectionId), { max: parseInt(options.max) || 50 });

    if (options.json) {
      console.log(JSON.stringify(pages, null, 2));
      return;
    }

    if (pages.length === 0) {
      console.log(chalk.yellow('No pages found in this section'));
      return;
    }

    console.log(chalk.bold('Pages'));
    console.log('');

    for (const pg of pages) {
      const date = chalk.dim(formatDate(pg.lastModifiedDateTime));
      console.log(`📄 ${chalk.cyan(pg.title || '(Untitled)')}  ${date}`);
      console.log(chalk.dim(`   ID: ${formatId(pg.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`   Full: ${pg.id}`));
        if (pg.level !== undefined) {
          console.log(chalk.dim(`   Level: ${pg.level}`));
        }
      }
    }

    console.log('');
    console.log(chalk.dim(`${pages.length} page(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Get Page Content ============

export async function onenoteGet(pageId, options) {
  try {
    // Get metadata first
    const page = await getPage(resolveId(pageId));

    // Get content
    const response = await getPageContent(resolveId(pageId));

    // Handle both response types (raw response or string)
    let html;
    if (typeof response === 'string') {
      html = response;
    } else if (response && typeof response.text === 'function') {
      html = await response.text();
    } else {
      html = String(response || '');
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            ...page,
            content: options.html ? html : htmlToText(html),
          },
          null,
          2
        )
      );
      return;
    }

    console.log(chalk.bold(page.title || '(Untitled)'));
    console.log(chalk.dim(`ID: ${formatId(page.id)}`));
    console.log(chalk.dim(`Modified: ${formatDate(page.lastModifiedDateTime)}`));
    console.log('');

    if (options.html) {
      console.log(html);
    } else {
      const text = htmlToText(html);
      console.log(text || chalk.dim('(Empty page)'));
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Create Notebook ============

export async function onenoteCreateNotebook(name, options) {
  try {
    if (!name) {
      console.error(chalk.red('Error: notebook name is required'));
      process.exit(1);
    }

    const notebook = await createNotebook(name);

    if (options.json) {
      console.log(JSON.stringify(notebook, null, 2));
      return;
    }

    console.log(chalk.green('✓ Notebook created'));
    console.log(`  Name: ${chalk.cyan(notebook.displayName)}`);
    console.log(`  ID: ${chalk.dim(formatId(notebook.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Create Section ============

export async function onenoteCreateSection(notebookId, name, options) {
  try {
    if (!notebookId || !name) {
      console.error(chalk.red('Error: notebook ID and section name are required'));
      process.exit(1);
    }

    const section = await createSection(resolveId(notebookId), name);

    if (options.json) {
      console.log(JSON.stringify(section, null, 2));
      return;
    }

    console.log(chalk.green('✓ Section created'));
    console.log(`  Name: ${chalk.cyan(section.displayName)}`);
    console.log(`  ID: ${chalk.dim(formatId(section.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Create Page ============

export async function onenoteCreatePage(sectionId, title, content, options) {
  try {
    if (!sectionId || !title) {
      console.error(chalk.red('Error: section ID and page title are required'));
      process.exit(1);
    }

    const page = await createPage(resolveId(sectionId), title, content || '');

    if (options.json) {
      console.log(JSON.stringify(page, null, 2));
      return;
    }

    console.log(chalk.green('✓ Page created'));
    console.log(`  Title: ${chalk.cyan(page.title || title)}`);
    console.log(`  ID: ${chalk.dim(formatId(page.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Delete Page ============

export async function onenoteDelete(pageId, options) {
  try {
    if (!pageId) {
      console.error(chalk.red('Error: page ID is required'));
      process.exit(1);
    }

    await deletePage(resolveId(pageId));

    if (options.json) {
      console.log(JSON.stringify({ success: true, pageId }, null, 2));
      return;
    }

    console.log(chalk.green('✓ Page deleted'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Search ============

export async function onenoteSearch(query, options) {
  try {
    if (!query) {
      console.error(chalk.red('Error: search query is required'));
      process.exit(1);
    }

    const pages = await searchPages(query, { max: parseInt(options.max) || 25 });

    if (options.json) {
      console.log(JSON.stringify(pages, null, 2));
      return;
    }

    if (pages.length === 0) {
      console.log(chalk.yellow('No pages found matching your search'));
      return;
    }

    console.log(chalk.bold(`Search Results for "${query}"`));
    console.log('');

    for (const pg of pages) {
      const date = chalk.dim(formatDate(pg.lastModifiedDateTime));
      const section = pg.parentSection?.displayName
        ? chalk.dim(` in ${pg.parentSection.displayName}`)
        : '';
      console.log(`📄 ${chalk.cyan(pg.title || '(Untitled)')}${section}  ${date}`);
      console.log(chalk.dim(`   ID: ${formatId(pg.id)}`));
      if (options.verbose && pg.parentSection) {
        console.log(chalk.dim(`   Section ID: ${formatId(pg.parentSection.id)}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${pages.length} result(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
