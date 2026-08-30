import { Config } from "@remotion/cli/config";
import path from "path";
import fs from "fs";

// Ensure scratch/temp cache directory on Drive D with 125 GB free space
const tempDir = path.resolve(__dirname, ".temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");
Config.setChromiumOpenGlRenderer("angle");
Config.setChromiumDisableWebSecurity(true);
Config.setChromiumHeadlessMode(true);
Config.setBrowserExecutable("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
