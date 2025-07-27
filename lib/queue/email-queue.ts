import { db } from '../db';
import { emailQueue as emailQueueTable } from '../../drizzle/schema';
import { eq, and, lt, sql } from 'drizzle-orm';

export interface EmailJob {
  id: string;
  blogId: string;
  postId: string;
  subscriberEmail: string;
  unsubscribeToken: string;
  type: 'post-notification';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  processedAt?: Date;
  scheduledFor: Date;
  errorMessage?: string;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
}

class EmailQueue {
  private retryDelayMs = 60000; // 1 minute

  async enqueue(job: Omit<EmailJob, 'id' | 'createdAt' | 'retryCount' | 'status' | 'scheduledFor'>): Promise<string> {
    const jobId = crypto.randomUUID();
    
    await db.insert(emailQueueTable).values({
      id: jobId,
      blogId: job.blogId,
      postId: job.postId,
      subscriberEmail: job.subscriberEmail,
      unsubscribeToken: job.unsubscribeToken,
      type: job.type,
      status: 'pending',
      retryCount: 0,
      maxRetries: job.maxRetries,
      createdAt: new Date(),
      scheduledFor: new Date(),
    });

    return jobId;
  }

  async dequeue(): Promise<EmailJob | null> {
    // Use a transaction to atomically get and mark a job as processing
    const result = await db.transaction(async (tx) => {
      // Find the oldest pending job that's scheduled to run
      const [job] = await tx
        .select()
        .from(emailQueueTable)
        .where(
          and(
            eq(emailQueueTable.status, 'pending'),
            lt(emailQueueTable.scheduledFor, new Date())
          )
        )
        .orderBy(emailQueueTable.createdAt)
        .limit(1);

      if (!job) return null;

      // Mark it as processing
      await tx
        .update(emailQueueTable)
        .set({ status: 'processing' })
        .where(eq(emailQueueTable.id, job.id));

      return job as EmailJob;
    });

    return result;
  }

  async complete(jobId: string): Promise<void> {
    await db
      .update(emailQueueTable)
      .set({ 
        status: 'completed',
        processedAt: new Date()
      })
      .where(eq(emailQueueTable.id, jobId));
  }

  async retry(job: EmailJob): Promise<void> {
    if (job.retryCount >= job.maxRetries) {
      console.error(`Job ${job.id} exceeded max retries, marking as failed`);
      await db
        .update(emailQueueTable)
        .set({ 
          status: 'failed',
          processedAt: new Date(),
          errorMessage: `Exceeded max retries (${job.maxRetries})`
        })
        .where(eq(emailQueueTable.id, job.id));
      return;
    }

    const newRetryCount = job.retryCount + 1;
    const delay = this.retryDelayMs * Math.pow(2, newRetryCount - 1);
    const scheduledFor = new Date(Date.now() + delay);

    await db
      .update(emailQueueTable)
      .set({
        status: 'pending',
        retryCount: newRetryCount,
        scheduledFor,
        errorMessage: job.errorMessage
      })
      .where(eq(emailQueueTable.id, job.id));
  }

  async fail(jobId: string, errorMessage: string): Promise<void> {
    await db
      .update(emailQueueTable)
      .set({
        status: 'failed',
        processedAt: new Date(),
        errorMessage
      })
      .where(eq(emailQueueTable.id, jobId));
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const results = await db
      .select({
        status: emailQueueTable.status,
        count: sql<number>`count(*)`.as('count')
      })
      .from(emailQueueTable)
      .groupBy(emailQueueTable.status);

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };

    results.forEach(row => {
      stats[row.status as keyof typeof stats] = Number(row.count);
    });

    return stats;
  }

  async recoverStuckJobs(): Promise<void> {
    // Find jobs that have been processing for more than 5 minutes
    const stuckJobs = await db
      .select()
      .from(emailQueueTable)
      .where(
        and(
          eq(emailQueueTable.status, 'processing'),
          lt(emailQueueTable.scheduledFor, new Date(Date.now() - 5 * 60 * 1000))
        )
      );

    for (const job of stuckJobs) {
      console.log(`Recovering stuck job ${job.id}`);
      await this.retry(job as EmailJob);
    }
  }

  async cleanupOldJobs(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    await db
      .delete(emailQueueTable)
      .where(
        and(
          eq(emailQueueTable.status, 'completed'),
          lt(emailQueueTable.createdAt, cutoffDate)
        )
      );
  }
}

export const emailQueue = new EmailQueue();