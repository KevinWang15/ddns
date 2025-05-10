# DDNS - Dynamic DNS Service

A flexible Dynamic DNS service that supports multiple DNS providers, starting with Aliyun DNS.

## Features

- Support for multiple DNS providers (currently Aliyun)
- Token-based authentication for secure domain updates
- CLI for managing domains and tokens
- Web server for handling client updates
- Client script for automatic IP detection and updates

## Installation

```bash
# Clone the repository
git clone https://github.com/kevinwang15/ddns.git
cd ddns

# Install dependencies
npm install

# Install the CLI globally
npm install -g .
```

After installation, you can use the `ddns` command from anywhere. The CLI will automatically create a configuration file in your home directory (`~/.ddns/config.json`).

## Database Setup

The application uses MySQL with Prisma ORM. Configure your database connection:

```bash
# Configure the database connection
ddns configure-db "mysql://user:password@localhost:3306/ddns"

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

The database scripts automatically use the configuration from `~/.ddns/config.json`.

## Configuration

All configuration is stored in `~/.ddns/config.json` and managed through the CLI commands. You can view your current configuration with:

```bash
ddns show-config
```

## CLI Usage

The CLI provides commands for managing domains, tokens, and the DDNS server.

### Configure a DNS Provider

```bash
# Configure Aliyun DNS provider with access keys
ddns configure aliyun --key YOUR_ACCESS_KEY_ID --secret YOUR_ACCESS_KEY_SECRET

# Or using a config file
ddns configure aliyun --file path/to/config.json
```

### Generate a Token for a Domain

```bash
ddns token machine1.example.com aliyun
```

This will generate a token and provide instructions for setting up the client.

### List Registered Domains

```bash
ddns list
```

### Delete a Domain

```bash
ddns delete machine1.example.com
```

### Configure Server Settings

Configure your server settings before starting:

```bash
# Configure the server listening port
ddns configure-port 3000

# Configure the public server URL for client script generation
ddns configure-url "https://your-ddns-server.example.com"
```

Both settings are required before starting the server and are stored in the configuration file.

### Start the DDNS Server

```bash
# Start the server (uses settings from config file)
ddns start
```

The server will check that all required configuration is present before starting.

## Client Setup

After generating a token, you'll receive a command to run on your client machine. By default, a Python implementation is used (recommended):

```bash
# Get Python client (default)
curl "http://your-server/api/client/script?token=YOUR_TOKEN" > ddns-client.py && python3 ddns-client.py
```

If you prefer to use the Node.js implementation:

```bash
# Get Node.js client (optional)
curl "http://your-server/api/client/script?token=YOUR_TOKEN&type=node" > ddns-client.js && node ddns-client.js
```

Both client implementations will:

1. Detect your public IP address
2. Send it to the DDNS server for DNS record updates
3. Periodically check for IP changes (default: every 5 minutes)

The Python implementation requires Python 3 to be installed on your system.

## Server API Endpoints

- `GET /api/client/script?token=TOKEN&type=TYPE` - Get client script with embedded token
  - `type` parameter is optional and can be set to:
    - `python` - Python implementation (default)
    - `node` or `nodejs` or `js` - Node.js implementation
- `POST /api/dns/update` - Update DNS record (requires token)
- `GET /api/dns/info` - Get DNS record information (requires token)
- `GET /api/ip` - Get the client's public IP address (works behind proxies)

## Contributing

Contributions are welcome! Feel free to add support for additional DNS providers or enhance existing functionality.

To add a new DNS provider:

1. Create a new provider implementation in `src/providers/`
2. Update the provider registry in `src/providers/index.js`
3. Update the CLI to support the new provider configuration

## License

MIT