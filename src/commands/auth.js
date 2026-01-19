import chalk from 'chalk';
import open from 'open';
import { startDeviceCodeFlow, pollForToken, clearTokens, getAuthStatus } from '../auth.js';
import { getUserInfo } from '../api/client.js';
import { clearSlugs, slugStats } from '../ids.js';

export async function login(options) {
  const clientId = options.clientId || process.env.MIC_CLIENT_ID;

  if (!clientId) {
    console.error(chalk.red('Error: Client ID required'));
    console.log('');
    console.log('Provide via:');
    console.log('  --client-id <id>');
    console.log('  MIC_CLIENT_ID environment variable');
    console.log('');
    console.log('See README for Azure AD app registration instructions.');
    process.exit(1);
  }

  try {
    console.log(chalk.blue('Starting device code authentication...'));
    console.log('');

    const deviceCodeResponse = await startDeviceCodeFlow(clientId);

    console.log(chalk.yellow('To sign in:'));
    console.log(`  1. Open: ${chalk.cyan(deviceCodeResponse.verification_uri)}`);
    console.log(`  2. Enter code: ${chalk.bold.green(deviceCodeResponse.user_code)}`);
    console.log('');

    // Try to open browser
    if (options.browser !== false) {
      try {
        await open(deviceCodeResponse.verification_uri);
        console.log(chalk.dim('(Browser opened automatically)'));
      } catch {
        // Ignore - user can open manually
      }
    }

    console.log(chalk.dim('Waiting for authorization...'));

    await pollForToken(clientId, deviceCodeResponse.device_code, deviceCodeResponse.interval || 5);

    console.log('');
    console.log(chalk.green('✓ Authentication successful!'));

    // Try to get user info
    try {
      const user = await getUserInfo();
      console.log(chalk.dim(`  Signed in as: ${user.displayName || user.userPrincipalName}`));
    } catch {
      // Ignore - not critical
    }
  } catch (error) {
    console.error(chalk.red('Authentication failed:'), error.message);
    process.exit(1);
  }
}

export async function logout(_options) {
  const clearedTokens = clearTokens();

  // Also clear slugs cache
  const stats = slugStats();
  const slugCount = stats.count;
  clearSlugs();

  if (clearedTokens) {
    console.log(chalk.green('✓ Logged out successfully'));
    if (slugCount > 0) {
      console.log(chalk.dim(`  Cleared ${slugCount} cached slug(s)`));
    }
  } else {
    console.log(chalk.yellow('No active session found'));
  }
}

export async function status(options) {
  const authStatus = getAuthStatus();

  if (options?.json) {
    console.log(JSON.stringify(authStatus, null, 2));
    return;
  }

  console.log(chalk.bold('Authentication Status'));
  console.log('');

  if (!authStatus.hasClientId) {
    console.log(chalk.yellow('⚠ No client ID configured'));
    console.log(chalk.dim('  Run: mic auth login --client-id <your-client-id>'));
    return;
  }

  console.log(`  Client ID: ${chalk.dim(authStatus.clientId)}`);

  if (!authStatus.isAuthenticated) {
    console.log(`  Status: ${chalk.red('Not logged in')}`);
    console.log(chalk.dim('  Run: mic auth login'));
    return;
  }

  if (authStatus.isExpired) {
    console.log(`  Status: ${chalk.yellow('Token expired (will refresh on next request)')}`);
  } else {
    console.log(`  Status: ${chalk.green('Authenticated')}`);
  }

  console.log(`  Token saved: ${chalk.dim(authStatus.savedAt)}`);

  // Try to get user info
  try {
    const user = await getUserInfo();
    console.log(`  User: ${chalk.cyan(user.displayName || user.userPrincipalName)}`);
    if (user.mail) {
      console.log(`  Email: ${chalk.dim(user.mail)}`);
    }
  } catch (error) {
    console.log(chalk.dim(`  (Could not fetch user info: ${error.message})`));
  }
}
