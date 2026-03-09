/**
 * Source type configurations for AdvantageScope tabs that use SourceListState controllers.
 * Derived from AdvantageScope's actual *_Config.ts files in src/hub/controllers/.
 *
 * These define what visualization types each tab supports, what data types (logType)
 * each visualization accepts, what options are available, and parent/child relationships.
 */

// ─── Option value definitions ────────────────────────────────────

export const GRAPH_COLORS = [
  "#2b66a2", "#e5b31b", "#af2437", "#80588e", "#e48b32",
  "#c0b487", "#858584", "#3b875a", "#d993aa", "#5f4528",
] as const;

export const GRAPH_COLOR_NAMES: Record<string, string> = {
  "#2b66a2": "Blue", "#e5b31b": "Gold", "#af2437": "Red",
  "#80588e": "Purple", "#e48b32": "Orange", "#c0b487": "Tan",
  "#858584": "Gray", "#3b875a": "Green", "#d993aa": "Pink",
  "#5f4528": "Brown",
};

export const NEON_COLORS = [
  "#00ff00", "#ff0000", "#0000ff", "#ff8c00", "#00ffff", "#ffff00", "#ff00ff",
] as const;

export const NEON_COLOR_NAMES: Record<string, string> = {
  "#00ff00": "Green", "#ff0000": "Red", "#0000ff": "Blue",
  "#ff8c00": "Orange", "#00ffff": "Cyan", "#ffff00": "Yellow",
  "#ff00ff": "Magenta",
};

export const NEON_COLORS_RED_START = [
  "#ff0000", "#0000ff", "#00ff00", "#ff8c00", "#00ffff", "#ffff00", "#ff00ff",
] as const;

export const SWERVE_ARRANGEMENTS = [
  "0,1,2,3", "1,0,3,2", "0,1,3,2",
  "0,3,1,2", "3,0,2,1", "1,0,2,3",
] as const;

export const SWERVE_ARRANGEMENT_NAMES: Record<string, string> = {
  "0,1,2,3": "FL/FR/BL/BR",
  "1,0,3,2": "FR/FL/BR/BL",
  "0,1,3,2": "FL/FR/BR/BL",
  "0,3,1,2": "FL/BL/BR/FR",
  "3,0,2,1": "FR/BR/BL/FL",
  "1,0,2,3": "FR/FL/BL/BR",
};

// ─── Types ───────────────────────────────────────────────────────

export interface SourceTypeOption {
  key: string;
  display: string;
  values: readonly string[];
}

export interface SourceTypeConfig {
  key: string;
  display: string;
  sourceTypes: readonly string[];
  options: SourceTypeOption[];
  /** If set, this source must be a child of a source with this parentKey */
  childOf?: string;
  /** If set, this source can be a parent that children reference */
  parentKey?: string;
  /** Whether this type uses the deprecated NumberArray format */
  legacy?: boolean;
}

export interface TabSourceConfig {
  /** Tab type ID (matches TabType enum) */
  tabType: number;
  /** Tab type display name */
  tabName: string;
  /** Section title (e.g., "Sources", "Poses", "Measurements") */
  sectionTitle: string;
  /** Property path to the sources array within the controller object (null = controller IS the array) */
  sourcesPath: string | null;
  /** For tabs with multiple source sections (e.g., LineGraph), lists the section keys */
  sections?: { key: string; display: string; description: string }[];
  /** All valid source types for this tab */
  types: SourceTypeConfig[];
  /** Which sections each type belongs to (only for multi-section tabs) */
  typeSections?: Record<string, string>;
  /** WPILib/AdvantageKit code hints for publishing data */
  wpilibHints: string[];
}

// ─── Tab type IDs that use SourceListState ────────────────────────

export const SOURCE_LIST_TAB_TYPES = new Set([1, 2, 3, 6, 9, 10, 11]);

// ─── Thickness values ────────────────────────────────────────────

const THICKNESS_OPTIONS: SourceTypeOption = {
  key: "size", display: "Thickness",
  values: ["normal", "bold", "verybold"],
};

const SIZE_NORMAL_BOLD: SourceTypeOption = {
  key: "size", display: "Thickness",
  values: ["normal", "bold"],
};

const POINT_SIZE: SourceTypeOption = {
  key: "size", display: "Size",
  values: ["medium", "large", "small"],
};

