import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  pdfs: defineTable({
    name: v.string(),
    fileId: v.id("_storage"),
    size: v.number(),
    mimeType: v.string(),
    description: v.optional(v.string()),
    userId: v.string(),
  }).index("by_userId", ["userId"]),

  media: defineTable({
    name: v.string(),
    fileId: v.id("_storage"),
    size: v.number(),
    mimeType: v.string(),
    description: v.optional(v.string()),
    userId: v.string(),
    duration: v.optional(v.number()),
    transcriptionStatus: v.optional(v.string()), // "pending", "processing", "completed", "error"
    transcriptionText: v.optional(v.string()),
    transcribedAt: v.optional(v.number()),
    detectedLanguage: v.optional(v.string()), // Language code detected by Whisper
    translations: v.optional(v.array(v.object({
      targetLanguage: v.string(), // Language code of the translation
      translatedText: v.string(), // The translated text
      translatedAt: v.number(), // Timestamp of translation
    }))),
  }).index("by_userId", ["userId"]),

  receipts: defineTable({
    userId: v.string(), // Clerk user ID
    fileName: v.string(),
    fileDisplayName: v.optional(v.string()),
    fileId: v.id("_storage"),
    uploadedAt: v.number(), // Timestamp of upload saving
    size: v.number(),
    mimeType: v.string(),
    status: v.string(), // 'pending', 'processing', 'processed', 'error'

    // Fields for extracted data
    merchantName: v.optional(v.string()),
    merchantAddress: v.optional(v.string()),
    merchantContact: v.optional(v.string()),
    transactionDate: v.optional(v.string()),
    receiptNumber: v.optional(v.string()), // Added field
    paymentMethod: v.optional(v.string()), // Added field
    transactionAmount: v.optional(v.number()), // This is the 'total'
    subtotal: v.optional(v.number()), // Added field
    tax: v.optional(v.number()), // Added field
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
  }).index("by_userId", ["userId"]),
  
  // Table to track multipart uploads
  multipartUploads: defineTable({
    uploadId: v.string(),
    numChunks: v.number(),
    uploadedChunks: v.number(),
    isComplete: v.boolean(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    storageId: v.optional(v.id("_storage")),
  }).index("by_uploadId", ["uploadId"]),
  
  // Table to track individual chunks in a multipart upload
  multipartChunks: defineTable({
    uploadId: v.string(),
    chunkIndex: v.number(),
    storageId: v.optional(v.id("_storage")),
    uploadedAt: v.number(),
  }).index("by_uploadId", ["uploadId"]),
});
