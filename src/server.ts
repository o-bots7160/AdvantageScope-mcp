import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  readAssetConfig,
  writeAssetConfig,
  inferAssetType,
  listAssetDirs,
  assetConfigPath,
} from "./tools/assets.js";
import {
  readLayout,
  writeLayout,
  createEmptyLayout,
  createTab,
  readPreferences,
  writePreferences,
} from "./tools/layout.js";
import {
  validateAssetConfig,
  validateApplicationState,
  validatePreferences,
} from "./schema/validation.js";
import {
  Config2dFieldSchema,
  Config3dFieldSchema,
  Config3dRobotSchema,
  ConfigJoystickSchema,
  Config3dRotationSchema,
  Config3dRobotCameraSchema,
  Config3dRobotComponentSchema,
  Config3dFieldGamePieceSchema,
  Config3dFieldAprilTagSchema,
  ConfigJoystickComponentSchema,
  PreferencesSchema,
} from "./schema/schemas.js";
import type {
  AssetType,
  Config2dField,
  Config3dField,
  Config3dRobot,
  ConfigJoystick,
  TabType,
} from "./schema/types.js";
import { TAB_TYPE_NAMES } from "./schema/types.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "advantagescope-mcp",
    version: "0.1.0",
  });

  // ─── READ/INSPECT TOOLS ───────────────────────────────────────────

  server.tool(
    "list_assets",
    "List AdvantageScope custom asset directories and their config files within a base directory",
    {
      base_dir: z.string().describe("Base directory to scan for asset folders (e.g., user assets folder or bundledAssets path)"),
      asset_type: z.enum(["Field2d", "Field3d", "Robot", "Joystick"]).optional().describe("Filter by asset type"),
    },
    async ({ base_dir, asset_type }) => {
      try {
        const assets = listAssetDirs(base_dir, asset_type as AssetType | undefined);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(assets, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_asset_config",
    "Read an AdvantageScope custom asset config.json file and return its contents",
    {
      file_path: z.string().describe("Path to the asset config.json file"),
    },
    async ({ file_path }) => {
      try {
        const config = readAssetConfig(file_path);
        const assetType = inferAssetType(file_path);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ assetType, config }, null, 2),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "validate_asset_config",
    "Validate an AdvantageScope asset config.json file against its schema",
    {
      file_path: z.string().describe("Path to the asset config.json file"),
      asset_type: z.enum(["Field2d", "Field3d", "Robot", "Joystick"]).optional().describe("Asset type (auto-detected from directory name if omitted)"),
    },
    async ({ file_path, asset_type }) => {
      try {
        const config = readAssetConfig(file_path);
        const type = (asset_type as AssetType) ?? inferAssetType(file_path);
        if (!type) {
          return {
            content: [{ type: "text" as const, text: "Error: Could not determine asset type. Provide asset_type or use standard directory naming (e.g., Field2d_Name/)." }],
            isError: true,
          };
        }
        const errors = validateAssetConfig(type, config);
        if (errors.length === 0) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ valid: true, assetType: type }, null, 2) }],
          };
        }
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ valid: false, assetType: type, errors }, null, 2),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "list_tab_types",
    "List all available AdvantageScope tab types with their numeric IDs, supported data types, controller state format, and visualization options",
    {},
    async () => {
      const tabTypeInfo = [
        {
          id: 0, name: "Documentation",
          controllerType: "null",
          description: "Static documentation/welcome tab",
          dataTypes: [],
          visualizationTypes: [],
        },
        {
          id: 1, name: "Line Graph",
          controllerType: "SourceListState",
          description: "Time-series line charts for numeric and discrete data",
          dataTypes: ["Number", "Raw", "Boolean", "String", "BooleanArray", "NumberArray", "StringArray", "Alerts"],
          visualizationTypes: [
            { type: "stepped", description: "Stepped line", sources: ["Number"], options: { color: "GraphColors", size: "normal|bold|verybold" } },
            { type: "smooth", description: "Smooth interpolated line", sources: ["Number"], options: { color: "GraphColors", size: "normal|bold|verybold" } },
            { type: "points", description: "Points only", sources: ["Number"], options: { color: "GraphColors", size: "normal|bold" } },
            { type: "stripes", description: "Discrete stripes", sources: ["Raw", "Boolean", "Number", "String", "BooleanArray", "NumberArray", "StringArray"], options: { color: "GraphColors" } },
            { type: "graph", description: "Discrete graph", sources: ["Raw", "Boolean", "Number", "String", "BooleanArray", "NumberArray", "StringArray"], options: { color: "GraphColors" } },
            { type: "alerts", description: "Alert display", sources: ["Alerts"], options: {} },
          ],
        },
        {
          id: 2, name: "2D Field",
          controllerType: "SourceListState",
          description: "2D field visualization with robot poses, trajectories, and heatmaps",
          dataTypes: ["Pose2d", "Pose3d", "Transform2d", "Transform3d", "Translation2d", "Translation3d", "Rotation2d", "Rotation3d", "SwerveModuleState[]", "Trajectory", "DifferentialSample[]", "SwerveSample[]"],
          visualizationTypes: [
            { type: "robot", description: "Robot pose", sources: ["Pose2d", "Pose3d", "Pose2d[]", "Pose3d[]", "Transform2d", "Transform3d"], options: { bumpers: "alliance color or NeonColors" } },
            { type: "ghost", description: "Ghost pose overlay", sources: ["Pose2d", "Pose3d", "Pose2d[]", "Pose3d[]"], options: { color: "NeonColors" } },
            { type: "vision", description: "Vision target (child of robot)", sources: ["Pose2d", "Pose3d", "Translation2d", "Translation3d"], options: { color: "NeonColors", size: "normal|bold" } },
            { type: "trajectory", description: "Path visualization", sources: ["Pose2d[]", "Trajectory", "DifferentialSample[]", "SwerveSample[]"], options: { color: "NeonColors", size: "normal|bold" } },
            { type: "heatmap", description: "Position heatmap", sources: ["Pose2d", "Pose3d", "Translation2d", "Translation3d"], options: { timeRange: "enabled|auto|teleop|teleop-no-endgame|full|visible" } },
            { type: "arrow", description: "Direction arrow", sources: ["Pose2d", "Pose3d", "Trajectory"], options: { position: "center|back|front" } },
            { type: "swerveStates", description: "Swerve module vectors (child of robot)", sources: ["SwerveModuleState[]"], options: { color: "NeonColors", arrangement: "FL/FR/BL/BR permutations" } },
            { type: "rotationOverride", description: "Rotation override (child of robot)", sources: ["Rotation2d", "Rotation3d"], options: {} },
          ],
        },
        {
          id: 3, name: "3D Field",
          controllerType: "SourceListState",
          description: "3D field visualization with CAD models, game pieces, and articulated robots",
          dataTypes: ["Pose2d", "Pose3d", "Transform2d", "Transform3d", "Translation2d", "Translation3d", "Rotation2d", "Rotation3d", "SwerveModuleState[]", "Mechanism2d", "Trajectory"],
          visualizationTypes: [
            { type: "robot", description: "Robot pose", sources: ["Pose2d", "Pose3d"], options: { bumpers: "alliance color or NeonColors" } },
            { type: "ghost", description: "Ghost pose overlay", sources: ["Pose2d", "Pose3d"], options: { color: "NeonColors" } },
            { type: "component", description: "Articulated 3D component (child of robot)", sources: ["Pose3d", "Pose3d[]"], options: {} },
            { type: "mechanism", description: "2D mechanism projection (child of robot)", sources: ["Mechanism2d"], options: { orientation: "XZ|YZ" } },
            { type: "cone", description: "Game piece - cone (2023)", sources: ["Pose3d", "Translation3d"], options: {} },
            { type: "cube", description: "Game piece - cube (2023)", sources: ["Pose3d", "Translation3d"], options: {} },
            { type: "note", description: "Game piece - note (2024)", sources: ["Pose3d", "Translation3d"], options: {} },
            { type: "axes", description: "Coordinate axes", sources: ["Pose2d", "Pose3d"], options: {} },
            { type: "cameraOverride", description: "Camera position override", sources: ["Pose2d", "Pose3d"], options: {} },
          ],
        },
        {
          id: 4, name: "Table",
          controllerType: "string[]",
          description: "Tabular view of value changes over time. Controller is an array of log field keys.",
          dataTypes: ["all types supported"],
          visualizationTypes: [],
        },
        {
          id: 5, name: "Console",
          controllerType: "string | null",
          description: "Console message viewer with warning/error highlighting. Controller is a single log field key.",
          dataTypes: ["String"],
          visualizationTypes: [],
        },
        {
          id: 6, name: "Statistics",
          controllerType: "SourceListState",
          description: "Statistical analysis with histograms (mean, median, std dev, percentiles)",
          dataTypes: ["Number"],
          visualizationTypes: [
            { type: "independent", description: "Independent measurement", sources: ["Number"], options: { color: "GraphColors" } },
            { type: "reference", description: "Reference measurement (parent)", sources: ["Number"], options: {} },
            { type: "relativeError", description: "Relative error (child of reference)", sources: ["Number"], options: { color: "GraphColors" } },
            { type: "absoluteError", description: "Absolute error (child of reference)", sources: ["Number"], options: { color: "GraphColors" } },
          ],
        },
        {
          id: 7, name: "Video",
          controllerType: "object",
          description: "Synchronized match video playback (local file, YouTube, or The Blue Alliance)",
          dataTypes: [],
          visualizationTypes: [],
        },
        {
          id: 8, name: "Joysticks",
          controllerType: "string[]",
          description: "Display up to 6 controller states. Controller is an array of 6 joystick layout names.",
          dataTypes: ["Joystick data (from WPILib/AdvantageKit logs)"],
          visualizationTypes: [],
        },
        {
          id: 9, name: "Swerve",
          controllerType: "SourceListState",
          description: "Swerve drive module vector display with velocity and rotation visualization",
          dataTypes: ["SwerveModuleState[]", "ChassisSpeeds", "Rotation2d", "Rotation3d"],
          visualizationTypes: [
            { type: "states", description: "Module states (velocity vectors)", sources: ["SwerveModuleState[]"], options: { color: "NeonColors", arrangement: "FL/FR/BL/BR|FR/FL/BR/BL|etc." } },
            { type: "chassisSpeeds", description: "Chassis speeds vector", sources: ["ChassisSpeeds"], options: { color: "NeonColors" } },
            { type: "rotation", description: "Robot rotation indicator", sources: ["Rotation2d", "Rotation3d"], options: {} },
          ],
        },
        {
          id: 10, name: "Mechanism",
          controllerType: "SourceListState",
          description: "WPILib Mechanism2d visualization (jointed mechanisms like arms, elevators)",
          dataTypes: ["Mechanism2d"],
          visualizationTypes: [
            { type: "mechanism", description: "Mechanism2d field", sources: ["Mechanism2d"], options: {} },
          ],
        },
        {
          id: 11, name: "Points",
          controllerType: "SourceListState",
          description: "2D scatter plot visualization for arbitrary point data",
          dataTypes: ["Translation2d", "Translation2d[]", "NumberArray"],
          visualizationTypes: [
            { type: "plus", description: "Plus marker", sources: ["Translation2d", "Translation2d[]", "NumberArray"], options: { size: "small|medium|large", groupSize: "0-9" } },
            { type: "cross", description: "Cross marker", sources: ["Translation2d", "Translation2d[]", "NumberArray"], options: { size: "small|medium|large", groupSize: "0-9" } },
            { type: "circle", description: "Circle marker", sources: ["Translation2d", "Translation2d[]", "NumberArray"], options: { size: "small|medium|large", groupSize: "0-9" } },
          ],
        },
        {
          id: 12, name: "Metadata",
          controllerType: "null",
          description: "Display log metadata key-value pairs. Supports side-by-side real vs replay comparison.",
          dataTypes: ["String metadata (/Metadata table or Logger.recordMetadata)"],
          visualizationTypes: [],
        },
      ];
      return {
        content: [{ type: "text" as const, text: JSON.stringify(tabTypeInfo, null, 2) }],
      };
    },
  );

  // ─── CREATE TOOLS ─────────────────────────────────────────────────

  server.tool(
    "create_field2d_config",
    "Create a new AdvantageScope 2D field asset config.json file",
    {
      base_dir: z.string().describe("Base assets directory to create the field in"),
      name: z.string().min(1).describe("Field display name (also used for directory name)"),
      is_ftc: z.boolean().describe("Whether this is an FTC field"),
      coordinate_system: z.enum(["wall-alliance", "wall-blue", "center-rotated", "center-red"]).describe("Coordinate system"),
      top_left: z.tuple([z.number(), z.number()]).describe("Top-left corner in image pixels [x, y]"),
      bottom_right: z.tuple([z.number(), z.number()]).describe("Bottom-right corner in image pixels [x, y]"),
      width_inches: z.number().positive().describe("Field width in inches"),
      height_inches: z.number().positive().describe("Field height in inches"),
      source_url: z.string().optional().describe("Source URL for the field image"),
    },
    async ({ base_dir, name, is_ftc, coordinate_system, top_left, bottom_right, width_inches, height_inches, source_url }) => {
      try {
        const config: Config2dField = {
          name,
          isFTC: is_ftc,
          coordinateSystem: coordinate_system,
          topLeft: top_left,
          bottomRight: bottom_right,
          widthInches: width_inches,
          heightInches: height_inches,
          ...(source_url ? { sourceUrl: source_url } : {}),
        };
        const filePath = assetConfigPath(base_dir, "Field2d", name);
        writeAssetConfig(filePath, config);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ created: filePath, config }, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "create_field3d_config",
    "Create a new AdvantageScope 3D field asset config.json file",
    {
      base_dir: z.string().describe("Base assets directory"),
      name: z.string().min(1).describe("Field display name"),
      is_ftc: z.boolean().describe("Whether this is an FTC field"),
      coordinate_system: z.enum(["wall-alliance", "wall-blue", "center-rotated", "center-red"]).describe("Coordinate system"),
      rotations: z.array(Config3dRotationSchema).optional().describe("Field model rotations"),
      position: z.tuple([z.number(), z.number(), z.number()]).optional().describe("Field model position [x, y, z] in meters"),
      width_inches: z.number().positive().describe("Field width in inches"),
      height_inches: z.number().positive().describe("Field height in inches"),
      default_origin: z.string().optional().describe("Default coordinate origin"),
      driver_stations: z.array(z.tuple([z.number(), z.number()])).optional().describe("Driver station positions"),
      game_pieces: z.array(Config3dFieldGamePieceSchema).optional().describe("Game piece definitions"),
      april_tags: z.array(Config3dFieldAprilTagSchema).optional().describe("AprilTag definitions"),
    },
    async ({ base_dir, name, is_ftc, coordinate_system, rotations, position, width_inches, height_inches, default_origin, driver_stations, game_pieces, april_tags }) => {
      try {
        const config: Config3dField = {
          name,
          isFTC: is_ftc,
          coordinateSystem: coordinate_system,
          rotations: rotations ?? [],
          position: position ?? [0, 0, 0],
          widthInches: width_inches,
          heightInches: height_inches,
          ...(default_origin ? { defaultOrigin: default_origin } : {}),
          driverStations: driver_stations ?? [],
          gamePieces: game_pieces ?? [],
          aprilTags: april_tags ?? [],
        };
        const filePath = assetConfigPath(base_dir, "Field3d", name);
        writeAssetConfig(filePath, config);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ created: filePath, config }, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "create_robot_config",
    "Create a new AdvantageScope 3D robot model config.json file",
    {
      base_dir: z.string().describe("Base assets directory"),
      name: z.string().min(1).describe("Robot model display name"),
      is_ftc: z.boolean().describe("Whether this is an FTC robot"),
      disable_simplification: z.boolean().optional().describe("Disable mesh simplification (default: false)"),
      rotations: z.array(Config3dRotationSchema).optional().describe("Robot model rotations"),
      position: z.tuple([z.number(), z.number(), z.number()]).optional().describe("Robot model position offset [x, y, z] in meters"),
      cameras: z.array(Config3dRobotCameraSchema).optional().describe("Camera definitions"),
      components: z.array(Config3dRobotComponentSchema).optional().describe("Articulated component definitions"),
    },
    async ({ base_dir, name, is_ftc, disable_simplification, rotations, position, cameras, components }) => {
      try {
        const config: Config3dRobot = {
          name,
          isFTC: is_ftc,
          disableSimplification: disable_simplification ?? false,
          rotations: rotations ?? [],
          position: position ?? [0, 0, 0],
          cameras: cameras ?? [],
          components: components ?? [],
        };
        const filePath = assetConfigPath(base_dir, "Robot", name);
        writeAssetConfig(filePath, config);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ created: filePath, config }, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "create_joystick_config",
    "Create a new AdvantageScope custom joystick config.json file",
    {
      base_dir: z.string().describe("Base assets directory"),
      name: z.string().min(1).describe("Joystick config display name"),
      components: z.array(ConfigJoystickComponentSchema).describe("Joystick input components (buttons, sticks, axes)"),
    },
    async ({ base_dir, name, components }) => {
      try {
        const config: ConfigJoystick = { name, components };
        const filePath = assetConfigPath(base_dir, "Joystick", name);
        writeAssetConfig(filePath, config);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ created: filePath, config }, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── MODIFY TOOLS ─────────────────────────────────────────────────

  server.tool(
    "update_asset_config",
    "Update fields in an existing AdvantageScope asset config.json file (merges with existing values)",
    {
      file_path: z.string().describe("Path to the asset config.json file"),
      updates: z.record(z.string(), z.unknown()).describe("Object with fields to update (merged with existing config)"),
    },
    async ({ file_path, updates }) => {
      try {
        const existing = readAssetConfig(file_path);
        const merged = { ...existing, ...updates };
        const assetType = inferAssetType(file_path);
        if (assetType) {
          const errors = validateAssetConfig(assetType, merged);
          if (errors.length > 0) {
            return {
              content: [{
                type: "text" as const,
                text: JSON.stringify({ valid: false, errors }, null, 2),
              }],
              isError: true,
            };
          }
        }
        writeAssetConfig(file_path, merged);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ updated: file_path, config: merged }, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── LAYOUT TOOLS ─────────────────────────────────────────────────

  server.tool(
    "get_layout",
    "Read an AdvantageScope layout/state JSON file and return its structure",
    {
      file_path: z.string().describe("Path to the AdvantageScope state JSON file"),
    },
    async ({ file_path }) => {
      try {
        const layout = readLayout(file_path);
        const summary = {
          hubs: layout.hubs.map((hub, i) => ({
            hub: i,
            window: { x: hub.x, y: hub.y, width: hub.width, height: hub.height },
            tabs: hub.state.tabs.tabs.map((tab, j) => ({
              index: j,
              type: tab.type,
              typeName: TAB_TYPE_NAMES[tab.type as TabType] ?? `Unknown(${tab.type})`,
              title: tab.title,
              selected: j === hub.state.tabs.selected,
            })),
          })),
          satellites: layout.satellites.length,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_tab",
    "Get full details of a specific tab in an AdvantageScope layout, including controller and renderer config",
    {
      file_path: z.string().describe("Path to the AdvantageScope state JSON file"),
      hub_index: z.number().int().min(0).optional().describe("Hub (window) index (default: 0)"),
      tab_index: z.number().int().min(0).describe("Tab index within the hub"),
    },
    async ({ file_path, hub_index, tab_index }) => {
      try {
        const layout = readLayout(file_path);
        const hi = hub_index ?? 0;
        if (hi >= layout.hubs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: hub index ${hi} out of range (${layout.hubs.length} hubs)` }],
            isError: true,
          };
        }
        const hub = layout.hubs[hi];
        if (tab_index >= hub.state.tabs.tabs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: tab index ${tab_index} out of range (${hub.state.tabs.tabs.length} tabs in hub ${hi})` }],
            isError: true,
          };
        }
        const tab = hub.state.tabs.tabs[tab_index];
        const result = {
          hub: hi,
          index: tab_index,
          type: tab.type,
          typeName: TAB_TYPE_NAMES[tab.type as TabType] ?? `Unknown(${tab.type})`,
          title: tab.title,
          selected: tab_index === hub.state.tabs.selected,
          controllerUUID: tab.controllerUUID,
          controlsHeight: tab.controlsHeight,
          controller: tab.controller,
          renderer: tab.renderer,
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "create_layout",
    "Create a new AdvantageScope layout/state JSON file with a default window and Documentation tab",
    {
      file_path: z.string().describe("Path for the new layout state JSON file"),
      width: z.number().positive().optional().describe("Window width in pixels (default: 1280)"),
      height: z.number().positive().optional().describe("Window height in pixels (default: 720)"),
    },
    async ({ file_path, width, height }) => {
      try {
        const layout = createEmptyLayout();
        if (width) layout.hubs[0].width = width;
        if (height) layout.hubs[0].height = height;
        writeLayout(file_path, layout);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ created: file_path, hubs: 1, tabs: 1 }, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "add_tab",
    "Add a new tab to an AdvantageScope layout with optional controller/renderer configuration",
    {
      file_path: z.string().describe("Path to the layout state JSON file"),
      hub_index: z.number().int().min(0).optional().describe("Hub (window) index to add the tab to (default: 0)"),
      tab_type: z.number().int().min(0).max(12).describe("Tab type ID (0=Documentation, 1=LineGraph, 2=Field2d, 3=Field3d, 4=Table, 5=Console, 6=Statistics, 7=Video, 8=Joysticks, 9=Swerve, 10=Mechanism, 11=Points, 12=Metadata)"),
      title: z.string().optional().describe("Tab title (defaults to tab type name)"),
      controller: z.record(z.string(), z.unknown()).optional().describe("Tab-specific controller configuration object"),
      renderer: z.record(z.string(), z.unknown()).optional().describe("Tab-specific renderer configuration object"),
    },
    async ({ file_path, hub_index, tab_type, title, controller, renderer }) => {
      try {
        const layout = readLayout(file_path);
        const idx = hub_index ?? 0;
        if (idx >= layout.hubs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: Hub index ${idx} out of range (${layout.hubs.length} hubs)` }],
            isError: true,
          };
        }
        const tab = createTab(tab_type as TabType, title);
        if (controller !== undefined) tab.controller = controller;
        if (renderer !== undefined) tab.renderer = renderer;
        layout.hubs[idx].state.tabs.tabs.push(tab);
        writeLayout(file_path, layout);
        const tabIndex = layout.hubs[idx].state.tabs.tabs.length - 1;
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              added: {
                hub: idx,
                tabIndex,
                type: tab_type,
                typeName: TAB_TYPE_NAMES[tab_type as TabType] ?? `Unknown(${tab_type})`,
                title: tab.title,
              },
            }, null, 2),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "update_tab",
    "Update properties of an existing tab in an AdvantageScope layout (title, controller, renderer). Controller and renderer objects are shallow-merged with existing values.",
    {
      file_path: z.string().describe("Path to the layout state JSON file"),
      hub_index: z.number().int().min(0).optional().describe("Hub (window) index (default: 0)"),
      tab_index: z.number().int().min(0).describe("Tab index to update"),
      title: z.string().optional().describe("New tab title"),
      controller: z.record(z.string(), z.unknown()).optional().describe("Controller properties to merge into existing controller config"),
      renderer: z.record(z.string(), z.unknown()).optional().describe("Renderer properties to merge into existing renderer config"),
    },
    async ({ file_path, hub_index, tab_index, title, controller, renderer }) => {
      try {
        const layout = readLayout(file_path);
        const hi = hub_index ?? 0;
        if (hi >= layout.hubs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: hub index ${hi} out of range (${layout.hubs.length} hubs)` }],
            isError: true,
          };
        }
        const tabs = layout.hubs[hi].state.tabs;
        if (tab_index >= tabs.tabs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: tab index ${tab_index} out of range (${tabs.tabs.length} tabs in hub ${hi})` }],
            isError: true,
          };
        }
        const tab = tabs.tabs[tab_index];
        if (title !== undefined) tab.title = title;
        if (controller !== undefined) {
          tab.controller = tab.controller && typeof tab.controller === "object" && !Array.isArray(tab.controller)
            ? { ...(tab.controller as Record<string, unknown>), ...controller }
            : controller;
        }
        if (renderer !== undefined) {
          tab.renderer = tab.renderer && typeof tab.renderer === "object" && !Array.isArray(tab.renderer)
            ? { ...(tab.renderer as Record<string, unknown>), ...renderer }
            : renderer;
        }
        writeLayout(file_path, layout);
        const result = {
          updated: {
            hub: hi,
            tabIndex: tab_index,
            type: tab.type,
            typeName: TAB_TYPE_NAMES[tab.type as TabType] ?? `Unknown(${tab.type})`,
            title: tab.title,
            controller: tab.controller,
            renderer: tab.renderer,
          },
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "remove_tab",
    "Remove a tab from an AdvantageScope layout by index",
    {
      file_path: z.string().describe("Path to the layout state JSON file"),
      hub_index: z.number().int().min(0).optional().describe("Hub (window) index (default: 0)"),
      tab_index: z.number().int().min(0).describe("Tab index to remove"),
    },
    async ({ file_path, hub_index, tab_index }) => {
      try {
        const layout = readLayout(file_path);
        const idx = hub_index ?? 0;
        if (idx >= layout.hubs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: Hub index ${idx} out of range (${layout.hubs.length} hubs)` }],
            isError: true,
          };
        }
        const tabs = layout.hubs[idx].state.tabs;
        if (tab_index >= tabs.tabs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: Tab index ${tab_index} out of range (${tabs.tabs.length} tabs)` }],
            isError: true,
          };
        }
        const removed = tabs.tabs.splice(tab_index, 1)[0];
        if (tabs.selected >= tabs.tabs.length) {
          tabs.selected = Math.max(0, tabs.tabs.length - 1);
        }
        writeLayout(file_path, layout);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              removed: {
                hub: idx,
                tabIndex: tab_index,
                type: removed.type,
                typeName: TAB_TYPE_NAMES[removed.type as TabType] ?? `Unknown(${removed.type})`,
                title: removed.title,
              },
              remainingTabs: tabs.tabs.length,
            }, null, 2),
          }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ─── PREFERENCES TOOLS ────────────────────────────────────────────

  server.tool(
    "get_preferences",
    "Read AdvantageScope preferences from a prefs.json file",
    {
      file_path: z.string().describe("Path to the AdvantageScope prefs.json file"),
    },
    async ({ file_path }) => {
      try {
        const prefs = readPreferences(file_path);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(prefs, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "update_preferences",
    "Update AdvantageScope preferences in a prefs.json file (merges with existing values)",
    {
      file_path: z.string().describe("Path to the AdvantageScope prefs.json file"),
      theme: z.enum(["light", "dark", "system"]).optional(),
      robot_address: z.string().optional().describe("Robot IP address (e.g., '10.71.60.2')"),
      remote_path: z.string().optional().describe("Remote log file path"),
      live_mode: z.enum(["nt4", "nt4-akit", "phoenix", "rlog", "ftcdashboard"]).optional(),
      live_subscribe_mode: z.enum(["low-bandwidth", "logging"]).optional(),
      live_discard: z.number().positive().optional().describe("Live data discard time in ms"),
      rlog_port: z.number().int().positive().optional(),
      coordinate_system: z.union([z.literal("automatic"), z.enum(["wall-alliance", "wall-blue", "center-rotated", "center-red"])]).optional(),
      field3d_mode_ac: z.enum(["cinematic", "standard", "low-power"]).optional(),
      field3d_antialiasing: z.boolean().optional(),
      tba_api_key: z.string().optional().describe("The Blue Alliance API key"),
      user_assets_folder: z.string().nullable().optional().describe("Custom assets folder path"),
    },
    async ({ file_path, theme, robot_address, remote_path, live_mode, live_subscribe_mode, live_discard, rlog_port, coordinate_system, field3d_mode_ac, field3d_antialiasing, tba_api_key, user_assets_folder }) => {
      try {
        const prefs = readPreferences(file_path);
        if (theme !== undefined) prefs.theme = theme;
        if (robot_address !== undefined) prefs.robotAddress = robot_address;
        if (remote_path !== undefined) prefs.remotePath = remote_path;
        if (live_mode !== undefined) prefs.liveMode = live_mode;
        if (live_subscribe_mode !== undefined) prefs.liveSubscribeMode = live_subscribe_mode;
        if (live_discard !== undefined) prefs.liveDiscard = live_discard;
        if (rlog_port !== undefined) prefs.rlogPort = rlog_port;
        if (coordinate_system !== undefined) prefs.coordinateSystem = coordinate_system;
        if (field3d_mode_ac !== undefined) prefs.field3dModeAc = field3d_mode_ac;
        if (field3d_antialiasing !== undefined) prefs.field3dAntialiasing = field3d_antialiasing;
        if (tba_api_key !== undefined) prefs.tbaApiKey = tba_api_key;
        if (user_assets_folder !== undefined) prefs.userAssetsFolder = user_assets_folder;

        const errors = validatePreferences(prefs);
        if (errors.length > 0) {
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ valid: false, errors }, null, 2),
            }],
            isError: true,
          };
        }

        writePreferences(file_path, prefs);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ updated: file_path, preferences: prefs }, null, 2) }],
        };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${(e as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  return server;
}
