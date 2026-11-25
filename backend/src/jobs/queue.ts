import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { IdempotencyManager } from './idempotency';
import { emailService } from '../services/email/emailService';
import { store, DBNotification } from '../database/db';
import { ioServer } from '../realtime/socket';

export interface JobData {
  jobName: string;
  idempotencyKey: string;
  organizationId: string;
  payload: Record<string, any>;
}

class WorkSphereQueueService {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private redisConnection: IORedis | null = null;
  private inMemoryQueue: JobData[] = [];
  private isProcessingInMemory = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.redisConnection = new IORedis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 2000,
        retryStrategy: () => null // Don't hang if redis is not running locally
      });

      await this.redisConnection.connect();
      logger.info('Connected to Redis for BullMQ queues');

      this.queue = new Queue('worksphere-jobs', { connection: this.redisConnection });
      this.worker = new Worker('worksphere-jobs', async (job: Job) => {
        await this.processJob(job.data);
      }, { connection: this.redisConnection });

      this.worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, err }, 'BullMQ job failed');
      });
    } catch (err) {
      logger.warn('Redis not available locally. Switching to built-in resilient in-memory job runner.');
      this.queue = null;
      this.worker = null;
      if (this.redisConnection) {
        this.redisConnection.disconnect();
        this.redisConnection = null;
      }
    }
  }

  async dispatch(jobName: string, organizationId: string, payload: Record<string, any>, customIdempotencyKey?: string) {
    const idempotencyKey = customIdempotencyKey || `job-${jobName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const jobData: JobData = {
      jobName,
      organizationId,
      idempotencyKey,
      payload
    };

    if (this.queue) {
      await this.queue.add(jobName, jobData, {
        jobId: idempotencyKey,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 }
      });
    } else {
      // Run via in-memory queue
      this.inMemoryQueue.push(jobData);
      this.drainInMemoryQueue();
    }

    return { queued: true, idempotencyKey };
  }

  private async drainInMemoryQueue() {
    if (this.isProcessingInMemory) return;
    this.isProcessingInMemory = true;

    while (this.inMemoryQueue.length > 0) {
      const item = this.inMemoryQueue.shift();
      if (item) {
        try {
          await this.processJob(item);
        } catch (err) {
          logger.error({ err, item }, 'Error processing in-memory background job');
        }
      }
    }

    this.isProcessingInMemory = false;
  }

  async processJob(jobData: JobData) {
    const { jobName, idempotencyKey, organizationId, payload } = jobData;

    // Assessment 07 & Capstone Challenge: Verify idempotency before dispatching
    const gate = await IdempotencyManager.checkAndAcquire(jobName, idempotencyKey, payload);
    if (!gate.shouldRun) {
      return { skipped: true, reason: 'IDEMPOTENT_DUPLICATE_OR_DLQ' };
    }

    try {
      let result: any = null;

      switch (jobName) {
        case 'SEND_EMAIL': {
          result = await emailService.sendEmail({
            to: payload.to,
            subject: payload.subject,
            html: payload.html,
            text: payload.text,
            attachments: payload.attachments,
            idempotencyKey
          });
          break;
        }

        case 'SEND_TASK_NOTIFICATION': {
          const notifId = `ntf-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const notif: DBNotification = {
            id: notifId,
            organizationId,
            userId: payload.userId,
            title: payload.title,
            message: payload.message,
            type: payload.type || 'TASK_UPDATE',
            isRead: false,
            link: payload.link || null,
            createdAt: new Date().toISOString()
          };
          store.notifications.set(notifId, notif);

          // Emit real-time notification
          if (ioServer) {
            ioServer.to(`org:${organizationId}:user:${payload.userId}`).emit('notification:new', notif);
          }
          result = { notificationId: notifId };
          break;
        }

        case 'CHECK_OVERDUE_TASKS': {
          const now = new Date();
          let overdueCount = 0;
          for (const task of store.tasks.values()) {
            if (task.organizationId === organizationId && task.status !== 'DONE' && task.dueDate) {
              if (new Date(task.dueDate) < now) {
                overdueCount++;
              }
            }
          }
          result = { overdueCount };
          break;
        }

        default:
          result = { executed: true };
      }

      await IdempotencyManager.markCompleted(idempotencyKey, result);
      return result;
    } catch (err: any) {
      await IdempotencyManager.markFailed(idempotencyKey, err.message || String(err));
      throw err;
    }
  }
}

export const jobQueue = new WorkSphereQueueService();
