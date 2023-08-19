import nipplejs from "https://cdn.jsdelivr.net/npm/nipplejs@0.10.1/+esm";

export class JoystickMap {
  constructor(map, selector) {
    this._map = map;
    this._el_ctrl = document.querySelector(selector);

    this._state = {
      offset: [0, 0],
      pitch: 80,
      bearing: this._map.getBearing(),
      speed: 2,
      altitude: 5000,
      delta: {
        x: 0,
        y: 0,
        p: 0,
        b: 0,
      },
    };

    this._ctrl = nipplejs.create({
      zone: this._el_ctrl,
      mode: "static",
      position: {
        top: "50%",
        left: "50%",
      },
    });
    const state = this._state;

    this._ctrl.on("move", (_, d) => {
      state.delta.b = (d.vector.x * state.speed) / 5 || 0;
      state.delta.y = d.vector.y * state.speed * -1000 || 0;
    });

    this._ctrl.on("end", () => {
      state.delta.b = 0;
      state.delta.y = 0;
    });

    this.render().catch(console.error);
  }

  async render(force) {
    const state = this._state;
    const skip = state.rendering;

    if (skip && !force) {
      return;
    }
    state.rendering = true;
    state.bearing += state.delta.b;
    state.offset[1] = state.delta.y;

    const camera = this._map.getFreeCameraOptions();
    const point = this._map.project(camera.position.toLngLat());

    point.x = point.x + state.offset[0];
    point.y = point.y + state.offset[1];
    const coord = this._map.unproject(point);

    camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
      coord,
      state.altitude
    );

    camera.setPitchBearing(state.pitch, state.bearing);

    this._map.setFreeCameraOptions(camera);

    await this.nextFrame();
    state.rendering = false;
    await this.render();
  }

  nextFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }
}
