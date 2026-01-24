import chalk from 'chalk';
import {
  getCalendars,
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  respondToEvent,
  getFreeBusy,
  getCalendarPermissions,
} from '../api/calendar.js';
import { formatId, resolveId } from '../ids.js';

function formatEventTime(event) {
  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);

  if (event.isAllDay) {
    return chalk.dim('All day');
  }

  const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return chalk.dim(`${startTime} - ${endTime}`);
}

function formatEventDate(event) {
  const start = new Date(event.start.dateTime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const eventDate = new Date(start);
  eventDate.setHours(0, 0, 0, 0);

  if (eventDate.getTime() === today.getTime()) {
    return chalk.green('Today');
  } else if (eventDate.getTime() === tomorrow.getTime()) {
    return chalk.yellow('Tomorrow');
  } else {
    return start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

export async function calList(options) {
  try {
    const eventOptions = {
      max: parseInt(options.max),
      calendar: options.calendar,
    };

    if (options.from) {
      eventOptions.from = options.from;
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventOptions.from = today.toISOString();
    }

    if (options.to) {
      eventOptions.to = options.to;
    }

    const events = await getEvents(eventOptions);

    if (options.json) {
      console.log(JSON.stringify(events, null, 2));
      return;
    }

    if (events.length === 0) {
      console.log(chalk.yellow('No events found'));
      return;
    }

    console.log(chalk.bold('Upcoming Events'));
    console.log('');

    let currentDate = '';
    for (const event of events) {
      const dateStr = formatEventDate(event);
      if (dateStr !== currentDate) {
        if (currentDate) {
          console.log('');
        }
        console.log(chalk.bold(dateStr));
        currentDate = dateStr;
      }

      const time = formatEventTime(event);
      const location = event.location?.displayName
        ? chalk.dim(` @ ${event.location.displayName}`)
        : '';
      console.log(`  ${time}  ${chalk.cyan(event.subject)}${location}`);

      console.log(chalk.dim(`    ID: ${formatId(event.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`    Full: ${event.id}`));
      }
    }

    console.log('');
    console.log(chalk.dim(`${events.length} event(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calCreate(options) {
  try {
    const event = await createEvent({
      subject: options.summary,
      start: options.from,
      end: options.to,
      body: options.description,
      location: options.location,
      calendar: options.calendar ? resolveId(options.calendar) : undefined,
      attendees: options.attendees,
    });

    if (options.json) {
      console.log(JSON.stringify(event, null, 2));
      return;
    }

    console.log(chalk.green('✓ Event created'));
    console.log(`  Subject: ${chalk.cyan(event.subject)}`);
    console.log(`  Start: ${new Date(event.start.dateTime).toLocaleString()}`);
    console.log(`  End: ${new Date(event.end.dateTime).toLocaleString()}`);
    if (event.location?.displayName) {
      console.log(`  Location: ${event.location.displayName}`);
    }
    console.log(`  ID: ${chalk.dim(formatId(event.id))}`);
    if (options.verbose) {
      console.log(`  Full: ${chalk.dim(event.id)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calGet(eventId, options) {
  try {
    const event = await getEvent(
      resolveId(eventId),
      options.calendar ? resolveId(options.calendar) : undefined
    );

    if (options.json) {
      console.log(JSON.stringify(event, null, 2));
      return;
    }

    console.log(chalk.bold(event.subject));
    console.log('');
    console.log(`Start: ${new Date(event.start.dateTime).toLocaleString()}`);
    console.log(`End: ${new Date(event.end.dateTime).toLocaleString()}`);

    if (event.location?.displayName) {
      console.log(`Location: ${event.location.displayName}`);
    }

    if (event.organizer) {
      console.log(
        `Organizer: ${event.organizer.emailAddress?.name || event.organizer.emailAddress?.address}`
      );
    }

    if (event.attendees?.length > 0) {
      console.log('Attendees:');
      for (const a of event.attendees) {
        const status = a.status?.response || 'none';
        console.log(`  - ${a.emailAddress?.name || a.emailAddress?.address} (${status})`);
      }
    }

    if (event.body?.content) {
      console.log('');
      console.log('Description:');
      console.log(event.body.content);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calUpdate(eventId, options) {
  try {
    const updates = {};
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (options.summary) {
      updates.subject = options.summary;
    }
    if (options.from) {
      updates.start = {
        dateTime: options.from,
        timeZone: tz,
      };
    }
    if (options.to) {
      updates.end = {
        dateTime: options.to,
        timeZone: tz,
      };
    }
    if (options.description !== undefined) {
      updates.body = {
        contentType: 'Text',
        content: options.description,
      };
    }
    if (options.location !== undefined) {
      updates.location = {
        displayName: options.location,
      };
    }

    if (Object.keys(updates).length === 0) {
      console.error(chalk.red('Error: No updates provided'));
      console.log(chalk.dim('Use --summary, --from, --to, --description, or --location'));
      process.exit(1);
    }

    const event = await updateEvent(
      resolveId(eventId),
      updates,
      options.calendar ? resolveId(options.calendar) : undefined
    );

    if (options.json) {
      console.log(JSON.stringify(event, null, 2));
      return;
    }

    console.log(chalk.green('✓ Event updated'));
    console.log(`  Title: ${chalk.cyan(event.subject)}`);
    console.log(`  Start: ${chalk.dim(event.start.dateTime)}`);
    console.log(`  End: ${chalk.dim(event.end.dateTime)}`);
    if (event.location?.displayName) {
      console.log(`  Location: ${chalk.dim(event.location.displayName)}`);
    }
    console.log(`  ID: ${chalk.dim(formatId(event.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calDelete(eventId, options) {
  try {
    await deleteEvent(
      resolveId(eventId),
      options.calendar ? resolveId(options.calendar) : undefined
    );

    console.log(chalk.green('✓ Event deleted'));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calCalendars(options) {
  try {
    const calendars = await getCalendars();

    if (options.json) {
      console.log(JSON.stringify(calendars, null, 2));
      return;
    }

    console.log(chalk.bold('Calendars'));
    console.log('');

    for (const cal of calendars) {
      const defaultMark = cal.isDefaultCalendar ? chalk.green(' (default)') : '';
      const color = cal.hexColor ? chalk.hex(cal.hexColor)('●') : '';
      console.log(`  ${color} ${chalk.cyan(cal.name)}${defaultMark}`);
      console.log(`    ID: ${chalk.dim(formatId(cal.id))}`);
      if (options.verbose) {
        console.log(`    Full: ${chalk.dim(cal.id)}`);
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calRespond(eventId, response, options) {
  try {
    // Validate response type
    const validResponses = ['accept', 'tentative', 'decline'];
    if (!validResponses.includes(response.toLowerCase())) {
      console.error(chalk.red(`Error: Invalid response. Use: ${validResponses.join(', ')}`));
      process.exit(1);
    }

    await respondToEvent(
      resolveId(eventId),
      response.toLowerCase(),
      options.comment,
      options.calendar ? resolveId(options.calendar) : undefined
    );

    if (options.json) {
      console.log(JSON.stringify({ success: true, response }));
      return;
    }

    const responseEmoji = {
      accept: '✅',
      tentative: '❓',
      decline: '❌',
    };

    console.log(chalk.green(`${responseEmoji[response.toLowerCase()]} Response sent: ${response}`));
    if (options.comment) {
      console.log(`  Comment: ${chalk.dim(options.comment)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calFreeBusy(emails, options) {
  try {
    // Default to next 24 hours if not specified
    const now = new Date();
    const startTime = options.start || now.toISOString();
    const endTime = options.end || new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const result = await getFreeBusy(emails, startTime, endTime);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold('Free/Busy Schedule'));
    console.log(`${chalk.dim('Period:')} ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleString()}`);
    console.log('');

    const schedules = result.value || [];
    for (const schedule of schedules) {
      console.log(chalk.cyan(schedule.scheduleId));
      
      if (schedule.error) {
        console.log(`  ${chalk.red('Error:')} ${schedule.error.message || 'Unable to retrieve schedule'}`);
        continue;
      }

      if (!schedule.scheduleItems || schedule.scheduleItems.length === 0) {
        console.log(`  ${chalk.green('Free')} - No busy times`);
        continue;
      }

      for (const item of schedule.scheduleItems) {
        const start = new Date(item.start.dateTime).toLocaleString();
        const end = new Date(item.end.dateTime).toLocaleString();
        const status = item.status;
        
        const statusColor = {
          free: chalk.green,
          tentative: chalk.yellow,
          busy: chalk.red,
          oof: chalk.magenta,
          workingElsewhere: chalk.blue,
        };
        
        const colorFn = statusColor[status] || chalk.white;
        console.log(`  ${colorFn(status.toUpperCase())} ${start} - ${end}`);
        if (item.subject) {
          console.log(`    ${chalk.dim(item.subject)}`);
        }
      }
      console.log('');
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calAcl(calendarId, options) {
  try {
    const permissions = await getCalendarPermissions(
      calendarId ? resolveId(calendarId) : undefined
    );

    if (options.json) {
      console.log(JSON.stringify(permissions, null, 2));
      return;
    }

    console.log(chalk.bold('Calendar Permissions'));
    console.log('');

    if (permissions.length === 0) {
      console.log(chalk.yellow('No permissions found'));
      return;
    }

    for (const perm of permissions) {
      const email = perm.emailAddress?.address || perm.emailAddress?.name || 'Unknown';
      const role = perm.role || 'unknown';
      const isRemovable = perm.isRemovable ? '' : chalk.dim(' (built-in)');
      
      const roleColor = {
        owner: chalk.red,
        write: chalk.yellow,
        read: chalk.green,
        freeBusyRead: chalk.blue,
        none: chalk.dim,
      };
      
      const colorFn = roleColor[role] || chalk.white;
      console.log(`  ${chalk.cyan(email)}`);
      console.log(`    Role: ${colorFn(role)}${isRemovable}`);
      console.log(`    ID: ${chalk.dim(formatId(perm.id))}`);
      if (options.verbose) {
        console.log(`    Full: ${chalk.dim(perm.id)}`);
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
