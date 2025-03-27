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

// Define the interface for your network state
interface NetworkState {
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
const agentNetwork = createNetwork({
  name: "Agent Team",
  agents: [databaseAgent, receiptScanningAgent],
  defaultModel: createModel(),
  defaultState: createState<NetworkState>({}),
  defaultRouter: ({ network }) => {
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

    // By default, use the receipt scanning agent first
    const hasFile = network.state.data.file !== undefined;
    if (!hasFile || !network.state.data.receiptData) {
      return receiptScanningAgent;
    }

    // Default routing if no specific conditions are met
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
  async({ event }) => {
    const result = await agentNetwork.run(
      `Extract the key data from this PDF: ${event.data.url}. 
      Once the data is extracted, save it to the database using the 
      receiptId: ${event.data.receiptId}. 
      Make sure to use the exact format specified in the receipt scanning agent.
      Once the receipt is successfully saved to the database you can terminate the agent process.`,
    );
    return result.state.kv.get("receipt");
  },
);

