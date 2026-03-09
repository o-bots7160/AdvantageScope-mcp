import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ApplicationState,
  HubState,
  TabState,
  TabType,
  Preferences,
} from "../schema/types.js";
import { DEFAULT_PREFERENCES, TAB_TYPE_NAMES } from "../schema/types.js";

export function readLayout(filePath: string): ApplicationState {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content) as ApplicationState;
}

export function writeLayout(
  filePath: string,
  layout: ApplicationState,
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(layout, null, 2) + "\n", "utf-8");
}

function generateUUID(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createTab(type: TabType, title?: string): TabState {
  return {
    type,
    title: title ?? TAB_TYPE_NAMES[type] ?? "",
    controller: null,
    controllerUUID: generateUUID(),
    renderer: null,
    controlsHeight: 0,
  };
}

export function createDefaultHubState(): HubState {
  return {
    sidebar: {
      width: 160,
      expanded: [],
    },
    tabs: {
      selected: 0,
      tabs: [createTab(0, "")], // Documentation tab
    },
  };
}

export function createEmptyLayout(): ApplicationState {
  return {
    hubs: [
      {
        x: 0,
        y: 0,
        width: 1280,
        height: 720,
        state: createDefaultHubState(),
      },
    ],
    satellites: [],
  };
}

export function readPreferences(filePath: string): Preferences {
  if (!fs.existsSync(filePath)) {
    return { ...DEFAULT_PREFERENCES };
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(content);
  return { ...DEFAULT_PREFERENCES, ...parsed };
}

export function writePreferences(
  filePath: string,
  prefs: Preferences,
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(prefs, null, 2) + "\n", "utf-8");
}