const GROUP_SIZE: SourceTypeOption = {
  key: "groupSize", display: "Group Size",
  values: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
};

const COMPONENT_OPTION: SourceTypeOption = {
  key: "component", display: "Component",
  values: ["x", "y"],
};

const ARROW_POSITION: SourceTypeOption = {
  key: "position", display: "Position",
  values: ["center", "back", "front"],
};

const TIME_RANGE: SourceTypeOption = {
  key: "timeRange", display: "Time Range",
  values: ["enabled", "auto", "teleop", "teleop-no-endgame", "full", "visible"],
};

const COLOR_GRAPH: SourceTypeOption = {
  key: "color", display: "Color",
  values: [...GRAPH_COLORS],
};

const COLOR_NEON: SourceTypeOption = {
  key: "color", display: "Color",
  values: [...NEON_COLORS],
};

const COLOR_NEON_RED_START: SourceTypeOption = {
  key: "color", display: "Color",
  values: [...NEON_COLORS_RED_START],
};

const BUMPERS_OPTION: SourceTypeOption = {
  key: "bumpers", display: "Bumpers",
  values: ["", ...NEON_COLORS], // "" = Alliance Color
};

const SWERVE_ARRANGEMENT: SourceTypeOption = {
  key: "arrangement", display: "Arrangement",
  values: [...SWERVE_ARRANGEMENTS],
};

const MECHANISM_PLANE: SourceTypeOption = {
  key: "plane", display: "Plane",
  values: ["xz", "yz"],
};

// ─── Shared geometry source types ────────────────────────────────

const POSE_TYPES = [
  "Pose2d", "Pose3d", "Pose2d[]", "Pose3d[]",
  "Transform2d", "Transform3d", "Transform2d[]", "Transform3d[]",
] as const;

const TRANSLATION_TYPES = [
  "Translation2d", "Translation3d", "Translation2d[]", "Translation3d[]",
] as const;

const ALL_GEOMETRY_TYPES = [...POSE_TYPES, ...TRANSLATION_TYPES] as const;

const TRAJECTORY_TYPES = [
  "Pose2d[]", "Pose3d[]", "Transform2d[]", "Transform3d[]",
  "Translation2d[]", "Translation3d[]",
  "Trajectory", "DifferentialSample[]", "SwerveSample[]",
] as const;

const DISCRETE_TYPES = [
  "Raw", "Boolean", "Number", "String",
  "BooleanArray", "NumberArray", "StringArray",
] as const;

// ─── Per-tab source configurations ───────────────────────────────

export const LINE_GRAPH_CONFIG: TabSourceConfig = {
  tabType: 1,
  tabName: "Line Graph",
  sectionTitle: "Sources",
  sourcesPath: null, // special: uses sections
  sections: [
    { key: "leftSources", display: "Left Axis", description: "Numeric sources displayed on the left Y-axis" },
    { key: "rightSources", display: "Right Axis", description: "Numeric sources displayed on the right Y-axis" },
    { key: "discreteSources", display: "Discrete Fields", description: "Discrete (non-numeric) sources displayed as stripes/graphs below the chart" },
  ],
  typeSections: {
    stepped: "leftSources",   // default; can also go to rightSources
    smooth: "leftSources",
    points: "leftSources",
    stripes: "discreteSources",
    graph: "discreteSources",
    alerts: "discreteSources",
  },
  types: [
    // Numeric axis
    {
      key: "stepped", display: "Stepped",
      sourceTypes: ["Number"],
      options: [COLOR_GRAPH, THICKNESS_OPTIONS],
    },
    {
      key: "smooth", display: "Smooth",
      sourceTypes: ["Number"],
      options: [COLOR_GRAPH, THICKNESS_OPTIONS],
    },
    {
      key: "points", display: "Points",
      sourceTypes: ["Number"],
      options: [COLOR_GRAPH, { key: "size", display: "Size", values: ["normal", "bold"] }],
    },
    // Discrete fields
    {
      key: "stripes", display: "Stripes",
      sourceTypes: [...DISCRETE_TYPES],
      options: [COLOR_GRAPH],
    },
    {
      key: "graph", display: "Graph",
      sourceTypes: [...DISCRETE_TYPES],
      options: [COLOR_GRAPH],
    },
    {
      key: "alerts", display: "Alerts",
      sourceTypes: ["Alerts"],
      options: [],
    },
  ],
  wpilibHints: [
    "Numeric: Any NetworkTables number field. Use DoublePublisher or SmartDashboard.putNumber().",
    "Boolean: BooleanPublisher or SmartDashboard.putBoolean().",
    "Alerts: Use WPILib's Alert class or publish StringArray with AdvantageKit Logger.recordOutput().",
    "All int/float/double types are treated as Number — no distinction needed.",
    "Supports integration and differentiation transforms on numeric sources.",
  ],
};

