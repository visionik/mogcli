import chalk from 'chalk';
import { 
  getLists, 
  getTasks, 
  getDefaultListId, 
  getListByName, 
  createTask, 
  completeTask, 
  deleteTask 
} from '../api/todo.js';

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
      console.log(`    ID: ${chalk.dim(list.id)}`);
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
  if (!dateTime) return null;
  const date = new Date(dateTime.dateTime);
  return date.toLocaleDateString();
}

function formatTask(task) {
  const status = task.status === 'completed' 
    ? chalk.green('✓') 
    : chalk.dim('○');
  
  const title = task.status === 'completed'
    ? chalk.strikethrough.dim(task.title)
    : task.title;
  
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
    let listId = listIdOrName;
    let listName = 'Tasks';
    
    if (!listId) {
      listId = await getDefaultListId();
      const lists = await getLists();
      const defaultList = lists.find(l => l.id === listId);
      if (defaultList) listName = defaultList.displayName;
    } else if (!listId.includes('-')) {
      const list = await getListByName(listId);
      if (list) {
        listName = list.displayName;
        listId = list.id;
      }
    } else {
      const lists = await getLists();
      const list = lists.find(l => l.id === listId);
      if (list) listName = list.displayName;
    }
    
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
      if (a.dueDateTime) return -1;
      if (b.dueDateTime) return 1;
      return 0;
    });
    
    for (const task of tasks) {
      console.log(formatTask(task));
      if (options.verbose) {
        console.log(chalk.dim(`      ID: ${task.id}`));
        if (task.body?.content) {
          console.log(chalk.dim(`      Note: ${task.body.content.substring(0, 50)}...`));
        }
      }
    }
    
    console.log('');
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.length - completed;
    console.log(chalk.dim(`${pending} pending, ${completed} completed`));
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Add ============

function parseDate(dateStr) {
  if (!dateStr) return null;
  
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
    if (daysUntil <= 0) daysUntil += 7;
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

export async function addTask(title, options) {
  try {
    let listId = options.list;
    let listName = 'Tasks';
    
    if (!listId) {
      listId = await getDefaultListId();
      const lists = await getLists();
      const defaultList = lists.find(l => l.id === listId);
      if (defaultList) listName = defaultList.displayName;
    } else if (!listId.includes('-')) {
      const list = await getListByName(listId);
      if (list) {
        listName = list.displayName;
        listId = list.id;
      } else {
        console.error(chalk.red(`List not found: ${listId}`));
        process.exit(1);
      }
    }
    
    const taskData = { title };
    
    if (options.due) {
      taskData.dueDateTime = parseDate(options.due);
    }
    if (options.note) {
      taskData.body = options.note;
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
    console.log(`  ID: ${chalk.dim(task.id)}`);
    
  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// ============ Complete ============

async function findTaskByPartialId(listId, partialId) {
  const tasks = await getTasks(listId, {});
  
  let task = tasks.find(t => t.id === partialId);
  if (task) return task;
  
  const matches = tasks.filter(t => t.id.startsWith(partialId));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`Ambiguous task ID: ${partialId} (${matches.length} matches)`);
  }
  
  return null;
}

export async function markComplete(taskId, options) {
  try {
    let listId = options.list;
    
    if (!listId) {
      listId = await getDefaultListId();
    } else if (!listId.includes('-')) {
      const list = await getListByName(listId);
      if (list) {
        listId = list.id;
      } else {
        console.error(chalk.red(`List not found: ${listId}`));
        process.exit(1);
      }
    }
    
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

// ============ Delete ============

export async function removeTask(taskId, options) {
  try {
    let listId = options.list;
    
    if (!listId) {
      listId = await getDefaultListId();
    } else if (!listId.includes('-')) {
      const list = await getListByName(listId);
      if (list) {
        listId = list.id;
      } else {
        console.error(chalk.red(`List not found: ${listId}`));
        process.exit(1);
      }
    }
    
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
