import { v } from "convex/values";
import {
  query,
  mutation,
  action,
} from "./_generated/server";
import { api } from "./_generated/api";

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
 * Initialize a multipart upload for large files.
 * This creates an entry in the "multipartUploads" table to track the upload.
 */
export const initMultipartUpload = mutation({
  args: {
    numChunks: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    uploadId: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Create a unique uploadId
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Store the upload information
      await ctx.db.insert("multipartUploads", {
        uploadId,
        numChunks: args.numChunks,
        uploadedChunks: 0,
        isComplete: false,
        createdAt: Date.now(),
      });
      
      return { 
        success: true, 
        uploadId 
      };
    } catch (error) {
      console.error("Error initializing multipart upload:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
});

/**
 * Get a URL for uploading a specific chunk of a multipart upload.
 */
export const getMultipartUploadUrl = mutation({
  args: {
    uploadId: v.string(),
    chunkIndex: v.number(),
  },
  returns: v.object({
    uploadUrl: v.string(),
    chunkId: v.id("multipartChunks")
  }),
  handler: async (ctx, args) => {
    // Validate the upload ID exists
    const uploads = await ctx.db
      .query("multipartUploads")
      .filter(q => q.eq(q.field("uploadId"), args.uploadId))
      .collect();
      
    if (uploads.length === 0) {
      throw new Error(`Upload ID ${args.uploadId} not found`);
    }
    
    const upload = uploads[0];
    
    if (upload.isComplete) {
      throw new Error("This upload has already been completed");
    }
    
    if (args.chunkIndex >= upload.numChunks) {
      throw new Error(`Chunk index ${args.chunkIndex} is out of bounds (max: ${upload.numChunks - 1})`);
    }
    
    // Get an upload URL
    const uploadUrl = await ctx.storage.generateUploadUrl();
    
    // Store this chunk info for later
    const chunkId = await ctx.db.insert("multipartChunks", {
      uploadId: args.uploadId,
      chunkIndex: args.chunkIndex,
      storageId: undefined, // Will be set after upload
      uploadedAt: Date.now(),
    });
    
    return {
      uploadUrl,
      chunkId
    };
  },
});

/**
 * Save the storage ID for a chunk after it's been uploaded
 */
export const saveChunkStorageId = mutation({
  args: {
    chunkId: v.id("multipartChunks"),
    storageId: v.id("_storage"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Update the chunk record with the actual storage ID
    await ctx.db.patch(args.chunkId, {
      storageId: args.storageId,
    });
    
    return true;
  },
});

/**
 * Complete a multipart upload by storing actual file
 */
export const completeMultipartUpload = mutation({
  args: {
    uploadId: v.string(),
    contentType: v.string(),
    storageId: v.id("_storage"), // Use the already uploaded storageId
  },
  returns: v.object({
    success: v.boolean(),
    storageId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      // Get the upload record
      const uploads = await ctx.db
        .query("multipartUploads")
        .filter(q => q.eq(q.field("uploadId"), args.uploadId))
        .collect();
        
      if (uploads.length === 0) {
        throw new Error(`Upload ID ${args.uploadId} not found`);
      }
      
      const upload = uploads[0];
      
      if (upload.isComplete) {
        throw new Error("This upload has already been completed");
      }
           
      // Mark the upload as complete
      await ctx.db.patch(upload._id, {
        isComplete: true,
        completedAt: Date.now(),
        storageId: args.storageId,
      });
      
      // Just return the storageId that was passed in
      return { 
        success: true,
        storageId: args.storageId,
      };
    } catch (error) {
      console.error("Error completing multipart upload:", error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },
});

/**
 * Save PDF file information to the pdfs table
 */
export const savePdf = mutation({
  args: {
    name: v.string(),
    fileId: v.id("_storage"),
    size: v.number(),
    mimeType: v.string(),
    description: v.optional(v.string()),
    userId: v.string(),
  },
  returns: v.id("pdfs"),
  handler: async (ctx, args) => {
    // Create a record with the PDF information
    const pdf = {
      name: args.name,
      fileId: args.fileId,
      size: args.size,
      mimeType: args.mimeType,
      description: args.description,
      userId: args.userId,
    };

    const pdfId = await ctx.db.insert("pdfs", pdf);

    return pdfId;
  },
});

/**
 * Get all PDFs
 */
export const getAllPdfs = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("pdfs"),
      _creationTime: v.number(),
      name: v.string(),
      fileId: v.id("_storage"),
      size: v.number(),
      mimeType: v.string(),
      description: v.optional(v.string()),
      fileUrl: v.optional(v.string()),
      userId: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const pdfs = await ctx.db
      .query("pdfs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Generate a file URL for each PDF
    return await Promise.all(
      pdfs.map(async (pdf) => {
        // Get the fileUrl for display
        const fileUrl = await ctx.storage.getUrl(pdf.fileId);

        return {
          _id: pdf._id,
          _creationTime: pdf._creationTime,
          name: pdf.name,
          fileId: pdf.fileId,
          size: pdf.size,
          mimeType: pdf.mimeType,
          description: pdf.description,
          fileUrl: fileUrl || undefined,
          userId: pdf.userId,
        };
      })
    );
  },
});

/**
 * Save receipt information after file has been uploaded to storage.
 */
export const saveReceipt = mutation({
  args: {
    userId: v.string(),
    fileName: v.string(),
    fileDisplayName: v.optional(v.string()),
    fileId: v.id("_storage"),
    size: v.number(),
    mimeType: v.string(),
    status: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
      })
    ),
  },
  returns: v.object({
    receiptId: v.id("receipts"),
    storageId: v.id("_storage"),
  }),
  handler: async (ctx, args) => {
    const receiptId = await ctx.db.insert("receipts", {
      userId: args.userId,
      fileName: args.fileName,
      fileDisplayName: args.fileDisplayName,
      fileId: args.fileId,
      uploadedAt: Date.now(),
      size: args.size,
      mimeType: args.mimeType,
      status: args.status,
      items: args.items,
      merchantName: undefined,
      merchantAddress: undefined,
      merchantContact: undefined,
      transactionDate: undefined,
      transactionAmount: undefined,
      currency: undefined,
      receiptSummary: undefined,
      receiptNumber: undefined,
      paymentMethod: undefined,
      subtotal: undefined,
      tax: undefined,
    });
    return { receiptId, storageId: args.fileId };
  },
});

