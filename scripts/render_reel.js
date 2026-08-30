const { bundle } = require("@remotion/bundler");
const { renderMedia, selectComposition } = require("@remotion/renderer");
const path = require("path");
const fs = require("fs");

async function render() {
  const args = process.argv.slice(2);
  const propsFile = args[0] || ".temp/edit_plan_v3.json";
  const outputFile = args[1] || "output/final_v3_reel.mp4";

  const entryPoint = path.resolve("src/index.ts");
  const propsPath = path.resolve(propsFile);
  const outputPath = path.resolve(outputFile);

  console.log(`🎬 [Node Renderer] Entry: ${entryPoint}`);
  console.log(`📋 [Node Renderer] Props: ${propsPath}`);
  console.log(`🎯 [Node Renderer] Target Output: ${outputPath}`);

  const inputProps = JSON.parse(fs.readFileSync(propsPath, "utf-8"));

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  console.log("📦 [Node Renderer] Bundling Remotion project with Webpack...");
  const bundled = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  console.log("🔍 [Node Renderer] Selecting ReelComposition...");
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "ReelComposition",
    inputProps,
    browserExecutable,
    chromiumOptions: {
      gl: "angle",
    },
  });

  console.log(`🚀 [Node Renderer] Rendering ${composition.durationInFrames} frames @ ${composition.fps}fps to ${outputPath}...`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    inputProps,
    browserExecutable,
    chromiumOptions: {
      gl: "angle",
    },
    concurrency: 2,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      process.stdout.write(`\rProgress: ${pct}% [${"█".repeat(Math.floor(pct / 5))}${" ".repeat(20 - Math.floor(pct / 5))}]`);
    },
  });

  if (fs.existsSync(outputPath)) {
    const sizeMB = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
    console.log(`\n🎉 [Node Renderer] Render complete! File size: ${sizeMB} MB at ${outputPath}`);
  } else {
    throw new Error(`Output file was not found at ${outputPath}`);
  }
}

render().catch((err) => {
  console.error("\n❌ [Node Renderer] Error:", err);
  process.exit(1);
});
