import { createModel } from "@/inngest/customModel";
import { createAgent, createTool } from "@inngest/agent-kit";
import { z } from "zod";
// Use dynamic import for pdf-parse in the handler

const parsePdfTool = createTool({
  name: "parse-pdf",
  description: "Analyzes the given PDF and extracts receipt information",
  parameters: z.object({
    pdfUrl: z.string(),
  }),
  handler: async ({ pdfUrl }, { step }) => {
    try {
      // Use dynamic import for pdf-parse
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      
      // Dynamically import pdf-parse to avoid initialization issues
      const pdfParse = await import('pdf-parse').then(module => module.default);
      const data = await pdfParse(pdfBuffer);
      console.log(data)
      // Use the step.ai.infer to process the PDF with the local LLM
      return await step?.ai.infer("parse-pdf", {
        model: createModel(), // Use our custom model that supports LMStudio
        body: {
          messages: [
            {
              role: "user",
              content: `Extract the data from the receipt and return the structured output as follows:
{
  "merchant": {
    "name": "Store Name",
    "address": "123 Main St, City, Country",
    "contact": "+12345678"
  },
  "transaction": {
    "date": "YYYY-MM-DD",
    "receipt_number": "ABC123456",
    "payment_method": "Credit Card"
  },
  "items": [
    {
      "name": "Item 1",
      "quantity": 2,
      "unit_price": 10.00,
      "total_price": 20.00
    }
  ],
  "totals": {
    "subtotal": 20.00,
    "tax": 2.00,
    "total": 22.00, 
    "currency": "USD"
  }
}

Please analyze the PDF at this URL: ${pdfUrl}`,
            },
          ],
        },
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      return {
        error: "Failed to process PDF",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Define your receipt scanning agent
export const receiptScanningAgent = createAgent({
  name: "Receipt Scanning Agent",
  description:
    "Processes receipt images and PDFs to extract key information such as vendor names, dates, amounts, and line items",
  system:
    "You are an AI-powered receipt scanning assistant. Your primary role is to accurately extract and structure relevant information from scanned receipts. Your task includes recognizing and parsing details such as:\n• Merchant Information: Store name, address, contact details\n• Transaction Details: Date, time, receipt number, payment method\n• Itemized Purchases: Product names, quantities, individual prices, discounts\n• Total Amounts: Subtotal, taxes, total paid, and any applied discounts\n• Ensure high accuracy by detecting OCR errors and correcting misread text when possible.\n• Normalize dates, currency values, and formatting for consistency.\n• If any key details are missing or unclear, return a structured response indicating incomplete data.\n• Handle multiple formats, languages, and varying receipt layouts efficiently.\n• Maintain a structured JSON output for easy integration with databases or expense tracking systems.",
  model: createModel(),
  tools: [parsePdfTool],
});
