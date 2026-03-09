# AdvantageScope MCP Server

MCP (Model Context Protocol) server for creating, reading, modifying, and validating AdvantageScope configuration JSON files in FRC robotics projects.

This project follows the same architecture and conventions as [elastic_dashboard-mcp](https://github.com/o-bots7160/elastic_dashboard-mcp).

## Build & Test Commands

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode — recompile on file changes
npm start            # Run the compiled MCP server
npm test             # Run full test suite (vitest)
npm run test:watch   # Run tests in watch mode

# Run a single test file
npx vitest run test/some-file.test.ts

# Run tests matching a pattern
npx vitest run -t "pattern name"
```

No separate linter — TypeScript strict mode (`strict: true`) enforces type safety.

## Architecture

### MCP Server Pattern

The server uses `@modelcontextprotocol/sdk` with stdio transport, identical to elastic_dashboard-mcp:

- **`src/index.ts`** — Entry point (shebang `#!/usr/bin/env node`). Creates the server and connects via `StdioServerTransport`.
- **`src/server.ts`** — `createServer()` factory function. All MCP tools are registered here using `server.tool()`.
- **`src/schema/types.ts`** — TypeScript interfaces for all AdvantageScope config types (Config2dField, Config3dField, Config3dRobot, ConfigJoystick, ApplicationState, Preferences, TabType enum).
- **`src/schema/schemas.ts`** — Zod schemas matching each TypeScript interface, used for both MCP tool input validation and config file validation.
- **`src/schema/validation.ts`** — Validation functions that return `ValidationError[]` arrays.
- **`src/tools/assets.ts`** — File I/O for asset config.json files (read, write, list, infer type from directory name).
- **`src/tools/layout.ts`** — File I/O for layout state files and preferences (read, write, create empty layouts/tabs).
- **`src/utils/`** — Shared utility functions.
- **`test/`** — Vitest test files (`validation.test.ts`, `file-io.test.ts`).

### Tool Registration Pattern

Every tool follows this structure:

```typescript
server.tool(
  "tool_name",
  "Human-readable description of what this tool does",
  {
    param_name: z.string().describe("What this parameter is for"),
  },
  async ({ param_name }) => {
    try {
      // Implementation
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
        isError: true,
      };
    }
  },
);
```

Key conventions:
- All tool handlers catch exceptions and return `{ isError: true }` with a descriptive message
- Input parameters use Zod schemas with `.describe()` for each field
- Return JSON as formatted text content (`JSON.stringify(result, null, 2)`)
- Tool names use `snake_case`

### Implemented Tools (14 total)

**Read/Inspect:**
- `list_assets` — List AdvantageScope custom asset directories within a base directory, optionally filtered by type
- `get_asset_config` — Read an asset's config.json and return contents with auto-detected asset type
- `validate_asset_config` — Validate an asset config.json against its Zod schema
- `list_tab_types` — List all AdvantageScope tab types with numeric IDs
- `get_layout` — Read an AdvantageScope layout state JSON file and return a summary of hubs and tabs
- `get_preferences` — Read AdvantageScope preferences from a prefs.json file (returns defaults for missing fields)

**Create:**
- `create_field2d_config` — Create a new 2D field asset config.json (coordinate system, pixel bounds, dimensions)
- `create_field3d_config` — Create a new 3D field asset config.json (rotations, driver stations, game pieces, AprilTags)
- `create_robot_config` — Create a new 3D robot model config.json (rotations, cameras, articulated components)
- `create_joystick_config` — Create a new joystick config.json (buttons, sticks, axes with pixel positions)
- `create_layout` — Create a new AdvantageScope layout state JSON file with a default window and Documentation tab
- `add_tab` — Add a tab to an existing layout by type ID

**Modify:**
- `update_asset_config` — Merge updates into an existing asset config.json with validation
- `update_preferences` — Update AdvantageScope preferences (merges with existing, validates before saving)

**Delete:**
- `remove_tab` — Remove a tab from a layout by index (auto-adjusts selected tab)

## Key Conventions

### TypeScript & Module System

- **ES Modules** (`"type": "module"` in package.json)
- **Target**: ES2022, **Module resolution**: Node16
- Use `.js` extension in imports (e.g., `import { foo } from "./bar.js"`) — required for Node16 ESM resolution
- Output to `dist/` directory

### Schema Validation with Zod

Use [Zod v4](https://zod.dev/) for all schema validation. Note Zod v4 API differences from v3:
- `z.record()` requires two arguments: `z.record(z.string(), z.unknown())`
- ZodError issue paths use `PropertyKey[]` (includes symbols), not `(string | number)[]`
- Discriminated unions use `z.discriminatedUnion("type", [...])`

Keep Zod schemas in `src/schema/schemas.ts` alongside TypeScript interfaces in `src/schema/types.ts`.

### Testing with Vitest

- Test files live in `test/` at the project root
- Name test files `*.test.ts` matching the source module they test
- Test JSON file I/O, schema validation, and utility functions independently

### NPM Package Publishing

The server is published as an npm package and invoked via `npx`:

```json
{
  "bin": { "advantagescope-mcp": "dist/index.js" },
  "publishConfig": { "access": "public" }
}
```

VS Code MCP client configuration:

```json
{
  "servers": {
    "advantagekit": {
      "command": "npx",
      "args": ["-y", "@o-bots7160/advantagescope-mcp"]
    }
  }
}
```

## AdvantageScope Configuration Reference

AdvantageScope is a robot diagnostics and log analysis application. The MCP server manages AdvantageScope's JSON configuration files.

### Custom Asset Directory Convention

AdvantageScope custom assets live in `~/.advantagescope/assets/` (or a user-configured folder). Each asset is a directory named `{Type}_{Name}/` containing a `config.json` and associated files (images, 3D models):

```
assets/
├── Field2d_Evergreen/
│   ├── config.json      # 2D field config (pixel bounds, dimensions, coordinate system)
│   └── image.png        # Field image
├── Field3d_2024Crescendo/
│   ├── config.json      # 3D field config (rotations, AprilTags, game pieces)
│   └── model.glb        # 3D model
├── Robot_MyBot/
│   ├── config.json      # Robot config (rotations, cameras, components)
│   └── model.glb        # 3D robot model
└── Joystick_OperatorBoard/
    ├── config.json      # Joystick config (buttons, sticks, axes with pixel positions)
    └── image.png        # Controller image
```

### Layout State Files

AdvantageScope saves window/tab state to `~/.advantagescope/state-{version}.json`. The `ApplicationState` structure contains:
- `hubs[]` — Main windows, each with sidebar state and tab list
- `satellites[]` — Satellite (detached) windows
- Each tab has a numeric `type` (0–12), `title`, and tab-specific `controller`/`renderer` config

### Preferences File

Stored at `~/.advantagescope/prefs.json`. All fields are optional and merge with defaults.

### Supported Log Formats

AdvantageScope reads these log formats (the MCP server does not parse logs, but should understand what they are):

| Format | Extension | Source |
|--------|-----------|--------|
| WPILib | `.wpilog`, `.wpilogxz` | WPILib robot logging |
| RLOG | `.rlog` | AdvantageKit streaming/logs |
| Driver Station | `.dslog`, `.dsevents` | FRC Driver Station |
| Hoot | `.hoot` | CTRE Phoenix |
| REVLOG | `.revlog` | REV Robotics CAN |
| CSV | `.csv` | Generic data |

### AdvantageScope Tab Types

AdvantageScope organizes visualizations into tabs. Each tab type has specific source data requirements:

| Tab Type | Purpose |
|----------|---------|
| `LineGraph` | Time-series line charts |
| `Table` | Tabular data view |
| `Field2d` | 2D field visualization with robot poses |
| `Field3d` | 3D field visualization with CAD models |
| `Console` | Log message viewer |
| `Statistics` | Log statistics analysis |
| `Video` | Synchronized video playback |
| `Joysticks` | Joystick input visualization |
| `Swerve` | Swerve drive module vectors |
| `Mechanism` | 2D mechanism visualization |
| `Points` | Scatter plot visualization |
| `Metadata` | Log metadata viewer |

### AdvantageScope Preferences Schema

Key preferences the MCP server may need to read or generate:

```typescript
{
  theme: "light" | "dark" | "system",
  robotAddress: string,              // e.g., "10.71.60.2" (10.TE.AM.2)
  liveMode: "nt4" | "nt4-akit" | "phoenix" | "rlog" | "ftcdashboard",
  liveSubscribeMode: "low-bandwidth" | "logging",
  rlogPort: number,                  // default: 5800
  coordinateSystem: "automatic" | "wall-alliance" | "wall-blue" | "center-rotated" | "center-red",
  field3dModeAc: "cinematic" | "standard" | "low-power",
  tbaApiKey: string,                 // The Blue Alliance API key
  userAssetsFolder: string | null    // Custom CAD models and field images
}
```

### NetworkTables (NT4) Context

AdvantageScope visualizes telemetry data published via NetworkTables 4 (NT4). Common topic patterns:

- `/SmartDashboard/...` — General dashboard values
- `/Shuffleboard/...` — Shuffleboard-organized data
- `/RealOutputs/...` — Real robot outputs (when using AdvantageKit)
- `/ReplayOutputs/...` — Replay outputs (when using AdvantageKit)

## Releasing

```bash
npm version patch    # or minor/major — bumps version + creates git tag
git push && git push --tags
gh release create v<version> --generate-notes
# GitHub Actions builds and publishes to npm
```
