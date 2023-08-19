import nipplejs from "https://cdn.jsdelivr.net/npm/nipplejs@0.10.1/+esm";
/**
 * JoystickMap: A handler to facilitate joystick navigation in mapbox gl maps.
 *
 * Enables joystick-controlled navigation within a Mapbox GL map. It adjusts
 * the view based on joystick input, handling bearing and vertical offsets.
 *
 * @author @frdmsr 2023
 * @license MIT
 */
export class JoystickMap {
  /**
   * Initializes a new instance of JoystickMap.
   * @param {Object} map - The Mapbox GL map instance.
   * @param {string} selector - The CSS selector to bind the joystick to.
   */
  constructor(map, selector) {
    this._map = map;
    this._joystickContainer = document.querySelector(selector);
    this._initializeState();
    this._initializeJoystick();
    this._render().catch(console.error);
  }

  /**
   * Initializes the default state.
   */
  _initializeState() {
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
  }

  /**
   * Initializes the joystick using nipplejs.
   */
  _initializeJoystick() {
    this._joystick = nipplejs.create({
      zone: this._joystickContainer,
      mode: "static",
      position: {
        top: "50%",
        left: "50%",
      },
    });

    this._joystick.on("move", (_, data) => {
      this._state.delta.b = (data.vector.x * this._state.speed) / 5 || 0;
      this._state.delta.y = data.vector.y * this._state.speed * -1000 || 0;
    });

    this._joystick.on("end", () => {
      this._state.delta.b = 0;
      this._state.delta.y = 0;
    });
  }

  /**
   * Starts the rendering loop to apply joystick controls to the map view.
   * @param {boolean} [force=false] - Force the render even if already rendering.
   */
  async _render(force = false) {
    if (this._state.rendering && !force) return;

    this._state.rendering = true;
    this._state.bearing += this._state.delta.b;
    this._state.offset[1] = this._state.delta.y;

    const camera = this._map.getFreeCameraOptions();
    const point = this._map.project(camera.position.toLngLat());
    point.x += this._state.offset[0];
    point.y += this._state.offset[1];

    const coord = this._map.unproject(point);
    camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
      coord,
      this._state.altitude
    );
    camera.setPitchBearing(this._state.pitch, this._state.bearing);

    this._map.setFreeCameraOptions(camera);

    await this._waitForNextFrame();
    this._state.rendering = false;
    await this._render();
  }

  /**
   * Waits for the next animation frame.
   * @returns {Promise} - Resolves when the next animation frame is available.
   */
  _waitForNextFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(resolve);
    });
  }
}
