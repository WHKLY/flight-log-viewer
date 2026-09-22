(function (root) {
  "use strict";

  const clean = (value) => String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ");
  const numeric = (value) => {
    if (value === "" || value == null) return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  };

  function legacySources(summary) {
    return Object.entries(summary?.parameter_sets || {})
      .filter(([, source]) => source?.params && Object.keys(source.params).length)
      .map(([id, source]) => ({
        id: `legacy:${id}`,
        kind: id,
        label: source.label || id,
        source_file: null,
        values: source.params,
        timeline: id === "dataflash_latest" ? summary?.dataflash_param_timeline || [] : [],
        quality: { parameter_count: Object.keys(source.params).length, complete: null },
      }));
  }

  function create(options) {
    const domain = options?.domain || {};
    const catalog = options?.catalog || { categories: [], parameters: {} };
    const categories = catalog.categories?.length ? catalog.categories : [{ id: "other", label: "其他", prefixes: [], aliases: [] }];
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const sources = domain.sources?.length ? domain.sources : legacySources(options?.summary || {});
    let selectedId = options?.sourceId && sources.some((source) => source.id === options.sourceId)
      ? options.sourceId
      : domain.recommended_source_id && sources.some((source) => source.id === domain.recommended_source_id)
        ? domain.recommended_source_id
        : sources[0]?.id || null;

    function source() {
      return sources.find((candidate) => candidate.id === selectedId) || null;
    }

    function categoryFor(name) {
      const exact = catalog.parameters?.[name];
      if (exact?.category && categoryMap.has(exact.category)) return categoryMap.get(exact.category);
      const upperName = name.toUpperCase();
      return categories.find((category) => category.id !== "other" && (category.prefixes || []).some((prefix) => upperName.startsWith(String(prefix).toUpperCase())))
        || categoryMap.get("other")
        || categories[categories.length - 1];
    }

    function entry(name, value) {
      const metadata = catalog.parameters?.[name] || {};
      const category = categoryFor(name);
      return {
        name,
        value: String(value),
        number: numeric(value),
        title: metadata.title || "",
        description: metadata.description || category.description || "",
        aliases: [...(metadata.aliases || []), ...(category.aliases || [])],
        category_id: category.id,
        category_label: category.label,
      };
    }

    function entries(filters = {}) {
      const query = clean(filters.query);
      const categoryId = filters.category || "all";
      return Object.entries(source()?.values || {})
        .map(([name, value]) => entry(name, value))
        .filter((item) => categoryId === "all" || item.category_id === categoryId)
        .filter((item) => !query || clean([item.name, item.title, item.description, item.category_label, ...item.aliases].join(" ")).includes(query))
        .sort((left, right) => left.category_label.localeCompare(right.category_label, "zh-CN") || left.name.localeCompare(right.name));
    }

    function diagnostics() {
      const current = source();
      const values = current?.values || {};
      const issues = [];
      const add = (severity, code, title, detail, names = []) => issues.push({ severity, code, title, detail, names });
      if (!current) {
        add("error", "no-source", "没有可用参数源", "请用启动器重新生成数据，或确认数据集中包含 .bin、.tlog 或 .param 文件。");
        return issues;
      }
      if (current.quality?.complete === false) {
        add("warning", "incomplete-source", "参数流可能不完整", `已收到 ${current.quality.observed_indices || 0} / ${current.quality.declared_count || "?"} 个索引。`, []);
      }
      for (const error of domain.errors || []) {
        add("error", "source-read-error", `未能读取 ${error.source_file}`, error.error || "未知读取错误");
      }
      const ordered = (low, middle, high, label) => {
        const a = numeric(values[low]);
        const b = numeric(values[middle]);
        const c = numeric(values[high]);
        if (a != null && b != null && c != null && !(a <= b && b <= c)) {
          add("error", `range:${low}`, `${label}顺序异常`, `${low} (${a}) ≤ ${middle} (${b}) ≤ ${high} (${c}) 应成立。`, [low, middle, high]);
        }
      };
      ordered("AIRSPEED_MIN", "AIRSPEED_CRUISE", "AIRSPEED_MAX", "空速边界");
      ordered("THR_MIN", "THR_TRIM", "THR_MAX", "油门边界");
      const pitchMin = numeric(values.PTCH_LIM_MIN_DEG);
      const pitchMax = numeric(values.PTCH_LIM_MAX_DEG);
      if (pitchMin != null && pitchMax != null && pitchMin >= pitchMax) {
        add("error", "pitch-limits", "俯仰限制异常", `PTCH_LIM_MIN_DEG (${pitchMin}) 必须小于 PTCH_LIM_MAX_DEG (${pitchMax})。`, ["PTCH_LIM_MIN_DEG", "PTCH_LIM_MAX_DEG"]);
      }
      if (numeric(values.STALL_PREVENTION) === 0) add("warning", "stall-disabled", "失速保护已关闭", "STALL_PREVENTION=0；请确认这是有意配置。", ["STALL_PREVENTION"]);
      if (numeric(values.THR_FAILSAFE) === 0) add("warning", "thr-failsafe-disabled", "油门失控保护已关闭", "THR_FAILSAFE=0；外场飞行前建议核对接收机失控行为。", ["THR_FAILSAFE"]);
      return issues;
    }

    return {
      sources: () => sources.slice(),
      source,
      sourceId: () => selectedId,
      setSource(id) {
        if (sources.some((candidate) => candidate.id === id)) selectedId = id;
        return source();
      },
      categories: () => categories.slice(),
      entries,
      diagnostics,
    };
  }

  root.ParameterModel = { create };
})(globalThis);
