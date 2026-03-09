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
- **`src/schema/source-types.ts`** — Source type configurations for all SourceListState tabs, derived from AdvantageScope's actual `*_Config.ts` files. Includes valid type keys, sourceTypes, options with allowed values, parent/child relationships, WPILib code hints, and validation functions.
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

### Implemented Tools (20 total)

**Read/Inspect:**
- `list_assets` — List AdvantageScope custom asset directories within a base directory, optionally filtered by type
- `get_asset_config` — Read an asset's config.json and return contents with auto-detected asset type
- `validate_asset_config` — Validate an asset config.json against its Zod schema
- `list_tab_types` — List all AdvantageScope tab types with numeric IDs, data types, visualization types, configuration, and notes
- `get_tab_type_schema` — Get the full schema for a specific tab type including controller format, valid source types with options, parent/child relationships, and WPILib code hints
- `get_layout` — Read an AdvantageScope layout state JSON file and return a summary of hubs and tabs
- `get_tab` — Get full details of a specific tab including controller and renderer config
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
- `update_tab` — Update an existing tab's title, controller, and/or renderer config (shallow-merges with existing)
- `add_source` — Add a validated data source to a SourceListState tab (validates type, logType, options, and parent/child relationships)
- `update_source` — Update an existing source in a SourceListState tab by index with validation
- `remove_source` — Remove a source from a SourceListState tab by index

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

