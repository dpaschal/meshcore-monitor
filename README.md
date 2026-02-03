# MeshCore Monitor

[![Sync with Upstream](https://github.com/dpaschal/meshcore-monitor/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/dpaschal/meshcore-monitor/actions/workflows/sync-upstream.yml)
[![Security Scan](https://github.com/dpaschal/meshcore-monitor/actions/workflows/security-scan.yml/badge.svg)](https://github.com/dpaschal/meshcore-monitor/actions/workflows/security-scan.yml)
[![Upstream](https://img.shields.io/badge/upstream-Yeraze%2Fmeshmonitor-blue)](https://github.com/Yeraze/meshmonitor)
[![License](https://img.shields.io/badge/license-BSD--3--Clause-green)](LICENSE)

A comprehensive web application for monitoring **both Meshtastic and MeshCore** mesh networks.

**Forked from [MeshMonitor](https://github.com/Yeraze/meshmonitor) by Yeraze** (BSD-3-Clause) with added MeshCore protocol support.

> **This project extends MeshMonitor to support MeshCore devices while maintaining full Meshtastic compatibility.** We're grateful to Yeraze for creating the excellent MeshMonitor foundation.

## Features

### Meshtastic Support (from upstream MeshMonitor)
- Real-time node monitoring with map visualization
- Channel management and messaging
- Telemetry tracking (battery, GPS, environment)
- Admin commands and device configuration
- Multi-user authentication with role-based permissions
- SQLite/PostgreSQL/MySQL database support
- WebSocket real-time updates
- Mobile-responsive UI

### MeshCore Support (added in this fork)
- **MeshCore device connection** via serial or TCP
- **Node discovery** - see all MeshCore nodes on your mesh
- **Contact management** - discover and manage contacts
- **Messaging** - send broadcast or direct messages
- **Advert sending** - announce presence on the mesh
- **Remote admin** - login and manage remote nodes (coming soon)
- **Dual-protocol support** - monitor both networks from one interface

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+ with `meshcore` library (for MeshCore support)
- A Meshtastic and/or MeshCore device

### Installation

```bash
# Clone the repository with submodules (required for Meshtastic support)
git clone --recurse-submodules https://github.com/dpaschal/meshcore-monitor.git
cd meshcore-monitor

# If you already cloned without submodules, run:
git submodule update --init --recursive

# Install dependencies
npm install

# Install MeshCore Python library (for MeshCore support)
pip install meshcore

# Build
npm run build
npm run build:server

# Start
npm start
```

> **Note:** The `protobufs` submodule contains Meshtastic protocol definitions. If you only plan to use MeshCore, you can skip the submodule and set `SKIP_MESHTASTIC=true`.

### Configuration

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `SKIP_MESHTASTIC` | false | Skip Meshtastic initialization |
| `ALLOWED_ORIGINS` | - | CORS allowed origins |
| `DATABASE_URL` | SQLite | Database connection string |

### Connecting Devices

**Meshtastic:**
1. Go to Settings tab
2. Configure serial port or TCP connection
3. Nodes will appear in the Nodes tab

**MeshCore:**
1. Go to MeshCore tab (chain icon in sidebar)
2. Enter serial port (e.g., `/dev/ttyACM0` or `COM3`)
3. Click Connect
4. Send an Advert to discover other nodes

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MeshCore Monitor                      │
├─────────────────────────────────────────────────────────┤
│  React Frontend                                          │
│  ├── Nodes/Channels/Messages tabs (Meshtastic)          │
│  └── MeshCore tab (MeshCore devices)                    │
├─────────────────────────────────────────────────────────┤
│  Express Backend                                         │
│  ├── MeshtasticManager (protobuf protocol)              │
│  └── MeshCoreManager (binary/text protocol via Python)  │
├─────────────────────────────────────────────────────────┤
│  Database (SQLite/PostgreSQL/MySQL)                      │
└─────────────────────────────────────────────────────────┘
```

## Upstream Sync

This fork automatically syncs with [Yeraze/meshmonitor](https://github.com/Yeraze/meshmonitor) daily to incorporate upstream improvements. Our MeshCore additions are maintained separately and merged with upstream changes.

See [.github/SYNC_STATUS.md](.github/SYNC_STATUS.md) for sync details.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development

```bash
# Run in development mode
npm run dev:full

# Run tests
npm test

# Type checking
npm run typecheck
```

## Acknowledgments

- **[Yeraze](https://github.com/Yeraze)** - Creator of MeshMonitor, the foundation for this project
- **[Meshtastic](https://meshtastic.org)** - Open source mesh networking
- **[MeshCore](https://github.com/rmendes76/MeshCore)** - Lightweight mesh protocol

## License

BSD-3-Clause License - See [LICENSE](LICENSE)

This project is a fork of [MeshMonitor](https://github.com/Yeraze/meshmonitor) which is also BSD-3-Clause licensed.

## Contact

- **Issues:** [GitHub Issues](https://github.com/dpaschal/meshcore-monitor/issues)
- **Discussions:** [GitHub Discussions](https://github.com/dpaschal/meshcore-monitor/discussions)
- **Upstream:** [Yeraze/meshmonitor](https://github.com/Yeraze/meshmonitor)
