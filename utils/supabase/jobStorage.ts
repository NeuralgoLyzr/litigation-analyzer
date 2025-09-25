import { createClient } from "./client";

const supabase = createClient();

export interface BatchJob {
  id?: string;
  created_at?: string;
  project_name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results?: any[]; 
  status: "processing" | "completed" | "failed";
  error?: string;
  error_code? : number;
  updated_at?: string;
}

class JobStorage {
  async createJob(project_name: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("batch_jobs")
      .insert([
        {
          project_name,
          status: "processing",
          results: [], // Store empty array in JSONB
          updated_at: new Date().toISOString(),
        }
      ])
      .select("id")
      .single();

    if (error) {
      console.error("Error creating job:", error);
      return null;
    }
    return data.id;
  }

  async getJob(id: string): Promise<BatchJob | null> {
    const { data, error } = await supabase
      .from("batch_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching job:", error);
      return null;
    }
    return data;
  }

  async updateJob(id: string, updates: Partial<BatchJob>): Promise<boolean> {
    const { error } = await supabase
      .from("batch_jobs")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error updating job:", error);
      return false;
    }
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async appendResult(id: string, newResult: any): Promise<boolean> {
    // Get the current results array
    const { data, error: fetchError } = await supabase
      .from("batch_jobs")
      .select("results")
      .eq("id", id)
      .single();

    if (fetchError || !data) {
      console.error("Error fetching existing results:", fetchError);
      return false;
    }

    const updatedResults = [...data.results, ...newResult]; // Append new result

    // Update the job with the new results array
    const { error } = await supabase
      .from("batch_jobs")
      .update({ results: updatedResults, status : 'completed', updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("Error updating results:", error);
      return false;
    }
    return true;
  }

  async deleteJob(id: string): Promise<boolean> {
    const { error } = await supabase.from("batch_jobs").delete().eq("id", id);

    if (error) {
      console.error("Error deleting job:", error);
      return false;
    }
    return true;
  }

  async cleanupOldJobs(): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("batch_jobs")
      .delete()
      .lt("updated_at", oneHourAgo);

    if (error) {
      console.error("Error cleaning up jobs:", error);
      return false;
    }
    return true;
  }
}

export const jobStorage = new JobStorage();