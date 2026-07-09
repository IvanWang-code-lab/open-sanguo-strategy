import { access } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "public/assets/images/backgrounds/lord-select-palace.png",
  "public/assets/images/backgrounds/map-clean.png",
  "public/assets/images/backgrounds/battle-open-field.png",
  "public/assets/images/backgrounds/battle-siege-city.png",
  "public/assets/images/backgrounds/battle-city-gate.png",
  "public/assets/images/backgrounds/war-room.png",
  "public/assets/images/portraits/liubei.png",
  "public/assets/images/portraits/caocao.png",
  "public/assets/images/portraits/sunquan.png",
  "public/assets/images/ui/ui-asset-sheet.png",
];

const missing = [];
for (const file of required) {
  try {
    await access(resolve(file));
  } catch {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error("资源校验失败，缺少文件：");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`validate:assets 通过，检查 ${required.length} 个项目内资源。`);
