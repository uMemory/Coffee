/* ================================================================
   数据分析 — 多图表仪表板 + 自动洞察
   ================================================================ */

async function renderAnalysis() {
    const c = document.getElementById("app-content");
    c.innerHTML = `
        <div class="page-header"><div class="page-header-left"><h1>数据分析</h1><p>多维度探索咖啡品质规律 · 相关性 · 特征重要性 · 数据洞察</p></div></div>
        <div id="mini-stats" class="card-grid"></div>
        <div class="chart-row">
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">各国平均品质分 · Top 15</span></div><div id="ch-country" style="height:400px;"></div></div>
            <div class="chart-card">
                <div class="chart-card-header"><span class="chart-card-title">品质等级分布</span><span class="chart-card-badge" id="pie-badge">全球</span></div>
                <select id="pie-mode" class="form-control" style="width:180px;margin-bottom:8px;"><option value="global">全球视角</option><option value="country">按国家查看</option></select>
                <div id="ch-class" style="height:360px;"></div>
            </div>
        </div>
        <div class="chart-row">
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">感官维度相关性热力图</span></div><div id="ch-heatmap" style="height:380px;"></div></div>
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">特征重要性排序</span></div><div id="ch-importance" style="height:380px;"></div></div>
        </div>
        <div class="chart-full">
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">海拔与品质分关系</span></div><div id="ch-scatter" style="height:380px;"></div></div>
        </div>
        <div class="chart-full">
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">智能数据洞察</span></div><div id="insights-panel" class="insights-grid"></div></div>
        </div>`;

    try {
        const [byCountry, correlation, insights, modelInfo, summary] = await Promise.all([
            StatsAPI.byCountry(), StatsAPI.correlation(), StatsAPI.insights(),
            ModelAPI.info().catch(() => null), StatsAPI.summary(),
        ]);
        renderMiniStats(summary);
        renderCountryChart(byCountry.slice(0, 15));
        renderClassPieGlobal(summary, byCountry);
        renderHeatmap(correlation);
        if (modelInfo?.feature_importance) renderImportance(modelInfo.feature_importance);
        renderScatterPlot();
        renderInsights(insights);
    } catch (err) { showToast("数据加载失败: " + err.message, "error"); }
}

function renderMiniStats(s) {
    document.getElementById("mini-stats").innerHTML = [
        { v: s.num_countries, l: "产地国家", i: "🌍", bg: "#E8F0F8" },
        { v: s.num_varieties, l: "咖啡品种", i: "🌱", bg: "#E2F0EB" },
        { v: s.num_processing_methods, l: "处理方式", i: "⚙️", bg: "#FDF4E3" },
    ].map(d => `
        <div class="stat-card" style="cursor:default;">
            <div class="stat-card-header"><span class="stat-card-label">${d.l}</span><span class="stat-card-icon" style="background:${d.bg};">${d.i}</span></div>
            <div class="stat-card-value">${d.v}</div>
        </div>`).join("");
}

function renderCountryChart(data) {
    const chart = initChart("ch-country");
    if (!chart) return;
    chart.setOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 100, right: 50, top: 8, bottom: 8 },
        xAxis: { type: "value", name: "平均分", max: 92 },
        yAxis: { type: "category", data: data.map(d => d.country).reverse(), axisLabel: { fontSize: 11 }, triggerEvent: true },
        series: [{
            type: "bar", data: data.map(d => d.avg_score).reverse(),
            itemStyle: {
                color: p => ["#7A4E2D","#8B5E3C","#9A6B43","#B07D4E","#C08D5A","#D9A441","#E0B95A","#E8CC7E","#F0DBA0","#F7EAC2"][p.dataIndex % 10],
                borderRadius: [0, 4, 4, 0],
            },
            label: { show: true, position: "right", fontSize: 10.5 },
        }],
    });
    chart.on("click", p => {
        const country = data[data.length - 1 - p.dataIndex]?.country;
        if (country) { sessionStorage.setItem("filter_country", country); window.location.hash = "#data"; }
    });
}

function renderClassPieGlobal(summary, byCountry) {
    const chart = initChart("ch-class");
    if (!chart) return;
    const dist = summary.quality_distribution;
    const data = Object.entries(dist).map(([n, i]) => ({ name: n, value: i.count }));
    chart.setOption({
        tooltip: { trigger: "item", formatter: "{b}: {c}条 ({d}%)" },
        legend: { bottom: 0 },
        series: [{
            type: "pie", radius: ["48%", "75%"], center: ["50%", "44%"],
            itemStyle: { borderRadius: 5, borderColor: "#fff", borderWidth: 2 },
            label: { formatter: "{b}\n{d}%" },
            data, color: data.map(d => QUALITY_COLORS[d.name] || "#999"),
        }],
    });
    document.getElementById("pie-mode").onchange = (e) => {
        if (e.target.value === "global") { document.getElementById("pie-badge").textContent = "全球"; renderClassPieGlobal(summary, byCountry); }
        else renderCountryPie(byCountry);
    };
}

