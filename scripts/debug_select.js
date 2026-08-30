const { bundle } = require("@remotion/bundler");
const { selectComposition } = require("@remotion/renderer");
const path = require("path");
const fs = require("fs");

async function test() {
  console.log("1. Bundling...");
  const serveUrl = await bundle({
    entryPoint: path.resolve("src/index.ts"),
    webpackOverride: (c) => c,
  });
  console.log("2. Bundled:", serveUrl);

  const inputProps = JSON.parse(fs.readFileSync(".temp/edit_plan_v3.json", "utf-8"));
  console.log("3. Selecting composition with inputProps...");

  const comp = await selectComposition({
    serveUrl,
    id: "ReelComposition",
    inputProps,
    browserExecutable: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    chromiumOptions: {
      gl: "angle",
    },
  });
  console.log("4. SUCCESS! Selected composition:", comp.id, comp.fps, comp.durationInFrames);
}

test().catch(err => console.error("Caught error:", err));
