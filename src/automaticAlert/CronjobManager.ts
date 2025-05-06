import cron from 'node-cron';

// Type for task function
type CronTask = () => Promise<void>;

// Generic Cron Job Manager
class CronJobManager {
  /**
   * Schedules a cron job with the specified cron expression and task.
   * @param cronExpression - The cron expression (e.g., '0 0 * * *' for daily at midnight).
   * @param taskName - A descriptive name for the task.
   * @param task - The async function to execute.
   */
  static scheduleJob(cronExpression: string, taskName: string, task: CronTask) {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Schedule the cron job
    cron.schedule(cronExpression, async () => {
      try {
        console.log(`Running task: ${taskName} at ${new Date().toISOString()}`);
        await task(); // Execute the task
        console.log(`Task ${taskName} completed successfully`);
      } catch (error) {
        console.error(`Error in task ${taskName}:`, error);
      }
    });

    console.log(`Task ${taskName} scheduled with cron expression: ${cronExpression}`);
  }
}

export default CronJobManager;