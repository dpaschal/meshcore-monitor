# MeshCore Monitor

[![Sync with Upstream](https://github.com/dpaschal/meshcore-monitor/actions/workflows/sync-upstream.yml/badge.svg)](https://github.com/dpaschal/meshcore-monitor/actions/workflows/sync-upstream.yml)
[![Upstream](https://img.shields.io/badge/upstream-Yeraze%2Fmeshmonitor-blue)](https://github.com/Yeraze/meshmonitor)

A comprehensive web application for monitoring MeshCore mesh networks. Forked from [MeshMonitor](https://github.com/Yeraze/meshmonitor) (BSD-3-Clause) and adapted for the MeshCore protocol.

**Status:** Early Development - Community Contributions Welcome!

> **Upstream Sync:** This fork automatically syncs with [Yeraze/meshmonitor](https://github.com/Yeraze/meshmonitor) daily to incorporate upstream improvements. See [sync status](.github/SYNC_STATUS.md) for details.

## About

MeshCore Monitor aims to provide a web-based monitoring interface for [MeshCore](https://github.com/meshcore-dev/MeshCore) mesh networks, similar to what MeshMonitor provides for Meshtastic.

### What is MeshCore?

MeshCore is a lightweight, hybrid routing mesh protocol for packet radios. Unlike Meshtastic, MeshCore focuses on:
- Lightweight multi-hop packet routing
- Simpler protocol design
- Optimized for embedded systems
- MIT licensed (fully open source)

## Project Status

This project is a **work in progress**. We're adapting the excellent MeshMonitor codebase to work with MeshCore's different protocol.

### Key Differences from MeshMonitor

| Feature | MeshMonitor (Meshtastic) | MeshCore Monitor |
|---------|--------------------------|------------------|
| Protocol | Protobuf over HTTP/BLE | Binary protocol (Companion) / Text CLI (Repeater) |
| Node IDs | 32-bit nodeNum | Public keys (hex) |
| Connection | HTTP API to node | Serial/TCP to device |
| Channels | PSK-based channels | Different channel model |

### Roadmap

See [ROADMAP.md](ROADMAP.md) for the development plan.

**Phase 1 - Core Adaptation:**
- [ ] Replace MeshtasticManager with MeshCoreManager
- [ ] Update database schema for MeshCore fields
- [ ] Implement serial/TCP connection layer
- [ ] Basic node discovery and display

**Phase 2 - Features:**
- [ ] Message sending/receiving
- [ ] Admin commands (login, status, etc.)
- [ ] Repeater management
- [ ] Contact list display

**Phase 3 - Polish:**
- [ ] UI updates for MeshCore terminology
- [ ] Documentation
- [ ] Docker images
- [ ] Testing

## Quick Start (Development)

```bash
# Clone the repo
git clone https://github.com/dpaschal/meshcore-monitor.git
cd meshcore-monitor

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env - set MESHCORE_SERIAL_PORT or MESHCORE_TCP_HOST

# Start development servers
npm run dev:full
```

## Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite 7 (build tool)
- CSS3 with Catppuccin theme

**Backend:**
- Node.js with Express 5
- TypeScript
- better-sqlite3 (SQLite driver)
- meshcore Python library (via child process) or native serial

## Contributing

This is a community project! Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a Pull Request

**Areas that need help:**
- MeshCore protocol expertise
- Serial/binary protocol handling in Node.js
- Testing with real MeshCore devices
- Documentation

## License

This project is licensed under the BSD-3-Clause License - see the [LICENSE](LICENSE) file for details.

### Attribution

This project is a fork of [MeshMonitor](https://github.com/Yeraze/meshmonitor) by Yeraze, licensed under BSD-3-Clause. Original copyright and license terms are preserved.

## Links

- [MeshCore GitHub](https://github.com/meshcore-dev/MeshCore) - The MeshCore firmware
- [MeshCore Python Library](https://pypi.org/project/meshcore/) - Python library for MeshCore
- [Original MeshMonitor](https://github.com/Yeraze/meshmonitor) - The project this is forked from
- [MeshCore Flasher](https://flasher.meshcore.co.uk/) - Flash MeshCore firmware

## Acknowledgments

- [Yeraze](https://github.com/Yeraze) - Original MeshMonitor author
- [MeshCore Team](https://github.com/meshcore-dev) - MeshCore firmware
- [Catppuccin](https://catppuccin.com/) - Soothing pastel theme
- [React](https://reactjs.org/) - Frontend framework

---

**MeshCore Monitor** - Monitor your MeshCore mesh, beautifully.

_Free and open source for the community._
