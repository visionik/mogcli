import chalk from 'chalk';
import { getCalendars, getEvents, getEvent, createEvent, deleteEvent } from '../api/calendar.js';

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
      calendar: options.calendar
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
        if (currentDate) console.log('');
        console.log(chalk.bold(dateStr));
        currentDate = dateStr;
      }
      
      const time = formatEventTime(event);
      const location = event.location?.displayName ? chalk.dim(` @ ${event.location.displayName}`) : '';
      console.log(`  ${time}  ${chalk.cyan(event.subject)}${location}`);
      
      if (options.verbose) {
        console.log(chalk.dim(`    ID: ${event.id}`));
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
      subject: options.subject,
      start: options.start,
      end: options.end,
      body: options.body,
      location: options.location,
      calendar: options.calendar,
      attendees: options.attendees
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
    console.log(`  ID: ${chalk.dim(event.id)}`);
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

export async function calGet(eventId, options) {
  try {
    const event = await getEvent(eventId, options.calendar);
    
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
      console.log(`Organizer: ${event.organizer.emailAddress?.name || event.organizer.emailAddress?.address}`);
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

export async function calDelete(eventId, options) {
  try {
    await deleteEvent(eventId, options.calendar);
    
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
      console.log(`    ID: ${chalk.dim(cal.id)}`);
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
