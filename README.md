
# HeyGen Status Client

[![License](https://img.shields.io/badge/license-Apache%202-blue)](https://www.apache.org/licenses/LICENSE-2.0)

TypeScript status client library for a demo HeyGen video translation service.

## Overview

`heygen-status-client` is a TypeScript client library that allows monitoring of the status of a sample process via HTTP polling or WebSocket. This library is designed to be used with the HeyGen video translation service to track and update the progress of a task.

## Installation

```bash
npm install heygen-status-client
```

## Features

- **WebSocket and HTTP Polling Support**: Choose between WebSocket or HTTP polling for monitoring updates, depending on the server's configuration.
- **Configurable Polling Strategies**: Supports `fixed`, `exponential`, and `adaptive` polling methods to customize the retry logic for HTTP requests.
- **Timeout and Retry Management**: Specify timeouts and retry limits to control when to stop monitoring based on custom conditions.
- **Event-driven Updates**: Emits various events such as `statusUpdate`, `finished`, `error`, and `timeout`, making it easy to integrate into event-driven applications.
- **Promise-based Usage**: Supports both callback-based (events) and promise-based usage, providing flexibility in implementation.

## Usage

### Import the Library

```typescript
import { StatusClient, Status } from 'heygen-status-client';
```

### Example Usage with Event Listeners

Here's how to use `StatusClient` with event listeners:

```typescript
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

client.on('connected', () => {
  console.log('Connected to server via WebSocket.');
});

client.on('statusUpdate', (status: Status) => {
  console.log(`Status updated: ${status}`);
});

client.on('finished', (status: Status) => {
  console.log(`Operation finished with status: ${status}`);
  client.stop();
});

client.on('error', (error: Error) => {
  console.error(`Error: ${error.message}`);
  client.stop();
});

client.on('timeout', () => {
  console.error('Operation timed out.');
  client.stop();
});

client.start();
```

### Example Usage with Promises

To use the `StatusClient` with promises:

```typescript
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
```

## Configuration Options

The `StatusClient` constructor accepts the following options:

| Option          | Type     | Default | Description |
|-----------------|----------|---------|-------------|
| `serverUrl`     | `string` | Required | The base URL of the server. |
| `useWebSocket`  | `boolean` | `true` | Use WebSocket for communication if available. Defaults to HTTP polling if false. |
| `pollingMethod` | `'fixed'`, `'exponential'`, `'adaptive'` | `'fixed'` | Polling method for HTTP polling. |
| `initialDelay`  | `number` | `1000` ms | Initial delay for polling, in milliseconds. |
| `maxDelay`      | `number` | `10000` ms | Maximum delay for polling, in milliseconds. |
| `maxRetries`    | `number` | `50` | Maximum number of retries for polling. |
| `timeout`       | `number` | `60000` ms | Overall timeout duration for the operation. |

## Events

The `StatusClient` emits the following events:

- **`connected`**: Emitted when the WebSocket connection is established.
- **`statusUpdate`**: Emitted when the status is updated (such as `pending`). Payload is `Status`.
- **`finished`**: Emitted when the operation is completed (status is `completed` or `error`).
- **`error`**: Emitted when an error occurs. Payload is `Error`.
- **`timeout`**: Emitted when the operation times out.

## Build

To build this TypeScript library, run:

```bash
npm run build
```

This will compile the TypeScript code into JavaScript and place it in the `dist` directory.

## Test

To test this TypeScript library, run:

```bash
npm test
```

This will run the unit and integration tests using Jest.
