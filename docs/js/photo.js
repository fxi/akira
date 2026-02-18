import { JoystickMap } from "./joystick.js";

/* 
        BROWSER COMPATIBILITY ==================
        NOTE: the blur effect does not work in firefox, and won't until it supports backdrop-filter: https://caniuse.com/css-backdrop-filter
        
        ****************************************
        REPLACE THE mapboxToken AND mapboxStyle WITH YOUR OWN MAPBOX MAP INFO
        ******************************************** */
// fxi.io/akira
//var mapboxToken="pk.eyJ1IjoiZnJlZGZ4aSIsImEiOiJjbGxmMnA4dzIwbmJhM3FuMWVjMm8zcW91In0.R6SBblqTtTw32KgxJSCBUA"
var mapboxToken="pk.eyJ1IjoiZnJlZGZ4aSIsImEiOiJja2psOTE5YWgwNm1jMnJxcDhmY25qc2gwIn0.VM7P6iTelL_rFnxTkO7LBQ"
var mapboxStyle ="mapbox://styles/fredfxi/cllf3l952012v01qs8npi4j95"

// SOME SETTINGS TO PLAY WITH
// ==========================

var tiltShiftMaxBlur = 4; // The maximum blur, in pixels, when the tilt-shift effect is fully on. 3 pixels is subtle and nice
//

var focus = document.getElementById("focus");
var tiltShiftBlur = document.getElementById("tiltShift");
var lensGrime = document.getElementById("lensGrime");
var lensReflection = document.getElementById("lensReflection");
var aberration = document.getElementById("aberration");
var photoEffect = document.getElementById("photoEffect");

var filmGrain = document.getElementById("filmGrain");
var mapDiv = document.getElementById("map");
var canvasElement = mapDiv.querySelector("canvas");
//var svgTurbulence = document.getElementById("svgTurbulence");
var svgDisplacementMap = document.getElementById("svgDisplacementMap");
//var svgBlur = document.getElementById("svgBlur");

var lensRotation = 0;

var effectsButton = document.getElementById("effectsButton");
var bodyTag = document.getElementById("bodyTag");

var localStorageName = "photoMap";

/* 
Initial map location settings
========================
When the page loads we check several things to decide on the locaiton of the map view.
We look at (in order of preference):
1. whether there is a well-formed set of location info in the URL hash.
    if not we fall back to...
2. we check if there is a "last location" in localStorage
    if not we fall back to...
3. The initial (default) settings defined in the variables below
*/

// London 51.50225,-0.13897,12.21,30.07,50.50
// Mt Fuji 35.37527,138.72744,11.34,-177.20,76.00
// Mt Snowdon 53.06559,-4.06381,12.53,-86.90,72.33

//initial map view if no previous map setting found in URL or local storage,

var useCache = false;
var initialLat = 35.37527;
var initialLng = 138.72744;
var initialZoom = 11.34;
var initialBearing = -86.9;
var initialPitch = 72.33;

var gotSomeLocationVariables = false; // did we find some well formed location varibales in the URL hash or localStorage?

var hashValues = location.hash.substring(1).split(",");
// check the URL hash values to see if it contains well-formed location info
if (hashValues.length == 5 && !hashValues.some(isNaN)) {
  // check if that location info looks valid; that there are 5 values and they are all numbers
  gotSomeLocationVariables = true;
} else if (localStorage[localStorageName]) {
  hashValues = localStorage[localStorageName].split(","); //check the browsers local storage to see if it contains any locaiton info
  if (hashValues.length == 5 && !hashValues.some(isNaN)) {
    // check if that location info looks valid; that there are 5 values and they are all numbers
    gotSomeLocationVariables = true;
  }
}

/* if we have some valid location info from the browsers URL or, failing that, the browsers localStorage cache, 
make the map use those settings (rather than the defaults) when it sets itself up */
if (useCache && gotSomeLocationVariables) {
  initialLat = parseFloat(hashValues[0]);
  initialLng = parseFloat(hashValues[1]);
  initialZoom = parseFloat(hashValues[2]);
  initialBearing = parseFloat(hashValues[3]);
  initialPitch = parseFloat(hashValues[4]);
} else {
  //they've not been here before, and not followed a URL that has valid location info embedded in it so let's show the help screen on startup
}

