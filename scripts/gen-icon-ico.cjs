const fs = require("fs");
const path = require("path");
const toIco = require("to-ico");
const sharp = require("sharp");

const dir = path.join(__dirname, "..", "src-tauri", "icons");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

(async () => {
  // Cria PNG 32x32 válido com sharp (quadrado cinza)
  const png32 = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 100, g: 100, b: 120, alpha: 1 } },
  })
    .png()
    .toBuffer();
  const icoBuffer = await toIco([png32]);
  const iconPath = path.join(dir, "icon.ico");
  fs.writeFileSync(iconPath, icoBuffer);
  console.log("icon.ico criado em", iconPath);
})();
