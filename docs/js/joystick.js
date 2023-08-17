import nipplejs from "https://cdn.jsdelivr.net/npm/nipplejs@0.10.1/+esm";

export class JoystickMap {
  constructor(map, selector) {
    this._map = map;
    this._el_ctrl = document.querySelector(selector);

    this._state = {
      ctrlAIsUsed: false,
      ctrlBIsUsed: false,
      center: {
        lng: 67.96553657077601,
        lat: 33.60321971447401,
      },
      offset: [0, 0],
      pitch: 80,
      bearing: -111.19,
      zoom: 11.91,
      delta: {
        x: 0,
        y: 0,
        z: 0,
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

    /**
     * Directional input
     */
    this._ctrl.on("move", (_, d) => {
      state.delta.b = d.vector.x * 1;
      state.delta.y = d.vector.y * 10;
    });

    this._ctrl.on("start", async () => {
      try {
        state.ctrlAIsUsed = true;
        await this.render();
      } catch (e) {
        console.error(e);
      }
    });

    this._ctrl.on("end", () => {
      state.ctrlAIsUsed = false;
      state.delta.b = 0;
      state.delta.y = 0;
    });
  }

  async render(force) {
    const state = this._state;
    const skip = state.rendering || (!state.ctrlAIsUsed && !state.ctrlBIsUsed);

    if (skip && !force) {
      return;
    }

    state.rendering = true;
    state.bearing += state.delta.b;
    state.offset[1] = -state.delta.y;
    this._map.jumpTo(
      {
        bearing: state.bearing,
      },
      {
        duration: 0,
      }
    );
    this._map.panBy(state.offset, {
      duration: 0,
    });
    await nextFrame();
    state.rendering = false;
    await this.render();
  }
}

function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}
