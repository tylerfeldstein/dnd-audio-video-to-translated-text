import { createModel } from "@/inngest/customModel";
import { createAgent, createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { ConvexClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Create a Convex client instance
const convex = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210");

// Define the structure of our parsed receipt data
type ReceiptData = {
  merchant: {
    name: string;
    address: string;
    contact: string;
  };
  transaction: {
    date: string;
    receipt_number: string;
    payment_method: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
};

// Define the handler parameter type
type ToolParams = {
  receiptId: string;
  receiptData: ReceiptData;
  context?: {
    step?: {
      run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
    };
    network?: {
      state?: {
        kv?: {
          set: (key: string, value: string | boolean) => void;
        };
      };
    };
  };
};

const saveToDatabaseTool = createTool({
  name: "save-to-database",
  description: "saves the extracted receipt data to the convex database",
  parameters: z.object({
    receiptId: z.string().describe("The ID of the receipt to update"),
    receiptData: z.object({
      merchant: z.object({
        name: z.string(),
        address: z.string(),
        contact: z.string(),
      }),
      transaction: z.object({
        date: z.string(),
        receipt_number: z.string(),
        payment_method: z.string(),
      }),
      items: z.array(
        z.object({
          name: z.string(),
          quantity: z.number(),
          unit_price: z.number(),
          total_price: z.number(),
        })
      ),
      totals: z.object({
        subtotal: z.number(),
        tax: z.number(),
        total: z.number(),
        currency: z.string(),
      }),
    }).describe("The structured receipt data extracted from the PDF"),
  }),
  handler: async (params: ToolParams) => {
    const { receiptId, receiptData, context } = params;
    
    const result = await context?.step?.run(
      "save-receipt-to-database",
      async () => {
        try {
          // Convert receipt ID string to a proper Convex ID
          const receiptConvexId = receiptId as Id<"receipts">;
          
          // Create a summary of the receipt
          const receiptSummary = `${receiptData.merchant.name} receipt for ${receiptData.totals.currency}${receiptData.totals.total.toFixed(2)} on ${receiptData.transaction.date}. Receipt #${receiptData.transaction.receipt_number}, paid via ${receiptData.transaction.payment_method}. Contains ${receiptData.items.length} item(s).`;
          
          // Format items for database storage
          const formattedItems = receiptData.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price,
          }));
          
          // Call our update mutation with mapped data
          await convex.mutation(api.files.updateReceiptDetails, {
            receiptId: receiptConvexId,
            fileDisplayName: `Receipt from ${receiptData.merchant.name} - ${receiptData.transaction.date}`,
            merchantName: receiptData.merchant.name, 
            merchantAddress: receiptData.merchant.address,
            merchantContact: receiptData.merchant.contact,
            transactionDate: receiptData.transaction.date,
            transactionAmount: receiptData.totals.total,
            currency: receiptData.totals.currency,
            receiptSummary,
            items: formattedItems
          });

          return {
            addedToDb: "success",
            receiptId,
            message: "Receipt details updated successfully"
          };
        } catch (error) {
          return {
            addedToDb: "Failed",
            error: error instanceof Error ? error.message : "Unknown Error",
          };
        } 
      },
    );
    
    if (result?.addedToDb === "success") {
      // Only set KV values if the operation was successful
      context?.network?.state?.kv?.set("saved-to-database", true);
      context?.network?.state?.kv?.set("receipt", receiptId);
    }
    
    return result;
  },
});

// Define your agents with createAgent
export const databaseAgent = createAgent({
  name: "Database Agent",
  description: "Handles convex database operations and data storage",
  system:
    "You are a specialized agent that handles database operations and data storage. You receive structured receipt data and save it to the Convex database using the correct schema.",
  model: createModel(),
  tools: [saveToDatabaseTool],
}); 