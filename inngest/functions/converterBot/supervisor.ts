import { inngest } from "@/inngest/client";
import {
  createNetwork,
  createState,
  getDefaultRoutingAgent,
} from "@inngest/agent-kit";
import { createServer } from "@inngest/agent-kit/server";
import Events from "./constants";
import { createModel } from "@/inngest/customModel";
import { databaseAgent } from "./agents/databaseAgent";
import { receiptScanningAgent } from "./agents/receiptScanningAgent";

// Define RouterArgs interface for the router function
interface RouterArgs<T> {
  network: {
    state: {
      data: T;
    };
  };
}

// Define the interface for your network state
export interface NetworkState {
  file?: string;
  receiptData?: {
    merchant?: {
      name: string;
      address: string;
      contact: string;
    };
    transaction?: {
      date: string;
      receipt_number: string;
      payment_method: string;
    };
    items?: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
    totals?: {
      subtotal: number;
      tax: number;
      total: number;
      currency: string;
    };
  };
  savedToDatabase?: boolean;
  receiptId?: string;
}

// Create a network with the agents and state
const agentNetwork = createNetwork<NetworkState>({
  name: "Agent Team",
  agents: [databaseAgent, receiptScanningAgent],
  defaultModel: createModel(),
  defaultState: createState<NetworkState>({}),
  defaultRouter: ({ network }: RouterArgs<NetworkState>) => {
    // Check if data has been saved to database from state
    const savedToDatabase = network.state.data.savedToDatabase === true;

    if (savedToDatabase) {
      // Terminate the agent process if the data has been saved to the database
      return undefined;
    }

    // Check if we have receipt data but haven't saved it yet
    if (network.state.data.receiptData && !savedToDatabase) {
      // Route to database agent to save the data
      return databaseAgent;
    }

    // Route to receipt scanning agent if we have a file URL but no receipt data yet
    const hasFile = network.state.data.file !== undefined;
    if (hasFile && !network.state.data.receiptData) {
      return receiptScanningAgent;
    }

    // Fallback or initial routing if needed - might need adjustment
    // If the initial state has 'file', the router should pick receiptScanningAgent
    if (hasFile) {
        return receiptScanningAgent; // Ensure it gets picked initially
    }

    // Default routing if no specific conditions are met (should ideally not be reached with initial state)
    return getDefaultRoutingAgent();
  },
});

// This is the network server. This spins up the network. The network has a router and a state
export const server = createServer({
  agents: [databaseAgent, receiptScanningAgent],
  networks: [agentNetwork],
});

export const extractAndSavePDF = inngest.createFunction(
  { id: "Extract PDF and Save in Database" },
  { event: Events.EXTRACT_DATA_FROM_PDF_AND_SAVE_TO_DB },
  async ({ event, logger }) => {
    logger.info("Starting PDF extraction and saving process", {
      receiptId: event.data.receiptId,
      url: event.data.url,
    });

    // Ensure the URL is provided
    if (!event.data.url) {
      logger.error("No PDF URL provided in the event data.", { eventData: event.data });
      throw new Error("Missing PDF URL in event data.");
    }
    // Ensure the receiptId is provided
    if (!event.data.receiptId) {
      logger.error("No receiptId provided in the event data.", { eventData: event.data });
      throw new Error("Missing receiptId in event data.");
    }

    const initialPrompt = "Process the receipt provided in the initial state.";

    logger.info("Running agent network with initial state:", {
        prompt: initialPrompt,
        initialState: { file: event.data.url, receiptId: event.data.receiptId }
    });

    try {
      // Pass the initial state object directly as the second argument
      const result = await agentNetwork.run(initialPrompt, {
          state: {
              file: event.data.url,
              receiptId: event.data.receiptId,
              receiptData: undefined,
              savedToDatabase: false,
          }
      });

      logger.info("Agent network finished successfully.", {
        finalStateData: result.state.data,
        kvReceipt: result.state.kv.get("receipt"),
      });

      const savedReceipt = result.state.kv.get("receipt");
      return savedReceipt;

    } catch (error) {
      logger.error("Error running agent network:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        receiptId: event.data.receiptId,
        url: event.data.url,
      });
      throw error;
    }
  },
);