// Updates the URL hash to include the current location, zoom, pitch and bearing of the map
function updateURLHash() {
  var newHash = "";
  newHash = map.getCenter().lat.toFixed(5) + ",";
  newHash = newHash + map.getCenter().lng.toFixed(5) + ",";
  newHash = newHash + map.getZoom().toFixed(2) + ",";
  newHash = newHash + map.getBearing().toFixed(2) + ",";
  newHash = newHash + map.getPitch().toFixed(2) + "";

  location.hash = newHash;
  localStorage[localStorageName] = newHash;
}

// These easing functions are useful to ensure the amount of blur is
// not applied in a linear fashion when zooming in and out.
function easeInCubic(x) {
  return x * x * x;
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}
function easeInExpo(x) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}
function easeOutExpo(x) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

function degreesToRadians(degrees) {
  var pi = Math.PI;
  return degrees * (pi / 180);
}
var fractionZoomedOut = 0;
var lastFractionZoomedOut = 0;
var lastcameraHeightNormalized = 0;
var brightness = 1;
var contrast = 1;
var grayscale = 0;
var dropletInterval = 500; //milliseconds beteen rain drops
var akiramode = true;
if (akiramode) {
  dropletInterval = 300;
  grayscale = 1;
  mapDiv.style.filter =
    `hue-rotate(-6deg) contrast(` +
    contrast +
    `) brightness(` +
    brightness +
    `)  saturate(0.9) grayscale(` +
    grayscale +
    `)`;

  lensReflection.style.filter = "grayscale(" + grayscale + ")";
  //filmGrain.style.filter = 'blur(1px) grayscale(1) contrast(1)';
  filmGrain.style.backgroundSize = "220px";
  filmGrain.style.mixBlendMode = "difference";
  filmGrain.style.filter = "blur(0.3px) grayscale(1)";
  photoEffect.style.filter = "grayscale(1)";
  aberration.style.webkitMaskImage =
    "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 10%, black 60%)";
  aberration.style.maskImage =
    "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 10%, black 60%)";
  aberration.style.filter = "grayscale(1)";
  lensGrime.style.filter = "grayscale(1)";
}