/**
 * Process a receipt that has been uploaded
 * This would typically include OCR and data extraction
 * For now, it just updates the status to "processed"
 */
export const processReceipt = mutation({
  args: {
    receiptId: v.id("receipts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);

    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // Simulate processing with a simple update
    // In a real app, this would trigger a background job for OCR/extraction
    await ctx.db.patch(args.receiptId, {
      status: "processed",
      // Add some sample data for demo purposes
      merchantName: "Sample Store",
      merchantAddress: "123 Sample St, Sample City",
      transactionDate: new Date().toISOString().split("T")[0],
      transactionAmount: Math.floor(Math.random() * 100) + 10,
      currency: "$",
      receiptSummary: "Sample transaction for demo purposes",
    });

    return null;
  },
});

/**
 * Update receipt details with extracted data from OCR processing
 * Called by the Inngest databaseAgent
 */
export const updateReceiptDetails = mutation({
  args: {
    receiptId: v.id("receipts"),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
      })
    ),
    fileDisplayName: v.optional(v.string()),
    merchantName: v.optional(v.string()),
    merchantAddress: v.optional(v.string()),
    merchantContact: v.optional(v.string()),
    transactionDate: v.optional(v.string()),
    receiptNumber: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    transactionAmount: v.optional(v.number()),
    currency: v.optional(v.string()),
    receiptSummary: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { receiptId, ...updates } = args;

    const receipt = await ctx.db.get(receiptId);
    if (!receipt) {
      console.error(`Receipt not found during update: ${receiptId}`);
      throw new Error("Receipt not found");
    }

    // Explicitly set status to processed when details are updated
    await ctx.db.patch(receiptId, {
      ...updates,
      status: "processed", // Ensure status is set to processed
    });

    console.log(`Receipt ${receiptId} details updated.`);
    return null;
  },
});

