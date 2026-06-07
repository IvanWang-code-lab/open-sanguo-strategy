import type { Faction } from "../types";

export const initialFactions: Faction[] = [
  { id: "liu-bei", name: "蜀汉雏形", color: "#4caf50", ruler: "刘备", capital: "平原", isPlayer: false, aiStyle: "balanced", description: "仁德聚众，武将成长快，开局地盘少但潜力极高。", difficulty: "困难" },
  { id: "cao-cao", name: "曹魏霸业", color: "#3f7cff", ruler: "曹操", capital: "许昌", isPlayer: false, aiStyle: "balanced", description: "中原富庶，文臣武将齐备，适合稳扎稳打。", difficulty: "普通" },
  { id: "sun-quan", name: "江东孙氏", color: "#e24d4d", ruler: "孙权", capital: "建业", isPlayer: false, aiStyle: "economic", description: "水军强盛，江河城市多，经济成长稳定。", difficulty: "普通" },
  { id: "yuan-shao", name: "河北袁氏", color: "#d9a441", ruler: "袁绍", capital: "邺城", isPlayer: false, aiStyle: "aggressive", description: "河北强藩，初始城池多但前线漫长。", difficulty: "简单" },
  { id: "dong-zhuo", name: "西凉董卓", color: "#8a57d6", ruler: "董卓", capital: "长安", isPlayer: false, aiStyle: "aggressive", description: "兵力厚重，武将凶悍，民心较差。", difficulty: "普通" },
  { id: "lv-bu", name: "飞将军团", color: "#ff7a33", ruler: "吕布", capital: "下邳", isPlayer: false, aiStyle: "aggressive", description: "顶级武力爆发强，但城少资源紧。", difficulty: "困难" },
  { id: "liu-biao", name: "荆州刘表", color: "#2aa6a1", ruler: "刘表", capital: "襄阳", isPlayer: false, aiStyle: "defensive", description: "荆襄要冲，防守稳健，适合内政发育。", difficulty: "普通" },
  { id: "ma-teng", name: "西凉马腾", color: "#b57b3a", ruler: "马腾", capital: "武威", isPlayer: false, aiStyle: "aggressive", description: "骑兵优势明显，西北资源较贫。", difficulty: "困难" },
  { id: "liu-zhang", name: "益州刘璋", color: "#6ab04c", ruler: "刘璋", capital: "成都", isPlayer: false, aiStyle: "defensive", description: "蜀地险固，粮草充足，扩张路线受限。", difficulty: "普通" },
  { id: "independent", name: "在野/自立势力", color: "#9aa4b2", ruler: "自立", capital: "云南", isPlayer: false, aiStyle: "balanced", description: "从边地空白势力起家，可体验自立称雄。", difficulty: "挑战" },
];
