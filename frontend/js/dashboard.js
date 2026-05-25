/* ================================================================
   数据概览仪表盘
   ================================================================ */

const STAT_CARD_DEFS = [
    { key: "total_records", label: "样本总数", icon: "📊", color: "#E8F0F8", iconBg: "#2374ab", route: "#data" },
    { key: "avg_score", label: "平均品质分", icon: "⭐", color: "#FDF4E3", iconBg: "#f76d37", route: "#data", suffix: "" },
    { key: "num_countries", label: "产地国家", icon: "🌍", color: "#E2F0EB", iconBg: "#2F7D6D", route: "#data" },
    { key: "num_varieties", label: "品种数量", icon: "🌱", color: "#FDE8D8", iconBg: "#e57b26", route: "#data" },
    { key: "top_country_card", label: "", icon: "🏆", color: "#F1E6F0", iconBg: "#252525", route: "#analysis" },
    { key: "excellent_pct", label: "卓越占比", icon: "💎", color: "#FDE2E0", iconBg: "#d64545", route: "#data" },
];

async function renderDashboard() {
    const container = document.getElementById("app-content");
    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-left">
                <h1>数据概览</h1>
                <p>全球咖啡品质数据全景 — 点击卡片可跳转查看详情</p>
            </div>
        </div>
        <div id="stat-cards" class="card-grid"></div>
        <div class="chart-row">
            <div class="chart-card">
                <div class="chart-card-header"><span class="chart-card-title">各国平均品质分 · Top 10</span></div>
                <div id="chart-country-bar" style="height:360px;"></div>
            </div>
            <div class="chart-card">
                <div class="chart-card-header"><span class="chart-card-title">品质等级分布</span></div>
                <div id="chart-class-pie" style="height:360px;"></div>
            </div>
        </div>
        <div class="chart-full">
            <div class="chart-card">
                <div class="chart-card-header"><span class="chart-card-title">分数分布直方图</span></div>
                <div id="chart-distribution" style="height:280px;"></div>
            </div>
        </div>`;

    try {
        const [summary, byCountryRaw, distribution] = await Promise.all([
            StatsAPI.summary(), StatsAPI.byCountry(), StatsAPI.distribution(),
        ]);
        // byCountry 从 per-country 数据获取该国家的 avg_score
        const byCountry = [...byCountryRaw].sort((a, b) => b.avg_score - a.avg_score);
        renderStatCards(summary, byCountry);
        renderCountryBar(byCountry.slice(0, 10));
        renderClassPie(summary.quality_distribution);
        renderDistribution(distribution);
    } catch (err) {
        showToast("数据加载失败: " + err.message, "error");
    }
}

function renderStatCards(summary, byCountry) {
    const topCountry = byCountry[0];
    const values = {
        total_records: summary.total_records?.toLocaleString() || "0",
        avg_score: summary.avg_score ?? "-",
        num_countries: summary.num_countries ?? 0,
        num_varieties: summary.num_varieties ?? 0,
        top_country_card: topCountry ? `${topCountry.country} ${topCountry.avg_score}` : "-",
        excellent_pct: (summary.quality_distribution?.["卓越"]?.pct ?? 0) + "%",
    };
    const labels = [
        "咖啡样本总数",
        "平均品质分",
        "产地国家数",
        "品种数量",
        topCountry ? `最高: ${topCountry.country}` : "最高分国家",
        "卓越等级占比",
    ];

    document.getElementById("stat-cards").innerHTML = STAT_CARD_DEFS.map((def, i) => `
        <div class="stat-card" data-route="${def.route}">
            <div class="stat-card-header">
                <span class="stat-card-label">${labels[i]}</span>
                <span class="stat-card-icon" style="background:${def.color};color:${def.iconBg};">${def.icon}</span>
            </div>
            <div class="stat-card-value">${values[def.key]}</div>
            <div class="stat-card-sub">${def.key === "avg_score" ? "满分 100 · 全球均值" : def.key === "excellent_pct" ? "≥85分 卓越级" : " "}</div>
        </div>
    `).join("");

    document.querySelectorAll(".stat-card").forEach(card => {
        card.addEventListener("click", () => {
            window.location.hash = card.dataset.route;
        });
    });
}

function renderCountryBar(data) {
    const chart = initChart("chart-country-bar");
    if (!chart) return;
    chart.setOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 100, right: 40, top: 8, bottom: 8 },
        xAxis: { type: "value", name: "平均分", max: 95 },
        yAxis: { type: "category", data: data.map(d => d.country).reverse(), axisLabel: { fontSize: 11 } },
        series: [{
            type: "bar",
            data: data.map(d => d.avg_score).reverse(),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: "#f76d37" }, { offset: 1, color: "#252525" },
                ]),
                borderRadius: [0, 6, 6, 0],
            },
            label: { show: true, position: "right", fontSize: 11 },
        }],
    });
}

function renderClassPie(distribution) {
    const chart = initChart("chart-class-pie");
    if (!chart) return;
    const data = Object.entries(distribution).map(([name, info]) => ({ name, value: info.count }));
    chart.setOption({
        tooltip: { trigger: "item", formatter: "{b}: {c}条 ({d}%)" },
        legend: { bottom: 0 },
        series: [{
            type: "pie",
            radius: ["52%", "78%"],
            center: ["50%", "44%"],
            itemStyle: { borderRadius: 5, borderColor: "#fff", borderWidth: 2 },
            label: { formatter: "{b}\n{d}%" },
            data,
            color: data.map(d => QUALITY_COLORS[d.name] || "#999"),
        }],
    });
}

function renderDistribution(data) {
    const chart = initChart("chart-distribution");
    if (!chart) return;
    chart.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 60, right: 30, top: 8, bottom: 30 },
        xAxis: { type: "category", data: data.map(d => d.range), axisLabel: { rotate: 45, fontSize: 10 } },
        yAxis: { type: "value", name: "数量" },
        series: [{
            type: "bar",
            data: data.map(d => d.count),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#252525" }, { offset: 1, color: "#f76d37" },
                ]),
                borderRadius: [6, 6, 0, 0],
            },
        }],
    });
}
