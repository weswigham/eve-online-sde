const fs = require("fs");
const path = require("path");
const jsyaml = require("js-yaml");
exports.raw = async (...yamlPath) => {
    const filepath = ["sde", ...yamlPath].filter(x => x.indexOf("/") === -1 && x.indexOf("\\") === -1).join("/");
    const filename = path.join(__dirname, `${filepath}.yaml`);
    const contents = await fs.promises.readFile(filename, { encoding: "utf-8" });
    const obj = jsyaml.safeLoad(contents);
    return obj;
}

function memoize(f) {
    let result;
    let run = false;
    return (...args) => {
        if (run) return result;
        run = true;
        result = f(...args);
        return result;
    }
}

const fdeMap = {
    "agents": "agents",
    "agentsInSpace": "agentsInSpace",
    "ancestries": "ancestries",
    "bloodlines": "bloodlines",
    "blueprints": "blueprints",
    "categories": "categories",
    "certificates": "certificates",
    "characterAttributes": "characterAttributes",
    "contrabandTypes": "contrabandTypes",
    "controlTowerResources": "controlTowerResources",
    "corporationActivities": "corporationActivities",
    "dogmaAttributeCategories": "dogmaAttributeCategories",
    "dogmaAttributes": "dogmaAttributes",
    "dogmaEffects": "dogmaEffects",
    "factions": "factions",
    "graphics": "graphicIDs",
    "groups": "groups",
    "icons": "iconIDs",
    "marketGroups": "marketGroups",
    "metaGroups": "metaGroups",
    "npcCorporationDivisions": "npcCorporationDivisions",
    "npcCorporations": "npcCorporations",
    "planetResources": "planetResources",
    "planetSchematics": "planetSchematics",
    "races": "races",
    "researchAgents": "researchAgents",
    "skinLicenses": "skinLicenses",
    "skinMaterials": "skinMaterials",
    "skins": "skins",
    "soverigntyUpgrades": "soverigntyUpgrades",
    "stationOperations": "stationOperations",
    "stationServices": "stationServices",
    "tournamentRules": "tournamentRuleSets",
    "typeDogma": "typeDogma",
    "typeMaterials": "typeMaterials",
    "types": "types",
}

for (const key of Object.keys(fdeMap)) {
    exports[key] = memoize(() => {
        return exports.raw("fsd", fdeMap[key]);
    });
}

exports.landmarks = memoize(() => exports.raw("universe", "landmarks", "landmarks"));

exports.region = (name) => {
    return exports.raw("universe", "eve", name, "region")
        .catch(() => {
            return exports.raw("universe", "wormhole", name, "region")
                .catch(() => {
                    return exports.raw("universe", "abyssal", name, "region")
                        .catch(() => {
                            return exports.raw("universe", "void", name, "region"); 
                        });
                });
        });
}

exports.lookup = (name, lang) => {
    lang = lang || "en";
    return exports.types().then((types) => {
        return Object.keys(types).map(id => [id, types[id]]).filter(([id, type]) => type.name && type.name[lang] && type.name[lang].startsWith(name)).map(([id, type]) => {
            type.id = +id;
            return type;
        })[0];
    });
}

exports.lookupByID = (id) => {
    return exports.types().then(types => types[id]);
}
