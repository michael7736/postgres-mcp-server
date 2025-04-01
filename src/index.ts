#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import pg from 'pg'; // Use ES module import

// Database connection details from environment variables
const dbConfig = {
  host: process.env.PG_HOST,
  port: process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
};

// Validate essential environment variables
if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
  console.error('Missing required environment variables: PG_HOST, PG_USER, PG_PASSWORD, PG_DATABASE');
  process.exit(1);
}

const pool = new pg.Pool(dbConfig);

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// --- MCP Server Implementation ---

class PostgresServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'postgres-products-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {}, // No resources defined for this simple server
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      await pool.end(); // Close the database connection pool
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'run_sql_query',
          description: 'Executes a read-only SQL query (SELECT statements only) against the products database.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The SQL SELECT query to execute.',
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'run_sql_query') {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }

      const args = request.params.arguments;
      if (typeof args !== 'object' || args === null || typeof args.query !== 'string') {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Invalid arguments: Expected an object with a "query" string property.'
        );
      }

      const query = args.query.trim();

      // Basic validation: Only allow SELECT queries
      if (!query.toLowerCase().startsWith('select')) {
         return {
            content: [
              {
                type: 'text',
                text: 'Error: Only SELECT queries are allowed.',
              },
            ],
            isError: true,
          };
      }

      let client;
      try {
        client = await pool.connect();
        const result = await client.query(query);
        return {
          content: [
            {
              type: 'text',
              // Return results as a JSON string
              text: JSON.stringify(result.rows, null, 2),
            },
          ],
        };
      } catch (error: any) {
         console.error('SQL Query Error:', error);
         return {
            content: [
              {
                type: 'text',
                text: `SQL Error: ${error.message || 'An unknown error occurred'}`,
              },
            ],
            isError: true,
          };
      } finally {
        if (client) {
          client.release(); // Release the client back to the pool
        }
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Postgres Products MCP server running on stdio');
  }
}

const server = new PostgresServer();
server.run().catch(console.error);
