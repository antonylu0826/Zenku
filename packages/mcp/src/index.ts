import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const ZENKU_URL = process.env.ZENKU_URL ?? "http://localhost:3001";
const AI_API_KEY = process.env.AI_API_KEY ?? "";

const headers = {
    "Content-Type": "application/json",
    "X-API-Key": AI_API_KEY,
};

async function fetchTools() {
    const res = await fetch(`${ZENKU_URL}/api/ai/tools`, { headers });
    if (!res.ok) throw new Error(`Failed to fetch tools: ${res.status}`);
    return res.json() as Promise<Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    }>>;
}

async function callTool(name: string, args: Record<string, unknown>) {
    const res = await fetch(`${ZENKU_URL}/api/ai/execute`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tool: name, arguments: args }),
    });
    const data = await res.json() as { result?: unknown; error?: string };
    if (!res.ok || data.error) throw new Error(data.error ?? `Tool execution failed: ${res.status}`);
    return data.result;
}

const server = new Server(
    { name: "zenku", version: "1.0.0" },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = await fetchTools();
    return {
        tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.parameters,
        })),
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
        const result = await callTool(name, args as Record<string, unknown>);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (err: any) {
        return {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
        };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
