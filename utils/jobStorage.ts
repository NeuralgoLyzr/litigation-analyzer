import connectToDatabase from '../lib/mongodb';
import BatchJob from '../models/BatchJob';

export interface BatchJob {
  id?: string;
  project_name: string;
  results?: Record<string, unknown>[];
  status: "processing" | "completed" | "failed";
  error?: string;
  error_code?: number;
  created_at?: Date;
  updated_at?: Date;
}

class JobStorage {
  async createJob(project_name: string): Promise<string | null> {
    console.log("Attempting to create job with project_name:", project_name);
    
    try {
      await connectToDatabase();
      
      const newJob = new BatchJob({
        project_name,
        status: "processing",
        results: [],
        updated_at: new Date()
      });
      
      const savedJob = await newJob.save();
      console.log("Job created successfully with ID:", savedJob._id);
      return savedJob._id.toString();
    } catch (e) {
      console.error("Exception in createJob:", e);
      return null;
    }
  }

  async getJob(id: string): Promise<BatchJob | null> {
    console.log("Fetching job with ID:", id);
    
    try {
      await connectToDatabase();
      
      const job = await BatchJob.findById(id).lean();
      
      if (!job) {
        console.error("No job found with ID:", id);
        return null;
      }
      
      return {
        id: job._id.toString(),
        project_name: job.project_name,
        results: job.results,
        status: job.status as "processing" | "completed" | "failed",
        error: job.error,
        error_code: job.error_code,
        created_at: job.created_at,
        updated_at: job.updated_at
      };
    } catch (e) {
      console.error("Exception in getJob:", e);
      return null;
    }
  }

  async updateJob(id: string, updates: Partial<BatchJob>): Promise<boolean> {
    console.log("Updating job with ID:", id, "Updates:", updates);
    
    try {
      await connectToDatabase();
      
      const result = await BatchJob.updateOne(
        { _id: id },
        { 
          ...updates, 
          updated_at: new Date()
        }
      );

      if (result.modifiedCount === 0) {
        console.error("No job updated with ID:", id);
        return false;
      }
      
      console.log("Job updated successfully");
      return true;
    } catch (e) {
      console.error("Exception in updateJob:", e);
      return false;
    }
  }

  async appendResult(id: string, newResult: Record<string, unknown>[]): Promise<boolean> {
    console.log("Appending results to job ID:", id);
    
    try {
      await connectToDatabase();
      
      // Get the current job
      const job = await BatchJob.findById(id);

      if (!job) {
        console.error("Job not found for ID:", id);
        return false;
      }

      // Add new results
      const updatedResults = [...job.results, ...newResult];
      console.log("Updating with new results, total count:", updatedResults.length);

      // Update the job with the new results array
      job.results = updatedResults;
      job.status = 'completed';
      job.updated_at = new Date();
      
      await job.save();
      
      console.log("Results appended successfully");
      return true;
    } catch (e) {
      console.error("Exception in appendResult:", e);
      return false;
    }
  }

  async appendResultWithStatus(
    id: string, 
    newResult: Record<string, unknown>[], 
    status: "processing" | "completed" | "failed"
  ): Promise<boolean> {
    console.log(`Appending results to job ID: ${id} with status: ${status}`);
    
    try {
      await connectToDatabase();
      
      // Get the current job
      const job = await BatchJob.findById(id);

      if (!job) {
        console.error("Job not found for ID:", id);
        return false;
      }

      // Add new results
      const updatedResults = [...job.results, ...newResult];
      console.log("Updating with new results, total count:", updatedResults.length);

      // Update the job with the new results array and specified status
      job.results = updatedResults;
      job.status = status;
      job.updated_at = new Date();
      
      await job.save();
      
      console.log("Results appended successfully with status:", status);
      return true;
    } catch (e) {
      console.error("Exception in appendResultWithStatus:", e);
      return false;
    }
  }

  async deleteJob(id: string): Promise<boolean> {
    console.log("Deleting job with ID:", id);
    
    try {
      await connectToDatabase();
      
      const result = await BatchJob.deleteOne({ _id: id });

      if (result.deletedCount === 0) {
        console.error("No job deleted with ID:", id);
        return false;
      }
      
      console.log("Job deleted successfully");
      return true;
    } catch (e) {
      console.error("Exception in deleteJob:", e);
      return false;
    }
  }

  async cleanupOldJobs(): Promise<boolean> {
    console.log("Cleaning up old jobs");
    
    try {
      await connectToDatabase();
      
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const result = await BatchJob.deleteMany({
        updated_at: { $lt: oneHourAgo }
      });

      console.log(`Deleted ${result.deletedCount} old jobs`);
      return true;
    } catch (e) {
      console.error("Exception in cleanupOldJobs:", e);
      return false;
    }
  }
}

export const jobStorage = new JobStorage(); 