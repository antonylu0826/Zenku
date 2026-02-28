# AI Integration

Zenku exposes an OpenAI-compatible HTTP API and an MCP server for AI agent integration.

## HTTP API

### Configuration

Add `AI_API_KEY` to your `.env`:

```
AI_API_KEY=your-secret-key-32-chars-minimum
```

### Endpoints

**List available tools:**
```bash
curl -H "X-API-Key: $AI_API_KEY" http://localhost:3001/api/ai/tools
```

**Execute a tool:**
```bash
curl -X POST http://localhost:3001/api/ai/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $AI_API_KEY" \
  -d '{"tool": "list_Product", "arguments": {"take": 5}}'
```

```bash
curl -X POST http://localhost:3001/api/ai/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $AI_API_KEY" \
  -d '{"tool": "create_Task", "arguments": {"title": "New task", "status": "TODO", "ownerId": "..."}}'
```

Tools follow the pattern `{action}_{ModelName}` where action is one of: `list`, `get`, `create`, `update`, `delete`.

---

## MCP Server

The MCP server bridges Claude Desktop (or any MCP client) to the Zenku HTTP API.

### Install

```bash
cd packages/mcp && bun install
```

### Claude Desktop configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "zenku": {
      "command": "bun",
      "args": ["run", "/path/to/zenku/packages/mcp/src/index.ts"],
      "env": {
        "ZENKU_URL": "http://localhost:3001",
        "AI_API_KEY": "your-secret-key"
      }
    }
  }
}
```

### Available tools in Claude Desktop

After connecting, you can ask Claude to:
- "List all products in the database"
- "Create a new task called 'Review PR' with status TODO"
- "Update product ELEC-001 price to 24.99"
- "Delete the event with id ..."
