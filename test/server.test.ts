import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  readLayout,
  writeLayout,
  createEmptyLayout,
  createTab,
  createDefaultHubState,
  readPreferences,
  writePreferences,
} from "../src/tools/layout.js";
import {
  writeAssetConfig,
  readAssetConfig,
  inferAssetType,
  listAssetDirs,
  assetConfigPath,
  deleteAssetDir,
} from "../src/tools/assets.js";
import { validateApplicationState } from "../src/schema/validation.js";
import type { TabType } from "../src/schema/types.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-server-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("layout workflow", () => {
  it("creates a layout, adds tabs, and reads them back", () => {
    const layoutPath = path.join(tmpDir, "test-layout.json");
    const layout = createEmptyLayout();
    writeLayout(layoutPath, layout);

    // Add a LineGraph tab
    const read1 = readLayout(layoutPath);
    const lineGraphTab = createTab(1 as TabType, "My Graph");
    read1.hubs[0].state.tabs.tabs.push(lineGraphTab);
    writeLayout(layoutPath, read1);

    // Add a Table tab
    const read2 = readLayout(layoutPath);
    const tableTab = createTab(4 as TabType, "Data Table");
    tableTab.controller = ["/field1", "/field2"];
    read2.hubs[0].state.tabs.tabs.push(tableTab);
    writeLayout(layoutPath, read2);

    // Verify final state
    const final = readLayout(layoutPath);
    expect(final.hubs).toHaveLength(1);
    expect(final.hubs[0].state.tabs.tabs).toHaveLength(3); // Documentation + LineGraph + Table
    expect(final.hubs[0].state.tabs.tabs[1].title).toBe("My Graph");
    expect(final.hubs[0].state.tabs.tabs[1].type).toBe(1);
    expect(final.hubs[0].state.tabs.tabs[2].title).toBe("Data Table");
    expect(final.hubs[0].state.tabs.tabs[2].controller).toEqual(["/field1", "/field2"]);
    expect(validateApplicationState(final)).toEqual([]);
  });

  it("removes a tab and adjusts selected index", () => {
    const layoutPath = path.join(tmpDir, "test-layout.json");
    const layout = createEmptyLayout();
    layout.hubs[0].state.tabs.tabs.push(createTab(1 as TabType, "Tab1"));
    layout.hubs[0].state.tabs.tabs.push(createTab(2 as TabType, "Tab2"));
    layout.hubs[0].state.tabs.selected = 2; // select last tab
    writeLayout(layoutPath, layout);

    const read = readLayout(layoutPath);
    read.hubs[0].state.tabs.tabs.splice(2, 1); // remove Tab2
    if (read.hubs[0].state.tabs.selected >= read.hubs[0].state.tabs.tabs.length) {
      read.hubs[0].state.tabs.selected = Math.max(0, read.hubs[0].state.tabs.tabs.length - 1);
    }
    writeLayout(layoutPath, read);

    const final = readLayout(layoutPath);
    expect(final.hubs[0].state.tabs.tabs).toHaveLength(2);
    expect(final.hubs[0].state.tabs.selected).toBe(1);
  });

  it("moves a tab from one position to another preserving config", () => {
    const layoutPath = path.join(tmpDir, "test-layout.json");
    const layout = createEmptyLayout();
    // Tabs: [Doc(0), LineGraph(1), Field2d(2), Table(3)]
    const lg = createTab(1 as TabType, "LineGraph");
    lg.controller = { leftSources: ["/a"] };
    layout.hubs[0].state.tabs.tabs.push(lg);
    layout.hubs[0].state.tabs.tabs.push(createTab(2 as TabType, "Field2d"));
    layout.hubs[0].state.tabs.tabs.push(createTab(4 as TabType, "Table"));
    layout.hubs[0].state.tabs.selected = 1; // LineGraph selected
    writeLayout(layoutPath, layout);

    // Move LineGraph (index 1) to end (index 3)
    const read = readLayout(layoutPath);
    const tabs = read.hubs[0].state.tabs;
    const [moved] = tabs.tabs.splice(1, 1);
    tabs.tabs.splice(3, 0, moved);
    // Adjust selected: was 1 (the moved tab), should now be 3
    tabs.selected = 3;
    writeLayout(layoutPath, read);

    const final = readLayout(layoutPath);
    const finalTabs = final.hubs[0].state.tabs;
    expect(finalTabs.tabs).toHaveLength(4);
    expect(finalTabs.tabs[0].title).toBe(""); // Documentation
    expect(finalTabs.tabs[1].title).toBe("Field2d");
    expect(finalTabs.tabs[2].title).toBe("Table");
    expect(finalTabs.tabs[3].title).toBe("LineGraph");
    // Verify controller was preserved
    expect(finalTabs.tabs[3].controller).toEqual({ leftSources: ["/a"] });
    expect(finalTabs.selected).toBe(3);
  });

  it("reorders all tabs preserving config", () => {
    const layoutPath = path.join(tmpDir, "test-layout.json");
    const layout = createEmptyLayout();
    // Tabs: [Doc(0), LineGraph(1), Field2d(2), Table(3)]
    layout.hubs[0].state.tabs.tabs.push(createTab(1 as TabType, "LineGraph"));
    const f2d = createTab(2 as TabType, "Field2d");
    f2d.renderer = { mode: "cinematic" };
    layout.hubs[0].state.tabs.tabs.push(f2d);
    layout.hubs[0].state.tabs.tabs.push(createTab(4 as TabType, "Table"));
    layout.hubs[0].state.tabs.selected = 2; // Field2d selected
    writeLayout(layoutPath, layout);

    // Reorder: [Table(3), Doc(0), Field2d(2), LineGraph(1)]
    const read = readLayout(layoutPath);
    const tabs = read.hubs[0].state.tabs;
    const order = [3, 0, 2, 1];
    const oldTabs = tabs.tabs;
    tabs.tabs = order.map(i => oldTabs[i]);
    tabs.selected = order.indexOf(2); // Field2d was index 2, now at position 2
    writeLayout(layoutPath, read);

    const final = readLayout(layoutPath);
    const finalTabs = final.hubs[0].state.tabs;
    expect(finalTabs.tabs).toHaveLength(4);
    expect(finalTabs.tabs[0].title).toBe("Table");
    expect(finalTabs.tabs[1].title).toBe(""); // Documentation
    expect(finalTabs.tabs[2].title).toBe("Field2d");
    expect(finalTabs.tabs[3].title).toBe("LineGraph");
    // Verify renderer was preserved
    expect(finalTabs.tabs[2].renderer).toEqual({ mode: "cinematic" });
    expect(finalTabs.selected).toBe(2);
  });

  it("adds and removes hubs", () => {
    const layoutPath = path.join(tmpDir, "test-layout.json");
    const layout = createEmptyLayout();
    writeLayout(layoutPath, layout);

    // Add a second hub
    const read1 = readLayout(layoutPath);
    read1.hubs.push({
      x: 100,
      y: 100,
      width: 800,
      height: 600,
      state: createDefaultHubState(),
    });
    writeLayout(layoutPath, read1);

    const withTwo = readLayout(layoutPath);
    expect(withTwo.hubs).toHaveLength(2);
    expect(withTwo.hubs[1].width).toBe(800);

    // Remove the first hub
    withTwo.hubs.splice(0, 1);
    writeLayout(layoutPath, withTwo);

    const withOne = readLayout(layoutPath);
    expect(withOne.hubs).toHaveLength(1);
    expect(withOne.hubs[0].width).toBe(800);
  });

  it("update_tab merge logic: object controllers are shallow-merged", () => {
    const layoutPath = path.join(tmpDir, "test-layout.json");
    const layout = createEmptyLayout();
    const tab = createTab(1 as TabType, "Graph");
    tab.controller = { leftSources: [], rightSources: [], discreteSources: [] };
    layout.hubs[0].state.tabs.tabs.push(tab);
    writeLayout(layoutPath, layout);

    // Simulate update_tab shallow merge
    const read = readLayout(layoutPath);
    const existing = read.hubs[0].state.tabs.tabs[1];
    const updates = { leftSources: [{ type: "stepped", logKey: "/test" }] };

    if (
      existing.controller != null &&
      typeof existing.controller === "object" &&
      !Array.isArray(existing.controller) &&
      typeof updates === "object" &&
      !Array.isArray(updates)
    ) {
      existing.controller = { ...(existing.controller as Record<string, unknown>), ...updates };
    }
    writeLayout(layoutPath, read);

    const final = readLayout(layoutPath);
    const ctrl = final.hubs[0].state.tabs.tabs[1].controller as Record<string, unknown>;
    expect(ctrl.leftSources).toEqual([{ type: "stepped", logKey: "/test" }]);
    expect(ctrl.rightSources).toEqual([]); // preserved from original
    expect(ctrl.discreteSources).toEqual([]); // preserved from original
  });

  it("update_tab: array controllers are replaced entirely", () => {
    const layoutPath = path.join(tmpDir, "test-layout.json");
    const layout = createEmptyLayout();
    const tab = createTab(4 as TabType, "Table");
    tab.controller = ["/old1", "/old2"];
    layout.hubs[0].state.tabs.tabs.push(tab);
    writeLayout(layoutPath, layout);

    const read = readLayout(layoutPath);
    const existing = read.hubs[0].state.tabs.tabs[1];
    const newController = ["/new1", "/new2", "/new3"];

    // Array controllers get replaced
    if (
      existing.controller != null &&
      typeof existing.controller === "object" &&
      !Array.isArray(existing.controller) &&
      typeof newController === "object" &&
      !Array.isArray(newController)
    ) {
      existing.controller = { ...(existing.controller as Record<string, unknown>), ...(newController as unknown as Record<string, unknown>) };
    } else {
      existing.controller = newController;
    }
    writeLayout(layoutPath, read);

    const final = readLayout(layoutPath);
    expect(final.hubs[0].state.tabs.tabs[1].controller).toEqual(["/new1", "/new2", "/new3"]);
  });

  it("creates layout with satellite windows", () => {
    const layoutPath = path.join(tmpDir, "test-layout.json");
    const layout = createEmptyLayout();
    layout.satellites.push({
      uuid: "test-uuid-12345",
      x: 200,
      y: 200,
      width: 640,
      height: 480,
      state: createDefaultHubState(),
    });
    writeLayout(layoutPath, layout);

    const read = readLayout(layoutPath);
    expect(read.satellites).toHaveLength(1);
    expect((read.satellites[0] as any).uuid).toBe("test-uuid-12345");
    expect(validateApplicationState(read)).toEqual([]);
  });
});

