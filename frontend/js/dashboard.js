/* ========== 数据概览仪表盘 ========== */

const STAT_COLORS = [
    { bg: "#EBF5FB", icon: "#2980B9" },
    { bg: "#FEF9E7", icon: "#F39C12" },
    { bg: "#E8F8F5", icon: "#27AE60" },
    { bg: "#FDEBD0", icon: "#E67E22" },
    { bg: "#F4ECF7", icon: "#8E44AD" },
    { bg: "#FDEDEC", icon: "#C0392B" },
];

const STAT_ICONS = ["📊", "⭐", "🌍", "🌱", "🏆", "💎"];

async function renderDashboard() {
    const container = document.getElementById("app-content");
    container.innerHTML = `
        <div class="page-header">
            <h1>数据概览</h1>
            <p>全球咖啡品质数据总览，点击卡片可跳转查看详情</p>
        </div>
        <div id="stat-cards" class="card-grid"></div>
        <div class="chart-row">
            <div class="chart-card"><h3>各国平均品质分 (Top 10)</h3><div id="chart-country-bar" style="height:350px;"></div></div>
            <div class="chart-card"><h3>品质等级分布</h3><div id="chart-class-pie" style="height:350px;"></div></div>
        </div>
        <div class="chart-full">
            <div class="chart-card"><h3>分数分布</h3><div id="chart-distribution" style="height:300px;"></div></div>
        </div>`;

    try {
        const [summary, byCountry, distribution] = await Promise.all([
            StatsAPI.summary(),
            StatsAPI.byCountry(),
            StatsAPI.distribution(),
        ]);

        renderStatCards(summary);
        renderCountryBar(byCountry.slice(0, 10));
        renderClassPie(summary.quality_distribution);
        renderDistribution(distribution);
    } catch (err) {
        container.innerHTML += `<p style="color:red;">加载失败: ${err.message}</p>`;
    }
}

function renderStatCards(summary) {
    const cards = [
        { label: "咖啡样本总数", value: summary.total_records.toLocaleString() },
        { label: "平均品质分", value: summary.avg_score },
        { label: "产地国家数", value: summary.num_countries },
        { label: "品种数量", value: summary.num_varieties },
        { label: `最高分国家: ${summary.top_country}`, value: summary.top_country_avg_score },
        { label: "卓越等级占比", value: summary.quality_distribution["卓越"].pct + "%" },
    ];

    const container = document.getElementById("stat-cards");
    container.innerHTML = cards.map((c, i) => `
        <div class="stat-card" data-index="${i}">
            <div class="stat-card-icon" style="background:${STAT_COLORS[i].bg};">
                <span>${STAT_ICONS[i]}</span>
            </div>
            <div>
                <div class="stat-card-value">${c.value}</div>
                <div class="stat-card-label">${c.label}</div>
            </div>
        </div>
    `).join("");

    // 点击跳转
    container.querySelectorAll(".stat-card").forEach(card => {
        card.addEventListener("click", () => {
            window.location.hash = "#data";
        });
    });
}

function renderCountryBar(data) {
    const chart = echarts.init(document.getElementById("chart-country-bar"));
    chart.setOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 100, right: 40, top: 20, bottom: 30 },
        xAxis: { type: "value", name: "平均分", axisLabel: { formatter: "{value}" } },
        yAxis: {
            type: "category",
            data: data.map(d => d.country).reverse(),
            axisLabel: { fontSize: 12 },
        },
        series: [{
            type: "bar",
            data: data.map(d => d.avg_score).reverse(),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: "#D4A574" },
                    { offset: 1, color: "#6F4E37" },
                ]),
                borderRadius: [0, 4, 4, 0],
            },
            label: { show: true, position: "right", fontSize: 12 },
        }],
    });
}

function renderClassPie(distribution) {
    const chart = echarts.init(document.getElementById("chart-class-pie"));
    const data = Object.entries(distribution).map(([name, info]) => ({
        name, value: info.count,
    }));
    const colors = {
        "卓越": "#27AE60", "优秀": "#2980B9", "良好": "#F39C12",
        "一般": "#E67E22", "较差": "#E74C3C",
    };
    chart.setOption({
        tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
        legend: { bottom: 10 },
        series: [{
            type: "pie",
            radius: ["50%", "75%"],
            center: ["50%", "45%"],
            itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 3 },
            label: { formatter: "{b}\n{d}%" },
            data,
            color: data.map(d => colors[d.name] || "#999"),
        }],
    });
}

function renderDistribution(data) {
    const chart = echarts.init(document.getElementById("chart-distribution"));
    chart.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 60, right: 30, top: 20, bottom: 40 },
        xAxis: {
            type: "category",
            data: data.map(d => d.range),
            axisLabel: { rotate: 45, fontSize: 11 },
        },
        yAxis: { type: "value", name: "数量" },
        series: [{
            type: "bar",
            data: data.map(d => d.count),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "#8B6B52" },
                    { offset: 1, color: "#D4A574" },
                ]),
                borderRadius: [6, 6, 0, 0],
            },
        }],
    });
}
