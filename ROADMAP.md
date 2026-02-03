# MeshCore Monitor - Development Roadmap

This document outlines the plan for adapting MeshMonitor to work with MeshCore.

## Overview

MeshMonitor was built for Meshtastic, which uses:
- Protobuf-based binary protocol
- HTTP API for node communication
- 32-bit node numbers as identifiers
- Channel-based PSK encryption

MeshCore uses:
- Binary protocol (Companion firmware) or text CLI (Repeater firmware)
- Serial/TCP connection to device
- Public keys (64-char hex strings) as identifiers
- Different encryption model

## Phase 1: Core Protocol Adaptation

### 1.1 Connection Layer
**File:** `src/server/meshcoreManager.ts` (new, replaces meshtasticManager.ts)

- [x] Serial port connection (for local USB devices)
- [x] TCP socket connection (for remote/network devices)
- [x] Connection state management
- [x] Reconnection handling
- [x] Event-based message handling

**MeshCore Connection Methods:**
```typescript
// Serial connection
const connection = new SerialConnection('/dev/ttyACM0', { baudrate: 115200 });

// TCP connection (if using serial-bridge)
const connection = new TCPConnection('192.168.1.100', 4403);
```

### 1.2 Protocol Handling
**Files:** `src/server/meshcoreProtocol.ts` (new)

MeshCore has two firmware types with different protocols:

**Companion Firmware (Binary Protocol):**
- Uses the meshcore Python library protocol
- Binary commands and responses
- Full API: contacts, messages, admin, etc.

**Repeater Firmware (Text CLI):**
- Simple text commands over serial
- Commands: `set name`, `get radio`, `ver`, `advert`, etc.
- Limited API compared to Companion

- [x] Implement binary protocol parser (via Python meshcore library)
- [x] Implement text CLI handler (for Repeater firmware)
- [x] Auto-detect firmware type
- [x] Command/response mapping

### 1.3 Database Schema Updates
**Files:** `src/db/schema/*.ts`

MeshCore uses different identifiers and fields:

```sql
-- Nodes table changes
CREATE TABLE nodes (
  publicKey TEXT PRIMARY KEY,        -- 64-char hex (was nodeNum INTEGER)
  name TEXT,                          -- (was longName/shortName)
  advType INTEGER,                    -- Companion=1, Repeater=2, RoomServer=3
  txPower INTEGER,
  lastHeard INTEGER,
  rssi INTEGER,
  snr REAL,
  batteryMv INTEGER,
  uptimeSecs INTEGER,
  -- ... MeshCore-specific fields
);

-- Messages table changes
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  fromPublicKey TEXT NOT NULL,        -- (was fromNodeNum)
  toPublicKey TEXT,                   -- null for broadcast
  text TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  -- ...
);

-- Contacts table (new for MeshCore)
CREATE TABLE contacts (
  ownerPublicKey TEXT NOT NULL,       -- The node that has this contact
  contactPublicKey TEXT NOT NULL,
  advName TEXT,
  lastSeen INTEGER,
  rssi INTEGER,
  snr REAL,
  PRIMARY KEY (ownerPublicKey, contactPublicKey)
);
```

- [x] Create new schema files (meshcoreNodes.ts, meshcoreMessages.ts)
- [ ] Migration from old schema
- [ ] Update repository classes

## Phase 2: Feature Implementation

### 2.1 Node Discovery & Display
- [x] Connect to local MeshCore device
- [x] Receive and parse advert messages
- [ ] Store nodes in database (schema ready, persistence pending)
- [x] Display node list in UI
- [x] Show node details (name, type, battery, etc.)

### 2.2 Contact Management
- [x] Fetch contacts from connected device
- [x] Display contact list
- [x] Show contact status (last seen, RSSI, SNR)
- [x] Refresh contacts on demand

### 2.3 Messaging
- [x] Send text messages
- [x] Receive incoming messages
- [x] Message history display
- [x] Broadcast vs direct messages

### 2.4 Admin Commands
MeshCore supports remote administration:

- [x] Login to remote node (password-based)
- [x] Request status from remote node
- [ ] Configure remote node settings
- [x] Request remote advert

```typescript
// Admin workflow
await mc.commands.send_login(publicKey, '123459');
const status = await mc.commands.req_status_sync(publicKey, timeout=10);
```

### 2.5 Repeater Management
For Repeater firmware devices:

- [x] Configure name
- [x] Configure radio settings (freq, BW, SF, CR)
- [ ] Set admin password
- [x] Trigger advert
- [x] View status

## Phase 3: UI Adaptation

### 3.1 Terminology Updates
- "Node Number" → "Public Key"
- "Long Name" / "Short Name" → "Name"
- "Channels" → (MeshCore doesn't have channels the same way)
- "Hardware Model" → "Firmware Type" (Companion/Repeater/RoomServer)

### 3.2 Component Updates
- [x] NodeList component - show MeshCore fields (MeshCoreTab.tsx)
- [x] NodeDetails component - MeshCore-specific info (MeshCoreTab.tsx)
- [x] MessageList component - adapt for MeshCore messages (MeshCoreTab.tsx)
- [x] Settings component - MeshCore connection settings (MeshCoreTab.tsx)

### 3.3 Map View
- [ ] Display nodes with positions
- [ ] MeshCore nodes may not always have GPS
- [ ] Manual position entry support

## Phase 4: Polish & Release

### 4.1 Documentation
- [ ] Installation guide
- [ ] Configuration reference
- [ ] API documentation
- [ ] Troubleshooting guide

### 4.2 Docker Support
- [ ] Dockerfile updates
- [ ] docker-compose.yml for easy deployment
- [ ] Multi-architecture builds (amd64, arm64)

### 4.3 Testing
- [ ] Unit tests for protocol handling
- [ ] Integration tests with mock device
- [ ] Real device testing

## Technical Notes

### Using meshcore Python Library

The meshcore Python library (v2.2.6+) provides the cleanest API for Companion firmware. Options for integration:

1. **Child Process** - Spawn Python scripts for commands
2. **Python-Shell** - Use python-shell npm package
3. **Native Port** - Port the binary protocol to TypeScript (significant effort)

Recommendation: Start with child process approach, then optimize if needed.

### Serial Port Access

Node.js serial port libraries:
- `serialport` - Most popular, good Windows/Linux/Mac support
- Need to handle port discovery and permissions

### Firmware Detection

To detect firmware type:
1. Send a binary protocol handshake
2. If no response, try text CLI commands
3. Cache the detected type

## Resources

- [MeshCore GitHub](https://github.com/meshcore-dev/MeshCore)
- [MeshCore Python Library](https://pypi.org/project/meshcore/)
- [MeshCore Protocol Docs](https://github.com/meshcore-dev/MeshCore/tree/main/docs)
- [Original MeshMonitor](https://github.com/Yeraze/meshmonitor)

## Contributing

Areas where help is needed:
1. **Protocol expertise** - Understanding MeshCore binary protocol
2. **Testing** - Access to various MeshCore devices
3. **UI/UX** - Adapting the interface for MeshCore concepts
4. **Documentation** - Writing guides and references

Join the discussion on GitHub Issues!
