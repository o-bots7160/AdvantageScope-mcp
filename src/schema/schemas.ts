import { z } from "zod";

// Shared schemas
export const Config3dRotationSchema = z.object({
  axis: z.enum(["x", "y", "z"]).describe("Rotation axis"),
  degrees: z.number().describe("Rotation angle in degrees"),
});

export const CoordinateSystemSchema = z.enum([
  "wall-alliance",
  "wall-blue",
  "center-rotated",
  "center-red",
]);

const Position2d = z.tuple([z.number(), z.number()]);
const Position3d = z.tuple([z.number(), z.number(), z.number()]);
const Resolution = z.tuple([z.number(), z.number()]);

// 2D field config schema
export const Config2dFieldSchema = z.object({
  name: z.string().min(1).describe("Display name for the field"),
  isFTC: z.boolean().describe("Whether this is an FTC field"),
  coordinateSystem: CoordinateSystemSchema.describe("Coordinate system used"),
  sourceUrl: z.string().optional().describe("Source URL for the field image"),
  topLeft: Position2d.describe("Top-left corner of the field in image pixels"),
  bottomRight: Position2d.describe("Bottom-right corner of the field in image pixels"),
  widthInches: z.number().positive().describe("Field width in inches"),
  heightInches: z.number().positive().describe("Field height in inches"),
});

// 3D field config schema
export const Config3dFieldGamePieceSchema = z.object({
  name: z.string().min(1).describe("Game piece name"),
  rotations: z.array(Config3dRotationSchema).describe("Rotation transforms"),
  position: Position3d.describe("Position in meters [x, y, z]"),
  stagedObjects: z.array(z.string()).describe("Staged object file names"),
});

export const Config3dFieldAprilTagSchema = z.object({
  variant: z.string().describe("AprilTag variant (e.g., '36h11-6.5in')"),
  id: z.number().int().positive().describe("AprilTag ID"),
  rotations: z.array(Config3dRotationSchema).describe("Rotation transforms"),
  position: Position3d.describe("Position in meters [x, y, z]"),
});

export const Config3dFieldSchema = z.object({
  name: z.string().min(1).describe("Display name for the field"),
  isFTC: z.boolean().describe("Whether this is an FTC field"),
  coordinateSystem: CoordinateSystemSchema.describe("Coordinate system used"),
  rotations: z.array(Config3dRotationSchema).describe("Field model rotations"),
  position: Position3d.describe("Field model position in meters"),
  widthInches: z.number().positive().describe("Field width in inches"),
  heightInches: z.number().positive().describe("Field height in inches"),
  defaultOrigin: z.string().optional().describe("Default coordinate origin"),
  driverStations: z.array(Position2d).describe("Driver station positions [x, y] in meters"),
  gamePieces: z.array(Config3dFieldGamePieceSchema).describe("Game piece definitions"),
  aprilTags: z.array(Config3dFieldAprilTagSchema).describe("AprilTag definitions"),
});

// Robot config schema
export const Config3dRobotCameraSchema = z.object({
  name: z.string().min(1).describe("Camera name"),
  rotations: z.array(Config3dRotationSchema).describe("Camera rotation transforms"),
  position: Position3d.describe("Camera position on robot in meters"),
  resolution: Resolution.describe("Camera resolution [width, height] in pixels"),
  fov: z.number().positive().describe("Camera field of view in degrees"),
});

export const Config3dRobotComponentSchema = z.object({
  zeroedRotations: z.array(Config3dRotationSchema).describe("Component rotation transforms at zero position"),
  zeroedPosition: Position3d.describe("Component position at zero position in meters"),
});

export const Config3dRobotSchema = z.object({
  name: z.string().min(1).describe("Display name for the robot model"),
  isFTC: z.boolean().describe("Whether this is an FTC robot"),
  disableSimplification: z.boolean().describe("Disable mesh simplification for rendering"),
  rotations: z.array(Config3dRotationSchema).describe("Robot model rotations"),
  position: Position3d.describe("Robot model position offset in meters"),
  cameras: z.array(Config3dRobotCameraSchema).describe("Camera definitions"),
  components: z.array(Config3dRobotComponentSchema).describe("Articulated component definitions"),
});

