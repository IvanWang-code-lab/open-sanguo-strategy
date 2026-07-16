import { access, mkdtemp, rm } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cwd = process.cwd();
const appUrl = "http://127.0.0.1:5173";
const debuggingPort = 9333;
const saveKey = "three-kingdoms-new-overlord-save-v1";
const browserCandidates = [
  process.env.BROWSER_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const waitForHttp = async (url, timeout = 20000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch { /* 服务仍在启动 */ }
    await delay(250);
  }
  throw new Error(`等待 ${url} 超时`);
};

const findBrowser = async () => {
  for (const candidate of browserCandidates) {
    try { await access(candidate); return candidate; } catch { /* 尝试下一项 */ }
  }
  throw new Error("未找到 Edge/Chrome；可通过 BROWSER_PATH 指定浏览器路径。 ");
};

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const callback = this.pending.get(message.id);
      if (!callback) return;
      this.pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result?.value;
  }

  close() { this.socket?.close(); }
}

const main = async () => {
  const profileDir = await mkdtemp(join(tmpdir(), "sanguo-e2e-"));
  const serverLogs = [];
  let server;
  let browser;
  let cdp;
  const cleanup = async () => {
    cdp?.close();
    if (browser?.pid) spawnSync("taskkill", ["/pid", String(browser.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
    if (server?.pid) spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { windowsHide: true, stdio: "ignore" });
    await delay(1200);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await rm(profileDir, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === 9) console.warn(`临时浏览器目录稍后由系统回收：${error instanceof Error ? error.message : error}`);
        else await delay(800);
      }
    }
  };

  try {
    server = spawn("cmd.exe", ["/d", "/s", "/c", "npm.cmd run dev -- --host 127.0.0.1 --strictPort"], { cwd, windowsHide: true });
    server.stdout.on("data", (chunk) => serverLogs.push(String(chunk)));
    server.stderr.on("data", (chunk) => serverLogs.push(String(chunk)));
    await waitForHttp(appUrl);

    const browserPath = await findBrowser();
    browser = spawn(browserPath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-mode",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-features=CalculateNativeWinOcclusion,msSpellChecking",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${profileDir}`,
      "--window-size=1366,768",
      appUrl,
    ], { windowsHide: true });
    await waitForHttp(`http://127.0.0.1:${debuggingPort}/json/version`);
    let page;
    for (let attempt = 0; attempt < 40 && !page; attempt += 1) {
      const pages = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`).then((response) => response.json());
      page = pages.find((item) => item.type === "page" && item.url.startsWith(appUrl));
      if (!page) await delay(250);
    }
    assert(page?.webSocketDebuggerUrl, "未取得测试页面的调试连接");
    cdp = new CdpClient(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Runtime.enable");

    const bodyText = () => cdp.evaluate("document.body?.innerText ?? ''");
    const waitForText = async (text, timeout = 15000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        if ((await bodyText()).includes(text)) return;
        await delay(200);
      }
      throw new Error(`页面未出现文本：${text}`);
    };
    const clickText = async (text) => {
      const ok = await cdp.evaluate(`(() => { const text=${JSON.stringify(text)}; const node=[...document.querySelectorAll('button')].find((item) => !item.disabled && (item.textContent || '').replace(/\\s+/g,' ').includes(text)); if(!node) return false; node.click(); return true; })()`);
      assert(ok, `找不到可点击按钮：${text}`);
      await delay(180);
    };
    const clickSelector = async (selector) => {
      const ok = await cdp.evaluate(`(() => { const node=document.querySelector(${JSON.stringify(selector)}); if(!node || node.disabled) return false; node.click(); return true; })()`);
      assert(ok, `找不到可点击元素：${selector}`);
      await delay(180);
    };

    await waitForText("开始新局");
    await clickText("开始新局");
    await waitForText("选择开局时代");
    await clickText("190");
    await clickText("进入诸侯席位");
    await waitForText("请选择诸侯");
    await clickText("刘备");
    await clickText("开始游戏");
    await waitForText("平原 府衙");
    let unifiedText = await bodyText();
    assert(unifiedText.includes("指令"), "顶部未显示统一指令");
    assert(!unifiedText.includes("政令") && !unifiedText.includes("军令"), "页面仍出现政令/军令旧文案");

    // 独立临时浏览器档仅用于让 P0 占城流程确定获胜，不改生产初始平衡。
    const fixtureApplied = await cdp.evaluate(`(() => { const key=${JSON.stringify(saveKey)}; const state=JSON.parse(localStorage.getItem(key)); const pingyuan=state.cities.find(c=>c.id==='pingyuan'); const chenliu=state.cities.find(c=>c.id==='chenliu'); pingyuan.troops={infantry:5200,cavalry:2200,archer:2200,navy:0}; pingyuan.food=12000; pingyuan.morale=96; chenliu.troops={infantry:260,cavalry:40,archer:80,navy:0}; chenliu.defense=8; chenliu.morale=35; state.commandState.commands=10; state.commandState.maxCommands=10; state.commandState.usedCommands=0; localStorage.setItem(key,JSON.stringify(state)); location.reload(); return true; })()`);
    assert(fixtureApplied, "无法准备 E2E 临时战斗档");
    await waitForText("平原 府衙");
    await clickText("军务署");
    await clickText("发兵 陈留");
    await waitForText("军议桌");
    await clickText("全力进攻");
    await clickText("发兵令");
    await waitForText("经典可控战场");
    await clickSelector(".classic-skill-grid button:not(:disabled)");
    await clickSelector(".classic-army-roster.player button:nth-of-type(2)");
    await clickText("攻击");
    await clickText("执行本轮命令");

    for (let round = 0; round < 12; round += 1) {
      const text = await bodyText();
      if (text.includes("如何安置军势")) break;
      const canRecommend = await cdp.evaluate("Boolean([...document.querySelectorAll('button')].find(b => !b.disabled && (b.textContent || '').includes('本轮自动推荐')))");
      if (!canRecommend) break;
      await clickText("本轮自动推荐");
      await clickText("执行本轮命令");
      await delay(250);
    }
    await waitForText("如何安置军势", 15000);
    await clickText("分兵驻守");
    await clickSelector('[data-testid="station-guan-yu"]');
    await clickSelector('[data-testid="return-liu-bei"]');
    await clickSelector('[data-testid="return-zhang-fei"]');
    await clickSelector('[data-testid="confirm-settlement"]');
    await waitForText("跳过战斗");
    await clickText("跳过战斗");
    await waitForText("战后军势去向");
    await waitForText("返回地图");
    await clickText("返回地图");
    await waitForText("陈留 府衙");

    let saved = await cdp.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(saveKey)}))`);
    assert(saved.generals.find((general) => general.id === "guan-yu").locationCityId === "chenliu", "战后关羽未驻守陈留");
    assert(saved.generals.find((general) => general.id === "liu-bei").locationCityId === "pingyuan", "战后刘备未回师平原");
    assert(saved.generals.find((general) => general.id === "zhang-fei").locationCityId === "pingyuan", "战后张飞未回师平原");

    const commandsBeforeTransfer = saved.commandState.commands;
    await clickText("军务署");
    await clickText("城市调遣");
    await waitForText("城市间调遣");
    await clickText("平原");
    await clickSelector('[data-testid="transfer-general-guan-yu"]');
    await clickSelector('[data-testid="transfer-general-guan-yu"]');
    await clickSelector('[data-testid="confirm-transfer"]');
    await waitForText("平原 府衙");
    saved = await cdp.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(saveKey)}))`);
    assert(saved.commandState.commands === commandsBeforeTransfer - 1, "调遣未扣除 1 指令");
    assert(saved.generals.find((general) => general.id === "guan-yu").locationCityId === "pingyuan", "调遣后关羽未回平原");

    await cdp.evaluate("location.reload(); true");
    await waitForText("平原 府衙");
    const reloaded = await cdp.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(saveKey)}))`);
    assert(reloaded.generals.find((general) => general.id === "guan-yu").locationCityId === "pingyuan", "刷新后关羽位置丢失");
    const pingyuanIds = reloaded.generals.filter((general) => general.status === "active" && general.locationCityId === "pingyuan").map((general) => general.id).sort();
    assert(["guan-yu", "liu-bei", "zhang-fei"].every((id) => pingyuanIds.includes(id)), "刷新后平原派生武将不一致");

    console.log("E2E 通过：平原出征陈留 → 可控战场命令/技能 → 分兵驻守 → 主力回师 → 调遣 → 保存重载一致。");
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    if (serverLogs.length) console.error(serverLogs.join("").slice(-2500));
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
};

await main();
