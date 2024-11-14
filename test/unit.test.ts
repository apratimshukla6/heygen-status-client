import { StatusClient, Status } from '../src/StatusClient';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { Server } from 'ws';

describe('StatusClient', () => {
  let axiosMock: MockAdapter;
  let wsServer: Server;
  const port = 12345;
  const serverUrl = `http://localhost:${port}`;

  beforeEach(() => {
    axiosMock = new MockAdapter(axios);
    wsServer = new Server({ port });
  });

  afterEach(() => {
    axiosMock.restore();
    wsServer.close();
  });

  test('receives status updates via WebSocket', (done) => {
    const client = new StatusClient({ serverUrl, useWebSocket: true, timeout: 5000 });

    wsServer.on('connection', (socket) => {
      socket.send(JSON.stringify({ result: 'pending' }));
      setTimeout(() => {
        socket.send(JSON.stringify({ result: 'completed' }));
      }, 100);
    });

    const statuses: Status[] = [];

    client.on('statusUpdate', (status) => {
      statuses.push(status);
    });

    client.on('finished', (status) => {
      expect(statuses).toEqual(['pending', 'completed']);
      expect(status).toBe('completed');
      done();
    });

    client.on('error', done);
    client.start();
  });

  test('handles timeout correctly', (done) => {
    const client = new StatusClient({ serverUrl, useWebSocket: false, timeout: 100 });

    axiosMock.onGet('/status').reply(200, { result: 'pending' });

    client.on('timeout', () => {
      expect(true).toBe(true);
      done();
    });

    client.on('error', done);
    client.start();
  });

  test('emits error when max retries reached', (done) => {
    const client = new StatusClient({
      serverUrl,
      useWebSocket: false,
      maxRetries: 2,
      initialDelay: 50,
      timeout: 5000,
    });

    axiosMock.onGet('/status').reply(200, { result: 'pending' });

    client.on('error', (error) => {
      expect(error.message).toBe('Max retries reached.');
      done();
    });

    client.start();
  });
});