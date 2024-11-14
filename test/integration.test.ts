import { AddressInfo } from 'net';
import { createServer } from './server';
import { StatusClient, Status } from '../src/StatusClient';

jest.setTimeout(30000);

describe('StatusClient Integration Test', () => {
  let srv: any;
  let port: number;
  const originalDelay = process.env.DELAY;
  const originalSimulateError = process.env.SIMULATE_ERROR;

  beforeEach(async () => {
    process.env.DELAY = '10000'; // Set the delay before creating the server
    process.env.SIMULATE_ERROR = 'false'; // Set to 'true' to simulate error

    await new Promise<void>((resolve) => {
      srv = createServer().listen(0, () => {
        const address = srv.address() as AddressInfo;
        port = address.port;
        console.log(`Server is running on port ${port}`);
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      srv.close(() => {
        console.log('Server stopped.');
        resolve();
      });
    });

    process.env.DELAY = originalDelay;
    process.env.SIMULATE_ERROR = originalSimulateError;
  });

  test('should receive completed status using WebSocket', async () => {
    console.log('Testing with WebSocket for fetching status.');
    await new Promise<void>((resolve, reject) => {
      const client = new StatusClient({
        serverUrl: `http://localhost:${port}`,
        useWebSocket: true,
        timeout: 20000,
      });

      client.on('connected', () => {
        console.log('Client connected via WebSocket.');
      });

      client.on('statusUpdate', (status: Status) => {
        console.log(`Status updated: ${status}`);
      });

      client.on('finished', (status: Status) => {
        console.log(`Operation finished with status: ${status}`);
        expect(['completed', 'error']).toContain(status);
        client.stop();
        resolve();
      });

      client.on('error', (error: Error) => {
        console.error(`Error: ${error.message}`);
        client.stop();
        reject(error);
      });

      client.on('timeout', () => {
        console.error('Operation timed out.');
        client.stop();
        reject(new Error('Operation timed out.'));
      });

      client.start();
    });
  });

  test('should receive completed status using polling', async () => {
    console.log('Testing with polling (adaptive) for fetching status.');
    await new Promise<void>((resolve, reject) => {
      const client = new StatusClient({
        serverUrl: `http://localhost:${port}`,
        useWebSocket: false,
        pollingMethod: 'adaptive',
        initialDelay: 1000,
        maxDelay: 5000,
        maxRetries: 20,
        timeout: 20000,
      });

      client.on('statusUpdate', (status: Status) => {
        console.log(`Status updated: ${status}`);
      });

      client.on('finished', (status: Status) => {
        console.log(`Operation finished with status: ${status}`);
        expect(['completed', 'error']).toContain(status);
        client.stop();
        resolve();
      });

      client.on('error', (error: Error) => {
        console.error(`Error: ${error.message}`);
        client.stop();
        reject(error);
      });

      client.on('timeout', () => {
        console.error('Operation timed out.');
        client.stop();
        reject(new Error('Operation timed out.'));
      });

      client.start();
    });
  });
});