export const FIELD2D_CONFIG: TabSourceConfig = {
  tabType: 2,
  tabName: "2D Field",
  sectionTitle: "Poses",
  sourcesPath: "sources",
  types: [
    {
      key: "robot", display: "Robot",
      sourceTypes: [...POSE_TYPES],
      options: [BUMPERS_OPTION],
      parentKey: "robot",
    },
    {
      key: "ghost", display: "Ghost",
      sourceTypes: [...POSE_TYPES],
      options: [COLOR_NEON],
      parentKey: "robot",
    },
    {
      key: "vision", display: "Vision Target",
      sourceTypes: [...ALL_GEOMETRY_TYPES],
      options: [COLOR_NEON, SIZE_NORMAL_BOLD],
      childOf: "robot",
    },
    {
      key: "swerveStates", display: "Swerve States",
      sourceTypes: ["SwerveModuleState[]"],
      options: [COLOR_NEON_RED_START, SWERVE_ARRANGEMENT],
      childOf: "robot",
    },
    {
      key: "rotationOverride", display: "Rotation Override",
      sourceTypes: ["Rotation2d", "Rotation3d"],
      options: [],
      childOf: "robot",
    },
    {
      key: "trajectory", display: "Trajectory",
      sourceTypes: [...TRAJECTORY_TYPES],
      options: [COLOR_NEON, SIZE_NORMAL_BOLD],
    },
    {
      key: "heatmap", display: "Heatmap",
      sourceTypes: [...ALL_GEOMETRY_TYPES],
      options: [TIME_RANGE],
    },
    {
      key: "arrow", display: "Arrow",
      sourceTypes: [
        ...POSE_TYPES,
        "DifferentialSample[]", "SwerveSample[]", "Trajectory",
      ],
      options: [ARROW_POSITION],
    },
  ],
  wpilibHints: [
    "Robot pose: StructPublisher<Pose2d> or Logger.recordOutput('MyPose', pose).",
    "Trajectory: StructArrayPublisher<Pose2d> with an array of poses.",
    "Data must be byte-encoded struct or protobuf — legacy NumberArray format is deprecated.",
    "Field image and coordinate system are configurable in tab settings.",
    "Robot size options: 30 inches, 27 inches, or 24 inches (configured in tab).",
  ],
};

