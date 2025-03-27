import { v } from "convex/values";
import {
  query,
  mutation,
} from "./_generated/server";

/**
 * Generate a URL for uploading a file to Convex storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save media file information to the media table
 */
export const saveMedia = mutation({
  args: {
    name: v.string(),
    fileId: v.id("_storage"),
    size: v.number(),
    mimeType: v.string(),
    description: v.optional(v.string()),
    userId: v.string(),
    duration: v.optional(v.number()),
  },
  returns: v.object({
    mediaId: v.id("media"),
    storageId: v.id("_storage"),
  }),
  handler: async (ctx, args) => {
    // Create a record with the media information
    const media = {
      name: args.name,
      fileId: args.fileId,
      size: args.size,
      mimeType: args.mimeType,
      description: args.description,
      userId: args.userId,
      duration: args.duration,
      transcriptionStatus: "pending", // Default status
    };

    const mediaId = await ctx.db.insert("media", media);

    return { mediaId, storageId: args.fileId };
  },
});

/**
 * Get all media files for a user
 */
export const getAllMedia = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("media"),
      _creationTime: v.number(),
      name: v.string(),
      fileId: v.id("_storage"),
      size: v.number(),
      mimeType: v.string(),
      description: v.optional(v.string()),
      fileUrl: v.optional(v.string()),
      userId: v.string(),
      duration: v.optional(v.number()),
      transcriptionStatus: v.optional(v.string()),
      transcriptionText: v.optional(v.string()),
      transcribedAt: v.optional(v.number()),
      translations: v.optional(v.array(
        v.object({
          targetLanguage: v.string(),
          translatedText: v.string(),
          translatedAt: v.number(),
          status: v.optional(v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("error")
          )),
          error: v.optional(v.string())
        })
      )),
      enhancements: v.optional(v.array(
        v.object({
          originalText: v.string(),
          enhancedText: v.string(),
          modelName: v.string(),
          promptType: v.string(),
          enhancedAt: v.number(),
          status: v.optional(v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("error")
          )),
          error: v.optional(v.string())
        })
      )),
    })
  ),
  handler: async (ctx, args) => {
    const mediaFiles = await ctx.db
      .query("media")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Generate a file URL for each media file
    return await Promise.all(
      mediaFiles.map(async (media) => {
        // Get the fileUrl for display
        const fileUrl = await ctx.storage.getUrl(media.fileId);

        return {
          ...media,
          fileUrl: fileUrl || undefined,
        };
      })
    );
  },
});

/**
 * Get a media file by ID
 */
export const getMediaById = query({
  args: {
    mediaId: v.id("media"),
  },
  returns: v.union(
    v.object({
      _id: v.id("media"),
      _creationTime: v.number(),
      name: v.string(),
      fileId: v.id("_storage"),
      size: v.number(),
      mimeType: v.string(),
      description: v.optional(v.string()),
      fileUrl: v.optional(v.string()),
      userId: v.string(),
      duration: v.optional(v.number()),
      transcriptionStatus: v.optional(v.string()),
      transcriptionText: v.optional(v.string()),
      transcribedAt: v.optional(v.number()),
      translations: v.optional(v.array(
        v.object({
          targetLanguage: v.string(),
          translatedText: v.string(),
          translatedAt: v.number(),
          status: v.optional(v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("error")
          )),
          error: v.optional(v.string())
        })
      )),
      enhancements: v.optional(v.array(
        v.object({
          originalText: v.string(),
          enhancedText: v.string(),
          modelName: v.string(),
          promptType: v.string(),
          enhancedAt: v.number(),
          status: v.optional(v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("error")
          )),
          error: v.optional(v.string())
        })
      )),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);
    
    if (!media) {
      return null;
    }
    
    // Get the fileUrl for display
    const fileUrl = media.fileId ? await ctx.storage.getUrl(media.fileId) : null;
    
    return {
      ...media,
      fileUrl: fileUrl || undefined,
    };
  },
});

/**
 * Update the transcription status and result
 */
export const updateTranscription = mutation({
  args: {
    mediaId: v.id("media"),
    status: v.string(),
    transcriptionText: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { mediaId, status, transcriptionText } = args;
    const media = await ctx.db.get(mediaId);

    if (!media) {
      console.error(`Media not found during status update: ${mediaId}`);
      throw new Error("Media not found");
    }

    const update: Record<string, string | number> = { 
      transcriptionStatus: status
    };

    if (transcriptionText !== undefined) {
      update.transcriptionText = transcriptionText;
    }

    if (status === "completed") {
      update.transcribedAt = Date.now();
    }

    await ctx.db.patch(mediaId, update);

    return null;
  },
});

/**
 * Retrieves the URL for a file stored in Convex storage.
 */
export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const updateTranslations = mutation({
  args: {
    mediaId: v.id("media"),
    translations: v.array(
      v.object({
        targetLanguage: v.string(),
        translatedText: v.string(),
        translatedAt: v.number(),
        status: v.optional(v.union(
          v.literal("pending"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("error")
        )),
        error: v.optional(v.string())
      })
    ),
  },
  returns: v.object({
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    await ctx.db.patch(args.mediaId, {
      translations: args.translations,
    });

    return { success: true };
  },
});

/**
 * Update the AI enhancements for a media file
 */
export const updateEnhancements = mutation({
  args: {
    mediaId: v.id("media"),
    enhancements: v.array(
      v.object({
        originalText: v.string(),
        enhancedText: v.string(),
        modelName: v.string(),
        promptType: v.string(),
        enhancedAt: v.number(),
        status: v.optional(v.union(
          v.literal("pending"),
          v.literal("processing"),
          v.literal("completed"),
          v.literal("error")
        )),
        error: v.optional(v.string())
      })
    ),
  },
  returns: v.object({
    success: v.boolean()
  }),
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);
    if (!media) {
      throw new Error("Media not found");
    }

    await ctx.db.patch(args.mediaId, {
      enhancements: args.enhancements,
    });

    return { success: true };
  },
});

/**
 * Check if a user has access to a media file
 */
export const userHasAccess = query({
  args: {
    mediaId: v.id("media"),
    userId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const media = await ctx.db.get(args.mediaId);
    if (!media) {
      return false;
    }
    return media.userId === args.userId;
  },
}); 