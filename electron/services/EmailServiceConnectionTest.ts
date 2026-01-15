/**
 * Email Service Connection Testing
 * Provides functionality to test IMAP and SMTP connections
 */

import { ImapFlow } from 'imapflow';
import { createTransport } from 'nodemailer';

import type { ImapConfig, SmtpConfig } from './EmailService';

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  latency?: number;
}

export interface TestConnectionOptions {
  imap?: ImapConfig;
  smtp?: SmtpConfig;
  testType: 'incoming' | 'outgoing' | 'both';
  timeout?: number;
}

/**
 * Test IMAP connection
 */
export async function testImapConnection(
  config: ImapConfig,
  timeout = 30000
): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  let client: ImapFlow | null = null;

  try {
    client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      logger: false,
    });

    // Set timeout
    const connectPromise = client.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);
    });

    await Promise.race([connectPromise, timeoutPromise]);

    // Test mailbox list to verify connection works
    // client.list() returns a Promise that resolves to an array
    const mailboxes = await client.list();
    if (!mailboxes || mailboxes.length === 0) {
      throw new Error('No mailboxes found');
    }

    const latency = Date.now() - startTime;

    await client.logout();

    return {
      success: true,
      latency,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      latency: Date.now() - startTime,
    };
  } finally {
    if (client) {
      try {
        await client.logout();
      } catch {
        // Ignore logout errors
      }
    }
  }
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(
  config: SmtpConfig,
  timeout = 30000
): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  try {
    const transport = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: timeout,
      greetingTimeout: timeout,
      socketTimeout: timeout,
    });

    // Test connection by verifying
    await transport.verify();

    const latency = Date.now() - startTime;

    transport.close();

    return {
      success: true,
      latency,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      latency: Date.now() - startTime,
    };
  }
}

/**
 * Test both IMAP and SMTP connections
 */
export async function testEmailConnections(options: TestConnectionOptions): Promise<{
  success: boolean;
  incoming?: ConnectionTestResult;
  outgoing?: ConnectionTestResult;
}> {
  const results: {
    success: boolean;
    incoming?: ConnectionTestResult;
    outgoing?: ConnectionTestResult;
  } = {
    success: false,
  };

  const timeout = options.timeout ?? 30000;

  try {
    // Test incoming (IMAP) connection
    if ((options.testType === 'incoming' || options.testType === 'both') && options.imap) {
      results.incoming = await testImapConnection(options.imap, timeout);
    }

    // Test outgoing (SMTP) connection
    if ((options.testType === 'outgoing' || options.testType === 'both') && options.smtp) {
      results.outgoing = await testSmtpConnection(options.smtp, timeout);
    }

    // Determine overall success
    if (options.testType === 'incoming') {
      results.success = results.incoming?.success ?? false;
    } else if (options.testType === 'outgoing') {
      results.success = results.outgoing?.success ?? false;
    } else {
      results.success = (results.incoming?.success ?? true) && (results.outgoing?.success ?? true);
    }

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      incoming: results.incoming ?? { success: false, error: errorMessage },
      outgoing: results.outgoing ?? { success: false, error: errorMessage },
    };
  }
}
