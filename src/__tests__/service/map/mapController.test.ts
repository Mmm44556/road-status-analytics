import { describe, expect, it, vi } from "vitest";
import { createMapController } from "@/service/map/shared/mapController";

describe("map controller", () => {
  it("forwards navigation and highlighted geometry to the active map adapter", () => {
    const flyTo = vi.fn();
    const showGeometry = vi.fn();
    const hideGeometry = vi.fn();
    const fitTaiwan = vi.fn();
    const fitCounty = vi.fn();
    const setUserLocation = vi.fn();
    const setSearchLocation = vi.fn();
    const controller = createMapController();

    controller.attach({
      flyTo,
      showGeometry,
      hideGeometry,
      fitTaiwan,
      fitCounty,
      setUserLocation,
      setSearchLocation,
    });
    controller.flyTo([120.67, 24.15], 15);
    controller.fitTaiwan();
    controller.fitCounty('64000');
    controller.setUserLocation([120.67, 24.15]);
    controller.setUserLocation(null);
    controller.setSearchLocation([120.302, 22.6397]);
    controller.setSearchLocation(null);
    controller.showGeometry({
      id: "road-event",
      type: "point",
      coordinates: [120.67, 24.15],
      color: "#C33A4A",
    });

    expect(flyTo).toHaveBeenCalledWith([120.67, 24.15], 15);
    expect(fitTaiwan).toHaveBeenCalledOnce();
    expect(fitCounty).toHaveBeenCalledWith('64000');
    expect(setUserLocation).toHaveBeenNthCalledWith(1, [120.67, 24.15]);
    expect(setUserLocation).toHaveBeenNthCalledWith(2, null);
    expect(setSearchLocation).toHaveBeenNthCalledWith(1, [120.302, 22.6397]);
    expect(setSearchLocation).toHaveBeenNthCalledWith(2, null);
    expect(showGeometry).toHaveBeenCalledWith(expect.objectContaining({ id: "road-event" }));

    controller.hideGeometry("road-event");
    expect(hideGeometry).toHaveBeenCalledWith("road-event");
  });

  it("ignores commands when no map is attached", () => {
    const controller = createMapController();
    expect(() => controller.flyTo([120.67, 24.15], 15)).not.toThrow();
    expect(() => controller.fitTaiwan()).not.toThrow();
    expect(() => controller.fitCounty('64000')).not.toThrow();
    expect(() => controller.setUserLocation([120.67, 24.15])).not.toThrow();
    expect(() => controller.setUserLocation(null)).not.toThrow();
    expect(() => controller.setSearchLocation([120.302, 22.6397])).not.toThrow();
    expect(() => controller.setSearchLocation(null)).not.toThrow();
    expect(() => controller.showGeometry({
      id: "road-event",
      type: "point",
      coordinates: [120.67, 24.15],
      color: "#C33A4A",
    })).not.toThrow();
    expect(() => controller.hideGeometry("road-event")).not.toThrow();
  });
});
