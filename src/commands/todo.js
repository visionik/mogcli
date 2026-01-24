import chalk from 'chalk';
import {
  getLists,
  getTasks,
  getDefaultListId,
  createTask,
  updateTask,
  completeTask,
  uncompleteTask,
  deleteTask,
  clearCompletedTasks,
} from '../api/todo.js';
import { formatId, resolveId } from '../ids.js';

// ============ Lists ============

export async function listLists(options) {
  try {
    const lists = await getLists();

    if (options.json) {
      console.log(JSON.stringify(lists, null, 2));
      return;
    }

    if (lists.length === 0) {
      console.log(chalk.yellow('No task lists found'));
      return;
    }

    console.log(chalk.bold('Task Lists'));
    console.log('');

    for (const list of lists) {
      const isDefault = list.wellknownListName === 'defaultList';
      const marker = isDefault ? chalk.green(' (default)') : '';
      console.log(`  ${chalk.cyan(list.displayName)}${marker}`);
      console.log(`    ID: ${chalk.dim(formatId(list.id))}`);
      if (options.verbose) {
        console.log(`    Full: ${chalk.dim(list.id)}`);
      }
    }

    console.log('');
    console.log(chalk.dim(`Total: ${lists.length} list(s)`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Tasks ============

function formatDate(dateTime) {
  if (!dateTime) {
    return null;
  }
  const date = new Date(dateTime.dateTime);
  return date.toLocaleDateString();
}

function formatTask(task) {
  const status = task.status === 'completed' ? chalk.green('✓') : chalk.dim('○');

  const title = task.status === 'completed' ? chalk.strikethrough.dim(task.title) : task.title;

  let dueStr = '';
  if (task.dueDateTime) {
    const dueDate = new Date(task.dueDateTime.dateTime);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today && task.status !== 'completed') {
      dueStr = chalk.red(` (overdue: ${formatDate(task.dueDateTime)})`);
    } else {
      dueStr = chalk.dim(` (due: ${formatDate(task.dueDateTime)})`);
    }
  }

  const importance = task.importance === 'high' ? chalk.red(' !') : '';

  return `  ${status} ${title}${importance}${dueStr}`;
}

export async function listTasks(listIdOrName, options) {
  try {
    const { listId, listName } = await resolveListId(listIdOrName);

    const fetchOptions = {};
    if (!options.all) {
      fetchOptions.filter = "status ne 'completed'";
    }

    const tasks = await getTasks(listId, fetchOptions);

    if (options.json) {
      console.log(JSON.stringify(tasks, null, 2));
      return;
    }

    if (tasks.length === 0) {
      if (options.all) {
        console.log(chalk.yellow(`No tasks in "${listName}"`));
      } else {
        console.log(chalk.green(`✓ All tasks complete in "${listName}"!`));
      }
      return;
    }

    console.log(chalk.bold(`Tasks in "${listName}"`));
    console.log('');

    tasks.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'completed' ? 1 : -1;
      }
      if (a.dueDateTime && b.dueDateTime) {
        return new Date(a.dueDateTime.dateTime) - new Date(b.dueDateTime.dateTime);
      }
      if (a.dueDateTime) {
        return -1;
      }
      if (b.dueDateTime) {
        return 1;
      }
      return 0;
    });

    for (const task of tasks) {
      console.log(formatTask(task));
      console.log(chalk.dim(`      ID: ${formatId(task.id)}`));
      if (options.verbose) {
        console.log(chalk.dim(`      Full: ${task.id}`));
        if (task.body?.content) {
          console.log(chalk.dim(`      Note: ${task.body.content.substring(0, 50)}...`));
        }
      }
    }

    console.log('');
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.length - completed;
    console.log(chalk.dim(`${pending} pending, ${completed} completed`));
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Add ============

function parseDate(dateStr) {
  if (!dateStr) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lower = dateStr.toLowerCase();
  if (lower === 'today') {
    return today.toISOString().split('T')[0] + 'T00:00:00';
  }
  if (lower === 'tomorrow') {
    today.setDate(today.getDate() + 1);
    return today.toISOString().split('T')[0] + 'T00:00:00';
  }
  if (lower === 'next week') {
    today.setDate(today.getDate() + 7);
    return today.toISOString().split('T')[0] + 'T00:00:00';
  }

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = days.indexOf(lower);
  if (dayIndex !== -1) {
    const currentDay = today.getDay();
    let daysUntil = dayIndex - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }
    today.setDate(today.getDate() + daysUntil);
    return today.toISOString().split('T')[0] + 'T00:00:00';
  }

  const plusDays = lower.match(/^\+(\d+)(?:d|days?)?$/);
  if (plusDays) {
    today.setDate(today.getDate() + parseInt(plusDays[1]));
    return today.toISOString().split('T')[0] + 'T00:00:00';
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0] + 'T00:00:00';
  }

  throw new Error(`Could not parse date: ${dateStr}`);
}

async function resolveListId(listIdOrName) {
  if (!listIdOrName) {
    const listId = await getDefaultListId();
    const lists = await getLists();
    const defaultList = lists.find((l) => l.id === listId);
    return { listId, listName: defaultList?.displayName || 'Tasks' };
  }

  // Try resolving as slug first
  const resolved = resolveId(listIdOrName);
  const lists = await getLists();

  // Check if resolved ID matches a list
  let list = lists.find((l) => l.id === resolved);

  // If not found, try by name
  if (!list) {
    list = lists.find((l) => l.displayName.toLowerCase() === listIdOrName.toLowerCase());
  }

  if (list) {
    return { listId: list.id, listName: list.displayName };
  }

  // Use resolved ID anyway (might be valid)
  return { listId: resolved, listName: listIdOrName };
}