/**
 * Get all receipts for a user.
 */
export const getReceiptsByUser = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("receipts"),
      _creationTime: v.number(),
      userId: v.string(),
      fileName: v.string(),
      fileDisplayName: v.optional(v.string()),
      fileId: v.id("_storage"),
      uploadedAt: v.number(),
      size: v.number(),
      mimeType: v.string(),
      status: v.string(),
      fileUrl: v.optional(v.string()),
      merchantName: v.optional(v.string()),
      merchantAddress: v.optional(v.string()),
      merchantContact: v.optional(v.string()),
      transactionDate: v.optional(v.string()),
      transactionAmount: v.optional(v.number()),
      currency: v.optional(v.string()),
      receiptSummary: v.optional(v.string()),
      items: v.array(
        v.object({
          name: v.string(),
          quantity: v.number(),
          unitPrice: v.number(),
          totalPrice: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Generate a file URL for each receipt
    return await Promise.all(
      receipts.map(async (receipt) => {
        const fileUrl = await ctx.storage.getUrl(receipt.fileId);

        return {
          ...receipt,
          fileUrl: fileUrl || undefined,
        };
      })
    );
  },
});

/**
 * Process a receipt using LLM (LLaMA 3.2 via LM Studio)
 * Trigger the Inngest function to extract PDF data
 */
export const processReceiptWithLLM = action({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    // Get the receipt document
    const receipt = await ctx.runQuery(api.files.getReceiptById, {
      receiptId: args.receiptId,
    });

    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // Get storage URL for the PDF
    const fileUrl = receipt.fileUrl;
    
    if (!fileUrl) {
      throw new Error("File URL not available");
    }

    // Update receipt status to processing
    await ctx.runMutation(api.files.updateReceiptStatus, {
      receiptId: args.receiptId,
      status: "processing",
    });

    // Call the Inngest function to process the PDF
    // The fetch call sends the event to Inngest which will trigger our agent
    try {
      const inngestUrl = process.env.INNGEST_EVENT_URL || "http://127.0.0.1:8288/e/";
      const response = await fetch(inngestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "extract-data-from-pdf-and-save-to-db",
          data: {
            url: fileUrl,
            receiptId: args.receiptId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger PDF processing: ${response.statusText}`);
      }

      return { success: true, message: "PDF processing started" };
    } catch (error) {
      // Update receipt status to error
      await ctx.runMutation(api.files.updateReceiptStatus, {
        receiptId: args.receiptId,
        status: "error",
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

/**
 * Get a receipt by ID
 */
export const getReceiptById = query({
  args: {
    receiptId: v.id("receipts"),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    
    if (!receipt) {
      return null;
    }
    
    // Get the fileUrl for display
    const fileUrl = receipt.fileId ? await ctx.storage.getUrl(receipt.fileId) : null;
    
    return {
      ...receipt,
      fileUrl: fileUrl || undefined,
    };
  },
});

/**
 * Update only the status of a receipt (e.g., 'processing', 'error').
 */
export const updateReceiptStatus = mutation({
  args: {
    receiptId: v.id("receipts"),
    status: v.string(), // Consider v.union(v.literal('processing'), v.literal('error'), ...)
    errorMessage: v.optional(v.string()), // Optional error message
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { receiptId, status, errorMessage } = args;
    const receipt = await ctx.db.get(receiptId);

    if (!receipt) {
      console.error(`Receipt not found during status update: ${receiptId}`);
      // Decide if throwing an error is correct or just log and return
      throw new Error("Receipt not found");
    }

    const patchData: { status: string; errorMessage?: string } = { status };
    if (errorMessage !== undefined) {
      // Add error message field to schema if you want to store it
      // patchData.errorMessage = errorMessage;
      console.error(`Receipt ${receiptId} status updated to '${status}' with error: ${errorMessage}`);
    } else {
       console.log(`Receipt ${receiptId} status updated to '${status}'.`);
    }


    await ctx.db.patch(receiptId, patchData);

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
