import { graphRequest } from './client.js';

// Lists
export async function getLists() {
  const data = await graphRequest('/me/todo/lists');
  return data.value;
}

export async function getListByName(name) {
  const lists = await getLists();
  return lists.find((list) => list.displayName.toLowerCase() === name.toLowerCase());
}

export async function getDefaultListId() {
  const lists = await getLists();
  const taskslist = lists.find((l) => l.wellknownListName === 'defaultList');
  if (taskslist) {
    return taskslist.id;
  }
  if (lists.length > 0) {
    return lists[0].id;
  }
  throw new Error('No task lists found');
}

// Tasks
export async function getTasks(listId, options = {}) {
  let endpoint = `/me/todo/lists/${listId}/tasks`;
  const params = new URLSearchParams();

  if (options.filter) {
    params.append('$filter', options.filter);
  }
  if (options.orderby) {
    params.append('$orderby', options.orderby);
  }
  if (options.top) {
    params.append('$top', options.top.toString());
  }

  const query = params.toString();
  if (query) {
    endpoint += `?${query}`;
  }

  const data = await graphRequest(endpoint);
  return data.value;
}

export async function createTask(listId, task) {
  const body = {
    title: task.title,
  };

  if (task.body) {
    body.body = {
      content: task.body,
      contentType: 'text',
    };
  }

  if (task.dueDateTime) {
    body.dueDateTime = {
      dateTime: task.dueDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  if (task.importance) {
    body.importance = task.importance;
  }

  return graphRequest(`/me/todo/lists/${listId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateTask(listId, taskId, updates) {
  return graphRequest(`/me/todo/lists/${listId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function completeTask(listId, taskId) {
  return updateTask(listId, taskId, {
    status: 'completed',
    completedDateTime: {
      dateTime: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
}

export async function uncompleteTask(listId, taskId) {
  return updateTask(listId, taskId, {
    status: 'notStarted',
    completedDateTime: null,
  });
}

export async function deleteTask(listId, taskId) {
  return graphRequest(`/me/todo/lists/${listId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}