export const FIELD3D_CONFIG: TabSourceConfig = {
  tabType: 3,
  tabName: "3D Field",
  sectionTitle: "Poses",
  sourcesPath: "sources",
  types: [
    {
      key: "robot", display: "Robot",
      sourceTypes: [...POSE_TYPES],
      options: [], // model option values are dynamic (loaded from assets)
      parentKey: "robot",
    },
    {
      key: "ghost", display: "Ghost",
      sourceTypes: [...POSE_TYPES],
      options: [COLOR_NEON],
      parentKey: "robot",
    },
    {
      key: "component", display: "Component",
      sourceTypes: ["Pose3d", "Pose3d[]", "Transform3d", "Transform3d[]"],
      options: [],
      childOf: "robot",
    },
    {
      key: "mechanism", display: "Mechanism",
      sourceTypes: ["Mechanism2d"],
      options: [MECHANISM_PLANE],
      childOf: "robot",
    },
    {
      key: "vision", display: "Vision Target",
      sourceTypes: [...ALL_GEOMETRY_TYPES],
      options: [COLOR_NEON, SIZE_NORMAL_BOLD],
      childOf: "robot",
    },
    {
      key: "swerveStates", display: "Swerve States",
      sourceTypes: ["SwerveModuleState[]"],
      options: [COLOR_NEON_RED_START, SWERVE_ARRANGEMENT],
      childOf: "robot",
    },
    {
      key: "rotationOverride", display: "Rotation Override",
      sourceTypes: ["Rotation2d", "Rotation3d"],
      options: [],
      childOf: "robot",
    },
    {
      key: "gamePiece", display: "Game Piece",
      sourceTypes: ["Pose3d", "Pose3d[]", "Transform3d", "Transform3d[]", "Translation3d", "Translation3d[]"],
      options: [], // variant option values are dynamic (loaded from field asset)
    },
    {
      key: "trajectory", display: "Trajectory",
      sourceTypes: [...TRAJECTORY_TYPES],
      options: [COLOR_NEON, SIZE_NORMAL_BOLD],
    },
    {
      key: "heatmap", display: "Heatmap",
      sourceTypes: [...ALL_GEOMETRY_TYPES],
      options: [TIME_RANGE],
    },
    {
      key: "arrow", display: "Arrow",
      sourceTypes: [
        ...POSE_TYPES,
        "DifferentialSample[]", "SwerveSample[]", "Trajectory",
      ],
      options: [ARROW_POSITION],
    },
    {
      key: "aprilTag", display: "AprilTag",
      sourceTypes: ["Pose3d", "Pose3d[]", "Transform3d", "Transform3d[]", "Trajectory"],
      options: [], // variant option values are dynamic
      parentKey: "aprilTag",
    },
    {
      key: "aprilTagIDs", display: "AprilTag IDs",
      sourceTypes: ["NumberArray"],
      options: [],
      childOf: "aprilTag",
    },
    {
      key: "axes", display: "Axes",
      sourceTypes: ["Pose3d", "Pose3d[]", "Transform3d", "Transform3d[]", "Trajectory"],
      options: [],
    },
    {
      key: "cone", display: "Cone",
      sourceTypes: [...POSE_TYPES, "Trajectory"],
      options: [COLOR_NEON, ARROW_POSITION],
    },
    {
      key: "cameraOverride", display: "Camera Override",
      sourceTypes: ["Pose3d", "Transform3d"],
      options: [],
    },
  ],
  wpilibHints: [
    "Robot pose: StructPublisher<Pose3d> or Logger.recordOutput('MyPose', pose3d).",
    "Components: Publish Pose3d or Pose3d[] for articulated robot parts (arms, elevators).",
    "Mechanism: SmartDashboard.putData('MyMech', mechanism2d) or Logger.recordOutput().",
    "Rendering modes: cinematic (shadows/reflections), standard, low-power (configurable in preferences).",
    "Camera modes: orbit field, orbit robot, driver station, fixed camera (via cameraOverride source).",
    "Component models in custom robot assets are named model_0.glb, model_1.glb, etc.",
  ],
};

export const STATISTICS_CONFIG: TabSourceConfig = {
  tabType: 6,
  tabName: "Statistics",
  sectionTitle: "Measurements",
  sourcesPath: "sources",
  types: [
    {
      key: "independent", display: "Independent",
      sourceTypes: ["Number"],
      options: [COLOR_GRAPH],
    },
    {
      key: "reference", display: "Reference",
      sourceTypes: ["Number"],
      options: [],
      parentKey: "reference",
    },
    {
      key: "relativeError", display: "Relative Error",
      sourceTypes: ["Number"],
      options: [COLOR_GRAPH],
      childOf: "reference",
    },
    {
      key: "absoluteError", display: "Absolute Error",
      sourceTypes: ["Number"],
      options: [COLOR_GRAPH],
      childOf: "reference",
    },
  ],
  wpilibHints: [
    "Use any numeric log field — all int/float/double types are treated as Number.",
    "Reference + error: Add a 'reference' source, then add 'relativeError' or 'absoluteError' as children.",
    "Time range options: Visible Range, Full Log, Enabled, Auto, Teleop, Teleop (No Endgame), Live: 30s, Live: 10s.",
    "Displays histogram, mean, median, standard deviation, percentiles, and skewness.",
  ],
};

