# advantagescope-mcp

An MCP (Model Context Protocol) server for creating, reading, modifying, and validating [AdvantageScope](https://github.com/Mechanical-Advantage/AdvantageScope) configuration JSON files. Designed for FRC teams to programmatically manage custom assets, layouts, and preferences using AI assistants like GitHub Copilot.

## Features

- **Custom asset management** — create and validate 2D fields, 3D fields, robot models, and joystick configs
- **Layout editing** — create, modify, and manage AdvantageScope window/tab state files
- **Source management** — add, update, and remove data sources on SourceListState tabs with full validation of types, logTypes, options, and parent/child relationships
- **Tab type discovery** — query detailed schemas for each tab type including WPILib code hints for publishing data
- **Preferences management** — read and update AdvantageScope preferences with validation
- **Schema validation** — validate any asset config against its Zod schema before saving

## Installation

Install from npm:

```bash
npm install @o-bots7160/advantagescope-mcp
```

Or build from source:

```bash
git clone https://github.com/o-bots7160/advantagescope-mcp.git
cd advantagescope-mcp
npm install && npm run build
```

## Usage with VS Code / GitHub Copilot

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "advantagescope": {
      "command": "npx",
      "args": [
        "-y",
        "@o-bots7160/advantagescope-mcp"
      ]
    }
  }
}
```

## Available Tools

### Read / Inspect

- **`list_assets`** — List AdvantageScope custom asset directories, optionally filtered by type
- **`get_asset_config`** — Read an asset's config.json with auto-detected asset type
- **`validate_asset_config`** — Validate an asset config.json against its schema
- **`list_tab_types`** — List all AdvantageScope tab types with IDs, data types, visualization options, configuration, and notes
- **`get_tab_type_schema`** — Get full schema for a tab type: controller format, valid source types, options, parent/child relationships, and WPILib code hints
- **`get_layout`** — Read a layout state JSON file and get a summary of hubs and tabs
- **`get_tab`** — Get full details of a specific tab including controller and renderer config
- **`get_preferences`** — Read AdvantageScope preferences (returns defaults for missing fields)

### Create

- **`create_field2d_config`** — Create a new 2D field asset config.json
- **`create_field3d_config`** — Create a new 3D field asset config.json
- **`create_robot_config`** — Create a new 3D robot model config.json
- **`create_joystick_config`** — Create a new joystick config.json
- **`create_layout`** — Create a new layout state JSON file with a default window

### Modify

- **`update_asset_config`** — Merge updates into an existing asset config.json with validation
- **`update_preferences`** — Update AdvantageScope preferences (merges with existing)
- **`update_tab`** — Update an existing tab's title, controller, and/or renderer config (objects are shallow-merged; arrays/null are replaced)
- **`add_tab`** — Add a tab to an existing layout by type ID with optional controller/renderer config
- **`add_hub`** — Add a new hub (window) to a layout with optional position and size
- **`add_source`** — Add a validated data source to a SourceListState tab (LineGraph, Field2d/3d, Statistics, Swerve, Mechanism, Points)
- **`update_source`** — Update an existing source in a SourceListState tab by index
- **`remove_source`** — Remove a source from a SourceListState tab by index
- **`move_tab`** — Move a tab from one position to another within a hub, preserving all config
- **`reorder_tabs`** — Reorder all tabs in a hub by specifying a new index order array

### Delete

- **`delete_asset`** — Delete an AdvantageScope custom asset directory and all its contents
- **`remove_tab`** — Remove a tab from a layout by index
- **`remove_hub`** — Remove a hub (window) from a layout by index (cannot remove the last hub)

## Development

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
npm test             # Run tests
npm run test:watch   # Watch tests
```

## License

This project is licensed under the [MIT License](LICENSE).

This project is not affiliated with or endorsed by [Littleton Robotics](https://littletonrobotics.com/) or [AdvantageScope](https://github.com/Mechanical-Advantage/AdvantageScope). AdvantageScope is developed by Littleton Robotics under the [BSD 3-Clause License](https://github.com/Mechanical-Advantage/AdvantageScope/blob/main/LICENSE).
