import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  readAssetConfig,
  writeAssetConfig,
  inferAssetType,
  listAssetDirs,
  assetDirName,
  assetConfigPath,
} from "../src/tools/assets.js";
import {
  readLayout,
  writeLayout,
  createEmptyLayout,
  createTab,
  readPreferences,
  writePreferences,
} from "../src/tools/layout.js";
import { TabType, DEFAULT_PREFERENCES } from "../src/schema/types.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "akit-mcp-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Asset file I/O", () => {
  it("writes and reads an asset config", () => {
    const config = {
      name: "TestField",
      isFTC: false,
      coordinateSystem: "wall-blue" as const,
      topLeft: [100, 50] as [number, number],
      bottomRight: [900, 500] as [number, number],
      widthInches: 648,
      heightInches: 324,
    };
    const filePath = path.join(tmpDir, "Field2d_TestField", "config.json");
    writeAssetConfig(filePath, config);
    const read = readAssetConfig(filePath);
    expect(read).toEqual(config);
  });

  it("creates parent directories on write", () => {
    const config = { name: "Test", isFTC: false, coordinateSystem: "wall-blue" as const, topLeft: [0, 0] as [number, number], bottomRight: [1, 1] as [number, number], widthInches: 1, heightInches: 1 };
    const filePath = path.join(tmpDir, "deep", "nested", "config.json");
    writeAssetConfig(filePath, config);
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

describe("inferAssetType", () => {
  it("infers Field2d from directory name", () => {
    expect(inferAssetType("/path/to/Field2d_MyField/config.json")).toBe("Field2d");
  });

  it("infers Field3d from directory name", () => {
    expect(inferAssetType("/path/to/Field3d_Season2024/config.json")).toBe("Field3d");
  });

  it("infers Robot from directory name", () => {
    expect(inferAssetType("/path/to/Robot_KitBot/config.json")).toBe("Robot");
  });

  it("infers Joystick from directory name", () => {
    expect(inferAssetType("/path/to/Joystick_Xbox/config.json")).toBe("Joystick");
  });

  it("returns null for unknown directory name", () => {
    expect(inferAssetType("/path/to/Unknown_Thing/config.json")).toBeNull();
  });
});

describe("assetDirName", () => {
  it("builds correct directory name", () => {
    expect(assetDirName("Field2d", "My Field")).toBe("Field2d_MyField");
  });

  it("removes spaces from name", () => {
    expect(assetDirName("Robot", "Kit Bot 2024")).toBe("Robot_KitBot2024");
  });
});

describe("listAssetDirs", () => {
  it("lists asset directories with config.json", () => {
    const field2dDir = path.join(tmpDir, "Field2d_TestField");
    const robotDir = path.join(tmpDir, "Robot_TestBot");
    const emptyDir = path.join(tmpDir, "Field3d_NoConfig");
    fs.mkdirSync(field2dDir);
    fs.mkdirSync(robotDir);
    fs.mkdirSync(emptyDir);
    fs.writeFileSync(path.join(field2dDir, "config.json"), "{}");
    fs.writeFileSync(path.join(robotDir, "config.json"), "{}");

    const results = listAssetDirs(tmpDir);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.type).sort()).toEqual(["Field2d", "Robot"]);
  });

  it("filters by asset type", () => {
    const field2dDir = path.join(tmpDir, "Field2d_TestField");
    const robotDir = path.join(tmpDir, "Robot_TestBot");
    fs.mkdirSync(field2dDir);
    fs.mkdirSync(robotDir);
    fs.writeFileSync(path.join(field2dDir, "config.json"), "{}");
    fs.writeFileSync(path.join(robotDir, "config.json"), "{}");

    const results = listAssetDirs(tmpDir, "Robot");
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("Robot");
  });

  it("returns empty for non-existent directory", () => {
    expect(listAssetDirs("/nonexistent/path")).toEqual([]);
  });
});

describe("Layout file I/O", () => {
  it("creates and reads an empty layout", () => {
    const layout = createEmptyLayout();
    const filePath = path.join(tmpDir, "state.json");
    writeLayout(filePath, layout);
    const read = readLayout(filePath);
    expect(read.hubs).toHaveLength(1);
    expect(read.satellites).toEqual([]);
    expect(read.hubs[0].state.tabs.tabs).toHaveLength(1);
  });

  it("creates tabs with correct defaults", () => {
    const tab = createTab(TabType.LineGraph);
    expect(tab.type).toBe(TabType.LineGraph);
    expect(tab.title).toBe("Line Graph");
    expect(tab.controller).toBeNull();
    expect(tab.controllerUUID).toHaveLength(32);
  });

  it("creates tabs with custom title", () => {
    const tab = createTab(TabType.Swerve, "Drive Swerve");
    expect(tab.title).toBe("Drive Swerve");
  });
});

describe("Preferences file I/O", () => {
  it("returns defaults when file does not exist", () => {
    const prefs = readPreferences(path.join(tmpDir, "nonexistent.json"));
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it("merges file values with defaults", () => {
    const filePath = path.join(tmpDir, "prefs.json");
    fs.writeFileSync(filePath, JSON.stringify({ theme: "dark", robotAddress: "10.71.60.2" }));
    const prefs = readPreferences(filePath);
    expect(prefs.theme).toBe("dark");
    expect(prefs.robotAddress).toBe("10.71.60.2");
    expect(prefs.liveMode).toBe("nt4"); // default
  });

  it("writes and reads preferences", () => {
    const filePath = path.join(tmpDir, "prefs.json");
    const prefs = { ...DEFAULT_PREFERENCES, theme: "dark" as const, robotAddress: "10.71.60.2" };
    writePreferences(filePath, prefs);
    const read = readPreferences(filePath);
    expect(read.theme).toBe("dark");
    expect(read.robotAddress).toBe("10.71.60.2");
  });
});
