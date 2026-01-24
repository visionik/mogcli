import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the API module
vi.mock('../api/todo.js', () => ({
  getLists: vi.fn(),
  getTasks: vi.fn(),
  getDefaultListId: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  completeTask: vi.fn(),
  uncompleteTask: vi.fn(),
  deleteTask: vi.fn(),
}));

// Mock ids module
vi.mock('../ids.js', () => ({
  formatId: vi.fn((id) => id?.slice(0, 8) || 'unknown'),
  resolveId: vi.fn((id) => id),
}));

import {
  getLists,
  getTasks,
  getDefaultListId,
  createTask,
  updateTask,
  completeTask,
  uncompleteTask,
  deleteTask,
} from '../api/todo.js';

import {
  listLists,
  listTasks,
  addTask,
  markComplete,
  markUncomplete,
  editTask,
  removeTask,
} from './todo.js';

describe('todo commands', () => {
  let consoleSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('listLists', () => {
    it('lists all task lists', async () => {
      const mockLists = [
        { id: 'list1', displayName: 'Tasks', wellknownListName: 'defaultList' },
        { id: 'list2', displayName: 'Shopping' },
      ];
      getLists.mockResolvedValue(mockLists);

      await listLists({});

      expect(getLists).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockLists = [{ id: 'list1', displayName: 'Tasks' }];
      getLists.mockResolvedValue(mockLists);

      await listLists({ json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockLists, null, 2));
    });

    it('shows message when no lists found', async () => {
      getLists.mockResolvedValue([]);

      await listLists({});

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No task lists found'));
    });

    it('shows verbose output when requested', async () => {
      const mockLists = [{ id: 'full-list-id-12345', displayName: 'Tasks' }];
      getLists.mockResolvedValue(mockLists);

      await listLists({ verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('full-list-id-12345'));
    });

    it('handles errors gracefully', async () => {
      getLists.mockRejectedValue(new Error('API Error'));

      await listLists({});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('listTasks', () => {
    beforeEach(() => {
      getLists.mockResolvedValue([
        { id: 'default-list-id', displayName: 'Tasks', wellknownListName: 'defaultList' },
      ]);
      getDefaultListId.mockResolvedValue('default-list-id');
    });

    it('lists tasks from default list', async () => {
      const mockTasks = [
        { id: 'task1', title: 'Buy milk', status: 'notStarted' },
        { id: 'task2', title: 'Call mom', status: 'notStarted' },
      ];
      getTasks.mockResolvedValue(mockTasks);

      await listTasks(undefined, {});

      expect(getTasks).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('lists tasks from specific list by ID', async () => {
      const mockTasks = [{ id: 'task1', title: 'Buy groceries', status: 'notStarted' }];
      getTasks.mockResolvedValue(mockTasks);
      getLists.mockResolvedValue([{ id: 'shopping-list-id', displayName: 'Shopping' }]);

      await listTasks('shopping-list-id', {});

      expect(getTasks).toHaveBeenCalledWith('shopping-list-id', expect.anything());
    });

    it('includes completed tasks when --all flag is set', async () => {
      const mockTasks = [
        { id: 'task1', title: 'Done task', status: 'completed' },
        { id: 'task2', title: 'Active task', status: 'notStarted' },
      ];
      getTasks.mockResolvedValue(mockTasks);

      await listTasks(undefined, { all: true });

      expect(getTasks).toHaveBeenCalledWith(expect.anything(), {});
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockTasks = [{ id: 'task1', title: 'Task' }];
      getTasks.mockResolvedValue(mockTasks);

      await listTasks(undefined, { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockTasks, null, 2));
    });

    it('shows completion message when no active tasks', async () => {
      getTasks.mockResolvedValue([]);

      await listTasks(undefined, {});

      // When no --all flag, empty list means "all complete"
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('All tasks complete'));
    });

    it('shows no tasks message when --all and empty', async () => {
      getTasks.mockResolvedValue([]);

      await listTasks(undefined, { all: true });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No tasks'));
    });

    it('handles errors gracefully', async () => {
      getTasks.mockRejectedValue(new Error('API Error'));

      await listTasks(undefined, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('addTask', () => {
    beforeEach(() => {
      getLists.mockResolvedValue([
        { id: 'default-list-id', displayName: 'Tasks', wellknownListName: 'defaultList' },
      ]);
      getDefaultListId.mockResolvedValue('default-list-id');
    });

    it('creates a task with title', async () => {
      const mockTask = { id: 'new-task', title: 'Buy milk', status: 'notStarted' };
      createTask.mockResolvedValue(mockTask);

      await addTask('Buy milk', {});

      expect(createTask).toHaveBeenCalledWith(
        'default-list-id',
        expect.objectContaining({ title: 'Buy milk' })
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Task created'));
    });

    it('creates a task with due date', async () => {
      const mockTask = {
        id: 'new-task',
        title: 'Buy milk',
        dueDateTime: { dateTime: '2025-01-20T00:00:00' },
      };
      createTask.mockResolvedValue(mockTask);

      await addTask('Buy milk', { due: '2025-01-20' });

      expect(createTask).toHaveBeenCalledWith(
        'default-list-id',
        expect.objectContaining({ dueDateTime: expect.any(String) })
      );
    });

    it('creates a task marked as important', async () => {
      const mockTask = { id: 'new-task', title: 'Urgent', importance: 'high' };
      createTask.mockResolvedValue(mockTask);

      await addTask('Urgent', { important: true });

      expect(createTask).toHaveBeenCalledWith(
        'default-list-id',
        expect.objectContaining({ importance: 'high' })
      );
    });

    it('creates a task with notes', async () => {
      const mockTask = { id: 'new-task', title: 'Task', body: { content: 'Notes here' } };
      createTask.mockResolvedValue(mockTask);

      await addTask('Task', { notes: 'Notes here' });

      expect(createTask).toHaveBeenCalledWith(
        'default-list-id',
        expect.objectContaining({ body: 'Notes here' })
      );
    });

    it('creates a task in specific list', async () => {
      const mockTask = { id: 'new-task', title: 'Buy groceries' };
      createTask.mockResolvedValue(mockTask);
      getLists.mockResolvedValue([
        { id: 'default-list-id', displayName: 'Tasks', wellknownListName: 'defaultList' },
        { id: 'shopping-list-id', displayName: 'Shopping' },
      ]);

      await addTask('Buy groceries', { list: 'Shopping' });

      expect(createTask).toHaveBeenCalledWith('shopping-list-id', expect.anything());
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockTask = { id: 'new-task', title: 'Task' };
      createTask.mockResolvedValue(mockTask);

      await addTask('Task', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockTask, null, 2));
    });

    it('handles errors gracefully', async () => {
      createTask.mockRejectedValue(new Error('API Error'));

      await addTask('Task', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('markComplete', () => {
    beforeEach(() => {
      getLists.mockResolvedValue([
        { id: 'default-list-id', displayName: 'Tasks', wellknownListName: 'defaultList' },
      ]);
      getDefaultListId.mockResolvedValue('default-list-id');
    });

    it('marks a task as complete with full ID', async () => {
      const mockTask = { id: 'full-task-id-longer-than-20', title: 'Done', status: 'completed' };
      completeTask.mockResolvedValue(mockTask);

      await markComplete('full-task-id-longer-than-20', {});

      expect(completeTask).toHaveBeenCalledWith('default-list-id', 'full-task-id-longer-than-20');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('completed'));
    });

    it('finds task by short ID prefix', async () => {
      const mockTasks = [{ id: 'task-full-id-12345678901234', title: 'My Task' }];
      getTasks.mockResolvedValue(mockTasks);
      completeTask.mockResolvedValue({ ...mockTasks[0], status: 'completed' });

      await markComplete('task-ful', {});

      expect(getTasks).toHaveBeenCalled();
      expect(completeTask).toHaveBeenCalledWith('default-list-id', 'task-full-id-12345678901234');
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockTask = { id: 'full-task-id-longer-than-20', status: 'completed' };
      completeTask.mockResolvedValue(mockTask);

      await markComplete('full-task-id-longer-than-20', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockTask, null, 2));
    });

    it('handles task not found', async () => {
      getTasks.mockResolvedValue([]);

      await markComplete('invalid', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      completeTask.mockRejectedValue(new Error('API Error'));

      await markComplete('full-task-id-longer-than-20', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('markUncomplete', () => {
    beforeEach(() => {
      getLists.mockResolvedValue([
        { id: 'default-list-id', displayName: 'Tasks', wellknownListName: 'defaultList' },
      ]);
      getDefaultListId.mockResolvedValue('default-list-id');
    });

    it('marks a task as incomplete with full ID', async () => {
      const mockTask = {
        id: 'full-task-id-longer-than-20',
        title: 'Back to work',
        status: 'notStarted',
      };
      uncompleteTask.mockResolvedValue(mockTask);

      await markUncomplete('full-task-id-longer-than-20', {});

      expect(uncompleteTask).toHaveBeenCalledWith('default-list-id', 'full-task-id-longer-than-20');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('incomplete'));
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockTask = { id: 'full-task-id-longer-than-20', status: 'notStarted' };
      uncompleteTask.mockResolvedValue(mockTask);

      await markUncomplete('full-task-id-longer-than-20', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockTask, null, 2));
    });

    it('handles errors gracefully', async () => {
      uncompleteTask.mockRejectedValue(new Error('Not found'));

      await markUncomplete('full-task-id-longer-than-20', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('editTask', () => {
    beforeEach(() => {
      getLists.mockResolvedValue([
        { id: 'default-list-id', displayName: 'Tasks', wellknownListName: 'defaultList' },
      ]);
      getDefaultListId.mockResolvedValue('default-list-id');
    });

    it('updates a task title with full ID', async () => {
      const mockTask = { id: 'full-task-id-longer-than-20', title: 'Updated title' };
      updateTask.mockResolvedValue(mockTask);

      await editTask('full-task-id-longer-than-20', { title: 'Updated title' });

      expect(updateTask).toHaveBeenCalledWith(
        'default-list-id',
        'full-task-id-longer-than-20',
        expect.objectContaining({ title: 'Updated title' })
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Task updated'));
    });

    it('updates task due date', async () => {
      const mockTask = {
        id: 'full-task-id-longer-than-20',
        dueDateTime: { dateTime: '2025-02-01' },
      };
      updateTask.mockResolvedValue(mockTask);

      await editTask('full-task-id-longer-than-20', { due: '2025-02-01' });

      expect(updateTask).toHaveBeenCalledWith(
        'default-list-id',
        'full-task-id-longer-than-20',
        expect.objectContaining({ dueDateTime: expect.anything() })
      );
    });

    it('updates task importance', async () => {
      const mockTask = { id: 'full-task-id-longer-than-20', importance: 'high' };
      updateTask.mockResolvedValue(mockTask);

      await editTask('full-task-id-longer-than-20', { important: true });

      expect(updateTask).toHaveBeenCalledWith(
        'default-list-id',
        'full-task-id-longer-than-20',
        expect.objectContaining({ importance: 'high' })
      );
    });

    it('outputs JSON when --json flag is set', async () => {
      const mockTask = { id: 'full-task-id-longer-than-20', title: 'Updated' };
      updateTask.mockResolvedValue(mockTask);

      await editTask('full-task-id-longer-than-20', { title: 'Updated', json: true });

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockTask, null, 2));
    });

    it('requires at least one update field', async () => {
      await editTask('full-task-id-longer-than-20', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('handles errors gracefully', async () => {
      updateTask.mockRejectedValue(new Error('API Error'));

      await editTask('full-task-id-longer-than-20', { title: 'New' });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('removeTask', () => {
    beforeEach(() => {
      getLists.mockResolvedValue([
        { id: 'default-list-id', displayName: 'Tasks', wellknownListName: 'defaultList' },
      ]);
      getDefaultListId.mockResolvedValue('default-list-id');
    });

    it('deletes a task with full ID', async () => {
      deleteTask.mockResolvedValue(undefined);

      await removeTask('full-task-id-longer-than-20', {});

      expect(deleteTask).toHaveBeenCalledWith('default-list-id', 'full-task-id-longer-than-20');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Task deleted'));
    });

    it('outputs JSON when --json flag is set', async () => {
      deleteTask.mockResolvedValue(undefined);
      getTasks.mockResolvedValue([{ id: 'full-task-id-longer-than-20', title: 'Task' }]);

      await removeTask('full-task-id-longer-than-20', { json: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        JSON.stringify({ success: true, taskId: 'full-task-id-longer-than-20' })
      );
    });

    it('handles errors gracefully', async () => {
      deleteTask.mockRejectedValue(new Error('Not found'));

      await removeTask('full-task-id-longer-than-20', {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
