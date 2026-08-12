import { describe, expect, it, vi } from "vitest";
import { createMapController } from "./mapController";

describe("map controller", () => {
  it("forwards navigation and highlighted geometry to the active map adapter", () => {
    const flyTo = vi.fn();
    const showGeometry = vi.fn();
    const controller = createMapController();

    controller.attach({ flyTo, showGeometry });
    controller.flyTo([120.67, 24.15], 15);
    controller.showGeometry({
      id: "road-event",
      type: "point",
      coordinates: [120.67, 24.15],
      color: "#C33A4A",
    });

    expect(flyTo).toHaveBeenCalledWith([120.67, 24.15], 15);
    expect(showGeometry).toHaveBeenCalledWith(expect.objectContaining({ id: "road-event" }));
  });

  it("ignores commands when no map is attached", () => {
    const controller = createMapController();
    expect(() => controller.flyTo([120.67, 24.15], 15)).not.toThrow();
    expect(() => controller.showGeometry({
      id: "road-event",
      type: "point",
      coordinates: [120.67, 24.15],
      color: "#C33A4A",
    })).not.toThrow();
  });
});
