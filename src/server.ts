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
  TAB_SOURCE_CONFIGS,
  SIMPLE_TAB_SCHEMAS,
  SOURCE_LIST_TAB_TYPES,
  validateSourceItem,
  validateParentChild,
  getSourcesArray,
  resolveLineGraphSection,
  GRAPH_COLOR_NAMES,
  NEON_COLOR_NAMES,
  SWERVE_ARRANGEMENT_NAMES,
  type SourceListItemState,
} from "./schema/source-types.js";
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
          configuration: {},
          notes: [],
        },
        {
          id: 1, name: "Line Graph",
          controllerType: "SourceListState",
          description: "Time-series line charts for numeric and discrete data. Supports integration, differentiation, and real-time alerts.",
          dataTypes: ["Number", "Raw", "Boolean", "String", "BooleanArray", "NumberArray", "StringArray", "Alerts"],
          visualizationTypes: [
            { type: "stepped", description: "Stepped line", sources: ["Number"], options: { color: "GraphColors", size: "normal|bold|verybold" } },
            { type: "smooth", description: "Smooth interpolated line", sources: ["Number"], options: { color: "GraphColors", size: "normal|bold|verybold" } },
            { type: "points", description: "Points only", sources: ["Number"], options: { color: "GraphColors", size: "normal|bold" } },
            { type: "stripes", description: "Discrete stripes", sources: ["Raw", "Boolean", "Number", "String", "BooleanArray", "NumberArray", "StringArray"], options: { color: "GraphColors" } },
            { type: "graph", description: "Discrete graph", sources: ["Raw", "Boolean", "Number", "String", "BooleanArray", "NumberArray", "StringArray"], options: { color: "GraphColors" } },
            { type: "alerts", description: "Alert display", sources: ["Alerts"], options: {} },
          ],
          configuration: {},
          notes: [
            "GraphColors: orange, yellow, green, blue, purple, brown, red, white, black",
            "Supports left and right Y-axis locking and zoom/pan",
            "Numeric sources support integration and differentiation transforms",
          ],
        },
        {
          id: 2, name: "2D Field",
          controllerType: "SourceListState",
          description: "2D field visualization with robot poses, trajectories, and heatmaps overlayed on a field map",
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
          configuration: {
            field: "Field image to use (all recent FRC and FTC games supported, or custom asset)",
            orientation: "Field image orientation in the viewer",
            size: "Robot side length: 30 inches, 27 inches, or 24 inches",
          },
          notes: [
            "Coordinate system is customizable via preferences (automatic, wall-alliance, wall-blue, center-rotated, center-red)",
            "Data should be published as byte-encoded struct or protobuf (legacy number arrays are deprecated)",
            "Some object types (vision, swerveStates, rotationOverride) must be added as children of a robot object",
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
          configuration: {
            field: "3D field model to use (all recent FRC and FTC games supported, or custom asset)",
            renderingMode: "cinematic (shadows, reflections), standard, or low-power",
          },
          notes: [
            "Rendering mode can be overridden for battery power via field3dModeBattery preference",
            "Camera modes: orbit field, orbit robot, driver station, fixed camera",
            "Supports antialiasing toggle via field3dAntialiasing preference",
            "Component models in robot assets are named model_0.glb, model_1.glb, etc.",
          ],
        },
        {
          id: 4, name: "Table",
          controllerType: "string[]",
          description: "Tabular view of value changes over time. Controller is an array of log field keys.",
          dataTypes: ["all types supported"],
          visualizationTypes: [],
          configuration: {},
          notes: [
            "Shows one row per value change (no duplicates)",
            "Click a row to select that timestamp (syncs across all tabs)",
          ],
        },
        {
          id: 5, name: "Console",
          controllerType: "string | null",
          description: "Console message viewer with warning/error highlighting, text filtering (supports ! exclusion), and text export.",
          dataTypes: ["String"],
          visualizationTypes: [],
          configuration: {},
          notes: [
            "Common fields: DSEvents, messages, /RealOutputs/Console, /ReplayOutputs/Console",
            "Filter supports ! prefix for exclusion (e.g., '!debug' hides debug messages)",
            "Warnings and errors are automatically highlighted",
            "Log content can be exported to a text file",
          ],
        },
        {
          id: 6, name: "Statistics",
          controllerType: "SourceListState",
          description: "Statistical analysis with histograms (mean, median, std dev, percentiles, skewness)",
          dataTypes: ["Number"],
          visualizationTypes: [
            { type: "independent", description: "Independent measurement", sources: ["Number"], options: { color: "GraphColors" } },
            { type: "reference", description: "Reference measurement (parent)", sources: ["Number"], options: {} },
            { type: "relativeError", description: "Relative error (child of reference)", sources: ["Number"], options: { color: "GraphColors" } },
            { type: "absoluteError", description: "Absolute error (child of reference)", sources: ["Number"], options: { color: "GraphColors" } },
          ],
          configuration: {
            timeRange: "Visible Range, Full Log, Enabled, Auto, Teleop, Teleop (No Endgame), Live: 30s, Live: 10s",
          },
          notes: [
            "Relative/absolute error sources must be children of a reference source",
            "Displays histogram, mean, median, standard deviation, percentiles, and skewness",
          ],
        },
        {
          id: 7, name: "Video",
          controllerType: "object",
          description: "Synchronized match video playback (local file, YouTube, or The Blue Alliance)",
          dataTypes: [],
          visualizationTypes: [],
          configuration: {
            source: "Local file path, YouTube URL, or The Blue Alliance match key",
          },
          notes: [
            "YouTube source requires a direct video URL",
            "The Blue Alliance source requires tbaApiKey in preferences",
            "Local file requires FFmpeg to be installed on the system",
            "Video is synchronized to the log timeline",
          ],
        },
        {
          id: 8, name: "Joysticks",
          controllerType: "string[]",
          description: "Display up to 6 controller states with button/axis visualization. Controller is an array of 6 joystick layout names.",
          dataTypes: ["Joystick data (from WPILib/AdvantageKit logs)"],
          visualizationTypes: [],
          configuration: {},
          notes: [
            "Joystick IDs range from 0 to 5, matching Driver Station and WPILib IDs",
            "WARNING: Joystick data is NOT available via a plain NetworkTables connection with stock WPILib",
            "Requires: WPILib log with joystick logging enabled, AdvantageKit logs, or AdvantageKit streaming",
            "Built-in layouts include Xbox Controller, PS4/PS5 Controller, and Generic Joystick (grid format)",
            "Custom joystick layouts can be added via custom assets (Joystick_{Name}/config.json)",
          ],
        },
        {
          id: 9, name: "Swerve",
          controllerType: "SourceListState",
          description: "Swerve drive module vector display showing velocity vectors, idle positions, robot rotation, and chassis speeds",
          dataTypes: ["SwerveModuleState[]", "ChassisSpeeds", "Rotation2d", "Rotation3d"],
          visualizationTypes: [
            { type: "states", description: "Module states (velocity vectors)", sources: ["SwerveModuleState[]"], options: { color: "NeonColors", arrangement: "FL/FR/BL/BR|FR/FL/BR/BL|etc." } },
            { type: "chassisSpeeds", description: "Chassis speeds vector (displayed in center)", sources: ["ChassisSpeeds"], options: { color: "NeonColors" } },
            { type: "rotation", description: "Robot rotation indicator (rotates the diagram)", sources: ["Rotation2d", "Rotation3d"], options: {} },
          ],
          configuration: {
            maxSpeed: "Maximum achievable module speed (adjusts vector sizing)",
            frameSize: "Distances between left-right and front-back modules (changes robot diagram aspect ratio)",
            orientation: "Direction the robot diagram is pointed (useful to align with pose data or match videos)",
          },
          notes: [
            "Data must be published as byte-encoded struct or protobuf (legacy number arrays are deprecated)",
            "SwerveModuleState[] requires exactly 4 module states",
          ],
        },
        {
          id: 10, name: "Mechanism",
          controllerType: "SourceListState",
          description: "WPILib Mechanism2d visualization for jointed mechanisms (arms, elevators, wrists, intakes)",
          dataTypes: ["Mechanism2d"],
          visualizationTypes: [
            { type: "mechanism", description: "Mechanism2d field", sources: ["Mechanism2d"], options: {} },
          ],
          configuration: {},
          notes: [
            "Publish via SmartDashboard.putData('MyMech', mechanism) or Logger.recordOutput('MyMech', mechanism)",
            "Mechanism2d must be recorded every loop cycle as it captures current state only",
            "Supports multiple mechanisms displayed simultaneously",
          ],
        },
        {
          id: 11, name: "Points",
          controllerType: "SourceListState",
          description: "2D scatter plot visualization for arbitrary point data (vision pipelines, mechanism states, custom visualizations)",
          dataTypes: ["Translation2d", "Translation2d[]", "NumberArray"],
          visualizationTypes: [
            { type: "plus", description: "Plus marker", sources: ["Translation2d", "Translation2d[]", "NumberArray"], options: { size: "small|medium|large", groupSize: "0-9" } },
            { type: "cross", description: "Cross marker", sources: ["Translation2d", "Translation2d[]", "NumberArray"], options: { size: "small|medium|large", groupSize: "0-9" } },
            { type: "circle", description: "Circle marker", sources: ["Translation2d", "Translation2d[]", "NumberArray"], options: { size: "small|medium|large", groupSize: "0-9" } },
          ],
          configuration: {
            dimensions: "Size of the display area (use units matching published points; for vision data, use camera resolution)",
            orientation: "Coordinate system (orientation of X and Y axes)",
            origin: "Position of the origin in the coordinate system",
          },
          notes: [
            "Data should be published as byte-encoded struct (Translation2d[])",
            "Symbol, color, and size can be customized per source",
            "Very flexible — use for custom visualizations of vision data, mechanism states, etc.",
          ],
        },
        {
          id: 12, name: "Metadata",
          controllerType: "null",
          description: "Display log metadata key-value pairs. Supports side-by-side real vs replay comparison.",
          dataTypes: ["String metadata (/Metadata table or Logger.recordMetadata)"],
          visualizationTypes: [],
          configuration: {},
          notes: [
            "Data source: /Metadata table (NetworkTables or DataLog) or Logger.recordMetadata() (AdvantageKit)",
            "Useful for recording build info, Git commit hashes, configuration parameters, etc.",
          ],
        },
      ];
      return {
        content: [{ type: "text" as const, text: JSON.stringify(tabTypeInfo, null, 2) }],
      };
    },
  );

  server.tool(
    "get_tab_type_schema",
    "Get the full schema for a specific AdvantageScope tab type, including controller format, valid source types with options, parent/child relationships, and WPILib code hints for publishing data",
    {
      tab_type: z.number().int().min(0).max(12).describe("Tab type ID (0=Documentation, 1=LineGraph, 2=Field2d, 3=Field3d, 4=Table, 5=Console, 6=Statistics, 7=Video, 8=Joysticks, 9=Swerve, 10=Mechanism, 11=Points, 12=Metadata)"),
    },
    async ({ tab_type }) => {
      // Check if it's a SourceListState tab
      const sourceConfig = TAB_SOURCE_CONFIGS.get(tab_type);
      if (sourceConfig) {
        // Build controller format description based on actual state shape
        let controllerFormat: string;
        let controllerShape: Record<string, string> | undefined;

        if (sourceConfig.sections) {
          controllerFormat = "Object with multiple source arrays (see controllerShape)";
          controllerShape = {};
          for (const section of sourceConfig.sections) {
            controllerShape[section.key] = `SourceListItemState[] — ${section.description}`;
          }
          // Add LineGraph-specific fields
          if (sourceConfig.tabType === 1) {
            controllerShape.leftLockedRange = "[number, number] | null — locked Y-axis range for left axis";
            controllerShape.rightLockedRange = "[number, number] | null — locked Y-axis range for right axis";
            controllerShape.leftUnitConversion = "object — unit conversion for left axis";
            controllerShape.rightUnitConversion = "object — unit conversion for right axis";
            controllerShape.leftFilter = "string — filter for left axis ('none', 'differentiate', 'integrate')";
            controllerShape.rightFilter = "string — filter for right axis";
          }
        } else if (sourceConfig.sourcesPath === null) {
          controllerFormat = "SourceListItemState[] — controller IS the flat array";
        } else {
          controllerFormat = `Object with '${sourceConfig.sourcesPath}' array (see controllerShape)`;
          controllerShape = { [sourceConfig.sourcesPath]: "SourceListItemState[]" };
          // Add tab-specific config fields
          if (sourceConfig.tabType === 2) {
            controllerShape.field = "string — field image name (e.g., 'FRC:2026 Field')";
            controllerShape.orientation = "number — field orientation (0=default)";
            controllerShape.size = "string — robot size display ('large', 'medium', 'small')";
          } else if (sourceConfig.tabType === 3) {
            controllerShape.game = "string — 3D field model name";
          } else if (sourceConfig.tabType === 6) {
            controllerShape.timeRange = "string — time range for statistics";
            controllerShape.rangeMin = "number — histogram range minimum";
            controllerShape.rangeMax = "number — histogram range maximum";
            controllerShape.stepSize = "number — histogram step size";
          } else if (sourceConfig.tabType === 9) {
            controllerShape.maxSpeed = "number — max module speed (for vector sizing)";
            controllerShape.sizeX = "number — left-right module distance";
            controllerShape.sizeY = "number — front-back module distance";
            controllerShape.orientation = "number — diagram orientation (0=up, 1=right, 2=down, 3=left)";
          } else if (sourceConfig.tabType === 11) {
            controllerShape.width = "number — display area width";
            controllerShape.height = "number — display area height";
            controllerShape.orientation = "string — coordinate system orientation";
            controllerShape.origin = "string — origin position";
          }
        }

        // Build color reference for types that use colors
        const colorReference: Record<string, Record<string, string>> = {};
        const hasGraphColors = sourceConfig.types.some(
          (t) => t.options.some((o) => o.key === "color" && o.values.includes("#2b66a2")),
        );
        const hasNeonColors = sourceConfig.types.some(
          (t) => t.options.some((o) => o.key === "color" && o.values.includes("#00ff00")),
        );
        if (hasGraphColors) colorReference.graphColors = GRAPH_COLOR_NAMES;
        if (hasNeonColors) colorReference.neonColors = NEON_COLOR_NAMES;

        // Build arrangement reference for swerve tabs
        const hasSwerveArrangements = sourceConfig.types.some(
          (t) => t.options.some((o) => o.key === "arrangement"),
        );

        const schema = {
          tabType: sourceConfig.tabType,
          tabName: sourceConfig.tabName,
          controllerFormat,
          ...(controllerShape ? { controllerShape } : {}),
          sectionTitle: sourceConfig.sectionTitle,
          ...(sourceConfig.sections ? {
            sections: sourceConfig.sections.map((s) => ({
              key: s.key,
              display: s.display,
              description: s.description,
            })),
            typeSections: sourceConfig.typeSections,
          } : {}),
          sourceItemFormat: {
            type: "string — visualization type key (see 'types' below)",
            logKey: "string — log field path (e.g., '/RealOutputs/Drive/Pose')",
            logType: "string — data type (must match one of the sourceTypes for the chosen type)",
            visible: "boolean — whether this source is shown",
            options: "object — key/value pairs with hex color values and enum strings (see type-specific options below)",
            children: "SourceListItemState[] (optional) — nested child sources (used by 3D field robot/ghost for components, cameras, etc.)",
          },
          types: sourceConfig.types.map((t) => ({
            key: t.key,
            display: t.display,
            sourceTypes: t.sourceTypes,
            options: t.options.map((o) => ({
              key: o.key,
              display: o.display,
              values: o.values,
            })),
            ...(t.childOf ? { childOf: t.childOf, note: `Must be added as child of a '${t.childOf}' parent source` } : {}),
            ...(t.parentKey ? { parentKey: t.parentKey, note: "Can have child sources attached" } : {}),
          })),
          ...(Object.keys(colorReference).length > 0 ? {
            colorReference,
            colorNote: "Any valid hex color (#RRGGBB) is accepted. The preset colors above are suggestions for consistency.",
          } : {}),
          ...(hasSwerveArrangements ? {
            arrangementReference: SWERVE_ARRANGEMENT_NAMES,
            arrangementNote: "Arrangement values are stored as index strings (e.g., '0,1,2,3'). The reference shows the module order each value represents.",
          } : {}),
          wpilibHints: sourceConfig.wpilibHints,
          supportsSourceManagement: true,
          note: sourceConfig.sections
            ? "Use add_source with 'section' parameter to target left/right/discrete. Use update_source/remove_source with 'section' to modify."
            : "Use add_source, update_source, remove_source tools to manage sources on this tab type.",
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(schema, null, 2) }],
        };
      }

      // Check simple tab schemas
      const simpleConfig = SIMPLE_TAB_SCHEMAS.get(tab_type);
      if (simpleConfig) {
        const schema = {
          tabType: simpleConfig.tabType,
          tabName: simpleConfig.tabName,
          controllerFormat: simpleConfig.controllerFormat,
          description: simpleConfig.description,
          wpilibHints: simpleConfig.wpilibHints,
          supportsSourceManagement: false,
          note: "This tab type does not use SourceListState. Use add_tab/update_tab with the controller format described above.",
        };
        return {
          content: [{ type: "text" as const, text: JSON.stringify(schema, null, 2) }],
        };
      }

      return {
        content: [{ type: "text" as const, text: `Error: Unknown tab type ${tab_type}` }],
        isError: true,
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

  // ─── SOURCE MANAGEMENT TOOLS ─────────────────────────────────────

  server.tool(
    "add_source",
    "Add a data source to a SourceListState tab (LineGraph, Field2d, Field3d, Statistics, Swerve, Mechanism, Points). Validates type, logType, and options against AdvantageScope's actual schema. For LineGraph, use the 'section' parameter to target left axis, right axis, or discrete fields.",
    {
      file_path: z.string().describe("Path to the layout state JSON file"),
      hub_index: z.number().int().min(0).optional().describe("Hub (window) index (default: 0)"),
      tab_index: z.number().int().min(0).describe("Tab index within the hub"),
      type: z.string().describe("Visualization type key (e.g., 'stepped', 'robot', 'states'). Use get_tab_type_schema to see valid types."),
      log_key: z.string().describe("Log field path (e.g., '/RealOutputs/Drive/Pose')"),
      log_type: z.string().describe("Data type string (e.g., 'Number', 'Pose2d', 'SwerveModuleState[]'). Must match one of the sourceTypes for the chosen type."),
      visible: z.boolean().optional().describe("Whether this source is visible (default: true)"),
      options: z.record(z.string(), z.string()).optional().describe("Type-specific display options. Colors are hex values (e.g., {color: '#2b66a2', size: 'bold'})"),
      section: z.string().optional().describe("LineGraph only: which section to add to ('leftSources', 'rightSources', or 'discreteSources'). Auto-detected from type if omitted."),
      parent_index: z.number().int().min(0).optional().describe("For 3D Field child sources (component, swerveStates, vision, etc.): index of the parent source (robot/ghost) to nest this child under. The child will be added to the parent's 'children' array."),
    },
    async ({ file_path, hub_index, tab_index, type, log_key, log_type, visible, options, section, parent_index }) => {
      try {
        const layout = readLayout(file_path);
        const hi = hub_index ?? 0;
        if (hi >= layout.hubs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: hub index ${hi} out of range (${layout.hubs.length} hubs)` }],
            isError: true,
          };
        }
        const tab = layout.hubs[hi].state.tabs.tabs[tab_index];
        if (!tab) {
          return {
            content: [{ type: "text" as const, text: `Error: tab index ${tab_index} out of range` }],
            isError: true,
          };
        }

        if (!SOURCE_LIST_TAB_TYPES.has(tab.type)) {
          const tabName = TAB_TYPE_NAMES[tab.type as TabType] ?? `Unknown(${tab.type})`;
          return {
            content: [{ type: "text" as const, text: `Error: Tab type "${tabName}" (${tab.type}) does not use SourceListState controller. Use update_tab for this tab type.` }],
            isError: true,
          };
        }

        const newSource: SourceListItemState = {
          type,
          logKey: log_key,
          logType: log_type,
          visible: visible ?? true,
          options: options ?? {},
        };

        // Validate the source against the tab's schema
        const errors = validateSourceItem(tab.type, newSource);
        if (errors.length > 0) {
          return {
            content: [{ type: "text" as const, text: `Validation errors:\n${errors.join("\n")}` }],
            isError: true,
          };
        }

        // Resolve section for LineGraph
        let resolvedSection: string | undefined;
        if (tab.type === 1) {
          resolvedSection = resolveLineGraphSection(type, section);
        }

        // Initialize controller if needed
        const config = TAB_SOURCE_CONFIGS.get(tab.type)!;
        if (config.sections && (tab.controller === null || tab.controller === undefined)) {
          tab.controller = {};
        } else if (config.sourcesPath !== null && (tab.controller === null || tab.controller === undefined)) {
          tab.controller = {};
        } else if (config.sourcesPath === null && !config.sections && !Array.isArray(tab.controller)) {
          tab.controller = [];
        }

        // Navigate to the correct sources array
        const { sources } = getSourcesArray(tab.controller, tab.type, resolvedSection);

        // Validate parent/child relationship against all sources in the section
        const parentError = validateParentChild(tab.type, sources, type);
        if (parentError && parent_index === undefined) {
          return {
            content: [{ type: "text" as const, text: `Warning: ${parentError}` }],
            isError: true,
          };
        }

        // Add the source — either as a child of a parent or at the top level
        if (parent_index !== undefined) {
          // Adding as a child of an existing parent source
          if (parent_index >= sources.length) {
            return {
              content: [{ type: "text" as const, text: `Error: parent_index ${parent_index} out of range (${sources.length} sources)` }],
              isError: true,
            };
          }
          const parentSource = sources[parent_index] as SourceListItemState;
          if (!parentSource.children) {
            parentSource.children = [];
          }
          parentSource.children.push(newSource);

          // For Mechanism (flat array), set controller directly
          if (config.sourcesPath === null && !config.sections) {
            tab.controller = sources;
          }

          writeLayout(file_path, layout);

          const childIndex = parentSource.children.length - 1;
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                added: {
                  hub: hi,
                  tabIndex: tab_index,
                  parentIndex: parent_index,
                  childIndex,
                  source: newSource,
                },
              }, null, 2),
            }],
          };
        }

        // Top-level add
        sources.push(newSource);

        // For Mechanism (flat array), we need to set controller directly
        if (config.sourcesPath === null && !config.sections) {
          tab.controller = sources;
        }

        writeLayout(file_path, layout);

        const sourceIndex = sources.length - 1;
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              added: {
                hub: hi,
                tabIndex: tab_index,
                ...(resolvedSection ? { section: resolvedSection } : {}),
                sourceIndex,
                source: newSource,
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
    "update_source",
    "Update an existing data source in a SourceListState tab by index. Can change type, logKey, logType, visibility, and options. For LineGraph, specify the section containing the source.",
    {
      file_path: z.string().describe("Path to the layout state JSON file"),
      hub_index: z.number().int().min(0).optional().describe("Hub (window) index (default: 0)"),
      tab_index: z.number().int().min(0).describe("Tab index within the hub"),
      source_index: z.number().int().min(0).describe("Source index within the section's source list"),
      section: z.string().optional().describe("LineGraph only: section containing the source ('leftSources', 'rightSources', or 'discreteSources'). Required for LineGraph tabs."),
      type: z.string().optional().describe("New visualization type key"),
      log_key: z.string().optional().describe("New log field path"),
      log_type: z.string().optional().describe("New data type string"),
      visible: z.boolean().optional().describe("New visibility state"),
      options: z.record(z.string(), z.string()).optional().describe("Options to merge into existing options (hex colors, e.g., '#2b66a2')"),
      parent_index: z.number().int().min(0).optional().describe("If targeting a child source nested under a parent (e.g., 3D Field component under a robot), specify the parent's index here. source_index then refers to the child index within that parent's children array."),
    },
    async ({ file_path, hub_index, tab_index, source_index, section, type, log_key, log_type, visible, options, parent_index }) => {
      try {
        const layout = readLayout(file_path);
        const hi = hub_index ?? 0;
        if (hi >= layout.hubs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: hub index ${hi} out of range (${layout.hubs.length} hubs)` }],
            isError: true,
          };
        }
        const tab = layout.hubs[hi].state.tabs.tabs[tab_index];
        if (!tab) {
          return {
            content: [{ type: "text" as const, text: `Error: tab index ${tab_index} out of range` }],
            isError: true,
          };
        }

        if (!SOURCE_LIST_TAB_TYPES.has(tab.type)) {
          return {
            content: [{ type: "text" as const, text: `Error: Tab type ${tab.type} does not use SourceListState controller` }],
            isError: true,
          };
        }

        // LineGraph requires section
        const config = TAB_SOURCE_CONFIGS.get(tab.type)!;
        if (config.sections && !section) {
          return {
            content: [{ type: "text" as const, text: `Error: LineGraph requires 'section' parameter ('leftSources', 'rightSources', or 'discreteSources')` }],
            isError: true,
          };
        }

        const { sources } = getSourcesArray(tab.controller, tab.type, section);

        // Resolve the target source — either top-level or a child
        let source: SourceListItemState;
        if (parent_index !== undefined) {
          if (parent_index >= sources.length) {
            return {
              content: [{ type: "text" as const, text: `Error: parent_index ${parent_index} out of range (${sources.length} sources${section ? ` in ${section}` : ""})` }],
              isError: true,
            };
          }
          const parentSource = sources[parent_index] as SourceListItemState;
          const children = parentSource.children ?? [];
          if (source_index >= children.length) {
            return {
              content: [{ type: "text" as const, text: `Error: child source_index ${source_index} out of range (${children.length} children in parent ${parent_index})` }],
              isError: true,
            };
          }
          source = children[source_index];
        } else {
          if (source_index >= sources.length) {
            return {
              content: [{ type: "text" as const, text: `Error: source index ${source_index} out of range (${sources.length} sources${section ? ` in ${section}` : ""})` }],
              isError: true,
            };
          }
          source = sources[source_index];
        }
        if (type !== undefined) source.type = type;
        if (log_key !== undefined) source.logKey = log_key;
        if (log_type !== undefined) source.logType = log_type;
        if (visible !== undefined) source.visible = visible;
        if (options !== undefined) source.options = { ...source.options, ...options };

        // Validate the updated source
        const errors = validateSourceItem(tab.type, source);
        if (errors.length > 0) {
          return {
            content: [{ type: "text" as const, text: `Validation errors:\n${errors.join("\n")}` }],
            isError: true,
          };
        }

        writeLayout(file_path, layout);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              updated: {
                hub: hi,
                tabIndex: tab_index,
                ...(section ? { section } : {}),
                ...(parent_index !== undefined ? { parentIndex: parent_index } : {}),
                sourceIndex: source_index,
                source,
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
    "remove_source",
    "Remove a data source from a SourceListState tab by index. For LineGraph, specify the section.",
    {
      file_path: z.string().describe("Path to the layout state JSON file"),
      hub_index: z.number().int().min(0).optional().describe("Hub (window) index (default: 0)"),
      tab_index: z.number().int().min(0).describe("Tab index within the hub"),
      source_index: z.number().int().min(0).describe("Source index to remove"),
      section: z.string().optional().describe("LineGraph only: section containing the source ('leftSources', 'rightSources', or 'discreteSources'). Required for LineGraph tabs."),
      parent_index: z.number().int().min(0).optional().describe("If removing a child source nested under a parent (e.g., 3D Field component under a robot), specify the parent's index here. source_index then refers to the child index within that parent's children array."),
    },
    async ({ file_path, hub_index, tab_index, source_index, section, parent_index }) => {
      try {
        const layout = readLayout(file_path);
        const hi = hub_index ?? 0;
        if (hi >= layout.hubs.length) {
          return {
            content: [{ type: "text" as const, text: `Error: hub index ${hi} out of range (${layout.hubs.length} hubs)` }],
            isError: true,
          };
        }
        const tab = layout.hubs[hi].state.tabs.tabs[tab_index];
        if (!tab) {
          return {
            content: [{ type: "text" as const, text: `Error: tab index ${tab_index} out of range` }],
            isError: true,
          };
        }

        if (!SOURCE_LIST_TAB_TYPES.has(tab.type)) {
          return {
            content: [{ type: "text" as const, text: `Error: Tab type ${tab.type} does not use SourceListState controller` }],
            isError: true,
          };
        }

        // LineGraph requires section
        const config = TAB_SOURCE_CONFIGS.get(tab.type)!;
        if (config.sections && !section) {
          return {
            content: [{ type: "text" as const, text: `Error: LineGraph requires 'section' parameter ('leftSources', 'rightSources', or 'discreteSources')` }],
            isError: true,
          };
        }

        const { sources } = getSourcesArray(tab.controller, tab.type, section);

        let removed: SourceListItemState;
        let remainingCount: number;

        if (parent_index !== undefined) {
          if (parent_index >= sources.length) {
            return {
              content: [{ type: "text" as const, text: `Error: parent_index ${parent_index} out of range (${sources.length} sources${section ? ` in ${section}` : ""})` }],
              isError: true,
            };
          }
          const parentSource = sources[parent_index] as SourceListItemState;
          const children = parentSource.children ?? [];
          if (source_index >= children.length) {
            return {
              content: [{ type: "text" as const, text: `Error: child source_index ${source_index} out of range (${children.length} children in parent ${parent_index})` }],
              isError: true,
            };
          }
          removed = children.splice(source_index, 1)[0];
          remainingCount = children.length;
          if (children.length === 0) {
            delete parentSource.children;
          }
        } else {
          if (source_index >= sources.length) {
            return {
              content: [{ type: "text" as const, text: `Error: source index ${source_index} out of range (${sources.length} sources${section ? ` in ${section}` : ""})` }],
              isError: true,
            };
          }
          removed = sources.splice(source_index, 1)[0];
          remainingCount = sources.length;
        }

        // For Mechanism (flat array), set controller directly
        if (config.sourcesPath === null && !config.sections) {
          tab.controller = sources;
        }

        writeLayout(file_path, layout);

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              removed: {
                hub: hi,
                tabIndex: tab_index,
                ...(section ? { section } : {}),
                ...(parent_index !== undefined ? { parentIndex: parent_index } : {}),
                sourceIndex: source_index,
                source: removed,
              },
              remainingSources: remainingCount,
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
