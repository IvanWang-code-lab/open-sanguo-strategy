import { areAdjacent, getNeighbors } from "../data/routes";
import { getActiveGeneralsAtCity } from "../selectors/generalSelectors";
import type { GameState, TransferOrder, Troops } from "../types";
import { canSpendCommand, spendPlayerCommand } from "./commandSystem";

const zeroTroops = (): Troops => ({ infantry: 0, cavalry: 0, archer: 0, navy: 0 });

const addTroops = (left: Troops, right: Troops): Troops => ({
  infantry: left.infantry + right.infantry,
  cavalry: left.cavalry + right.cavalry,
  archer: left.archer + right.archer,
  navy: left.navy + right.navy,
});

const subtractTroops = (left: Troops, right: Troops): Troops => ({
  infantry: left.infantry - right.infantry,
  cavalry: left.cavalry - right.cavalry,
  archer: left.archer - right.archer,
  navy: left.navy - right.navy,
});

const commandCost = { commands: 1, political: 0, military: 0 } as const;

export interface TransferRequest {
  sourceCityId: string;
  targetCityId: string;
  generalIds: string[];
  troopsByGeneral: Record<string, Troops>;
}

export const getTransferCandidates = (state: GameState, sourceCityId: string) =>
  getActiveGeneralsAtCity(state, sourceCityId).filter((general) => general.factionId === state.playerFactionId);

export const getRequestTransferSources = (state: GameState, targetCityId: string) =>
  getNeighbors(targetCityId)
    .map((id) => state.cities.find((city) => city.id === id))
    .filter((city): city is NonNullable<typeof city> => Boolean(city && city.factionId === state.playerFactionId && getTransferCandidates(state, city.id).length > 0));

export const validateTransfer = (state: GameState, request: TransferRequest): { ok: boolean; reason: string; carriedTroops: Troops } => {
  const source = state.cities.find((city) => city.id === request.sourceCityId);
  const target = state.cities.find((city) => city.id === request.targetCityId);
  const generalIds = Array.from(new Set(request.generalIds));
  const carriedTroops = generalIds.reduce((sum, id) => addTroops(sum, request.troopsByGeneral[id] ?? zeroTroops()), zeroTroops());
  if (!source || !target) return { ok: false, reason: "调遣城市不存在", carriedTroops };
  if (source.id === target.id) return { ok: false, reason: "来源城与目标城不能相同", carriedTroops };
  if (source.factionId !== state.playerFactionId || target.factionId !== state.playerFactionId) return { ok: false, reason: "调遣仅限己方城市", carriedTroops };
  if (!areAdjacent(source.id, target.id)) return { ok: false, reason: "两城不相邻，无法直接调遣", carriedTroops };
  if (generalIds.length === 0) return { ok: false, reason: "至少选择一名武将", carriedTroops };
  const candidates = getTransferCandidates(state, source.id);
  if (generalIds.some((id) => !candidates.some((general) => general.id === id))) return { ok: false, reason: "所选武将已不在来源城", carriedTroops };
  if (Object.values(carriedTroops).some((value) => !Number.isFinite(value) || value < 0)) return { ok: false, reason: "携带兵力必须为非负整数", carriedTroops };
  if (
    carriedTroops.infantry > source.troops.infantry ||
    carriedTroops.cavalry > source.troops.cavalry ||
    carriedTroops.archer > source.troops.archer ||
    carriedTroops.navy > source.troops.navy
  ) return { ok: false, reason: "携带兵力超过来源城现有兵力", carriedTroops };
  const command = canSpendCommand(state, commandCost);
  if (!command.ok) return { ok: false, reason: command.reason, carriedTroops };
  return { ok: true, reason: "", carriedTroops };
};

/** 原子执行相邻己方城市间的武将与兵力调遣。 */
export const transferGenerals = (
  state: GameState,
  request: TransferRequest,
): { ok: boolean; state: GameState; logs: string[]; reason?: string; order?: TransferOrder } => {
  const checked = validateTransfer(state, request);
  if (!checked.ok) return { ok: false, state, logs: [`调遣失败：${checked.reason}`], reason: checked.reason };
  const source = state.cities.find((city) => city.id === request.sourceCityId)!;
  const target = state.cities.find((city) => city.id === request.targetCityId)!;
  const generalIds = Array.from(new Set(request.generalIds));
  const spent = spendPlayerCommand(state, commandCost, "调遣", `${source.name}至${target.name}`);
  if (!spent.ok) return { ok: false, state, logs: spent.logs, reason: spent.logs[0] };

  const names = spent.state.generals.filter((general) => generalIds.includes(general.id)).map((general) => general.name);
  const summary = `${names.join("、")}由${source.name}调往${target.name}`;
  const order: TransferOrder = {
    id: `transfer-${Date.now()}-${source.id}-${target.id}`,
    sourceCityId: source.id,
    targetCityId: target.id,
    generalIds,
    troopsByGeneral: Object.fromEntries(generalIds.map((id) => [id, request.troopsByGeneral[id] ?? zeroTroops()])),
    createdAtTurn: (state.year - 190) * 12 + state.month,
    summary,
  };
  const next: GameState = {
    ...spent.state,
    generals: spent.state.generals.map((general) => generalIds.includes(general.id) ? { ...general, locationCityId: target.id } : general),
    cities: spent.state.cities.map((city) => {
      if (city.id === source.id) return { ...city, troops: subtractTroops(city.troops, checked.carriedTroops) };
      if (city.id === target.id) return { ...city, troops: addTroops(city.troops, checked.carriedTroops) };
      return city;
    }),
    transfers: [order, ...(spent.state.transfers ?? [])].slice(0, 50),
    history: [`${state.year}年${state.month}月：${summary}`, ...(spent.state.history ?? [])].slice(0, 100),
  };
  return { ok: true, state: next, logs: [...spent.logs, `调遣完成：${summary}。`], order };
};