export const SWERVE_CONFIG: TabSourceConfig = {
  tabType: 9,
  tabName: "Swerve",
  sectionTitle: "Sources",
  sourcesPath: "sources",
  types: [
    {
      key: "states", display: "Module States",
      sourceTypes: ["SwerveModuleState[]"],
      options: [COLOR_NEON_RED_START, SWERVE_ARRANGEMENT],
    },
    {
      key: "chassisSpeeds", display: "Chassis Speeds",
      sourceTypes: ["ChassisSpeeds"],
      options: [COLOR_NEON_RED_START],
    },
    {
      key: "rotation", display: "Rotation",
      sourceTypes: ["Rotation2d", "Rotation3d"],
      options: [],
    },
  ],
  wpilibHints: [
    "Module States: StructArrayPublisher<SwerveModuleState> with exactly 4 module states.",
    "  Java: publisher = NT.getStructArrayTopic('MySwerve', SwerveModuleState.struct).publish();",
    "  AdvantageKit: Logger.recordOutput('MySwerve', states);",
    "Chassis Speeds: StructPublisher<ChassisSpeeds> or Logger.recordOutput('MySpeeds', chassisSpeeds).",
    "Rotation: StructPublisher<Rotation2d> or Logger.recordOutput('MyRotation', rotation).",
    "Configuration: maxSpeed (vector sizing), frameSize (module distances), orientation (diagram direction).",
    "Legacy NumberArray format is deprecated — use struct format.",
  ],
};

export const MECHANISM_CONFIG: TabSourceConfig = {
  tabType: 10,
  tabName: "Mechanism",
  sectionTitle: "Sources",
  sourcesPath: null, // controller IS the flat array
  types: [
    {
      key: "mechanism", display: "Mechanism",
      sourceTypes: ["Mechanism2d"],
      options: [],
    },
  ],
  wpilibHints: [
    "WPILib: SmartDashboard.putData('MyMech', new Mechanism2d(width, height));",
    "AdvantageKit: Logger.recordOutput('MyMech', new LoggedMechanism2d(width, height));",
    "Mechanism2d must be recorded every loop cycle — it captures current state only.",
    "Supports multiple mechanisms displayed simultaneously.",
    "Useful for visualizing arms, elevators, wrists, intakes, and other jointed mechanisms.",
  ],
};

export const POINTS_CONFIG: TabSourceConfig = {
  tabType: 11,
  tabName: "Points",
  sectionTitle: "Sources",
  sourcesPath: "sources",
  types: [
    {
      key: "plus", display: "Plus",
      sourceTypes: ["Translation2d", "Translation2d[]", "NumberArray"],
      options: [POINT_SIZE, GROUP_SIZE],
    },
    {
      key: "cross", display: "Cross",
      sourceTypes: ["Translation2d", "Translation2d[]", "NumberArray"],
      options: [POINT_SIZE, GROUP_SIZE],
    },
    {
      key: "circle", display: "Circle",
      sourceTypes: ["Translation2d", "Translation2d[]", "NumberArray"],
      options: [POINT_SIZE, GROUP_SIZE],
    },
    {
      key: "plusSplit", display: "Plus/Split",
      sourceTypes: ["NumberArray"],
      options: [COMPONENT_OPTION, POINT_SIZE, GROUP_SIZE],
      parentKey: "split",
    },
    {
      key: "crossSplit", display: "Cross/Split",
      sourceTypes: ["NumberArray"],
      options: [COMPONENT_OPTION, POINT_SIZE, GROUP_SIZE],
      parentKey: "split",
    },
    {
      key: "circleSplit", display: "Circle/Split",
      sourceTypes: ["NumberArray"],
      options: [COMPONENT_OPTION, POINT_SIZE, GROUP_SIZE],
      parentKey: "split",
    },
    {
      key: "component", display: "Component",
      sourceTypes: ["NumberArray"],
      options: [COMPONENT_OPTION],
      childOf: "split",
    },
  ],
  wpilibHints: [
    "Point data: StructArrayPublisher<Translation2d> or Logger.recordOutput('MyPoints', translations).",
    "NumberArray: Can also publish raw number arrays (pairs of x,y values).",
    "Configuration: dimensions (display area size), orientation (X/Y axes), origin position.",
    "For vision data, set dimensions to camera resolution.",
    "Split markers: Use plusSplit/crossSplit/circleSplit to pair separate X and Y NumberArrays.",
  ],
};

// ─── Lookup map ──────────────────────────────────────────────────

/** Map from tab type ID to its source configuration. Only includes SourceListState tabs. */
export const TAB_SOURCE_CONFIGS: ReadonlyMap<number, TabSourceConfig> = new Map([
  [1, LINE_GRAPH_CONFIG],
  [2, FIELD2D_CONFIG],
  [3, FIELD3D_CONFIG],
  [6, STATISTICS_CONFIG],
  [9, SWERVE_CONFIG],
  [10, MECHANISM_CONFIG],
  [11, POINTS_CONFIG],
]);

