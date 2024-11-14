import { StatusClient, Status } from 'heygen-status-client';

const SERVER_URL = 'http://localhost:3000';

function monitorStatus(): Promise<Status> {
  return new Promise((resolve, reject) => {
    const client = new StatusClient({
      serverUrl: SERVER_URL,
      useWebSocket: true,
      timeout: 20000,
    });

    client.on('finished', (status: Status) => {
      console.log(`Operation finished with status: ${status}`);
      client.stop();
      resolve(status);
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
}

monitorStatus()
  .then((status) => {
    console.log(`Final status: ${status}`);
  })
  .catch((error) => {
    console.error(`Monitoring failed: ${error.message}`);
  });