function renderCountryPie(byCountry) {
    const chart = initChart("ch-class");
    const card = chart.getDom().parentElement;
    let sel = card.querySelector("#country-sel");
    if (!sel) {
        sel = document.createElement("select");
        sel.id = "country-sel";
        sel.className = "form-control";
        sel.style.cssText = "width:180px;margin-bottom:8px;";
        sel.innerHTML = byCountry.map(c => `<option>${c.country}</option>`).join("");
        card.insertBefore(sel, card.querySelector("#ch-class"));
    }
    async function load(country) {
        const detail = await StatsAPI.countryDetail(country);
        const dist = detail.quality_distribution;
        const data = Object.entries(dist).map(([n, i]) => ({ name: n, value: i.count }));
        const ch = initChart("ch-class");
        ch.setOption({
            title: { text: country + " 等级分布", left: "center", top: 4, textStyle: { fontSize: 13, fontWeight: 700 } },
            tooltip: { trigger: "item", formatter: "{b}: {c}条 ({d}%)" },
            legend: { bottom: 0 },
            series: [{ type: "pie", radius: ["48%", "75%"], center: ["50%", "48%"], itemStyle: { borderRadius: 5, borderColor: "#fff", borderWidth: 2 }, label: { formatter: "{b}\n{d}%" }, data, color: data.map(d => QUALITY_COLORS[d.name] || "#999") }],
        });
    }
    load(byCountry[0].country);
    sel.onchange = (e) => { document.getElementById("pie-badge").textContent = e.target.value; load(e.target.value); };
}

function renderHeatmap(data) {
    const chart = initChart("ch-heatmap");
    if (!chart || !data.labels.length) return;
    const hm = [];
    data.matrix.forEach((r, i) => r.forEach((v, j) => hm.push([j, i, v])));
    chart.setOption({
        tooltip: { formatter: p => `${data.labels[p.data[1]]} × ${data.labels[p.data[0]]}: r=${p.data[2].toFixed(3)}` },
        grid: { left: 90, right: 20, top: 8, bottom: 70 },
        xAxis: { type: "category", data: data.labels, axisLabel: { rotate: 45, fontSize: 10 } },
        yAxis: { type: "category", data: data.labels, axisLabel: { fontSize: 10 } },
        visualMap: { min: 0, max: 1, orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["#F7F3EC","#FDF4E3","#C96F2D","#C94E46"] } },
        series: [{ type: "heatmap", data: hm, label: { show: data.labels.length <= 10, fontSize: 9 } }],
    });
}

function renderImportance(importance) {
    const chart = initChart("ch-importance");
    if (!chart || !importance) return;
    const entries = Object.entries(importance).sort((a, b) => a[1] - b[1]);
    chart.setOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 80, right: 50, top: 8, bottom: 8 },
        xAxis: { type: "value", name: "重要性" },
        yAxis: { type: "category", data: entries.map(e => e[0]), axisLabel: { fontSize: 10 } },
        series: [{
            type: "bar", data: entries.map(e => e[1]),
            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: "#D9A441" }, { offset: 1, color: "#7A4E2D" }]), borderRadius: [0, 4, 4, 0] },
            label: { show: true, position: "right", fontSize: 10, formatter: v => v.toFixed(3) },
        }],
    });
}

async function renderScatterPlot() {
    const chart = initChart("ch-scatter");
    if (!chart) return;
    try {
        const data = await CoffeeAPI.list({ limit: 9999, sort_by: "id", order: "asc" });
        const pts = data.data.filter(d => d.altitude_mean > 0).map(d => [d.altitude_mean, d.total_cup_points, d.quality_class]);
        const groups = {};
        pts.forEach(([x, y, c]) => { if (!groups[c]) groups[c] = []; groups[c].push([x, y]); });
        chart.setOption({
            tooltip: { formatter: p => `海拔: ${p.data[0]}m<br>总分: ${p.data[1]}` },
            grid: { left: 60, right: 30, top: 8, bottom: 40 },
            xAxis: { type: "value", name: "海拔 (m)" },
            yAxis: { type: "value", name: "总分", min: 60, max: 95 },
            legend: { bottom: 0, data: Object.keys(groups) },
            series: Object.entries(groups).map(([c, p]) => ({ name: c, type: "scatter", data: p, symbolSize: 6, itemStyle: { color: QUALITY_COLORS[c] || "#999", opacity: 0.65 } })),
        });
    } catch (e) { /* fallback */ }
}

function renderInsights(insights) {
    const panel = document.getElementById("insights-panel");
    if (!insights.length) { panel.innerHTML = `<p style="color:var(--gray-400);">暂无数据洞察</p>`; return; }
    const icons = ["📌","🔍","📊","🌡️","🌱","💡","📈","🎯"];
    panel.innerHTML = insights.map((t, i) => `<div class="insight-card"><span style="margin-right:8px;">${icons[i%icons.length]}</span>${t}</div>`).join("");
}
