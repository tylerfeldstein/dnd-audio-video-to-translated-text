import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
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
  returns: v.id("receipts"),
  handler: async (ctx, args) => {
    // Create a record with only the fields defined in the schema
    const receipt = {
      userId: args.userId,
      fileName: args.fileName,
      fileDisplayName: args.fileDisplayName,
      fileId: args.fileId,
      uploadedAt: Date.now(),
      size: args.size,
      mimeType: args.mimeType,
      status: args.status,
      items: args.items || [], // Empty array for items
    };

    const receiptId = await ctx.db.insert("receipts", receipt);

    return receiptId;
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
 */
export const updateReceiptDetails = mutation({
  args: {
    receiptId: v.id("receipts"),
    fileDisplayName: v.optional(v.string()),
    merchantName: v.string(),
    merchantAddress: v.string(),
    merchantContact: v.string(),
    transactionDate: v.string(),
    transactionAmount: v.number(),
    currency: v.string(),
    receiptSummary: v.string(),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);

    if (!receipt) {
      throw new Error("Receipt not found");
    }

    // Update the receipt with the extracted data
    await ctx.db.patch(args.receiptId, {
      fileDisplayName: args.fileDisplayName,
      merchantName: args.merchantName,
      merchantAddress: args.merchantAddress,
      merchantContact: args.merchantContact,
      transactionDate: args.transactionDate,
      transactionAmount: args.transactionAmount,
      currency: args.currency,
      receiptSummary: args.receiptSummary,
      items: args.items,
      status: "processed", // Ensure the status is updated
    });

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
 * Update receipt status
 */
export const updateReceiptStatus = mutation({
  args: {
    receiptId: v.id("receipts"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const receipt = await ctx.db.get(args.receiptId);
    
    if (!receipt) {
      throw new Error("Receipt not found");
    }
    
    await ctx.db.patch(args.receiptId, {
      status: args.status,
    });
    
    return null;
  },
});
