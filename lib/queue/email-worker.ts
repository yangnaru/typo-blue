import { emailQueue, EmailJob } from './email-queue';
import { sendPostNotificationEmail } from '../actions/mailing-list';

class EmailWorker {
  private isRunning = false;
  private shutdownSignal = false;

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
    
    await emailQueue.disconnect();
    console.log('Email worker shut down gracefully');
    process.exit(0);
  }

  private async processJobs() {
    while (!this.shutdownSignal) {
      try {
        const job = await emailQueue.dequeue();
        
        if (!job) {
          continue; // Timeout, continue polling
        }

        console.log(`Processing job ${job.id} (attempt ${job.retryCount + 1}/${job.maxRetries + 1})`);
        
        await this.processJob(job);
        
      } catch (error) {
        console.error('Error in job processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
      }
    }
    
    this.isRunning = false;
  }

  private async processJob(job: EmailJob) {
    try {
      switch (job.type) {
        case 'post-notification':
          await sendPostNotificationEmail(job.blogId, job.postId);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      
      await emailQueue.complete(job.id);
      console.log(`Job ${job.id} completed successfully`);
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      await emailQueue.retry(job);
    }
  }

  async getStats() {
    return await emailQueue.getQueueStats();
  }
}

export const emailWorker = new EmailWorker();