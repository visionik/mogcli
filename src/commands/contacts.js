import chalk from 'chalk';
import {
  getContacts,
  searchContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  searchDirectory,
} from '../api/contacts.js';
import { formatId, resolveId } from '../ids.js';

function formatContact(contact) {
  const name = contact.displayName || 'Unknown';
  const email = contact.emailAddresses?.[0]?.address || '';
  const phone = contact.mobilePhone || contact.businessPhones?.[0] || '';

  let line = `  ${chalk.cyan(name)}`;
  if (email) {
    line += `  ${chalk.dim(email)}`;
  }
  if (phone) {
    line += `  ${chalk.dim(phone)}`;
  }

  return line;
}

export async function contactsList(options) {
  try {
    const contacts = await getContacts({ max: parseInt(options.max) });

    if (options.json) {
      console.log(JSON.stringify(contacts, null, 2));
      return;
    }

    if (contacts.length === 0) {
      console.log(chalk.yellow('No contacts found'));
      return;
    }

    console.log(chalk.bold('Contacts'));
    console.log('');

    for (const contact of contacts) {
      console.log(formatContact(contact));
      console.log(chalk.dim(`    ID: ${formatId(contact.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`    Full: ${contact.id}`));
      }
      if (contact.companyName) {
        console.log(chalk.dim(`    Company: ${contact.companyName}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${contacts.length} contact(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function contactsSearch(query, options) {
  try {
    const contacts = await searchContacts(query, { max: parseInt(options.max) });

    if (options.json) {
      console.log(JSON.stringify(contacts, null, 2));
      return;
    }

    if (contacts.length === 0) {
      console.log(chalk.yellow('No contacts found'));
      return;
    }

    console.log(chalk.bold(`Search results for "${query}"`));
    console.log('');

    for (const contact of contacts) {
      // Handle both contact and people API results
      const name = contact.displayName || contact.givenName || 'Unknown';
      const email =
        contact.emailAddresses?.[0]?.address || contact.scoredEmailAddresses?.[0]?.address || '';
      const phone = contact.mobilePhone || contact.phones?.[0]?.number || '';

      let line = `  ${chalk.cyan(name)}`;
      if (email) {
        line += `  ${chalk.dim(email)}`;
      }
      if (phone) {
        line += `  ${chalk.dim(phone)}`;
      }

      console.log(line);
      if (contact.id) {
        console.log(chalk.dim(`    ID: ${formatId(contact.id)}`));
      }
      if (options.verbose && contact.id) {
        console.log(chalk.dim(`    Full: ${contact.id}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${contacts.length} result(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function contactsGet(contactId, options) {
  try {
    const contact = await getContact(resolveId(contactId));

    if (options.json) {
      console.log(JSON.stringify(contact, null, 2));
      return;
    }

    console.log(chalk.bold(contact.displayName || 'Unknown'));
    console.log('');

    if (contact.emailAddresses?.length > 0) {
      console.log('Email:');
      for (const email of contact.emailAddresses) {
        console.log(`  ${email.address}`);
      }
    }

    if (contact.mobilePhone) {
      console.log(`Mobile: ${contact.mobilePhone}`);
    }

    if (contact.businessPhones?.length > 0) {
      console.log('Work:');
      for (const phone of contact.businessPhones) {
        console.log(`  ${phone}`);
      }
    }

    if (contact.companyName) {
      console.log(`Company: ${contact.companyName}`);
    }

    if (contact.jobTitle) {
      console.log(`Title: ${contact.jobTitle}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function contactsCreate(options) {
  try {
    if (!options.name && !options.email) {
      console.error(chalk.red('Error: Must provide at least --name or --email'));
      process.exit(1);
    }

    const contact = await createContact({
      name: options.name,
      email: options.email,
      phone: options.phone,
      company: options.company,
      title: options.title,
    });

    if (options.json) {
      console.log(JSON.stringify(contact, null, 2));
      return;
    }

    console.log(chalk.green('✓ Contact created'));
    console.log(`  Name: ${chalk.cyan(contact.displayName || '(none)')}`);
    if (contact.emailAddresses?.length > 0) {
      console.log(`  Email: ${chalk.dim(contact.emailAddresses[0].address)}`);
    }
    if (contact.mobilePhone) {
      console.log(`  Phone: ${chalk.dim(contact.mobilePhone)}`);
    }
    console.log(`  ID: ${chalk.dim(formatId(contact.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function contactsUpdate(contactId, options) {
  try {
    const updates = {};
    if (options.name) {
      updates.name = options.name;
    }
    if (options.email) {
      updates.email = options.email;
    }
    if (options.phone) {
      updates.phone = options.phone;
    }
    if (options.company) {
      updates.company = options.company;
    }
    if (options.title) {
      updates.title = options.title;
    }

    if (Object.keys(updates).length === 0) {
      console.error(chalk.red('Error: No updates provided'));
      console.log(chalk.dim('Use --name, --email, --phone, --company, or --title'));
      process.exit(1);
    }

    const contact = await updateContact(resolveId(contactId), updates);

    if (options.json) {
      console.log(JSON.stringify(contact, null, 2));
      return;
    }

    console.log(chalk.green('✓ Contact updated'));
    console.log(`  Name: ${chalk.cyan(contact.displayName || '(none)')}`);
    console.log(`  ID: ${chalk.dim(formatId(contact.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function contactsDelete(contactId, options) {
  try {
    await deleteContact(resolveId(contactId));

    if (options.json) {
      console.log(JSON.stringify({ success: true }));
      return;
    }

    console.log(chalk.green('✓ Contact deleted'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function contactsDirectory(query, options) {
  try {
    const users = await searchDirectory(query, { max: parseInt(options.max) });

    if (options.json) {
      console.log(JSON.stringify(users, null, 2));
      return;
    }

    if (users.length === 0) {
      console.log(chalk.yellow('No users found in directory'));
      return;
    }

    console.log(chalk.bold(`Directory search for "${query}"`));
    console.log('');

    for (const user of users) {
      const name = user.displayName || 'Unknown';
      const email = user.mail || user.userPrincipalName || '';
      
      console.log(`  ${chalk.cyan(name)}`);
      if (email) {
        console.log(`    Email: ${chalk.dim(email)}`);
      }
      if (user.jobTitle) {
        console.log(`    Title: ${chalk.dim(user.jobTitle)}`);
      }
      if (user.department) {
        console.log(`    Dept: ${chalk.dim(user.department)}`);
      }
      if (user.officeLocation) {
        console.log(`    Office: ${chalk.dim(user.officeLocation)}`);
      }
      if (user.id) {
        console.log(`    ID: ${chalk.dim(formatId(user.id))}`);
      }
      if (options.verbose && user.id) {
        console.log(`    Full: ${chalk.dim(user.id)}`);
      }
      console.log('');
    }

    console.log(chalk.dim(`${users.length} user(s) found`));
  } catch (error) {
    // Handle permission errors gracefully
    if (error.message?.includes('Authorization') || error.message?.includes('Forbidden') || error.message?.includes('Access')) {
      console.error(chalk.red('Error: Insufficient permissions'));
      console.log(chalk.dim('Directory search requires User.Read.All permission.'));
      console.log(chalk.dim('This may not be available for personal Microsoft accounts.'));
      process.exit(1);
    }
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
