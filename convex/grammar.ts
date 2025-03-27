import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new grammar check job
 */
export const createGrammarCheckJob = mutation({
  args: {
    text: v.string(),
    userId: v.string(),
  },
  returns: v.object({
    jobId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Create a unique job ID
    const jobId = generateJobId();
    
    // Create a grammar check job
    await ctx.db.insert("grammarChecks", {
      jobId,
      userId: args.userId,
      originalText: args.text,
      status: "pending",
      createdAt: Date.now(),
    });

    return { jobId };
  },
});

/**
 * Create or update a grammar check job
 */
export const createOrUpdateGrammarJob = mutation({
  args: {
    jobId: v.string(),
    text: v.string(),
    userId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("error")
    ),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if job already exists
    const existingJob = await ctx.db
      .query("grammarChecks")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .unique();
    
    if (existingJob) {
      // Update existing job
      await ctx.db.patch(existingJob._id, {
        status: args.status,
        error: args.error,
        ...(args.status === "completed" || args.status === "error"
          ? { completedAt: Date.now() }
          : {}),
      });
    } else {
      // Create new job
      await ctx.db.insert("grammarChecks", {
        jobId: args.jobId,
        userId: args.userId,
        originalText: args.text,
        status: args.status,
        error: args.error,
        createdAt: Date.now(),
        ...(args.status === "completed" || args.status === "error"
          ? { completedAt: Date.now() }
          : {}),
      });
    }
    
    return null;
  },
});

/**
 * Update the status and results of a grammar check job
 */
export const updateGrammarCheckResults = mutation({
  args: {
    jobId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("error")
    ),
    corrections: v.optional(v.array(
      v.object({
        message: v.string(),
        offset: v.number(),
        length: v.number(),
        replacement: v.string(),
      })
    )),
    detectedLanguage: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the job by ID
    const job = await ctx.db
      .query("grammarChecks")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .unique();
    
    if (!job) {
      throw new Error(`Grammar check job with ID ${args.jobId} not found`);
    }
    
    // Update the job with the new status and results
    await ctx.db.patch(job._id, {
      status: args.status,
      corrections: args.corrections,
      detectedLanguage: args.detectedLanguage,
      error: args.error,
      ...(args.status === "completed" || args.status === "error"
        ? { completedAt: Date.now() }
        : {}),
    });
    
    return null;
  },
});

/**
 * Get a grammar check job by ID
 */
export const getGrammarCheckById = query({
  args: {
    jobId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("grammarChecks"),
      _creationTime: v.number(),
      jobId: v.string(),
      userId: v.string(),
      originalText: v.string(),
      status: v.string(),
      corrections: v.optional(v.array(
        v.object({
          message: v.string(),
          offset: v.number(),
          length: v.number(),
          replacement: v.string(),
        })
      )),
      detectedLanguage: v.optional(v.string()),
      error: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const check = await ctx.db
      .query("grammarChecks")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .unique();
    
    return check;
  },
});

/**
 * Get all grammar check jobs for a user
 */
export const getGrammarChecksByUser = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("grammarChecks"),
      _creationTime: v.number(),
      jobId: v.string(),
      userId: v.string(),
      originalText: v.string(),
      status: v.string(),
      corrections: v.optional(v.array(
        v.object({
          message: v.string(),
          offset: v.number(),
          length: v.number(),
          replacement: v.string(),
        })
      )),
      detectedLanguage: v.optional(v.string()),
      error: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const checks = await ctx.db
      .query("grammarChecks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    
    return checks;
  },
});

/**
 * Check if a user has access to a grammar check job
 */
export const userHasAccess = query({
  args: {
    jobId: v.string(),
    userId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const check = await ctx.db
      .query("grammarChecks")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();
    
    return !!check;
  },
});

// Helper function to generate a unique job ID
function generateJobId(): string {
  return `grammar_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
} 