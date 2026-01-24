/**
 * Integration tests for mog API layer
 *
 * These tests hit the real Microsoft Graph API.
 * Only run when MOG_INTEGRATION_TESTS=1
 *
 * Prerequisites:
 * - mog auth login --client-id YOUR_CLIENT_ID
 * - export MOG_INTEGRATION_TESTS=1
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getValidAccessToken } from '../auth.js';

// Skip all tests unless integration mode is enabled
const SKIP = !process.env.MOG_INTEGRATION_TESTS;

// Import API modules
import { listItems, createFolder, deleteItem, searchFiles } from '../api/drive.js';
import { getLists, createTask, deleteTask, getTasks } from '../api/todo.js';
import { getEvents, getCalendars } from '../api/calendar.js';
import { searchMessages, getFolders } from '../api/mail.js';
import { getContacts } from '../api/contacts.js';
import { listDocuments } from '../api/word.js';
import { listPresentations } from '../api/ppt.js';

// Test artifacts to clean up
const cleanup = {
  driveItems: [],
  tasks: [],
  taskListId: null,
};

describe.skipIf(SKIP)('Integration Tests', () => {
  beforeAll(async () => {
    // Verify we have valid auth
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No valid token. Run: mog auth login --client-id YOUR_CLIENT_ID');
    }
    console.log('✓ Authentication verified');
  });

  afterAll(async () => {
    // Cleanup test artifacts
    console.log('\nCleaning up test artifacts...');

    for (const itemId of cleanup.driveItems) {
      try {
        await deleteItem(itemId);
        console.log(`  ✓ Deleted drive item: ${itemId.slice(0, 8)}...`);
      } catch (e) {
        console.log(`  ✗ Failed to delete drive item: ${e.message}`);
      }
    }

    for (const { listId, taskId } of cleanup.tasks) {
      try {
        await deleteTask(listId, taskId);
        console.log(`  ✓ Deleted task: ${taskId.slice(0, 8)}...`);
      } catch (e) {
        console.log(`  ✗ Failed to delete task: ${e.message}`);
      }
    }
  });

  describe('Drive API', () => {
    it('lists root folder', async () => {
      const items = await listItems(undefined, { max: 5 });

      expect(Array.isArray(items)).toBe(true);
      console.log(`  Found ${items.length} items in root`);
    });

    it('creates and deletes a folder', async () => {
      const testFolderName = `__mog_test_${Date.now()}`;

      // Create
      const folder = await createFolder(testFolderName);
      expect(folder.name).toBe(testFolderName);
      expect(folder.folder).toBeDefined();
      console.log(`  Created folder: ${folder.name}`);

      // Track for cleanup
      cleanup.driveItems.push(folder.id);

      // Verify it exists
      const items = await listItems(undefined, { max: 50 });
      const found = items.find((i) => i.id === folder.id);
      expect(found).toBeDefined();
    });

    it('searches files', async () => {
      const results = await searchFiles('test', { max: 5 });

      expect(Array.isArray(results)).toBe(true);
      console.log(`  Search returned ${results.length} results`);
    });
  });

  describe('To-Do API', () => {
    it('lists task lists', async () => {
      const lists = await getLists();

      expect(Array.isArray(lists)).toBe(true);
      expect(lists.length).toBeGreaterThan(0);
      console.log(`  Found ${lists.length} task lists`);

      // Find default list for task tests
      const defaultList = lists.find((l) => l.wellknownListName === 'defaultList');
      if (defaultList) {
        cleanup.taskListId = defaultList.id;
      }
    });

    it('creates and deletes a task', async () => {
      const lists = await getLists();
      const defaultList = lists.find((l) => l.wellknownListName === 'defaultList') || lists[0];

      const testTitle = `__mog_test_${Date.now()}`;

      // Create
      const task = await createTask(defaultList.id, { title: testTitle });
      expect(task.title).toBe(testTitle);
      console.log(`  Created task: ${task.title}`);

      // Track for cleanup
      cleanup.tasks.push({ listId: defaultList.id, taskId: task.id });

      // Verify it exists
      const tasks = await getTasks(defaultList.id, {});
      const found = tasks.find((t) => t.id === task.id);
      expect(found).toBeDefined();
    });
  });

  describe('Calendar API', () => {
    it('lists calendars', async () => {
      const calendars = await getCalendars();

      expect(Array.isArray(calendars)).toBe(true);
      expect(calendars.length).toBeGreaterThan(0);
      console.log(`  Found ${calendars.length} calendars`);
    });

    it('lists events', async () => {
      const events = await getEvents({});

      expect(Array.isArray(events)).toBe(true);
      console.log(`  Found ${events.length} upcoming events`);
    });
  });

  describe('Mail API', () => {
    it('lists folders', async () => {
      const folders = await getFolders();

      expect(Array.isArray(folders)).toBe(true);
      expect(folders.length).toBeGreaterThan(0);
      console.log(`  Found ${folders.length} mail folders`);

      const inbox = folders.find((f) => f.displayName === 'Inbox');
      expect(inbox).toBeDefined();
    });

    it('searches messages', async () => {
      const messages = await searchMessages('*', { max: 5 });

      expect(Array.isArray(messages)).toBe(true);
      console.log(`  Found ${messages.length} messages`);
    });
  });

  describe('Contacts API', () => {
    it('lists contacts', async () => {
      const contacts = await getContacts({ max: 10 });

      expect(Array.isArray(contacts)).toBe(true);
      console.log(`  Found ${contacts.length} contacts`);
    });
  });

  describe('Word API', () => {
    it('lists Word documents', async () => {
      const docs = await listDocuments({ max: 10 });

      expect(Array.isArray(docs)).toBe(true);
      console.log(`  Found ${docs.length} Word documents`);
    });
  });

  describe('PowerPoint API', () => {
    it('lists presentations', async () => {
      const ppts = await listPresentations({ max: 10 });

      expect(Array.isArray(ppts)).toBe(true);
      console.log(`  Found ${ppts.length} PowerPoint presentations`);
    });
  });
});