// Here's the clever bit...
function addPhotoEffects() {
  // Get the map state and preapare some useful normalized values of zoom and pitch
  // ==============================================================================
  var pitch = map.getPitch();
  var pitchNormalized = pitch / 85;

  var bearing = map.getBearing() + 180;
  var zoom = map.getZoom() - 4; // minus 4 from zoom so that it starts at zero
  var cameraHeightNormalized = Math.min(
    map.getFreeCameraOptions().position.z * 1000,
    1
  );

  cameraHeightNormalized = Math.round(cameraHeightNormalized * 1000) / 1000; //round to 2 digits
  //console.log(cameraHeightNormalized);
  //round the fractionSoomedOut to 2 decimal places
  fractionZoomedOut = 1 - zoom / 18; // normalize the zoom so it is now constrained bewteen 0 and 1
  fractionZoomedOut = Math.round(fractionZoomedOut * 100) / 100; //round the fractionZoomedOut to 2 decimal places

  var fractionPitched = pitch / 80; // normalise pitch so that its now a value between 0 and 1 (zero being when you're looking down from above)
  var fractionPitchedBackwards = Math.max(1 - pitch / 80, 0); // normalise pitch so that its now a value between 1 and 0 (zero being when you're looking to the horizon)

  /*  Set the CSS values that control the tilt-shift 
                The numbers here look complex (like the amount of blur)...
                 blur is calculated by: (tiltShiftMaxBlur * easeInCubic(fractionPitched)) * fractionZoomedOut
                 , but each is simply similar to:
                 1) an amount of the effect: tiltShiftMaxBlur 
                 2) an adjustment applied to that number and takes into account how pitched the map view is (in this case an easing function is also used): tiltShiftMaxBlur * easeInCubic(fractionPitched)
                 3) another adjustment applied to all of the above which ajusts the effect given how zoomed out we are: (tiltShiftMaxBlur * easeInCubic(fractionPitched)) * fractionZoomedOut   
             */
  // ==========================================================
  // Adjust the tilt-shift effect. The result of this is...
  // the more pitched your viewpoint, the stronger the blur
  // and when you're very close to the ground, the blur effect is reduced
  var tiltShiftBackdropFilter =
    "blur(" +
    tiltShiftMaxBlur * easeInCubic(fractionPitched) * fractionZoomedOut +
    "px)";
  var tiltShiftGradientBlackPoint =
    75 + 25 * easeOutCubic(fractionPitchedBackwards);

  tiltShiftBlur.style.backdropFilter = tiltShiftBackdropFilter;
  tiltShiftBlur.style.webkitBackdropFilter = tiltShiftBackdropFilter;

  // this needs to be styled in two different ways to support the most browsers
  tiltShiftBlur.style.webkitMaskImage =
    "-webkit-gradient(linear, left bottom, left top, from(black), color-stop(5%, black), color-stop(45%, rgba(0, 0, 0, 0)), color-stop(55%, rgba(0, 0, 0, 0)), color-stop(" +
    tiltShiftGradientBlackPoint +
    "%, black), to(black))";
  tiltShiftBlur.style.maskImage =
    "linear-gradient(0deg, black 0%, black 5%, rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0) 55%, black " +
    tiltShiftGradientBlackPoint +
    "%)";

  //adjust lens grime brightness based on bearing
  // Do loads of weird stuff to jiggle the grime strenght based on pitch and bearing
  var grimeStrength = (Math.sin(degreesToRadians(bearing + 90)) + 1) / 2; // the "+ 90" ensures the lighting effects are strongest when the camera is facing south
  grimeStrength = easeInExpo(grimeStrength);
  grimeStrength *= 1;
  grimeStrength = Math.max(grimeStrength, 0.3);
  grimeStrength *= pitchNormalized + 0.3;
  grimeStrength *= 0.7; //adjust the overall strength
  grimeStrength = Math.max(grimeStrength, 0.05); // make sure there's always some grime

  lensGrime.style.opacity = grimeStrength;
  lensReflection.style.opacity = grimeStrength * 1.2;

  brightness = (1 - easeInExpo(pitchNormalized) / 4) * 1.1 - grimeStrength / 3;
  contrast = grimeStrength / 4 + easeInExpo(pitchNormalized) / 2.5 + 0.8;

  if (lastcameraHeightNormalized != cameraHeightNormalized) {
    // only bother doing this time-consuming thing if zoom has changed
    var colourAdjust = 255 - cameraHeightNormalized * 120;
    //var horizonBlend = Math.max(easeInCubic((1 - cameraHeightNormalized)) * 0.8, 0.01);
    var horizonBlend = Math.max((1 - cameraHeightNormalized) * 0.3, 0.01);
    //console.log(horizonBlend);
    //console.log(colourAdjust );
    map.setFog({
      range: [
        -2 - easeOutCubic(cameraHeightNormalized * 2.5),
        20 - easeInCubic(cameraHeightNormalized) * 6,
      ],
      color: "rgb(" + colourAdjust + ", " + colourAdjust + ", 240)",
      "horizon-blend": horizonBlend,
    });
    //console.log(horizonBlend);
    var sunIntensity = Math.max((1 - cameraHeightNormalized) * 8, 0.5);
    var haloColorIntensity =
      Math.max((1 - cameraHeightNormalized) * 3, 0.2) * 0.7;

    map.setPaintProperty("sky", "sky-atmosphere-sun-intensity", sunIntensity);

    map.setPaintProperty(
      "sky",
      "sky-atmosphere-halo-color",
      "rgba(255,255,150," + haloColorIntensity + ")"
    );

    svgDisplacementMap.setAttribute("scale", cameraHeightNormalized * 17);
  }
  lastFractionZoomedOut = fractionZoomedOut;
  lastcameraHeightNormalized = cameraHeightNormalized;

  //svgTurbulence.setAttribute("seed", Math.random() * 100);

  window.requestAnimationFrame(addPhotoEffects);
}

