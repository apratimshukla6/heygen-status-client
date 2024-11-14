import { StatusClient, Status } from 'heygen-status-client';

const SERVER_URL = 'http://localhost:3000';

const client = new StatusClient({
  serverUrl: SERVER_URL,
  useWebSocket: true, // Set to false to use polling instead
  pollingMethod: 'adaptive', // 'fixed', 'exponential', or 'adaptive' (used if useWebSocket is false)
  initialDelay: 1000, // Initial delay for polling in milliseconds
  maxDelay: 5000, // Maximum delay for polling in milliseconds
  maxRetries: 20, // Maximum number of polling retries
  timeout: 20000, // Overall timeout for the operation in milliseconds
});

// Emitted when the WebSocket connection is established (if using WebSocket)
client.on('connected', () => {
  console.log('Connected to server via WebSocket.');
});

// Emitted when the status is updated
client.on('statusUpdate', (status: Status) => {
  console.log(`Status updated: ${status}`);
});

// Emitted when the operation is finished (status is 'completed' or 'error')
client.on('finished', (status: Status) => {
  console.log(`Operation finished with status: ${status}`);
  client.stop();
});

// Emitted when an error occurs
client.on('error', (error: Error) => {
  console.error(`Error: ${error.message}`);
  client.stop();
});

// Emitted when the operation times out
client.on('timeout', () => {
  console.error('Operation timed out.');
  client.stop();
});

client.start();