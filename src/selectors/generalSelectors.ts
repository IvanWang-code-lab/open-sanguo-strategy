import type { GameState, General } from "../types";

/** 以武将位置权威字段派生指定城市的全部武将。 */
export const getGeneralsAtCity = (state: Pick<GameState, "generals">, cityId: string): General[] =>
  state.generals.filter((general) => general.locationCityId === cityId);

/** 取得指定城市可参与内政、编成与调遣的在职武将。 */
export const getActiveGeneralsAtCity = (state: Pick<GameState, "generals">, cityId: string): General[] =>
  getGeneralsAtCity(state, cityId).filter((general) => general.status === "active");

/** 为城市面板提供不依赖旧 city.generals 的驻守摘要。 */
export const getCityGarrisonSummary = (state: Pick<GameState, "generals">, cityId: string) => {
  const generals = getActiveGeneralsAtCity(state, cityId);
  return {
    generalIds: generals.map((general) => general.id),
    count: generals.length,
    strongestGeneral: [...generals].sort((a, b) => b.command + b.force - (a.command + a.force))[0],
  };
};

/** 仅在保存与旧接口边界生成兼容镜像，主流程不得反向读取该字段。 */
export const deriveLegacyCityGenerals = <T extends Pick<GameState, "cities" | "generals">>(state: T): T => ({
  ...state,
  cities: state.cities.map((city) => ({
    ...city,
    generals: state.generals
      .filter((general) => general.status === "active" && general.locationCityId === city.id)
      .map((general) => general.id),
  })),
});

