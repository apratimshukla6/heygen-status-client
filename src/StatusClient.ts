import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export type Status = 'pending' | 'completed' | 'error';

export interface StatusClientOptions {
  serverUrl: string;
  useWebSocket?: boolean;
  pollingMethod?: 'fixed' | 'exponential' | 'adaptive';
  initialDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  maxRetries?: number;
  timeout?: number; // milliseconds
}

export class StatusClient extends EventEmitter {
  private readonly serverUrl: string;
  private readonly useWebSocket: boolean;
  private readonly pollingMethod: 'fixed' | 'exponential' | 'adaptive';
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly maxRetries: number;
  private readonly timeout: number;

  private readonly axiosInstance: AxiosInstance;
  private ws?: WebSocket;
  private pollingTimer?: NodeJS.Timeout;
  private timeoutTimer?: NodeJS.Timeout;
  private retries: number = 0;
  private isFinished: boolean = false;
  private lastDelay: number;

  constructor(options: StatusClientOptions) {
    super();

    if (!options.serverUrl) {
      throw new Error('serverUrl is required.');
    }

    this.serverUrl = options.serverUrl;
    this.useWebSocket = options.useWebSocket ?? true;
    this.pollingMethod = options.pollingMethod ?? 'fixed';
    this.initialDelay = options.initialDelay ?? 1000; // Default 1 second
    this.maxDelay = options.maxDelay ?? 10000; // Default 10 seconds
    this.maxRetries = options.maxRetries ?? 50;
    this.timeout = options.timeout ?? 60000; // Default 60 seconds

    this.lastDelay = this.initialDelay;

    this.axiosInstance = axios.create({
      baseURL: this.serverUrl,
    });
  }

  public start(): void {
    if (this.isFinished) {
      throw new Error('Cannot start after completion. Create a new instance.');
    }

    if (this.useWebSocket) {
      this.initWebSocket();
    } else {
      this.initPolling();
    }

    this.timeoutTimer = setTimeout(() => {
      this.emit('timeout');
      this.cleanup();
    }, this.timeout);
  }

  public stop(): void {
    this.cleanup();
  }

  private initWebSocket(): void {
    try {
      const wsUrl = this.serverUrl.replace(/^http/, 'ws');

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.emit('connected');
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          const status: Status = message.result;

          this.emit('statusUpdate', status);

          if (status === 'completed' || status === 'error') {
            this.emit('finished', status);
            this.cleanup();
          }
        } catch (error) {
          this.emit('error', new Error('Invalid message format.'));
        }
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
        this.cleanup();
      });

      this.ws.on('close', () => {
        if (!this.isFinished) {
          this.emit('disconnected');
        }
        this.cleanup();
      });
    } catch (error) {
      this.emit('error', error);
      this.initPolling(); // Fallback to polling if WebSocket fails
    }
  }

  private initPolling(): void {
    this.pollStatus();
  }

  private async pollStatus(): Promise<void> {
    if (this.isFinished) {
      return;
    }

    try {
      const response = await this.axiosInstance.get('/status');
      const status: Status = response.data.result;

      this.emit('statusUpdate', status);

      if (status === 'completed' || status === 'error') {
        this.emit('finished', status);
        this.cleanup();
        return;
      }

      if (this.retries >= this.maxRetries) {
        this.emit('error', new Error('Max retries reached.'));
        this.cleanup();
        return;
      }

      this.retries++;

      const nextDelay = this.calculateNextDelay();

      this.pollingTimer = setTimeout(() => {
        this.pollStatus();
      }, nextDelay);
    } catch (error) {
      this.emit('error', error);
      this.cleanup();
    }
  }

  private calculateNextDelay(): number {
    let nextDelay: number;

    switch (this.pollingMethod) {
      case 'fixed':
        nextDelay = this.initialDelay;
        break;
      case 'exponential':
        nextDelay = Math.min(this.lastDelay * 2, this.maxDelay);
        break;
      case 'adaptive':
        // Increase delay if status remains 'pending' for a long time
        if (this.retries < 5) {
          nextDelay = this.initialDelay;
        } else if (this.retries < 10) {
          nextDelay = this.lastDelay + 1000;
        } else {
          nextDelay = this.maxDelay;
        }
        break;
      default:
        nextDelay = this.initialDelay;
        break;
    }

    this.lastDelay = nextDelay;
    return nextDelay;
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = undefined;
    }

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = undefined;
    }

    this.isFinished = true;
  }
}