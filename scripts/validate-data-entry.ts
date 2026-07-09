import { initialCities } from "../src/data/cities";
import { initialFactions } from "../src/data/factions";
import { initialGenerals } from "../src/data/generals";
import { cityRoutes } from "../src/data/routes";
import { skills } from "../src/data/skills";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const cityIds = new Set(initialCities.map((city) => city.id));
const factionIds = new Set(initialFactions.map((faction) => faction.id));
const generalIds = new Set(initialGenerals.map((general) => general.id));
const skillIds = new Set(skills.map((skill) => skill.id));

assert(cityIds.size === initialCities.length, "存在重复城市 id");
assert(factionIds.size === initialFactions.length, "存在重复势力 id");
assert(generalIds.size === initialGenerals.length, "存在重复武将 id");

for (const city of initialCities) {
  assert(factionIds.has(city.factionId), `城市 ${city.name} 引用不存在势力 ${city.factionId}`);
  for (const generalId of city.generals) assert(generalIds.has(generalId), `城市 ${city.name} 引用不存在武将 ${generalId}`);
}

for (const [from, to] of cityRoutes) {
  assert(cityIds.has(from), `路线 from 不存在：${from}`);
  assert(cityIds.has(to), `路线 to 不存在：${to}`);
}

for (const general of initialGenerals) {
  assert(factionIds.has(general.factionId), `武将 ${general.name} 引用不存在势力 ${general.factionId}`);
  assert(cityIds.has(general.locationCityId), `武将 ${general.name} 引用不存在城市 ${general.locationCityId}`);
  for (const skillId of general.skills) assert(skillIds.has(skillId), `武将 ${general.name} 引用不存在技能 ${skillId}`);
}

for (const faction of initialFactions) {
  const cities = initialCities.filter((city) => city.factionId === faction.id);
  const generals = initialGenerals.filter((general) => general.factionId === faction.id && general.status === "active");
  if (faction.id !== "independent") {
    assert(cities.length > 0, `势力 ${faction.name} 没有初始城市`);
    assert(generals.length > 0, `势力 ${faction.name} 没有初始武将`);
  }
}

console.log(`validate:data 通过：${initialCities.length} 城、${initialFactions.length} 势力、${initialGenerals.length} 武将、${cityRoutes.length} 路线。`);
