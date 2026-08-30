const { bundle } = require("@remotion/bundler");
const { getCompositions } = require("@remotion/renderer");
const path = require("path");

async function test() {
  console.log("1. Bundling...");
  const serveUrl = await bundle({
    entryPoint: path.resolve("src/index.ts"),
    webpackOverride: (c) => c,
  });
  console.log("2. Bundled at:", serveUrl);

  console.log("3. Getting compositions with Chrome...");
  const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  
  try {
    const comps = await getCompositions(serveUrl, {
      browserExecutable,
      chromiumOptions: {
        gl: "angle",
      },
    });
    console.log("4. Compositions found:", comps.map(c => ({ id: c.id, fps: c.fps, durationInFrames: c.durationInFrames })));
  } catch (err) {
    console.error("Error with Chrome:", err);
  }
}

test();