// ─── Non-SourceListState tab controller descriptions ─────────────

export interface SimpleTabSchema {
  tabType: number;
  tabName: string;
  controllerFormat: string;
  description: string;
  wpilibHints: string[];
}

export const SIMPLE_TAB_SCHEMAS: ReadonlyMap<number, SimpleTabSchema> = new Map([
  [0, {
    tabType: 0, tabName: "Documentation",
    controllerFormat: "null",
    description: "Static documentation/welcome tab. No data sources needed.",
    wpilibHints: [],
  }],
  [4, {
    tabType: 4, tabName: "Table",
    controllerFormat: "string[] — array of log field keys to display as columns",
    description: "Tabular view of value changes over time. Supports all data types. Shows one row per value change.",
    wpilibHints: [
      "Add any log field key to the string array (e.g., '/RealOutputs/Drive/LeftVelocity').",
      "Click a row to select that timestamp — syncs across all tabs.",
    ],
  }],
  [5, {
    tabType: 5, tabName: "Console",
    controllerFormat: "string | null — single log field key for console output",
    description: "Console message viewer with warning/error highlighting and text filtering.",
    wpilibHints: [
      "Common fields: 'DSEvents', 'messages', '/RealOutputs/Console'.",
      "Filter supports ! prefix for exclusion (e.g., '!debug' hides debug messages).",
      "Log content can be exported to a text file.",
    ],
  }],
  [7, {
    tabType: 7, tabName: "Video",
    controllerFormat: "object — video source configuration",
    description: "Synchronized match video playback alongside log data.",
    wpilibHints: [
      "Sources: local file path, YouTube URL, or The Blue Alliance match key.",
      "TBA source requires tbaApiKey preference to be set.",
      "Local file requires FFmpeg to be installed.",
    ],
  }],
  [8, {
    tabType: 8, tabName: "Joysticks",
    controllerFormat: "string[] — array of 6 joystick layout names",
    description: "Display up to 6 controller states with button/axis visualization.",
    wpilibHints: [
      "Example: ['Xbox Controller', 'None', 'None', 'None', 'None', 'None'].",
      "Built-in: Xbox Controller, PS4/PS5 Controller, Generic Joystick (grid format).",
      "Custom layouts via Joystick_{Name}/config.json in assets folder.",
      "WARNING: Joystick data NOT available via plain NT4 — requires WPILib log with joystick logging, AdvantageKit logs, or AdvantageKit streaming.",
    ],
  }],
  [12, {
    tabType: 12, tabName: "Metadata",
    controllerFormat: "null",
    description: "Display log metadata key-value pairs. Supports side-by-side real vs replay comparison.",
    wpilibHints: [
      "Data: /Metadata table (NetworkTables/DataLog) or Logger.recordMetadata() (AdvantageKit).",
      "Useful for build info, Git commit hashes, configuration parameters.",
    ],
  }],
]);

// ─── Controller navigation helpers ───────────────────────────────

/**
 * Resolve the section key for a LineGraph source type.
 * For LineGraph, numeric types default to "leftSources" and discrete to "discreteSources".
 * The `section` parameter allows overriding to "rightSources".
 */
export function resolveLineGraphSection(
  sourceType: string,
  section?: string,
): string {
  const config = LINE_GRAPH_CONFIG;
  if (section) {
    const validSections = config.sections!.map((s) => s.key);
    if (!validSections.includes(section)) {
      throw new Error(
        `Invalid section "${section}" for LineGraph. Valid sections: ${validSections.join(", ")}`,
      );
    }
    return section;
  }
  // Auto-determine from type
  return config.typeSections?.[sourceType] ?? "leftSources";
}

/**
 * Get the sources array from a controller object for a given tab type and optional section.
 * Returns { sources, key } where key is the property path used.
 * Creates the array if it doesn't exist.
 */
