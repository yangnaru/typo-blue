import { createClient } from 'redis';

export interface EmailJob {
  id: string;
  blogId: string;
  postId: string;
  type: 'post-notification';
  createdAt: Date;
  retryCount: number;
  maxRetries: number;
}

class EmailQueue {
  private client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  private queueName = 'email-queue';
  private processingKey = 'email-processing';
  private retryDelayMs = 60000; // 1 minute

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  async enqueue(job: Omit<EmailJob, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    await this.connect();
    
    const emailJob: EmailJob = {
      ...job,
      id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
      createdAt: new Date(),
      retryCount: 0
    };

    await this.client.lPush(this.queueName, JSON.stringify(emailJob));
    return emailJob.id;
  }

  async dequeue(): Promise<EmailJob | null> {
    await this.connect();
    
    const result = await this.client.brPop(this.queueName, 10);
    if (!result) return null;

    const job: EmailJob = JSON.parse(result.element);
    
    // Add to processing set with expiration
    await this.client.setEx(
      `${this.processingKey}:${job.id}`,
      300, // 5 minutes
      JSON.stringify(job)
    );

    return job;
  }

  async complete(jobId: string): Promise<void> {
    await this.connect();
    await this.client.del(`${this.processingKey}:${jobId}`);
  }

  async retry(job: EmailJob): Promise<void> {
    await this.connect();
    
    if (job.retryCount >= job.maxRetries) {
      console.error(`Job ${job.id} exceeded max retries, moving to dead letter queue`);
      await this.client.lPush(`${this.queueName}:failed`, JSON.stringify(job));
      await this.client.del(`${this.processingKey}:${job.id}`);
      return;
    }

    job.retryCount++;
    
    // Exponential backoff: delay = retryDelayMs * 2^retryCount
    const delay = this.retryDelayMs * Math.pow(2, job.retryCount - 1);
    
    setTimeout(async () => {
      await this.client.lPush(this.queueName, JSON.stringify(job));
      await this.client.del(`${this.processingKey}:${job.id}`);
    }, delay);
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
  }> {
    await this.connect();
    
    const [pending, processing, failed] = await Promise.all([
      this.client.lLen(this.queueName),
      this.client.keys(`${this.processingKey}:*`).then(keys => keys.length),
      this.client.lLen(`${this.queueName}:failed`)
    ]);

    return { pending, processing, failed };
  }

  async recoverStuckJobs(): Promise<void> {
    await this.connect();
    
    const processingKeys = await this.client.keys(`${this.processingKey}:*`);
    
    for (const key of processingKeys) {
      const ttl = await this.client.ttl(key);
      if (ttl === -1) { // Key exists but has no expiration
        const jobData = await this.client.get(key);
        if (jobData) {
          const job: EmailJob = JSON.parse(jobData);
          await this.retry(job);
        }
      }
    }
  }
}

export const emailQueue = new EmailQueue();