describe("asset workflow", () => {
  it("creates, reads, and deletes an asset", () => {
    const assetDir = path.join(tmpDir, "Field2d_TestField");
    const configPath = path.join(assetDir, "config.json");
    const config = {
      name: "TestField",
      isFTC: false,
      coordinateSystem: "wall-blue" as const,
      topLeft: [100, 50] as [number, number],
      bottomRight: [900, 500] as [number, number],
      widthInches: 648,
      heightInches: 324,
    };

    writeAssetConfig(configPath, config);
    expect(fs.existsSync(configPath)).toBe(true);

    const read = readAssetConfig(configPath);
    expect(read.name).toBe("TestField");

    const type = inferAssetType(configPath);
    expect(type).toBe("Field2d");

    deleteAssetDir(assetDir);
    expect(fs.existsSync(assetDir)).toBe(false);
  });

  it("lists assets filtered by type", () => {
    // Create two assets
    const field2dDir = path.join(tmpDir, "Field2d_A");
    const robotDir = path.join(tmpDir, "Robot_B");
    writeAssetConfig(path.join(field2dDir, "config.json"), {
      name: "A",
      isFTC: false,
      coordinateSystem: "wall-blue" as const,
      topLeft: [0, 0] as [number, number],
      bottomRight: [100, 100] as [number, number],
      widthInches: 648,
      heightInches: 324,
    });
    writeAssetConfig(path.join(robotDir, "config.json"), {
      name: "B",
      isFTC: false,
      disableSimplification: false,
      rotations: [],
      position: [0, 0, 0] as [number, number, number],
      cameras: [],
      components: [],
    });

    const all = listAssetDirs(tmpDir);
    expect(all).toHaveLength(2);

    const field2dOnly = listAssetDirs(tmpDir, "Field2d");
    expect(field2dOnly).toHaveLength(1);
    expect(field2dOnly[0].type).toBe("Field2d");

    const robotOnly = listAssetDirs(tmpDir, "Robot");
    expect(robotOnly).toHaveLength(1);
    expect(robotOnly[0].type).toBe("Robot");
  });

  it("deleteAssetDir removes entire directory tree", () => {
    const assetDir = path.join(tmpDir, "Robot_TestBot");
    fs.mkdirSync(assetDir, { recursive: true });
    fs.writeFileSync(path.join(assetDir, "config.json"), "{}");
    fs.writeFileSync(path.join(assetDir, "model.glb"), "binary");

    expect(fs.existsSync(assetDir)).toBe(true);
    deleteAssetDir(assetDir);
    expect(fs.existsSync(assetDir)).toBe(false);
  });
});

describe("preferences workflow", () => {
  it("reads defaults when file doesn't exist", () => {
    const prefsPath = path.join(tmpDir, "prefs.json");
    const prefs = readPreferences(prefsPath);
    expect(prefs.theme).toBe("system");
    expect(prefs.robotAddress).toBe("10.00.00.2");
    expect(prefs.liveMode).toBe("nt4");
  });

  it("merges saved preferences with defaults", () => {
    const prefsPath = path.join(tmpDir, "prefs.json");
    fs.writeFileSync(prefsPath, JSON.stringify({ theme: "dark", robotAddress: "10.71.60.2" }));
    const prefs = readPreferences(prefsPath);
    expect(prefs.theme).toBe("dark");
    expect(prefs.robotAddress).toBe("10.71.60.2");
    expect(prefs.liveMode).toBe("nt4"); // default
  });
});
