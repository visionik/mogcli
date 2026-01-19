import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the client module
vi.mock('./client.js', () => ({
  graphRequest: vi.fn(),
}));

import { graphRequest } from './client.js';
import {
  getLists,
  getListByName,
  getDefaultListId,
  getTasks,
  createTask,
  updateTask,
  completeTask,
  uncompleteTask,
  deleteTask,
} from './todo.js';

describe('todo API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLists', () => {
    it('fetches todo lists from Graph API', async () => {
      const mockLists = [
        { id: 'list1', displayName: 'Tasks', wellknownListName: 'defaultList' },
        { id: 'list2', displayName: 'Shopping', wellknownListName: null },
      ];
      graphRequest.mockResolvedValue({ value: mockLists });

      const result = await getLists();

      expect(graphRequest).toHaveBeenCalledWith('/me/todo/lists');
      expect(result).toEqual(mockLists);
    });
  });

  describe('getListByName', () => {
    it('finds list by name case-insensitively', async () => {
      const mockLists = [
        { id: 'list1', displayName: 'Tasks' },
        { id: 'list2', displayName: 'Shopping' },
      ];
      graphRequest.mockResolvedValue({ value: mockLists });

      const result = await getListByName('shopping');

      expect(result).toEqual({ id: 'list2', displayName: 'Shopping' });
    });

    it('returns undefined if list not found', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      const result = await getListByName('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getDefaultListId', () => {
    it('returns the default list ID', async () => {
      const mockLists = [
        { id: 'list1', displayName: 'Tasks', wellknownListName: 'defaultList' },
        { id: 'list2', displayName: 'Shopping', wellknownListName: null },
      ];
      graphRequest.mockResolvedValue({ value: mockLists });

      const result = await getDefaultListId();

      expect(result).toBe('list1');
    });

    it('returns first list if no default found', async () => {
      const mockLists = [{ id: 'list1', displayName: 'Custom', wellknownListName: null }];
      graphRequest.mockResolvedValue({ value: mockLists });

      const result = await getDefaultListId();

      expect(result).toBe('list1');
    });

    it('throws if no lists found', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await expect(getDefaultListId()).rejects.toThrow('No task lists found');
    });
  });

  describe('getTasks', () => {
    it('fetches tasks from a list', async () => {
      const mockTasks = [
        { id: 'task1', title: 'Buy milk' },
        { id: 'task2', title: 'Call mom' },
      ];
      graphRequest.mockResolvedValue({ value: mockTasks });

      const result = await getTasks('list1');

      expect(graphRequest).toHaveBeenCalledWith('/me/todo/lists/list1/tasks');
      expect(result).toEqual(mockTasks);
    });

    it('applies filter option', async () => {
      graphRequest.mockResolvedValue({ value: [] });

      await getTasks('list1', { filter: "status ne 'completed'" });

      expect(graphRequest).toHaveBeenCalledWith(expect.stringMatching(/filter.*status.*completed/));
    });
  });

  describe('createTask', () => {
    it('creates a basic task', async () => {
      const mockTask = { id: 'new-task', title: 'New task' };
      graphRequest.mockResolvedValue(mockTask);

      const result = await createTask('list1', { title: 'New task' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/todo/lists/list1/tasks',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"New task"'),
        })
      );
      expect(result).toEqual(mockTask);
    });

    it('includes due date when provided', async () => {
      graphRequest.mockResolvedValue({ id: 'task' });

      await createTask('list1', {
        title: 'Task',
        dueDateTime: '2025-01-15T00:00:00',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/todo/lists/list1/tasks',
        expect.objectContaining({
          body: expect.stringContaining('dueDateTime'),
        })
      );
    });

    it('includes body when provided', async () => {
      graphRequest.mockResolvedValue({ id: 'task' });

      await createTask('list1', {
        title: 'Task',
        body: 'Some notes',
      });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/todo/lists/list1/tasks',
        expect.objectContaining({
          body: expect.stringContaining('Some notes'),
        })
      );
    });
  });

  describe('updateTask', () => {
    it('updates task with PATCH request', async () => {
      const mockTask = { id: 'task1', title: 'Updated' };
      graphRequest.mockResolvedValue(mockTask);

      const result = await updateTask('list1', 'task1', { title: 'Updated' });

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/todo/lists/list1/tasks/task1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"title":"Updated"'),
        })
      );
      expect(result).toEqual(mockTask);
    });
  });

  describe('completeTask', () => {
    it('marks task as completed', async () => {
      graphRequest.mockResolvedValue({ id: 'task1', status: 'completed' });

      await completeTask('list1', 'task1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/todo/lists/list1/tasks/task1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"status":"completed"'),
        })
      );
    });
  });

  describe('uncompleteTask', () => {
    it('marks task as not started', async () => {
      graphRequest.mockResolvedValue({ id: 'task1', status: 'notStarted' });

      await uncompleteTask('list1', 'task1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/todo/lists/list1/tasks/task1',
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"status":"notStarted"'),
        })
      );
    });
  });

  describe('deleteTask', () => {
    it('deletes task with DELETE request', async () => {
      graphRequest.mockResolvedValue(undefined);

      await deleteTask('list1', 'task1');

      expect(graphRequest).toHaveBeenCalledWith(
        '/me/todo/lists/list1/tasks/task1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
