import { emailQueue, EmailJob } from './email-queue';
import { sendPostNotificationEmailToSubscriber } from '../actions/mailing-list';

class EmailWorker {
  private isRunning = false;
  private shutdownSignal = false;
  private processingJob: EmailJob | null = null;

  async start() {
    if (this.isRunning) {
      console.log('Email worker is already running');
      return;
    }

    this.isRunning = true;
    this.shutdownSignal = false;
    
    console.log('Starting email worker...');
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    // Recover any stuck jobs on startup
    await emailQueue.recoverStuckJobs();

    // Start processing jobs
    this.processJobs();
  }

  async shutdown() {
    console.log('Shutting down email worker...');
    this.shutdownSignal = true;
    
    // Wait for current job to complete
    while (this.isRunning) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Email worker shut down gracefully');
    process.exit(0);
  }

  private async processJobs() {
    while (!this.shutdownSignal) {
      try {
        const job = await emailQueue.dequeue();
        
        if (!job) {
          // No jobs available, wait before polling again
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        this.processingJob = job;
        console.log(`Processing job ${job.id} (attempt ${job.retryCount + 1}/${job.maxRetries + 1})`);
        
        await this.processJob(job);
        this.processingJob = null;
        
      } catch (error) {
        console.error('Error in job processing loop:', error);
        if (this.processingJob) {
          await emailQueue.fail(this.processingJob.id, error instanceof Error ? error.message : 'Unknown error');
          this.processingJob = null;
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
      }
    }
    
    this.isRunning = false;
  }

  private async processJob(job: EmailJob) {
    try {
      switch (job.type) {
        case 'post-notification':
          await sendPostNotificationEmailToSubscriber(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      
      await emailQueue.complete(job.id);
      console.log(`Job ${job.id} completed successfully`);
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update job with error message for retry
      const jobWithError = { ...job, errorMessage };
      await emailQueue.retry(jobWithError);
    }
  }

  async getStats() {
    return await emailQueue.getQueueStats();
  }

  async cleanupOldJobs(olderThanDays: number = 30) {
    console.log(`Cleaning up completed jobs older than ${olderThanDays} days`);
    await emailQueue.cleanupOldJobs(olderThanDays);
  }
}

export const emailWorker = new EmailWorker();