// Set up the mapbox map...
mapboxgl.accessToken = mapboxToken;
window.map = new mapboxgl.Map({
  container: "map",
  projection: { name: "globe" },
  zoom: initialZoom,
  center: [initialLng, initialLat],
  pitch: initialPitch,
  bearing: initialBearing,
  style: mapboxStyle,
});

map.on("load", function () {
  updateURLHash();
  map.addSource("mapbox-dem", {
    type: "raster-dem",
    url: "mapbox://mapbox.mapbox-terrain-dem-v1",
    tileSize: 512,
    maxzoom: 14,
  });

  // start joystick
  window.jctrl = new JoystickMap(map, "#ctrlDirection");


  // add the DEM source as a terrain layer with exaggerated height
  map.setTerrain({
    source: "mapbox-dem",
    exaggeration: 1.5,
  });

  // add a sky layer that will show when the map is highly pitched
  map.addLayer({
    id: "sky",
    type: "sky",
    paint: {
      "sky-type": "atmosphere",
      "sky-atmosphere-color": "#6687eb",
      "sky-atmosphere-halo-color": "rgba(255,255,150,0.7)",
      "sky-atmosphere-sun": [180, 85],
      "sky-atmosphere-sun-intensity": 4,
    },
  });

  map.setFog({
    range: [-1, 20],
    color: "#dbe4f0",
    "horizon-blend": 0.05,
  });

  // call our photo effects fucntion that applies the blur when the map loads
  addPhotoEffects();
  // apply a style to the DIVs that contain the blur effects
  tiltShiftBlur.style.display = "block";

  adjustOnZoomEnd();
  window.requestAnimationFrame(addPhotoEffects);
  const timerId = setInterval(updateFilmGrain, 1000 / 24);

  startShake();

  canvasElement = mapDiv.querySelector("canvas");
  canvasElement.style.filter = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='b' x='0' y='0'%3E%3CfeFlood x='4' y='4' height='2' width='2'/%3E%3CfeComposite width='10' height='10'/%3E%3CfeTile result='a'/%3E%3CfeComposite in='SourceGraphic' in2='a' operator='in'/%3E%3CfeMorphology operator='dilate' radius='1.3'/%3E%3C/filter%3E%3C/svg%3E#b")`;
});

function updateFilmGrain() {
  filmGrain.style.backgroundPosition =
    Math.random() * 100 + "px " + Math.random() * 100 + "px";
}

let shaking = false;
let previousOrientation = null;
function startShake(reset = false) {
  if (!shaking) {
    shaking = true;
    //addCameraShake(reset);
  }
}

