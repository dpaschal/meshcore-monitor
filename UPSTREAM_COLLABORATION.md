# Upstream Collaboration Proposal

This document outlines a potential collaboration with [Yeraze](https://github.com/Yeraze), the creator of [MeshMonitor](https://github.com/Yeraze/meshmonitor).

## Our Contribution

We've extended MeshMonitor to support [MeshCore](https://github.com/rmendes76/MeshCore) devices while maintaining full Meshtastic compatibility. This could benefit the broader mesh networking community.

## What We've Added

1. **MeshCoreManager** (`src/server/meshcoreManager.ts`) - Device communication layer
2. **MeshCore API Routes** (`src/server/routes/meshcoreRoutes.ts`) - REST API endpoints
3. **MeshCore Tab UI** (`src/components/MeshCore/`) - React components
4. **Database Schema** - Tables for MeshCore nodes/messages
5. **Dual-Protocol Support** - Both Meshtastic and MeshCore in one app

## Collaboration Options

### Option 1: Feature Pull Request
Open a PR to merge MeshCore support into the main MeshMonitor repo.

**Pros:** Single unified project, shared maintenance
**Cons:** May increase complexity for users who only want Meshtastic

### Option 2: Separate Fork with Upstream Sync
Continue as a separate fork that syncs with upstream (current approach).

**Pros:** Independent development, doesn't affect main repo
**Cons:** Duplicated maintenance effort

### Option 3: Plugin/Module Architecture
Work together to create a plugin system where MeshCore is an optional module.

**Pros:** Clean separation, optional features
**Cons:** Requires architectural changes

## Proposed GitHub Issue/Discussion

```markdown
Title: [Feature Proposal] MeshCore Protocol Support

Hi @Yeraze,

First, thank you for creating MeshMonitor - it's an excellent tool for Meshtastic monitoring!

I've created a fork (MeshCore Monitor) that extends MeshMonitor to also support
MeshCore devices. MeshCore is a lightweight mesh protocol similar to Meshtastic
but with different design goals.

**What we've added:**
- MeshCore device connection (serial/TCP)
- Node and contact discovery
- Messaging (broadcast and direct)
- Dedicated MeshCore tab in the UI
- Full backwards compatibility with Meshtastic

**Our fork:** https://github.com/dpaschal/meshcore-monitor

I wanted to reach out to see if you'd be interested in:
1. Merging this feature into the main MeshMonitor repo
2. Collaborating on a plugin architecture for protocol support
3. Or just keeping informed about our fork

We're committed to maintaining upstream sync regardless of the approach.

Happy to discuss further and share any technical details!

Best regards,
[Your name]
```

## How to Reach Out

1. **GitHub Issue:** https://github.com/Yeraze/meshmonitor/issues/new
2. **GitHub Discussions:** https://github.com/Yeraze/meshmonitor/discussions
3. **Pull Request:** Fork, create branch, open PR with the changes

## Files to Share

If submitting a PR, the key files are:
- `src/server/meshcoreManager.ts`
- `src/server/routes/meshcoreRoutes.ts`
- `src/components/MeshCore/MeshCoreTab.tsx`
- `src/components/MeshCore/MeshCoreTab.css`
- Database schema updates in `src/db/schema/`

## Next Steps

1. Create a GitHub issue or discussion on Yeraze/meshmonitor
2. Share the fork URL and describe the feature
3. Offer to create a PR if interested
4. Maintain communication and upstream sync regardless
