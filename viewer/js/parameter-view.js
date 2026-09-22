(function (root) {
  "use strict";

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  function create(options) {
    const host = options.root;
    const model = options.model;
    let query = "";
    let category = "all";

    function issueHtml(issue) {
      return `<article class="parameter-issue parameter-issue-${escapeHtml(issue.severity)}">
        <strong>${escapeHtml(issue.title)}</strong><span>${escapeHtml(issue.detail)}</span>
      </article>`;
    }

    function render() {
      if (!host) return;
      const source = model.source();
      const entries = model.entries({ query, category });
      const issues = model.diagnostics();
      const quality = source?.quality || {};
      host.innerHTML = `<section class="parameter-workspace">
        <header class="parameter-header">
          <div><h2>Parameters</h2><p>按飞控控制链浏览、搜索和检查参数；每个数据源独立保留，不隐式覆盖。</p></div>
          <label>数据源<select id="parameter-source">${model.sources().map((item) => `<option value="${escapeHtml(item.id)}"${item.id === model.sourceId() ? " selected" : ""}>${escapeHtml(item.label)} (${item.quality?.parameter_count || 0})</option>`).join("")}</select></label>
        </header>
        <div class="parameter-summary">
          <div><small>参数</small><strong>${quality.parameter_count || 0}</strong></div>
          <div><small>源类型</small><strong>${escapeHtml(source?.kind || "none")}</strong></div>
          <div><small>完整性</small><strong>${quality.complete === true ? "完整" : quality.complete === false ? "不完整" : "未知"}</strong></div>
          <div><small>诊断</small><strong>${issues.length}</strong></div>
        </div>
        <section class="parameter-diagnostics">
          <h3>自动检查</h3>
          ${issues.length ? issues.map(issueHtml).join("") : '<div class="parameter-ok">当前规则未发现明显参数冲突。仍需结合机型、重心与试飞数据复核。</div>'}
        </section>
        <div class="parameter-filterbar">
          <label class="parameter-search">搜索<input id="parameter-search" type="search" value="${escapeHtml(query)}" placeholder="参数名、tkoff / takeoff、功能或控制层"></label>
          <div class="parameter-categories"><button data-parameter-category="all" class="${category === "all" ? "active" : ""}">全部</button>${model.categories().map((item) => `<button data-parameter-category="${escapeHtml(item.id)}" class="${category === item.id ? "active" : ""}">${escapeHtml(item.label)}</button>`).join("")}</div>
        </div>
        <p class="parameter-result-count">显示 ${entries.length} 个参数${query ? ` · 搜索 “${escapeHtml(query)}”` : ""}</p>
        <div class="table-scroll parameter-table"><table><thead><tr><th>控制层</th><th>参数</th><th>值</th><th>含义</th></tr></thead><tbody>${entries.map((item) => `<tr><td>${escapeHtml(item.category_label)}</td><td><code>${escapeHtml(item.name)}</code></td><td>${escapeHtml(item.value)}</td><td>${escapeHtml(item.title || item.description)}</td></tr>`).join("") || '<tr><td colspan="4">没有匹配参数。</td></tr>'}</tbody></table></div>
      </section>`;
      host.querySelector("#parameter-source")?.addEventListener("change", (event) => {
        model.setSource(event.target.value);
        render();
      });
      host.querySelector("#parameter-search")?.addEventListener("input", (event) => {
        query = event.target.value;
        render();
        const input = host.querySelector("#parameter-search");
        input?.focus();
        input?.setSelectionRange(query.length, query.length);
      });
      host.querySelectorAll("[data-parameter-category]").forEach((button) => button.addEventListener("click", () => {
        category = button.dataset.parameterCategory;
        render();
      }));
    }

    render();
    return { render, model };
  }

  root.ParameterView = { create };
})(globalThis);