function stopShake() {
  shaking = false;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function addCameraShake(reset = false) {
  if (shaking) {
    const shakeAmount = 0.005;
    const camera = map.getFreeCameraOptions();
    const currOrientation = camera.orientation;

    const interpolationFactor = 0.8;

    const randomX = (Math.random() - 0.5) * shakeAmount;
    const randomY = (Math.random() - 0.5) * shakeAmount;
    const randomZ = 0; //(Math.random() - 0.5) * shakeAmount;

    if (previousOrientation === null || reset == true) {
      previousOrientation = currOrientation.slice();
    }

    camera.orientation = [
      lerp(
        previousOrientation[0],
        currOrientation[0] + randomX,
        interpolationFactor
      ),
      lerp(
        previousOrientation[1],
        currOrientation[1] + randomY,
        interpolationFactor
      ),
      lerp(
        previousOrientation[2],
        currOrientation[2] + randomZ,
        interpolationFactor
      ),
      currOrientation[3],
    ];

    previousOrientation = currOrientation.slice();
    map.setFreeCameraOptions(camera);

    requestAnimationFrame(addCameraShake);
  }
}

// Usage example: Start and stop the camera shake after 10 seconds

// adjust the photo effects every frame

var zoomStartLevel = 0;

map.on("zoomstart", function () {
  zoomStartLevel = map.getZoom();
  focus.style.transitionDelay = "unset";
  focus.style.webkitTransitionDelay = "unset";
});
var zoomDiff = 0;
var zoomDiffAbs = 0;
map.on("zoom", function () {
  zoomDiff = zoomStartLevel - map.getZoom();
  zoomDiffAbs = Math.abs(zoomDiff);
  zoomDiffAbs *= 3;

  focus.style.backdropFilter = "blur(" + zoomDiffAbs + "px)";
  focus.style.webkitBackdropFilter = "blur(" + zoomDiffAbs + "px)";
});

function adjustOnZoomEnd() {
  lensRotation += zoomDiff * 10;
  var focusDuration = zoomDiffAbs / 10; // if we've zoomed a long way, then take longer to focus
  focus.style.transitionDuration = focusDuration + "s";
  lensGrime.style.transitionDuration = focusDuration + "s";
  focus.style.webkitTransitionDuration = focusDuration + "s";
  lensGrime.style.webkitTransitionDuration = focusDuration + "s";

  focus.style.backdropFilter = "blur(0.6px)"; // there is always some blur....
  focus.style.webkitBackdropFilter = "blur(0.6px)";
  lensGrime.style.transform = "rotate(" + lensRotation + "deg) scale(2.3)";
  lensReflection.style.transition =
    "opacity 0.02s ease-in, background-size " +
    focusDuration +
    "s cubic-bezier(.29,.74,.84,1.3)";
  lensReflection.style.webkitTransition =
    "opacity 0.02s ease-in, background-size " +
    focusDuration +
    "s cubic-bezier(.29,.74,.84,1.3)";

  lensReflection.style.backgroundSize = 100 + fractionZoomedOut * 50 + "%";
}

map.on("zoomstart", function () {
  //stopShake();
});
map.on("zoomend", function () {
  //startShake(true);
  adjustOnZoomEnd();
});
map.on("mousedown", function () {
  stopShake();
});
map.on("mouseup", function () {
  startShake(true);
});

var interactingWithMap = false;
map.on("movestart", function () {
  //stopShake();
});

map.on("moveend", function () {
  //startShake();
  updateURLHash();

  // adjust the cameras "exposure" by adjusting
  mapDiv.style.filter =
    `hue-rotate(-6deg) contrast(` +
    contrast +
    `) brightness(` +
    brightness +
    `)  saturate(0.9) grayscale(` +
    grayscale +
    `)`;
});

effectsButton.onclick = function () {
  bodyTag.classList.toggle("effectsOff");
};

map.onclick = function () {};

/*
SOUNDS
an array of sounds with
camera height bottom zero volume
camer height middle max volume
camera height top zero volume

use an ease-in-out function to turn the volume up and down
use the max volume setting to set a maximum volume that the sound can go

soundZone
    .audioSrc
    .minZoomLevel
    .maxVolume
    .maxZoomLevel
    .landType // (any, sea, land, desert, forest?) - sometimes a sound will play independent of any land type underneath, and other times (when close to the gound) we can play a specific sound depending on land underneath
    .fadeOutMultiplyer (e.g. 0.001 would fade out slowly when moving from one zone to another, and 0.1 would fade out very fast)


https://howlerjs.com/
https://github.com/goldfire/howler.js#quick-start

map.getZoom();

*/
var sound = false;
//    SOUND setup: LAND **********************
if (sound) {
  var sound_land = new Howl({
    src: ["sounds/129428__le-abbaye-noirlac__tree-rustle-2.mp3"],
    html5: true,
    loop: true,
    html5PoolSize: 10,
  });

  sound_land.on("fade", function () {
    if (sound_land.volume() < 0.1) {
      //we faded the sound down so turn off the sound
      sound_land.stop();
      console.log("stopped sound_land");
    }
  });

  sound_land.on("play", function () {
    sound_land.seek(generateRandom(0, sound_land.duration()));
    sound_land.fade(0, 1, 1900);
    console.log("play sound_land");
  });

  //    SOUND setup: River **********************
  var sound_river = new Howl({
    src: ["sounds/642775__nicoproson__river-gurgling-in-forest.mp3"],
    html5: true,
    loop: true,
  });

  sound_river.on("fade", function () {
    if (sound_river.volume() < 0.1) {
      //we faded the sound down so turn off the sound
      sound_river.stop();
      console.log("stopped sound_river");
    }
  });

  sound_river.on("play", function () {
    sound_river.seek(generateRandom(0, sound_river.duration()));
    sound_river.fade(0, 0.5, 1900);
    console.log("Play sound_river");
  });

  //    SOUND setup: Road **********************
  var sound_road = new Howl({
    src: [
      "sounds/235530__mhtaylor67__freeway-traffic-moving-at-the-speed-limit-side-of-the-road.mp3",
    ],
    html5: true,
    loop: true,
  });

  sound_road.on("fade", function () {
    if (sound_road.volume() < 0.1) {
      //we faded the sound down so turn off the sound
      sound_road.stop();
      console.log("stopped sound_road");
    }
  });

  sound_road.on("play", function () {
    sound_road.seek(generateRandom(0, sound_road.duration()));
    sound_road.fade(0, 0.5, 1900);
    console.log("Play sound_road ");
  });

  //    SOUND setup: RoadBusy **********************
  var sound_roadBusy = new Howl({
    src: ["sounds/345017__3bagbrew__galle-road.mp3"],
    html5: true,
    loop: true,
  });

  sound_roadBusy.on("fade", function () {
    if (sound_roadBusy.volume() < 0.1) {
      //we faded the sound down so turn off the sound
      sound_roadBusy.stop();
      console.log("stopped sound_roadBusy");
    }
  });

  sound_roadBusy.on("play", function () {
    sound_roadBusy.seek(generateRandom(0, sound_roadBusy.duration()));
    sound_roadBusy.fade(0, 0.5, 1900);
    console.log("Play sound_roadBusy ");
  });

  //    SOUND setup: SEA **********************
  var sound_sea = new Howl({
    src: ["sounds/425795__deathjester__seascape.mp3"],
    html5: true,
    loop: true,
  });

  sound_sea.on("fade", function () {
    if (sound_sea.volume() < 0.1) {
      //we faded the sound down so turn off the sound
      sound_sea.stop();
      console.log("stopped sound_sea!");
    }
  });

  sound_sea.on("play", function () {
    sound_sea.seek(generateRandom(0, sound_sea.duration()));
    sound_sea.fade(0, 1, 1900);
    console.log("Play sound_sea");
  });
  sound_sea.on("end", function () {
    sound_sea.seek(generateRandom(0, sound_sea.duration()));
    sound_sea.fade(0, 1, 1900);
    console.log("Play sound_sea");
  });

  //    SOUND setup: WIND **********************
  var sound_wind = new Howl({
    src: [
      "sounds/483479__astounded__wind-blowing-gusting-through-french-castle-tower.mp3",
    ],
    html5: true,
    loop: true,
  });

  sound_wind.on("fade", function () {
    if (sound_wind.volume() < 0.1) {
      //we faded the sound down so turn off the sound
      sound_wind.stop();
      console.log("stopped sound_wind");
    }
  });

  sound_wind.on("play", function () {
    sound_wind.seek(generateRandom(0, sound_wind.duration()));
    sound_wind.fade(0, 1, 1900);
    console.log("Play sound_wind");
  });

  //    SOUND setup: SPACE **********************
  var sound_space = new Howl({
    src: ["sounds/17835__dynamicell__earth-seti-pulses-nasa.mp3"],
    html5: true,
    loop: true,
  });

  sound_space.on("fade", function () {
    if (sound_space.volume() < 0.1) {
      //we faded the sound down so turn off the sound
      sound_space.stop();
      console.log("stopped sound_space");
    }
  });
  sound_space.on("play", function () {
    sound_space.seek(generateRandom(0, sound_space.duration()));
    sound_space.fade(0, 1, 1900);
    console.log("Play sound_space");
  });

  setInterval(checkSounds, 2000);
}
function checkSounds() {
  // look at zoom level and what type of terrain we are over and make sure the correct sounds are playing

  const cameraHeight = map.getFreeCameraOptions().position.z * 1000;
  console.log(cameraHeight);

  const currentZoomLevel = map.getZoom();
  var overSea = false;
  var overRiver = false;
  var overRoad = false;
  var overLand = false;
  var seaAtCenter = map.queryRenderedFeatures(
    [
      [window.innerWidth / 3, window.innerHeight / 3],
      [(window.innerWidth / 3) * 2, (window.innerHeight / 3) * 2],
    ],
    { layers: ["water"] }
  );
  var landAtCenter = map.queryRenderedFeatures(
    [
      [window.innerWidth / 3, window.innerHeight / 3],
      [(window.innerWidth / 3) * 2, (window.innerHeight / 3) * 2],
    ],
    { layers: ["country-boundaries (1)"] }
  );

  //see if we are over water
  if (seaAtCenter.length > 0 && !landAtCenter.length > 0) {
    overSea = true;
  }
  var riverAtCenter = map.queryRenderedFeatures(
    [
      [window.innerWidth / 3, window.innerHeight / 3],
      [(window.innerWidth / 3) * 2, (window.innerHeight / 3) * 2],
    ],
    { layers: ["waterway"] }
  );
  //see if we are over water
  if (riverAtCenter.length > 0) {
    overRiver = true;
  }
  var roadAtCenter = map.queryRenderedFeatures(
    [
      [0, 0],
      [window.innerWidth, window.innerHeight],
    ],
    { layers: ["road"] }
  );
  //see if we are over a road
  if (roadAtCenter.length > 0) {
    overRoad = true;
    console.log("Roads = " + roadAtCenter.length);
  }

  // sound_land +++++++++++++++++++++++
  if (cameraHeight < 0.6736) {
    // play land

    if (overRoad && roadAtCenter.length < 150) {
      if (!sound_road.playing()) {
        sound_road.play();
      }
    } else {
      if (sound_road.playing()) {
        sound_road.fade(0.5, 0, 1900);
      }
    }

    if (overRoad && roadAtCenter.length >= 150) {
      if (!sound_roadBusy.playing()) {
        sound_roadBusy.play();
      }
    } else {
      if (sound_roadBusy.playing()) {
        sound_roadBusy.fade(0.5, 0, 1900);
      }
    }

    if (overRiver) {
      if (!sound_river.playing()) {
        sound_river.play();
      }
    } else {
      if (sound_river.playing()) {
        sound_river.fade(0.5, 0, 1900);
      }
    }

    if (overSea) {
      if (!sound_sea.playing()) {
        sound_sea.play();
      }

      if (sound_land.playing()) {
        sound_land.fade(1, 0, 1900);
      }
    } else {
      if (sound_sea.playing()) {
        sound_sea.fade(1, 0, 1900);
      }
      //play land sound

      if (!sound_land.playing()) {
        sound_land.play();
      }
    }
  } else {
    //ensure ground level sounds are turned off
    if (sound_road.playing()) {
      sound_road.fade(0.5, 0, 1900);
    }
    if (sound_roadBusy.playing()) {
      sound_roadBusy.fade(0.5, 0, 1900);
    }

    if (sound_river.playing()) {
      sound_river.fade(0.5, 0, 1900);
    }
    if (sound_sea.playing()) {
      sound_sea.fade(1, 0, 1900);
    }
    if (sound_land.playing()) {
      sound_land.fade(1, 0, 1900);
    }
  }

  // sound_wind +++++++++++++++++++++++
  if (cameraHeight > 0.16 && cameraHeight < 60) {
    if (!sound_wind.playing()) {
      sound_wind.play();
    }
  } else {
    if (sound_wind.playing()) {
      sound_wind.fade(1, 0, 1900);
    }
  }

  // sound_space +++++++++++++++++++++++
  if (cameraHeight >= 42.62) {
    // play space
    if (!sound_space.playing()) {
      sound_space.play();
    }
  } else {
    if (sound_space.playing()) {
      sound_space.fade(1, 0, 1900);
    }
  }
}

setInterval(droplets, dropletInterval);

function droplets() {
  // randomize whether a droplet of formed
  if (Math.random() > 0.05 && map.getZoom() > 6 && map.getZoom() < 14) {
    // create a droplet element and destroy it after 10 seconds
    var dropletDiv = document.createElement("div");
    // set up droplet
    dropletDiv.style.left = generateRandom() + "%";
    dropletDiv.style.top = generateRandom() + "%";
    var dropletSize = generateRandom(4, 30);
    dropletDiv.style.width = dropletSize + "px";
    dropletDiv.style.height = dropletSize + "px";

    dropletDiv.classList.add("drop");

    document.body.insertBefore(dropletDiv, lensGrime);

    setTimeout(function () {
      dropletDiv.remove();
    }, 4000);
  }
}

function removeDroplet(aDiv) {
  console.log(aDiv);
  aDiv.remove();
}

function generateRandom(min = 0, max = 100) {
  // find diff
  let difference = max - min;

  // generate random number
  let rand = Math.random();

  // multiply with difference
  rand = Math.floor(rand * difference);

  // add with min value
  rand = rand + min;

  return rand;
}

// *******************************



//https://github.com/tmcw/togeojson
var xhttp = new XMLHttpRequest();
var routeAsGeoJSON = "";
var GPXRouteLoaded = false;
xhttp.onreadystatechange = function () {
  if (this.readyState == 4 && this.status == 200) {
    // Typical action to be performed when the document is ready:
    drawRoute(xhttp.response, "gpx");
  }
};

function drawRoute(routeText, fileExtension) {
  // filePanel.classList.remove('open');

  if (routeText.startsWith("http")) {
    routeAsGeoJSON = toGeoJSON.gpx(routeText);
  } else {
    //routeAsGeoJSON = toGeoJSON.gpx(new DOMParser().parseFromString(routeText, "text/xml"));
    if (fileExtension == "gpx") {
      console.log("loading .gpx");
      routeAsGeoJSON = toGeoJSON.gpx(
        new DOMParser().parseFromString(routeText, "text/xml")
      );
    } else {
      console.log("loading .geojson");
      routeAsGeoJSON = JSON.parse(routeText);
    }
  }

  // remove any existing GPX route
  removeGPXRoute();

  map.addSource("route", {
    type: "geojson",
    data: routeAsGeoJSON,
  });
  map.addLayer({
    id: "route",
    type: "line",
    source: "route",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#ffffff",
      "line-width": 10,
      "line-opacity": 0.3,
      "line-dasharray": [1, 0],
    },
  });

  GPXRouteLoaded = true;
  //enableLineAnimation('route');

  zoomToRoute();
}

function zoomToRoute() {
  var coordinates = routeAsGeoJSON.features[0].geometry.coordinates;
  console.log("COORDINATES: " + coordinates);
  //if (following){snapOffFollow()};
  // Pass the first coordinates in the LineString to `lngLatBounds` &
  // wrap each coordinate pair in `extend` to include them in the bounds
  // result. A variation of this technique could be applied to zooming
  // to the bounds of multiple Points or Polygon geomteries - it just
  // requires wrapping all the coordinates with the extend method.
  var bounds = coordinates.reduce(function (bounds, coord) {
    return bounds.extend(coord);
  }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[1]));

  map.fitBounds(bounds, {
    padding: 100,
  });
}

function removeGPXRoute() {
  if (GPXRouteLoaded) {
    //delete the GPX route
    map.removeLayer("route");
    map.removeSource("route");

    //Tell the app there's no route loaded
    GPXRouteLoaded = false;
  }
}

function loadRoute(routeName) {
  console.log("loading a GPX file: " + routeName);
  xhttp.open("GET", "routes/" + routeName + ".gpx", true);
  xhttp.send();
}
