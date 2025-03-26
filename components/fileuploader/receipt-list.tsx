"use client";

import { useState, useEffect } from "react";
import { ConvexReactClient } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Initialize the Convex client
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Receipt {
  _id: Id<"receipts">;
  _creationTime: number;
  fileName: string;
  fileDisplayName?: string;
  status: string;
  fileUrl?: string;
  merchantName?: string;
  merchantAddress?: string;
  merchantContact?: string;
  transactionDate?: string;
  transactionAmount?: number;
  currency?: string;
  receiptSummary?: string;
  items: ReceiptItem[];
}

export const ReceiptList = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch receipts on component mount
  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        setIsLoading(true);
        const userId = "temp-user-id"; // Would use your actual user ID from auth
        const data = await convex.query(api.files.getReceiptsByUser, {
          userId,
        });

        setReceipts(data as Receipt[]);
      } catch (err) {
        console.error("Error fetching receipts:", err);
        setError("Failed to load receipts");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceipts();
  }, []);

  if (isLoading) {
    return <div className="text-center py-8">Loading receipts...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>;
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No receipts uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Receipts</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {receipts.map((receipt) => (
          <div
            key={receipt._id.toString()}
            className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium truncate">
                {receipt.fileDisplayName || receipt.fileName}
              </h3>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  receipt.status === "pending"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                    : receipt.status === "processed"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                {receipt.status}
              </span>
            </div>

            {receipt.merchantName && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">Merchant:</span>{" "}
                {receipt.merchantName}
              </p>
            )}

            {receipt.transactionDate && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">Date:</span>{" "}
                {receipt.transactionDate}
              </p>
            )}

            {receipt.transactionAmount !== undefined && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span className="font-medium">Amount:</span>{" "}
                {receipt.currency || "$"}
                {receipt.transactionAmount.toFixed(2)}
              </p>
            )}

            <div className="mt-4 flex justify-between">
              {receipt.fileUrl && (
                <a
                  className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                  href={receipt.fileUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View PDF
                </a>
              )}
              <span className="text-xs text-gray-500">
                {new Date(receipt._creationTime).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