export function getSourcesArray(
  controller: unknown,
  tabType: number,
  section?: string,
): { sources: SourceListItemState[]; setBack: (arr: SourceListItemState[]) => void } {
  const config = TAB_SOURCE_CONFIGS.get(tabType);
  if (!config) {
    throw new Error(`Tab type ${tabType} does not use SourceListState`);
  }

  // LineGraph: multi-section
  if (config.sections) {
    const ctrl = (controller ?? {}) as Record<string, unknown>;
    const sectionKey = section ?? "leftSources";
    if (!Array.isArray(ctrl[sectionKey])) {
      ctrl[sectionKey] = [];
    }
    return {
      sources: ctrl[sectionKey] as SourceListItemState[],
      setBack: (arr) => { ctrl[sectionKey] = arr; },
    };
  }

  // Mechanism: controller IS the array
  if (config.sourcesPath === null) {
    return {
      sources: (controller ?? []) as SourceListItemState[],
      setBack: () => {}, // caller must set tab.controller directly
    };
  }

  // Other tabs: controller.sources
  const ctrl = (controller ?? {}) as Record<string, unknown>;
  if (!Array.isArray(ctrl[config.sourcesPath])) {
    ctrl[config.sourcesPath] = [];
  }
  return {
    sources: ctrl[config.sourcesPath] as SourceListItemState[],
    setBack: (arr) => { ctrl[config.sourcesPath!] = arr; },
  };
}

// ─── Validation helpers ──────────────────────────────────────────

export interface SourceListItemState {
  type: string;
  logKey: string;
  logType: string;
  visible: boolean;
  options: Record<string, string>;
  children?: SourceListItemState[];
}

/** Validate a source item against a tab's source type configuration. Returns error messages. */
export function validateSourceItem(
  tabType: number,
  item: SourceListItemState,
): string[] {
  const config = TAB_SOURCE_CONFIGS.get(tabType);
  if (!config) {
    return [`Tab type ${tabType} does not use SourceListState controller`];
  }

  const errors: string[] = [];
  const typeConfig = config.types.find((t) => t.key === item.type);

  if (!typeConfig) {
    const validKeys = config.types.filter((t) => !t.legacy).map((t) => t.key);
    errors.push(
      `Invalid source type "${item.type}" for ${config.tabName}. Valid types: ${validKeys.join(", ")}`,
    );
    return errors;
  }

  // Validate logType against sourceTypes
  if (!typeConfig.sourceTypes.includes(item.logType)) {
    errors.push(
      `Invalid logType "${item.logType}" for source type "${item.type}". ` +
      `Valid types: ${typeConfig.sourceTypes.join(", ")}`,
    );
  }

  // Validate options keys and values
  const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
  const COLOR_OPTION_KEYS = new Set(["color", "bumpers"]);

  for (const [key, value] of Object.entries(item.options)) {
    const optionConfig = typeConfig.options.find((o) => o.key === key);
    if (!optionConfig) {
      const validKeys = typeConfig.options.map((o) => o.key);
      if (validKeys.length > 0) {
        errors.push(
          `Unknown option "${key}" for source type "${item.type}". ` +
          `Valid options: ${validKeys.join(", ")}`,
        );
      } else {
        errors.push(
          `Source type "${item.type}" does not accept any options, but got "${key}"`,
        );
      }
    } else if (COLOR_OPTION_KEYS.has(key) && HEX_COLOR_RE.test(value)) {
      // Accept any valid hex color for color/bumpers options
    } else if (key === "bumpers" && value === "") {
      // Empty string means "Alliance Color" for bumpers
    } else if (optionConfig.values.length > 0 && !optionConfig.values.includes(value)) {
      errors.push(
        `Invalid value "${value}" for option "${key}". ` +
        `Valid values: ${optionConfig.values.join(", ")}`,
      );
    }
  }

  return errors;
}

/** Check if a source requires a parent and whether that parent exists in the sources list. */
export function validateParentChild(
  tabType: number,
  sources: SourceListItemState[],
  newItemType: string,
): string | null {
  const config = TAB_SOURCE_CONFIGS.get(tabType);
  if (!config) return null;

  const typeConfig = config.types.find((t) => t.key === newItemType);
  if (!typeConfig?.childOf) return null;

  // Check if any existing source has the required parentKey
  const parentExists = sources.some((s) => {
    const parentConfig = config.types.find((t) => t.key === s.type);
    return parentConfig?.parentKey === typeConfig.childOf;
  });

  if (!parentExists) {
    const parentTypes = config.types
      .filter((t) => t.parentKey === typeConfig.childOf)
      .map((t) => t.key);
    return (
      `Source type "${newItemType}" requires a parent of type: ${parentTypes.join(" or ")}. ` +
      `Add a parent source first.`
    );
  }

  return null;
}
