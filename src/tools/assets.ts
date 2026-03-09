import * as fs from "node:fs";
import * as path from "node:path";
import type { AssetConfig, AssetType } from "../schema/types.js";

export function readAssetConfig(filePath: string): AssetConfig {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as AssetConfig;
}

export function writeAssetConfig(
  filePath: string,
  config: AssetConfig,
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

// Infer asset type from the directory naming convention: {Type}_{Name}
export function inferAssetType(filePath: string): AssetType | null {
  const dir = path.basename(path.dirname(filePath));
  if (dir.startsWith("Field2d_")) return "Field2d";
  if (dir.startsWith("Field3d_")) return "Field3d";
  if (dir.startsWith("Robot_")) return "Robot";
  if (dir.startsWith("Joystick_")) return "Joystick";
  return null;
}

// Build the standard asset directory path
export function assetDirName(assetType: AssetType, name: string): string {
  return `${assetType}_${name.replace(/\s+/g, "")}`;
}

// Build full path to config.json for an asset
export function assetConfigPath(
  baseDir: string,
  assetType: AssetType,
  name: string,
): string {
  return path.join(baseDir, assetDirName(assetType, name), "config.json");
}

// List asset directories within a base directory
export function listAssetDirs(
  baseDir: string,
  assetType?: AssetType,
): Array<{ type: AssetType; name: string; path: string }> {
  if (!fs.existsSync(baseDir)) return [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const results: Array<{ type: AssetType; name: string; path: string }> = [];
  const prefixes: Array<{ prefix: string; type: AssetType }> = [
    { prefix: "Field2d_", type: "Field2d" },
    { prefix: "Field3d_", type: "Field3d" },
    { prefix: "Robot_", type: "Robot" },
    { prefix: "Joystick_", type: "Joystick" },
  ];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    for (const { prefix, type } of prefixes) {
      if (assetType && type !== assetType) continue;
      if (entry.name.startsWith(prefix)) {
        const name = entry.name.slice(prefix.length);
        const configPath = path.join(baseDir, entry.name, "config.json");
        if (fs.existsSync(configPath)) {
          results.push({ type, name, path: configPath });
        }
      }
    }
  }
  return results;
}