// Joystick config schema
export const ConfigJoystickButtonSchema = z.object({
  type: z.literal("button"),
  isYellow: z.boolean().describe("Use yellow highlight color"),
  isEllipse: z.boolean().describe("Render as ellipse instead of rectangle"),
  centerPx: Position2d.describe("Center position in pixels [x, y]"),
  sizePx: Position2d.describe("Size in pixels [width, height]"),
  sourceIndex: z.number().int().min(0).describe("Button index in joystick data"),
  sourcePov: z.enum(["up", "right", "down", "left"]).optional().describe("POV hat direction"),
});

export const ConfigJoystickStickSchema = z.object({
  type: z.literal("joystick"),
  isYellow: z.boolean().describe("Use yellow highlight color"),
  centerPx: Position2d.describe("Center position in pixels [x, y]"),
  radiusPx: z.number().positive().describe("Stick movement radius in pixels"),
  xSourceIndex: z.number().int().min(0).describe("X-axis source index"),
  xSourceInverted: z.boolean().describe("Invert X-axis"),
  ySourceIndex: z.number().int().min(0).describe("Y-axis source index"),
  ySourceInverted: z.boolean().describe("Invert Y-axis"),
  buttonSourceIndex: z.number().int().min(0).optional().describe("Stick click button index"),
});

export const ConfigJoystickAxisSchema = z.object({
  type: z.literal("axis"),
  isYellow: z.boolean().describe("Use yellow highlight color"),
  centerPx: Position2d.describe("Center position in pixels [x, y]"),
  sizePx: Position2d.describe("Size in pixels [width, height]"),
  sourceIndex: z.number().int().min(0).describe("Axis source index"),
  sourceRange: z.tuple([z.number(), z.number()]).describe("Axis value range [min, max]"),
});

export const ConfigJoystickComponentSchema = z.discriminatedUnion("type", [
  ConfigJoystickButtonSchema,
  ConfigJoystickStickSchema,
  ConfigJoystickAxisSchema,
]);

export const ConfigJoystickSchema = z.object({
  name: z.string().min(1).describe("Display name for the joystick config"),
  components: z.array(ConfigJoystickComponentSchema).describe("Joystick input components"),
});

// Preferences schema
export const PreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  robotAddress: z.string().optional().describe("Robot IP address (e.g., '10.71.60.2')"),
  remotePath: z.string().optional().describe("Remote log file path"),
  liveMode: z.enum(["nt4", "nt4-akit", "phoenix", "rlog", "ftcdashboard"]).optional(),
  liveSubscribeMode: z.enum(["low-bandwidth", "logging"]).optional(),
  liveDiscard: z.number().positive().optional().describe("Live data discard time in ms"),
  publishFilter: z.string().optional(),
  rlogPort: z.number().int().positive().optional(),
  coordinateSystem: z
    .union([z.literal("automatic"), CoordinateSystemSchema])
    .optional(),
  field3dModeAc: z.enum(["cinematic", "standard", "low-power"]).optional(),
  field3dModeBattery: z
    .union([z.literal(""), z.enum(["cinematic", "standard", "low-power"])])
    .optional(),
  field3dAntialiasing: z.boolean().optional(),
  tbaApiKey: z.string().optional(),
  userAssetsFolder: z.string().nullable().optional(),
});

// Tab type schema
export const TabTypeSchema = z.number().int().min(0).max(12).describe("Tab type (0=Documentation, 1=LineGraph, 2=Field2d, 3=Field3d, 4=Table, 5=Console, 6=Statistics, 7=Video, 8=Joysticks, 9=Swerve, 10=Mechanism, 11=Points, 12=Metadata)");

// Tab state schema
export const TabStateSchema = z.object({
  type: TabTypeSchema,
  title: z.string().describe("Tab display title"),
  controller: z.unknown().nullable().describe("Tab-specific controller configuration"),
  controllerUUID: z.string().describe("Unique controller identifier"),
  renderer: z.unknown().nullable().describe("Tab-specific renderer configuration"),
  controlsHeight: z.number().describe("Height of controls area"),
});

// Layout schemas
export const SidebarStateSchema = z.object({
  width: z.number().positive(),
  expanded: z.array(z.string()),
});

export const HubStateSchema = z.object({
  sidebar: SidebarStateSchema,
  tabs: z.object({
    selected: z.number().int().min(0),
    tabs: z.array(TabStateSchema),
  }),
});

export const WindowStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  state: HubStateSchema,
});

export const ApplicationStateSchema = z.object({
  hubs: z.array(WindowStateSchema),
  satellites: z.array(WindowStateSchema),
});
