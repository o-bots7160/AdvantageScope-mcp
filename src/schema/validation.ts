import type {
  AssetType,
  Config2dField,
  Config3dField,
  Config3dRobot,
  ConfigJoystick,
  ApplicationState,
  Preferences,
} from "./types.js";
import {
  Config2dFieldSchema,
  Config3dFieldSchema,
  Config3dRobotSchema,
  ConfigJoystickSchema,
  ApplicationStateSchema,
  PreferencesSchema,
} from "./schemas.js";

export interface ValidationError {
  path: string;
  message: string;
}

function zodErrorsToValidationErrors(
  zodError: { issues: Array<{ path: PropertyKey[]; message: string }> },
  prefix: string,
): ValidationError[] {
  return zodError.issues.map((issue) => ({
    path: prefix + (issue.path.length > 0 ? "." + issue.path.map(String).join(".") : ""),
    message: issue.message,
  }));
}

export function validateConfig2dField(config: unknown): ValidationError[] {
  const result = Config2dFieldSchema.safeParse(config);
  if (result.success) return [];
  return zodErrorsToValidationErrors(result.error, "Config2dField");
}

export function validateConfig3dField(config: unknown): ValidationError[] {
  const result = Config3dFieldSchema.safeParse(config);
  if (result.success) return [];
  return zodErrorsToValidationErrors(result.error, "Config3dField");
}

export function validateConfig3dRobot(config: unknown): ValidationError[] {
  const result = Config3dRobotSchema.safeParse(config);
  if (result.success) return [];
  return zodErrorsToValidationErrors(result.error, "Config3dRobot");
}

export function validateConfigJoystick(config: unknown): ValidationError[] {
  const result = ConfigJoystickSchema.safeParse(config);
  if (result.success) return [];
  return zodErrorsToValidationErrors(result.error, "ConfigJoystick");
}

export function validateAssetConfig(
  assetType: AssetType,
  config: unknown,
): ValidationError[] {
  switch (assetType) {
    case "Field2d":
      return validateConfig2dField(config);
    case "Field3d":
      return validateConfig3dField(config);
    case "Robot":
      return validateConfig3dRobot(config);
    case "Joystick":
      return validateConfigJoystick(config);
    default:
      return [{ path: "assetType", message: `Unknown asset type: ${assetType}` }];
  }
}

export function validateApplicationState(state: unknown): ValidationError[] {
  const result = ApplicationStateSchema.safeParse(state);
  if (result.success) return [];
  return zodErrorsToValidationErrors(result.error, "ApplicationState");
}

export function validatePreferences(prefs: unknown): ValidationError[] {
  const result = PreferencesSchema.safeParse(prefs);
  if (result.success) return [];
  return zodErrorsToValidationErrors(result.error, "Preferences");
}