AdvantageScope is a robot diagnostics, log review/analysis, and data visualization application for FRC/FTC teams developed by [Team 6328 (Mechanical Advantage)](https://littletonrobotics.org). The MCP server manages AdvantageScope's JSON configuration files for custom assets, layouts, and preferences.

### Supported Log Formats

AdvantageScope reads these log formats (the MCP server does not parse logs, but should understand what they are):

| Format | Extension | Source |
|--------|-----------|--------|
| WPILib | `.wpilog`, `.wpilogxz` | WPILib robot logging |
| RLOG | `.rlog` | AdvantageKit streaming/logs |
| Driver Station | `.dslog`, `.dsevents` | FRC Driver Station |
| Hoot | `.hoot` | CTRE Phoenix |
| REVLOG | `.revlog` | REV Robotics CAN |
| Road Runner | — | FTC Road Runner |
| CSV | `.csv` | Generic data |

### Live Data Sources

| Mode | Protocol | Use Case |
|------|----------|----------|
| `nt4` | NetworkTables 4 | Standard WPILib robot |
| `nt4-akit` | NetworkTables 4 | AdvantageKit robot |
| `phoenix` | Phoenix | CTRE Phoenix diagnostics |
| `rlog` | RLOG | AdvantageKit streaming |
| `ftcdashboard` | FTC Dashboard | FTC robots |

### Custom Asset Directory Convention

AdvantageScope custom assets live in `~/.advantagescope/assets/` (or a user-configured folder via `userAssetsFolder` preference). Each asset is a directory named `{Type}_{Name}/` containing a `config.json` and associated files:

```
assets/
├── Field2d_Evergreen/
│   ├── config.json      # 2D field config
│   └── image.png        # Field image (red alliance on left)
├── Field3d_2024Crescendo/
│   ├── config.json      # 3D field config
│   ├── model.glb        # Main field model (red alliance on left after rotations)
│   └── model_0.glb      # Game piece model(s)
├── Robot_MyBot/
│   ├── config.json      # Robot config
│   ├── model.glb        # Main robot model
│   └── model_0.glb      # Articulated component model(s)
└── Joystick_OperatorBoard/
    ├── config.json      # Joystick config
    └── image.png        # Controller image
```

#### Field 2D Config

```json
{
  "name": "2024 Crescendo",
  "isFTC": false,
  "coordinateSystem": "wall-blue",
  "sourceUrl": "https://...",
  "topLeft": [100, 50],
  "bottomRight": [1900, 950],
  "widthInches": 651.25,
  "heightInches": 323.25
}
```

#### Field 3D Config

```json
{
  "name": "2024 Crescendo",
  "isFTC": false,
  "coordinateSystem": "wall-blue",
  "rotations": [{"axis": "x", "degrees": 90}],
  "widthInches": 651.25,
  "heightInches": 323.25,
  "defaultOrigin": "auto",
  "driverStations": [[x, y], ...],
  "gamePieces": [{
    "name": "Note",
    "rotations": [],
    "position": [0, 0, 0],
    "stagedObjects": ["object_key"]
  }],
  "aprilTags": [{
    "variant": "36h11-6.5in",
    "id": 1,
    "rotations": [],
    "position": [0, 0, 0]
  }]
}
```

#### Robot 3D Config

```json
{
  "name": "2024 Robot",
  "isFTC": false,
  "disableSimplification": false,
  "rotations": [{"axis": "z", "degrees": 90}],
  "position": [0, 0, 0],
  "cameras": [{
    "name": "Front Camera",
    "rotations": [],
    "position": [0.3, 0, 0.2],
    "resolution": [1920, 1080],
    "fov": 70
  }],
  "components": [{
    "zeroedRotations": [],
    "zeroedPosition": [0, 0, 0]
  }]
}
```

Component models are named `model_0.glb`, `model_1.glb`, etc. Add `NOSIMPLIFY` to a mesh name to prevent automatic simplification, or set `disableSimplification: true` globally.

#### Joystick Config

```json
{
  "name": "Xbox Controller",
  "components": [
    { "type": "button", "isYellow": false, "isEllipse": true, "centerPx": [100, 200], "sizePx": [30, 30], "sourceIndex": 0 },
    { "type": "button", "isYellow": false, "isEllipse": false, "centerPx": [150, 200], "sizePx": [20, 20], "sourceIndex": 1, "sourcePov": "up" },
    { "type": "joystick", "isYellow": false, "centerPx": [150, 250], "radiusPx": 40, "xSourceIndex": 0, "xSourceInverted": false, "ySourceIndex": 1, "ySourceInverted": false, "buttonSourceIndex": 9 },
    { "type": "axis", "isYellow": false, "centerPx": [300, 250], "sizePx": [20, 100], "sourceIndex": 2, "sourceRange": [-1.0, 1.0] }
  ]
}
```

### Layout State Files

AdvantageScope saves window/tab state to `~/.advantagescope/state-{version}.json`. The `ApplicationState` structure contains:
- `hubs[]` — Main windows, each with sidebar state and tab list
- `satellites[]` — Satellite (detached) windows
- Each tab has a numeric `type` (0–12), `title`, and tab-specific `controller` config
- The `renderer` field is always `null` — only `controller` holds user configuration

### Tab Types and Controller State

Each tab's `controller` field contains tab-specific configuration. The format varies significantly by tab type.

**Source management tools** (`add_source`, `update_source`, `remove_source`) handle SourceListState tabs with full validation. Use `get_tab_type_schema` to query the exact schema for any tab type, including valid source types, options, and WPILib code hints.

#### Data Type Resolution

AdvantageScope has 8 fundamental `LoggableType` values: `Raw`, `Boolean`, `Number`, `String`, `BooleanArray`, `NumberArray`, `StringArray`, `Empty`.

**All numeric types (int8-64, uint8-64, float, float32, double, float64) are treated as a single `Number` type.** There is no int/float/double distinction in the logType field.

Structured types (e.g., `Pose2d`, `SwerveModuleState[]`, `ChassisSpeeds`) are resolved from WPILib struct descriptors and take priority over the base LoggableType. The `logType` field in SourceListItemState stores the resolved type string.

**Type resolution priority:**
1. Structured type (`"Pose2d"`, `"ChassisSpeeds"`, `"SwerveModuleState[]"`) — from struct decoder
2. LoggableType string (`"Number"`, `"NumberArray"`, `"Boolean"`) — fallback

#### SourceListState (used by most visualization tabs)

Many tabs store their controller state as a `SourceListState`, which is an array of source items:

```typescript
type SourceListState = SourceListItemState[];

type SourceListItemState = {
  type: string;           // Visualization type (e.g., "stepped", "robot", "states")
  logKey: string;         // Log field path (e.g., "/RealOutputs/Drive/Pose")
  logType: string;        // Data type (e.g., "Pose2d", "Number", "SwerveModuleState[]")
  visible: boolean;       // Whether this source is shown
  options: {              // Type-specific display options
    [key: string]: string;
  };
};
```

#### Tab Type Reference

##### Documentation (type: 0)
- **Controller:** `null`
- **Purpose:** Static documentation/welcome tab

##### LineGraph (type: 1)
- **Controller:** `SourceListState` (two sections: numeric axis and discrete fields)
- **Purpose:** Time-series line charts for numeric and discrete data
- **Numeric axis types:**
  - `"stepped"` — Stepped line. Source: `Number`. Options: `color` (GraphColors), `size` (normal/bold/verybold)
  - `"smooth"` — Smooth interpolated line. Source: `Number`. Options: same as stepped
  - `"points"` — Points only. Source: `Number`. Options: `color`, `size` (normal/bold)
- **Discrete field types:**
  - `"stripes"` — Color stripes. Source: `Raw`, `Boolean`, `Number`, `String`, `BooleanArray`, `NumberArray`, `StringArray`. Options: `color`
  - `"graph"` — Discrete graph. Source: same as stripes. Options: `color`
  - `"alerts"` — Alert display. Source: `Alerts`. Options: none
- **GraphColors:** orange, yellow, green, blue, purple, brown, red, white, black

##### Field2d (type: 2)
- **Controller:** `SourceListState`
- **Purpose:** 2D field visualization with robot poses, trajectories, and heatmaps
- **Types:**
  - `"robot"` — Robot pose. Source: `Pose2d`, `Pose3d`, arrays, `Transform2d/3d`. Options: `bumpers` (alliance color or NeonColors)
  - `"ghost"` — Ghost pose overlay. Source: same as robot. Options: `color` (NeonColors)
  - `"vision"` — Vision target (child of robot). Source: Pose/Transform/Translation types. Options: `color`, `size` (normal/bold)
  - `"trajectory"` — Path. Source: `Pose2d[]`, `Trajectory`, `DifferentialSample[]`, `SwerveSample[]`, etc. Options: `color`, `size`
  - `"heatmap"` — Position heatmap. Source: Pose/Translation types. Options: `timeRange` (enabled/auto/teleop/teleop-no-endgame/full/visible)
  - `"arrow"` — Direction arrow. Source: Pose types, `Trajectory`. Options: `position` (center/back/front)
  - `"swerveStates"` — Swerve module vectors (child of robot). Source: `SwerveModuleState[]`. Options: `color`, `arrangement` (FL/FR/BL/BR permutations)
  - `"rotationOverride"` — Rotation override (child of robot). Source: `Rotation2d`, `Rotation3d`. Options: none
- **NeonColors:** #00ff00, #00ffff, #ff00ff, #ffff00, #ff8800, etc.
- **Swerve arrangements:** FL/FR/BL/BR, FR/FL/BR/BL, FL/FR/BR/BL, FL/BL/BR/FR, FR/BR/BL/FL, FR/FL/BL/BR

##### Field3d (type: 3)
- **Controller:** `SourceListState`
- **Purpose:** 3D field visualization with CAD models, game pieces, and articulated robots
- **Types:** Same as Field2d, plus:
  - `"cone"` / `"cube"` / `"note"` — Game pieces (year-specific). Source: Pose/Translation types
  - `"component"` — Articulated 3D component (child of robot). Source: `Pose3d`, `Pose3d[]`
  - `"mechanism"` — 2D mechanism projection (child of robot). Source: `Mechanism2d`. Options: `orientation` (XZ/YZ)
  - `"axes"` — Coordinate axes. Source: Pose/Transform types
  - `"cameraOverride"` — Camera position override. Source: `Pose2d`, `Pose3d`
- **Rendering modes:** cinematic (shadows, reflections), standard, low-power

##### Table (type: 4)
- **Controller:** `string[]` — array of log field keys to display
- **Purpose:** Tabular view of value changes over time. Supports all data types.
- **Example:** `["/RealOutputs/Drive/LeftVelocity", "/RealOutputs/Drive/RightVelocity"]`

##### Console (type: 5)
- **Controller:** `string | null` — single log field key for console output
- **Purpose:** Console message viewer with warning/error highlighting and text filtering
- **Data type:** `String`
- **Common fields:** `DSEvents`, `messages`, `/RealOutputs/Console`, `/ReplayOutputs/Console`

##### Statistics (type: 6)
- **Controller:** `SourceListState`
- **Purpose:** Statistical analysis with histograms (mean, median, std dev, percentiles, skewness)
- **Types:**
  - `"independent"` — Independent measurement. Source: `Number`. Options: `color`
  - `"reference"` — Reference measurement (parent). Source: `Number`. Options: none
  - `"relativeError"` — Relative error (child of reference). Source: `Number`. Options: `color`
  - `"absoluteError"` — Absolute error (child of reference). Source: `Number`. Options: `color`
- **Time range options:** Visible Range, Full Log, Enabled, Auto, Teleop, Teleop (No Endgame), Live: 30s, Live: 10s

##### Video (type: 7)
- **Controller:** Video source configuration (local file path, YouTube URL, or TBA match)
- **Purpose:** Synchronized match video playback alongside log data
- **Video sources:** Local file, YouTube link, The Blue Alliance (requires `tbaApiKey` preference)

##### Joysticks (type: 8)
- **Controller:** `string[]` — array of 6 joystick layout names
- **Purpose:** Display up to 6 controller states with button/axis visualization
- **Example:** `["Xbox Controller", "None", "None", "None", "None", "None"]`
- **Note:** Requires WPILib log with joystick logging enabled, AdvantageKit logs, or AdvantageKit streaming (not available via plain NT4)

##### Swerve (type: 9)
- **Controller:** `SourceListState`
- **Purpose:** Swerve drive module vector display with velocity/rotation visualization
- **Types:**
  - `"states"` — Module states. Source: `SwerveModuleState[]`. Options: `color` (NeonColors), `arrangement` (FL/FR/BL/BR permutations)
  - `"chassisSpeeds"` — Chassis speeds vector. Source: `ChassisSpeeds`. Options: `color`
  - `"rotation"` — Robot rotation indicator. Source: `Rotation2d`, `Rotation3d`. Options: none
- **Configuration:** Max speed (for vector sizing), frame size (L/R and F/B distances), orientation

##### Mechanism (type: 10)
- **Controller:** `SourceListState`
- **Purpose:** WPILib Mechanism2d visualization (jointed mechanisms like arms, elevators)
- **Types:**
  - `"mechanism"` — Mechanism2d field. Source: `Mechanism2d`. Options: none
- **Publishing:** `SmartDashboard.putData("MyMech", mechanism)` or `Logger.recordOutput("MyMech", mechanism)`

##### Points (type: 11)
- **Controller:** `SourceListState`
- **Purpose:** 2D scatter plot visualization for arbitrary point data
- **Types:**
  - `"plus"` / `"cross"` / `"circle"` — Marker shapes. Source: `Translation2d`, `Translation2d[]`, `NumberArray`. Options: `size` (small/medium/large), `groupSize` (0-9)
  - `"plusSplit"` / `"crossSplit"` / `"circleSplit"` — Split component markers (parent). Source: `NumberArray`. Options: `component` (x/y), `size`, `groupSize`
  - `"component"` — Component value (child of split). Source: `NumberArray`. Options: `component` (x/y)
- **Configuration:** Dimensions, orientation, origin position

##### Metadata (type: 12)
- **Controller:** `null`
- **Purpose:** Display log metadata (key-value pairs). Supports side-by-side real vs replay comparison.
- **Data source:** `/Metadata` table (NetworkTables or DataLog) or `Logger.recordMetadata()` (AdvantageKit)

### Preferences File

Stored at `~/.advantagescope/prefs.json`. All fields are optional and merge with defaults.

```typescript
interface Preferences {
  theme: "light" | "dark" | "system";                    // default: "system"
  robotAddress: string;                                   // default: "10.00.00.2" (10.TE.AM.2 format)
  remotePath: string;                                     // default: "/U/logs"
  liveMode: "nt4" | "nt4-akit" | "phoenix" | "rlog" | "ftcdashboard"; // default: "nt4"
  liveSubscribeMode: "low-bandwidth" | "logging";         // default: "low-bandwidth"
  liveDiscard: number;                                    // default: 1200 (seconds, 20 minutes)
  publishFilter: string;                                  // default: "" (regex filter for published keys)
  rlogPort: number;                                       // default: 5800
  coordinateSystem: "automatic" | "wall-alliance" | "wall-blue" | "center-rotated" | "center-red"; // default: "automatic"
  field3dModeAc: "cinematic" | "standard" | "low-power";  // default: "standard"
  field3dModeBattery: "" | "cinematic" | "standard" | "low-power"; // default: "" (use AC setting)
  field3dAntialiasing: boolean;                            // default: true
  tbaApiKey: string;                                       // default: "" (The Blue Alliance API key)
  userAssetsFolder: string | null;                         // default: null
  skipHootNonProWarning: boolean;                          // default: false
  skipNumericArrayDeprecationWarning: boolean;              // default: false
  skipFTCExperimentalWarning: boolean;                     // default: false
  skipFrcLogFolderDefault: boolean;                        // default: false
  ctreLicenseAccepted: boolean;                            // default: false
  usb?: boolean;                                           // optional USB preference
}
```

### NetworkTables (NT4) Context

AdvantageScope visualizes telemetry data published via NetworkTables 4 (NT4). Common topic patterns:

- `/SmartDashboard/...` — General dashboard values
- `/Shuffleboard/...` — Shuffleboard-organized data
- `/RealOutputs/...` — Real robot outputs (when using AdvantageKit)
- `/ReplayOutputs/...` — Replay outputs (when using AdvantageKit)
- `/Metadata/...` — Log metadata entries

## Releasing

After pushing a new feature or bug fix that changes runtime behavior (source code in `src/`, dependency changes, etc.), create a release to publish to npm. Do **not** release for documentation-only changes (README, copilot-instructions, comments).

```bash
npm version patch    # or minor/major — bumps package.json and creates a git tag
git push && git push --tags
gh release create v$(node -p "require('./package.json').version") --generate-notes
```

The `publish.yml` workflow will automatically build, test, and publish the package to npm on release.
