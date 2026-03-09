import { describe, it, expect } from "vitest";
import {
  validateConfig2dField,
  validateConfig3dField,
  validateConfig3dRobot,
  validateConfigJoystick,
  validateAssetConfig,
  validateApplicationState,
  validatePreferences,
  validateTabController,
} from "../src/schema/validation.js";

describe("validateConfig2dField", () => {
  it("accepts a valid 2D field config", () => {
    const config = {
      name: "TestField",
      isFTC: false,
      coordinateSystem: "wall-blue",
      topLeft: [100, 50],
      bottomRight: [900, 500],
      widthInches: 648,
      heightInches: 324,
    };
    expect(validateConfig2dField(config)).toEqual([]);
  });

  it("rejects missing name", () => {
    const config = {
      isFTC: false,
      coordinateSystem: "wall-blue",
      topLeft: [100, 50],
      bottomRight: [900, 500],
      widthInches: 648,
      heightInches: 324,
    };
    const errors = validateConfig2dField(config);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects invalid coordinate system", () => {
    const config = {
      name: "TestField",
      isFTC: false,
      coordinateSystem: "invalid-system",
      topLeft: [100, 50],
      bottomRight: [900, 500],
      widthInches: 648,
      heightInches: 324,
    };
    const errors = validateConfig2dField(config);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects negative dimensions", () => {
    const config = {
      name: "TestField",
      isFTC: false,
      coordinateSystem: "wall-blue",
      topLeft: [100, 50],
      bottomRight: [900, 500],
      widthInches: -648,
      heightInches: 324,
    };
    const errors = validateConfig2dField(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("validateConfig3dRobot", () => {
  it("accepts a valid robot config", () => {
    const config = {
      name: "TestBot",
      isFTC: false,
      disableSimplification: false,
      rotations: [{ axis: "z", degrees: 90 }],
      position: [0, 0, 0],
      cameras: [],
      components: [],
    };
    expect(validateConfig3dRobot(config)).toEqual([]);
  });

  it("accepts a robot config with cameras", () => {
    const config = {
      name: "TestBot",
      isFTC: false,
      disableSimplification: false,
      rotations: [],
      position: [0, 0, 0],
      cameras: [
        {
          name: "Front Camera",
          rotations: [{ axis: "y", degrees: 20 }],
          position: [0.2, 0, 0.8],
          resolution: [960, 720],
          fov: 100,
        },
      ],
      components: [],
    };
    expect(validateConfig3dRobot(config)).toEqual([]);
  });

  it("rejects invalid rotation axis", () => {
    const config = {
      name: "TestBot",
      isFTC: false,
      disableSimplification: false,
      rotations: [{ axis: "w", degrees: 90 }],
      position: [0, 0, 0],
      cameras: [],
      components: [],
    };
    const errors = validateConfig3dRobot(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("validateConfig3dField", () => {
  it("accepts a valid 3D field config with all arrays", () => {
    const config = {
      name: "TestField3d",
      isFTC: false,
      coordinateSystem: "wall-blue",
      rotations: [{ axis: "x", degrees: -90 }],
      position: [0, 0, 0],
      widthInches: 648,
      heightInches: 324,
      driverStations: [[1.2, 0.5], [1.2, -0.5]],
      gamePieces: [
        {
          name: "Note",
          rotations: [{ axis: "z", degrees: 45 }],
          position: [1.0, 2.0, 0.0],
          stagedObjects: ["note.glb"],
        },
      ],
      aprilTags: [
        {
          variant: "36h11-6.5in",
          id: 1,
          rotations: [{ axis: "y", degrees: 0 }],
          position: [0.5, 1.0, 1.2],
        },
      ],
    };
    expect(validateConfig3dField(config)).toEqual([]);
  });

  it("accepts a valid 3D field config with defaultOrigin", () => {
    const config = {
      name: "TestField3d",
      isFTC: false,
      coordinateSystem: "center-rotated",
      rotations: [],
      position: [0, 0, 0],
      widthInches: 648,
      heightInches: 324,
      defaultOrigin: "blue",
      driverStations: [],
      gamePieces: [],
      aprilTags: [],
    };
    expect(validateConfig3dField(config)).toEqual([]);
  });

  it("accepts a minimal 3D field config with empty arrays", () => {
    const config = {
      name: "EmptyField",
      isFTC: true,
      coordinateSystem: "center-red",
      rotations: [],
      position: [0, 0, 0],
      widthInches: 144,
      heightInches: 144,
      driverStations: [],
      gamePieces: [],
      aprilTags: [],
    };
    expect(validateConfig3dField(config)).toEqual([]);
  });

  it("rejects invalid rotation axis in field rotations", () => {
    const config = {
      name: "BadField",
      isFTC: false,
      coordinateSystem: "wall-blue",
      rotations: [{ axis: "w", degrees: 90 }],
      position: [0, 0, 0],
      widthInches: 648,
      heightInches: 324,
      driverStations: [],
      gamePieces: [],
      aprilTags: [],
    };
    const errors = validateConfig3dField(config);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects negative width", () => {
    const config = {
      name: "BadField",
      isFTC: false,
      coordinateSystem: "wall-blue",
      rotations: [],
      position: [0, 0, 0],
      widthInches: -100,
      heightInches: 324,
      driverStations: [],
      gamePieces: [],
      aprilTags: [],
    };
    const errors = validateConfig3dField(config);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects missing required fields", () => {
    const config = {
      name: "IncompleteField",
      isFTC: false,
    };
    const errors = validateConfig3dField(config);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects invalid AprilTag (missing id)", () => {
    const config = {
      name: "TestField",
      isFTC: false,
      coordinateSystem: "wall-blue",
      rotations: [],
      position: [0, 0, 0],
      widthInches: 648,
      heightInches: 324,
      driverStations: [],
      gamePieces: [],
      aprilTags: [
        {
          variant: "36h11-6.5in",
          rotations: [],
          position: [0, 0, 0],
        },
      ],
    };
    const errors = validateConfig3dField(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("validateTabController", () => {
  it("accepts null for Documentation tab", () => {
    expect(validateTabController(0, null)).toEqual([]);
  });

  it("accepts null for Metadata tab", () => {
    expect(validateTabController(12, null)).toEqual([]);
  });

  it("warns when Documentation tab has non-null controller", () => {
    const errors = validateTabController(0, { something: true });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("null");
  });

  it("accepts string array for Table tab", () => {
    expect(validateTabController(4, ["/field1", "/field2"])).toEqual([]);
  });

  it("accepts string array for Joysticks tab", () => {
    expect(validateTabController(8, ["layout1", "layout2"])).toEqual([]);
  });

  it("rejects non-array for Table tab", () => {
    const errors = validateTabController(4, { sources: [] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("string array");
  });

  it("accepts string for Console tab", () => {
    expect(validateTabController(5, "/some/field")).toEqual([]);
  });

  it("accepts null for Console tab", () => {
    expect(validateTabController(5, null)).toEqual([]);
  });

  it("rejects number for Console tab", () => {
    const errors = validateTabController(5, 42);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts object for Video tab", () => {
    expect(validateTabController(7, { source: "local" })).toEqual([]);
  });

  it("rejects array for Video tab", () => {
    const errors = validateTabController(7, ["something"]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("object");
  });

  it("accepts object for LineGraph tab (SourceListState)", () => {
    expect(validateTabController(1, { leftSources: [], rightSources: [], discreteSources: [] })).toEqual([]);
  });

  it("accepts array for Mechanism tab", () => {
    expect(validateTabController(10, [])).toEqual([]);
  });

  it("rejects object for Mechanism tab", () => {
    const errors = validateTabController(10, { sources: [] });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("array");
  });

  it("accepts null for any tab type (uninitialized)", () => {
    // null is acceptable for any tab type (uninitialized state)
    expect(validateTabController(1, null)).toEqual([]);
    expect(validateTabController(4, null)).toEqual([]);
    expect(validateTabController(7, null)).toEqual([]);
  });
});

describe("validateConfigJoystick", () => {
  it("accepts a valid joystick config", () => {
    const config = {
      name: "TestJoystick",
      components: [
        {
          type: "button",
          isYellow: false,
          isEllipse: false,
          centerPx: [50, 50],
          sizePx: [30, 30],
          sourceIndex: 0,
        },
        {
          type: "joystick",
          isYellow: false,
          centerPx: [150, 150],
          radiusPx: 40,
          xSourceIndex: 0,
          xSourceInverted: false,
          ySourceIndex: 1,
          ySourceInverted: false,
        },
        {
          type: "axis",
          isYellow: false,
          centerPx: [200, 200],
          sizePx: [50, 50],
          sourceIndex: 2,
          sourceRange: [0, 1],
        },
      ],
    };
    expect(validateConfigJoystick(config)).toEqual([]);
  });

  it("rejects empty name", () => {
    const config = {
      name: "",
      components: [],
    };
    const errors = validateConfigJoystick(config);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("validateAssetConfig", () => {
  it("dispatches to correct validator by asset type", () => {
    const field2d = {
      name: "Test",
      isFTC: false,
      coordinateSystem: "wall-blue",
      topLeft: [0, 0],
      bottomRight: [100, 100],
      widthInches: 648,
      heightInches: 324,
    };
    expect(validateAssetConfig("Field2d", field2d)).toEqual([]);
  });

  it("returns error for unknown asset type", () => {
    const errors = validateAssetConfig("Unknown" as any, {});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toContain("Unknown");
  });
});

describe("validateApplicationState", () => {
  it("accepts a valid layout", () => {
    const state = {
      hubs: [
        {
          x: 0,
          y: 0,
          width: 1280,
          height: 720,
          state: {
            sidebar: { width: 160, expanded: [] },
            tabs: {
              selected: 0,
              tabs: [
                {
                  type: 0,
                  title: "",
                  controller: null,
                  controllerUUID: "abc123",
                  renderer: null,
                  controlsHeight: 0,
                },
              ],
            },
          },
        },
      ],
      satellites: [],
    };
    expect(validateApplicationState(state)).toEqual([]);
  });

  it("rejects missing hubs", () => {
    const errors = validateApplicationState({ satellites: [] });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("validatePreferences", () => {
  it("accepts valid partial preferences", () => {
    const prefs = {
      theme: "dark",
      robotAddress: "10.71.60.2",
    };
    expect(validatePreferences(prefs)).toEqual([]);
  });

  it("rejects invalid theme", () => {
    const errors = validatePreferences({ theme: "midnight" });
    expect(errors.length).toBeGreaterThan(0);
  });
});
