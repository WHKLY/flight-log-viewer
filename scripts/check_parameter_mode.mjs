import fs from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ console });
context.globalThis = context;
vm.runInContext(fs.readFileSync("viewer/js/parameter-model.js", "utf8"), context, { filename: "parameter-model.js" });

const domain = {
  recommended_source_id: "tlog:flight",
  sources: [{
    id: "tlog:flight",
    kind: "tlog",
    label: "TLog",
    values: {
      AIRSPEED_MIN: "18",
      AIRSPEED_CRUISE: "15",
      AIRSPEED_MAX: "12",
      TECS_TKOFF_IGAIN: "0.25",
      STALL_PREVENTION: "0",
    },
    quality: { parameter_count: 5, complete: false, observed_indices: 5, declared_count: 8 },
  }],
};
const catalog = JSON.parse(fs.readFileSync("viewer/data/parameter-catalog-plane-4.7.json", "utf8"));
const model = context.ParameterModel.create({ domain, catalog });

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(model.sourceId() === "tlog:flight", "recommended source should be selected");
assert(model.entries({ query: "takeoff" }).some((entry) => entry.name === "TECS_TKOFF_IGAIN"), "takeoff alias should find TKOFF parameter");
assert(model.entries({ category: "takeoff" }).length === 1, "control-layer category should filter entries");
assert(model.diagnostics().some((issue) => issue.code === "range:AIRSPEED_MIN"), "invalid airspeed ordering should be reported");
assert(model.diagnostics().some((issue) => issue.code === "incomplete-source"), "incomplete tlog source should be reported");
assert(model.diagnostics().some((issue) => issue.code === "stall-disabled"), "disabled stall protection should be reported");

console.log("PASS: source selection, control-layer categorization, synonym search and parameter diagnostics");
