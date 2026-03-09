// AdvantageScope coordinate system options
export type CoordinateSystem =
  | "wall-alliance"
  | "wall-blue"
  | "center-rotated"
  | "center-red";

// 3D rotation specification
export interface Config3dRotation {
  axis: "x" | "y" | "z";
  degrees: number;
}

// 2D field asset configuration
export interface Config2dField {
  name: string;
  isFTC: boolean;
  coordinateSystem: CoordinateSystem;
  sourceUrl?: string;
  topLeft: [number, number];
  bottomRight: [number, number];
  widthInches: number;
  heightInches: number;
}

// 3D field game piece
export interface Config3dFieldGamePiece {
  name: string;
  rotations: Config3dRotation[];
  position: [number, number, number];
  stagedObjects: string[];
}

// 3D field AprilTag
export interface Config3dFieldAprilTag {
  variant: string;
  id: number;
  rotations: Config3dRotation[];
  position: [number, number, number];
}

// 3D field asset configuration
export interface Config3dField {
  name: string;
  isFTC: boolean;
  coordinateSystem: CoordinateSystem;
  rotations: Config3dRotation[];
  position: [number, number, number];
  widthInches: number;
  heightInches: number;
  defaultOrigin?: string;
  driverStations: [number, number][];
  gamePieces: Config3dFieldGamePiece[];
  aprilTags: Config3dFieldAprilTag[];
}

// Robot camera definition
export interface Config3dRobotCamera {
  name: string;
  rotations: Config3dRotation[];
  position: [number, number, number];
  resolution: [number, number];
  fov: number;
}

// Robot articulated component
export interface Config3dRobotComponent {
  zeroedRotations: Config3dRotation[];
  zeroedPosition: [number, number, number];
}

// 3D robot model configuration
export interface Config3dRobot {
  name: string;
  isFTC: boolean;
  disableSimplification: boolean;
  rotations: Config3dRotation[];
  position: [number, number, number];
  cameras: Config3dRobotCamera[];
  components: Config3dRobotComponent[];
}

// Joystick button component
export interface ConfigJoystickButton {
  type: "button";
  isYellow: boolean;
  isEllipse: boolean;
  centerPx: [number, number];
  sizePx: [number, number];
  sourceIndex: number;
  sourcePov?: "up" | "right" | "down" | "left";
}

// Joystick stick component
export interface ConfigJoystickStick {
  type: "joystick";
  isYellow: boolean;
  centerPx: [number, number];
  radiusPx: number;
  xSourceIndex: number;
  xSourceInverted: boolean;
  ySourceIndex: number;
  ySourceInverted: boolean;
  buttonSourceIndex?: number;
}

// Joystick axis component
export interface ConfigJoystickAxis {
  type: "axis";
  isYellow: boolean;
  centerPx: [number, number];
  sizePx: [number, number];
  sourceIndex: number;
  sourceRange: [number, number];
}

export type ConfigJoystickComponent =
  | ConfigJoystickButton
  | ConfigJoystickStick
  | ConfigJoystickAxis;

// Joystick asset configuration
export interface ConfigJoystick {
  name: string;
  components: ConfigJoystickComponent[];
}

// AdvantageScope tab types
export enum TabType {
  Documentation = 0,
  LineGraph = 1,
  Field2d = 2,
  Field3d = 3,
  Table = 4,
  Console = 5,
  Statistics = 6,
  Video = 7,
  Joysticks = 8,
  Swerve = 9,
  Mechanism = 10,
  Points = 11,
  Metadata = 12,
}

export const TAB_TYPE_NAMES: Record<TabType, string> = {
  [TabType.Documentation]: "Documentation",
  [TabType.LineGraph]: "Line Graph",
  [TabType.Field2d]: "2D Field",
  [TabType.Field3d]: "3D Field",
  [TabType.Table]: "Table",
  [TabType.Console]: "Console",
  [TabType.Statistics]: "Statistics",
  [TabType.Video]: "Video",
  [TabType.Joysticks]: "Joysticks",
  [TabType.Swerve]: "Swerve",
  [TabType.Mechanism]: "Mechanism",
  [TabType.Points]: "Points",
  [TabType.Metadata]: "Metadata",
};

// Tab state within a layout
export interface TabState {
  type: TabType;
  title: string;
  controller: unknown;
  controllerUUID: string;
  renderer: unknown;
  controlsHeight: number;
}

// Sidebar state
export interface SidebarState {
  width: number;
  expanded: string[];
}

// Hub (window) internal state
export interface HubState {
  sidebar: SidebarState;
  tabs: {
    selected: number;
    tabs: TabState[];
  };
}

// Window state
export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  state: HubState;
}

// Root application state (layout file)
export interface ApplicationState {
  hubs: WindowState[];
  satellites: WindowState[];
}

// AdvantageScope preferences
export interface Preferences {
  theme: "light" | "dark" | "system";
  robotAddress: string;
  remotePath: string;
  liveMode: "nt4" | "nt4-akit" | "phoenix" | "rlog" | "ftcdashboard";
  liveSubscribeMode: "low-bandwidth" | "logging";
  liveDiscard: number;
  publishFilter: string;
  rlogPort: number;
  coordinateSystem: "automatic" | CoordinateSystem;
  field3dModeAc: "cinematic" | "standard" | "low-power";
  field3dModeBattery: "" | "cinematic" | "standard" | "low-power";
  field3dAntialiasing: boolean;
  tbaApiKey: string;
  userAssetsFolder: string | null;
  skipHootNonProWarning: boolean;
  skipNumericArrayDeprecationWarning: boolean;
  skipFTCExperimentalWarning: boolean;
  skipFrcLogFolderDefault: boolean;
  ctreLicenseAccepted: boolean;
  usb?: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  robotAddress: "10.00.00.2",
  remotePath: "/U/logs",
  liveMode: "nt4",
  liveSubscribeMode: "low-bandwidth",
  liveDiscard: 1200,
  publishFilter: "",
  rlogPort: 5800,
  coordinateSystem: "automatic",
  field3dModeAc: "standard",
  field3dModeBattery: "",
  field3dAntialiasing: true,
  tbaApiKey: "",
  userAssetsFolder: null,
  skipHootNonProWarning: false,
  skipNumericArrayDeprecationWarning: false,
  skipFTCExperimentalWarning: false,
  skipFrcLogFolderDefault: false,
  ctreLicenseAccepted: false,
};

// Asset type identifiers
export type AssetType = "Field2d" | "Field3d" | "Robot" | "Joystick";

// Union of all asset config types
export type AssetConfig =
  | Config2dField
  | Config3dField
  | Config3dRobot
  | ConfigJoystick;