export async function addTask(title, options) {
  try {
    const { listId, listName } = await resolveListId(options.list);

    const taskData = { title };

    if (options.due) {
      taskData.dueDateTime = parseDate(options.due);
    }
    if (options.notes || options.note) {
      taskData.body = options.notes || options.note;
    }
    if (options.important) {
      taskData.importance = 'high';
    }

    const task = await createTask(listId, taskData);

    if (options.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(chalk.green('✓ Task created'));
    console.log(`  Title: ${chalk.cyan(task.title)}`);
    console.log(`  List: ${chalk.dim(listName)}`);
    if (task.dueDateTime) {
      console.log(`  Due: ${chalk.dim(task.dueDateTime.dateTime.split('T')[0])}`);
    }
    console.log(`  ID: ${chalk.dim(formatId(task.id))}`);
    if (options.verbose) {
      console.log(`  Full: ${chalk.dim(task.id)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Complete ============

async function findTaskByPartialId(listId, partialId) {
  // First try resolving via our short ID cache
  const resolvedId = resolveId(partialId);

  const tasks = await getTasks(listId, {});

  // Check if resolved ID matches
  const task = tasks.find((t) => t.id === resolvedId);
  if (task) {
    return task;
  }

  // Fall back to partial match (prefix matching)
  const matches = tasks.filter((t) => t.id.startsWith(partialId));
  if (matches.length === 1) {
    return matches[0];
  }
  if (matches.length > 1) {
    throw new Error(`Ambiguous task ID: ${partialId} (${matches.length} matches)`);
  }

  return null;
}

export async function markComplete(taskId, options) {
  try {
    const { listId } = await resolveListId(options.list);

    let actualTaskId = taskId;
    if (taskId.length < 20) {
      const task = await findTaskByPartialId(listId, taskId);
      if (!task) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }
      actualTaskId = task.id;
    }

    const task = await completeTask(listId, actualTaskId);

    if (options.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(chalk.green('✓ Task completed'));
    console.log(`  ${chalk.strikethrough(task.title)}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Undo (Uncomplete) ============

export async function markUncomplete(taskId, options) {
  try {
    const { listId } = await resolveListId(options.list);

    let actualTaskId = taskId;
    if (taskId.length < 20) {
      const task = await findTaskByPartialId(listId, taskId);
      if (!task) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }
      actualTaskId = task.id;
    }

    const task = await uncompleteTask(listId, actualTaskId);

    if (options.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(chalk.green('✓ Task marked incomplete'));
    console.log(`  ${task.title}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Update ============

export async function editTask(taskId, options) {
  try {
    const { listId, listName } = await resolveListId(options.list);

    let actualTaskId = taskId;
    if (taskId.length < 20) {
      const task = await findTaskByPartialId(listId, taskId);
      if (!task) {
        console.error(chalk.red(`Task not found: ${taskId}`));
        process.exit(1);
      }
      actualTaskId = task.id;
    }

    const updates = {};

    if (options.title) {
      updates.title = options.title;
    }
    if (options.notes !== undefined) {
      updates.body = {
        content: options.notes,
        contentType: 'text',
      };
    }
    if (options.due) {
      updates.dueDateTime = {
        dateTime: parseDate(options.due),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (options.important !== undefined) {
      updates.importance = options.important ? 'high' : 'normal';
    }

    if (Object.keys(updates).length === 0) {
      console.error(chalk.red('Error: No updates provided'));
      console.log(chalk.dim('Use --title, --notes, --due, or --important'));
      process.exit(1);
    }

    const task = await updateTask(listId, actualTaskId, updates);

    if (options.json) {
      console.log(JSON.stringify(task, null, 2));
      return;
    }

    console.log(chalk.green('✓ Task updated'));
    console.log(`  Title: ${chalk.cyan(task.title)}`);
    console.log(`  List: ${chalk.dim(listName)}`);
    if (task.dueDateTime) {
      console.log(`  Due: ${chalk.dim(task.dueDateTime.dateTime.split('T')[0])}`);
    }
    console.log(`  ID: ${chalk.dim(formatId(task.id))}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Delete ============

export async function removeTask(taskId, options) {
  try {
    const { listId } = await resolveListId(options.list);

    let actualTaskId = taskId;
    let taskTitle = taskId;

    const task = await findTaskByPartialId(listId, taskId);
    if (task) {
      actualTaskId = task.id;
      taskTitle = task.title;
    } else if (taskId.length < 20) {
      console.error(chalk.red(`Task not found: ${taskId}`));
      process.exit(1);
    }

    await deleteTask(listId, actualTaskId);

    if (options.json) {
      console.log(JSON.stringify({ success: true, taskId: actualTaskId }));
      return;
    }

    console.log(chalk.green('✓ Task deleted'));
    console.log(`  ${chalk.dim(taskTitle)}`);
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Clear Completed ============

export async function clearCompleted(listIdOrName, options) {
  try {
    const { listId, listName } = await resolveListId(listIdOrName);

    const cleared = await clearCompletedTasks(listId);

    if (options.json) {
      console.log(JSON.stringify({ success: true, cleared: cleared.length, tasks: cleared }));
      return;
    }

    if (cleared.length === 0) {
      console.log(chalk.yellow(`No completed tasks to clear in "${listName}"`));
      return;
    }

    console.log(chalk.green(`✓ Cleared ${cleared.length} completed task(s) from "${listName}"`));
    for (const task of cleared) {
      console.log(`  ${chalk.dim('○')} ${chalk.strikethrough.dim(task.title)}`);
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}
