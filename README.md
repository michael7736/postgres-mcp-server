# PostgreSQL Products MCP Server

This is a Model Context Protocol (MCP) server designed to interact with a PostgreSQL database containing product information. It allows clients (like AI assistants) to query the database using SQL.

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   Access to a PostgreSQL database with the products schema.

## Installation

1.  Clone this repository (or download the source code):
    ```bash
    git clone https://github.com/michael7736/postgres-mcp-server.git
    cd postgres-mcp-server
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

## Building

Compile the TypeScript code to JavaScript:

```bash
npm run build
# or
yarn build
```

This will create the executable file in the `build/` directory (`build/index.js`).

## Configuration

This server requires PostgreSQL connection details to be provided via environment variables when it's configured in your MCP client settings (e.g., `cline_mcp_settings.json` or `claude_desktop_config.json`).

The required environment variables are:

*   `PGHOST`: Hostname of the PostgreSQL server.
*   `PGPORT`: Port number of the PostgreSQL server (default: 5432).
*   `PGUSER`: Username for the database connection.
*   `PGPASSWORD`: Password for the database connection.
*   `PGDATABASE`: Name of the database to connect to.

**Example MCP Settings Configuration:**

```json
{
  "mcpServers": {
    "postgres-products": {
      "command": "node",
      "args": ["/path/to/your/postgres-mcp-server/build/index.js"],
      "env": {
        "PGHOST": "your_db_host",
        "PGPORT": "5432",
        "PGUSER": "your_db_user",
        "PGPASSWORD": "your_db_password",
        "PGDATABASE": "your_db_name"
      },
      "disabled": false, // Ensure it's enabled
      "autoApprove": [] // Configure auto-approval if needed
    }
    // ... other servers
  }
}
```

Replace `/path/to/your/postgres-mcp-server/build/index.js` with the actual path to the built server file on your system, and fill in your specific database credentials in the `env` section.

## Usage

Once configured and running via your MCP client, this server provides the following tool:

### `run_sql_query`

Executes a read-only SQL query (SELECT statements only) against the configured products database.

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The SQL SELECT query to execute."
    }
  },
  "required": ["query"]
}
```

**Example Tool Call:**

```xml
<use_mcp_tool>
  <server_name>postgres-products</server_name>
  <tool_name>run_sql_query</tool_name>
  <arguments>
  {
    "query": "SELECT product_name, stock_quantity FROM products WHERE category = 'Electronics';"
  }
  </arguments>
</use_mcp_tool>
