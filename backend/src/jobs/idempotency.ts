import { store, DBJobEvent } from '../database/db';
import { logger } from '../config/logger';

export class IdempotencyManager {
  /**
   * Assessment 07 & Capstone Challenge:
   * Prevents duplicate job execution and duplicate notifications upon worker retries.
   */
  static async checkAndAcquire(jobName: string, idempotencyKey: string, payload: Record<string, any>): Promise<{ shouldRun: boolean; existingRecord?: DBJobEvent }> {
    const existing = store.jobEvents.get(idempotencyKey);
    const now = new Date().toISOString();

    if (existing) {
      if (existing.status === 'COMPLETED') {
        logger.info({ idempotencyKey, jobName }, '🛡️ [IDEMPOTENCY] Job already completed previously. Skipping duplicate dispatch.');
        return { shouldRun: false, existingRecord: existing };
      }
      if (existing.status === 'PROCESSING') {
        logger.warn({ idempotencyKey, jobName }, '🛡️ [IDEMPOTENCY] Job currently in flight. Skipping concurrent duplicate.');
        return { shouldRun: false, existingRecord: existing };
      }

      // If FAILED and attempts < maxRetries, allow retry
      if (existing.status === 'FAILED' && existing.attempts >= 3) {
        logger.error({ idempotencyKey, jobName, attempts: existing.attempts }, '❌ [DLQ] Job exceeded maximum retry attempts. Moved to Dead Letter Queue.');
        return { shouldRun: false, existingRecord: existing };
      }

      // Mark as retrying
      existing.status = 'PROCESSING';
      existing.attempts += 1;
      existing.updatedAt = now;
      store.jobEvents.set(idempotencyKey, existing);
      return { shouldRun: true, existingRecord: existing };
    }

    // New job event
    const record: DBJobEvent = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      jobName,
      idempotencyKey,
      status: 'PROCESSING',
      payload,
      attempts: 1,
      createdAt: now,
      updatedAt: now
    };
    store.jobEvents.set(idempotencyKey, record);
    return { shouldRun: true, existingRecord: record };
  }

  static async markCompleted(idempotencyKey: string, result?: Record<string, any>) {
    const record = store.jobEvents.get(idempotencyKey);
    if (record) {
      record.status = 'COMPLETED';
      record.result = result || null;
      record.updatedAt = new Date().toISOString();
      store.jobEvents.set(idempotencyKey, record);
      logger.info({ idempotencyKey, jobName: record.jobName }, '✅ [IDEMPOTENCY] Job successfully completed and marked idempotent');
    }
  }

  static async markFailed(idempotencyKey: string, error: string) {
    const record = store.jobEvents.get(idempotencyKey);
    if (record) {
      record.status = 'FAILED';
      record.error = error;
      record.updatedAt = new Date().toISOString();
      store.jobEvents.set(idempotencyKey, record);
      logger.warn({ idempotencyKey, jobName: record.jobName, error, attempts: record.attempts }, '⚠️ [IDEMPOTENCY] Job failed');
    }
  }
}
