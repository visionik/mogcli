# Integration Tests

These tests run against the real Microsoft Graph API.

## Setup

1. Authenticate with mog:
   ```bash
   mog auth login --client-id YOUR_CLIENT_ID
   ```

2. Set environment variable to enable integration tests:
   ```bash
   export MOG_INTEGRATION_TESTS=1
   ```

3. Run integration tests:
   ```bash
   npm run test:integration
   ```

## What gets tested

- Real API calls to Microsoft Graph
- Actual data in your OneDrive/Outlook/To-Do
- Creates temporary test files (cleaned up after)

## Caution

- Tests create/modify real data in your Microsoft 365 account
- A test folder `__mog_test__` is created in OneDrive root
- Test tasks are created in a `__mog_test__` task list
- Cleanup runs after tests, but failures may leave artifacts

## Skipping

By default, integration tests are skipped unless `MOG_INTEGRATION_TESTS=1`.
