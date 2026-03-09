import { describe, it, expect } from "vitest";
import {
  TAB_SOURCE_CONFIGS,
  SIMPLE_TAB_SCHEMAS,
  SOURCE_LIST_TAB_TYPES,
  validateSourceItem,
  validateParentChild,
  getSourcesArray,
  resolveLineGraphSection,
  type SourceListItemState,
} from "../src/schema/source-types.js";

describe("Source type configurations", () => {
  it("has configs for all SourceListState tab types", () => {
    for (const tabType of SOURCE_LIST_TAB_TYPES) {
      expect(TAB_SOURCE_CONFIGS.has(tabType)).toBe(true);
    }
  });

  it("has simple schemas for non-SourceListState tabs", () => {
    const expectedSimple = [0, 4, 5, 7, 8, 12];
    for (const tabType of expectedSimple) {
      expect(SIMPLE_TAB_SCHEMAS.has(tabType)).toBe(true);
    }
  });

  it("covers all 13 tab types between source configs and simple schemas", () => {
    for (let i = 0; i <= 12; i++) {
      const hasSource = TAB_SOURCE_CONFIGS.has(i);
      const hasSimple = SIMPLE_TAB_SCHEMAS.has(i);
      expect(hasSource || hasSimple).toBe(true);
      expect(hasSource && hasSimple).toBe(false); // no overlap
    }
  });

  it("every source type config has non-empty sourceTypes", () => {
    for (const [, config] of TAB_SOURCE_CONFIGS) {
      for (const type of config.types) {
        expect(type.sourceTypes.length).toBeGreaterThan(0);
      }
    }
  });

  it("every source type option has at least one value", () => {
    for (const [, config] of TAB_SOURCE_CONFIGS) {
      for (const type of config.types) {
        for (const option of type.options) {
          expect(option.values.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("validateSourceItem", () => {
  it("accepts a valid LineGraph stepped source", () => {
    const item: SourceListItemState = {
      type: "stepped",
      logKey: "/RealOutputs/Drive/LeftVelocity",
      logType: "Number",
      visible: true,
      options: { color: "#e48b32", size: "bold" },
    };
    expect(validateSourceItem(1, item)).toEqual([]);
  });

  it("accepts a valid Swerve states source", () => {
    const item: SourceListItemState = {
      type: "states",
      logKey: "/RealOutputs/Drive/SwerveStates",
      logType: "SwerveModuleState[]",
      visible: true,
      options: { arrangement: "0,1,2,3" },
    };
    expect(validateSourceItem(9, item)).toEqual([]);
  });

  it("accepts a valid Field2d robot source", () => {
    const item: SourceListItemState = {
      type: "robot",
      logKey: "/RealOutputs/Drive/Pose",
      logType: "Pose2d",
      visible: true,
      options: {},
    };
    expect(validateSourceItem(2, item)).toEqual([]);
  });

  it("rejects invalid type key", () => {
    const item: SourceListItemState = {
      type: "nonexistent",
      logKey: "/test",
      logType: "Number",
      visible: true,
      options: {},
    };
    const errors = validateSourceItem(1, item);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Invalid source type");
    expect(errors[0]).toContain("nonexistent");
  });

  it("rejects invalid logType for a given source type", () => {
    const item: SourceListItemState = {
      type: "stepped",
      logKey: "/test",
      logType: "Pose2d", // stepped only accepts Number
      visible: true,
      options: {},
    };
    const errors = validateSourceItem(1, item);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Invalid logType");
    expect(errors[0]).toContain("Pose2d");
  });

  it("rejects invalid option key", () => {
    const item: SourceListItemState = {
      type: "stepped",
      logKey: "/test",
      logType: "Number",
      visible: true,
      options: { nonexistent: "value" },
    };
    const errors = validateSourceItem(1, item);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Unknown option");
  });

  it("rejects invalid option value", () => {
    const item: SourceListItemState = {
      type: "stepped",
      logKey: "/test",
      logType: "Number",
      visible: true,
      options: { color: "rainbow" },
    };
    const errors = validateSourceItem(1, item);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("Invalid value");
    expect(errors[0]).toContain("rainbow");
  });

  it("accepts hex color values from GraphColors", () => {
    const item: SourceListItemState = {
      type: "stepped",
      logKey: "/test",
      logType: "Number",
      visible: true,
      options: { color: "#2b66a2" }, // Blue
    };
    expect(validateSourceItem(1, item)).toEqual([]);
  });

  it("accepts arbitrary hex colors not in preset list", () => {
    const item: SourceListItemState = {
      type: "stepped",
      logKey: "/test",
      logType: "Number",
      visible: true,
      options: { color: "#7c5cff" }, // Custom purple, not in presets
    };
    expect(validateSourceItem(1, item)).toEqual([]);
  });

  it("accepts empty string for bumpers (Alliance Color)", () => {
    const item: SourceListItemState = {
      type: "robot",
      logKey: "/pose",
      logType: "Pose2d",
      visible: true,
      options: { bumpers: "" },
    };
    expect(validateSourceItem(2, item)).toEqual([]);
  });

  it("returns error for non-SourceListState tab types", () => {
    const item: SourceListItemState = {
      type: "stepped",
      logKey: "/test",
      logType: "Number",
      visible: true,
      options: {},
    };
    const errors = validateSourceItem(4, item); // Table
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("does not use SourceListState");
  });

  it("reports multiple errors at once", () => {
    const item: SourceListItemState = {
      type: "stepped",
      logKey: "/test",
      logType: "Pose2d", // wrong logType
      visible: true,
      options: { color: "rainbow", badKey: "badValue" }, // wrong value + unknown key
    };
    const errors = validateSourceItem(1, item);
    expect(errors.length).toBe(3);
  });

  it("accepts a valid Mechanism source", () => {
    const item: SourceListItemState = {
      type: "mechanism",
      logKey: "/SmartDashboard/Arm",
      logType: "Mechanism2d",
      visible: true,
      options: {},
    };
    expect(validateSourceItem(10, item)).toEqual([]);
  });

  it("rejects options on a type with no options", () => {
    const item: SourceListItemState = {
      type: "mechanism",
      logKey: "/SmartDashboard/Arm",
      logType: "Mechanism2d",
      visible: true,
      options: { color: "#ff0000" },
    };
    const errors = validateSourceItem(10, item);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain("does not accept any options");
  });

  it("accepts Points circle source with valid options", () => {
    const item: SourceListItemState = {
      type: "circle",
      logKey: "/Vision/Targets",
      logType: "Translation2d[]",
      visible: true,
      options: { size: "large", groupSize: "4" },
    };
    expect(validateSourceItem(11, item)).toEqual([]);
  });

  it("accepts Statistics error sources", () => {
    const item: SourceListItemState = {
      type: "relativeError",
      logKey: "/RealOutputs/Error",
      logType: "Number",
      visible: true,
      options: { color: "#af2437" },
    };
    expect(validateSourceItem(6, item)).toEqual([]);
  });
});

describe("validateParentChild", () => {
  it("returns null for non-child types", () => {
    const result = validateParentChild(2, [], "robot");
    expect(result).toBeNull();
  });

  it("returns error when child has no parent", () => {
    const result = validateParentChild(2, [], "vision");
    expect(result).not.toBeNull();
    expect(result).toContain("requires a parent");
    expect(result).toContain("robot");
  });

  it("returns null when parent exists", () => {
    const sources: SourceListItemState[] = [
      { type: "robot", logKey: "/pose", logType: "Pose2d", visible: true, options: {} },
    ];
    const result = validateParentChild(2, sources, "vision");
    expect(result).toBeNull();
  });

  it("validates Statistics error requires reference parent", () => {
    const result = validateParentChild(6, [], "relativeError");
    expect(result).not.toBeNull();
    expect(result).toContain("reference");
  });

  it("accepts Statistics error with reference parent", () => {
    const sources: SourceListItemState[] = [
      { type: "reference", logKey: "/ref", logType: "Number", visible: true, options: {} },
    ];
    const result = validateParentChild(6, sources, "absoluteError");
    expect(result).toBeNull();
  });

  it("validates 3D field component requires robot parent", () => {
    const result = validateParentChild(3, [], "component");
    expect(result).not.toBeNull();
    expect(result).toContain("robot");
  });

  it("validates Points component requires split parent", () => {
    const result = validateParentChild(11, [], "component");
    expect(result).not.toBeNull();
    expect(result).toContain("plusSplit");
  });

  it("accepts Points component with split parent", () => {
    const sources: SourceListItemState[] = [
      { type: "plusSplit", logKey: "/data", logType: "NumberArray", visible: true, options: { component: "x" } },
    ];
    const result = validateParentChild(11, sources, "component");
    expect(result).toBeNull();
  });

  it("returns null for non-SourceListState tabs", () => {
    const result = validateParentChild(4, [], "anything");
    expect(result).toBeNull();
  });
});

describe("resolveLineGraphSection", () => {
  it("auto-detects numeric types to leftSources", () => {
    expect(resolveLineGraphSection("stepped")).toBe("leftSources");
    expect(resolveLineGraphSection("smooth")).toBe("leftSources");
    expect(resolveLineGraphSection("points")).toBe("leftSources");
  });

  it("auto-detects discrete types to discreteSources", () => {
    expect(resolveLineGraphSection("stripes")).toBe("discreteSources");
    expect(resolveLineGraphSection("graph")).toBe("discreteSources");
    expect(resolveLineGraphSection("alerts")).toBe("discreteSources");
  });

  it("allows explicit rightSources override", () => {
    expect(resolveLineGraphSection("stepped", "rightSources")).toBe("rightSources");
  });

  it("throws for invalid section", () => {
    expect(() => resolveLineGraphSection("stepped", "invalid")).toThrow("Invalid section");
  });
});

describe("getSourcesArray", () => {
  it("navigates to sources property for Field2d", () => {
    const ctrl = { sources: [{ type: "robot", logKey: "/pose", logType: "Pose2d", visible: true, options: {} }], field: "2024" };
    const { sources } = getSourcesArray(ctrl, 2);
    expect(sources.length).toBe(1);
    expect(sources[0].type).toBe("robot");
  });

  it("navigates to sources property for Swerve", () => {
    const ctrl = { sources: [], maxSpeed: 4.5 };
    const { sources } = getSourcesArray(ctrl, 9);
    expect(sources).toEqual([]);
  });

  it("returns flat array for Mechanism", () => {
    const ctrl = [{ type: "mechanism", logKey: "/mech", logType: "Mechanism2d", visible: true, options: {} }];
    const { sources } = getSourcesArray(ctrl, 10);
    expect(sources.length).toBe(1);
  });

  it("navigates to leftSources for LineGraph", () => {
    const ctrl = {
      leftSources: [{ type: "stepped", logKey: "/a", logType: "Number", visible: true, options: {} }],
      rightSources: [],
      discreteSources: [],
    };
    const { sources } = getSourcesArray(ctrl, 1, "leftSources");
    expect(sources.length).toBe(1);
    expect(sources[0].logKey).toBe("/a");
  });

  it("navigates to rightSources for LineGraph", () => {
    const ctrl = {
      leftSources: [],
      rightSources: [{ type: "smooth", logKey: "/b", logType: "Number", visible: true, options: {} }],
      discreteSources: [],
    };
    const { sources } = getSourcesArray(ctrl, 1, "rightSources");
    expect(sources.length).toBe(1);
    expect(sources[0].logKey).toBe("/b");
  });

  it("creates empty array when missing for Field2d", () => {
    const ctrl = { field: "2024" } as Record<string, unknown>;
    const { sources } = getSourcesArray(ctrl, 2);
    expect(sources).toEqual([]);
    expect(ctrl.sources).toEqual([]);
  });

  it("throws for non-SourceListState tab", () => {
    expect(() => getSourcesArray(null, 4)).toThrow("does not use SourceListState");
  });
});
