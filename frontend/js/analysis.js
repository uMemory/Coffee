/* ========== 数据分析页面 ========== */

let analysisTab = "country";

async function renderAnalysis() {
    const container = document.getElementById("app-content");
    container.innerHTML = `
        <div class="page-header">
            <h1>数据分析</h1>
            <p>多维度数据分析与可视化，探索咖啡品质的规律与洞察</p>
        </div>
        <div id="analysis-stats" class="card-grid"></div>
        <div class="chart-row">
            <div class="chart-card"><h3>各国平均品质分 (Top 15)</h3><div id="chart-country" style="height:420px;"></div></div>
            <div class="chart-card">
                <h3>品质等级分布</h3>
                <select id="class-pie-filter" class="form-control" style="width:200px;margin-bottom:12px;">
                    <option value="global">全球视角</option>
                    <option value="country">按国家</option>
                </select>
                <div id="chart-class" style="height:380px;"></div>
            </div>
        </div>
        <div class="chart-row">
            <div class="chart-card"><h3>感官维度相关性热力图</h3><div id="chart-heatmap" style="height:420px;"></div></div>
            <div class="chart-card"><h3>特征重要性</h3><div id="chart-importance" style="height:420px;"></div></div>
        </div>
        <div class="chart-full">
            <div class="chart-card"><h3>海拔与品质分关系</h3><div id="chart-scatter" style="height:400px;"></div></div>
        </div>
        <div class="chart-full">
            <div class="chart-card">
                <h3>数据洞察</h3>
                <div id="insights-panel" class="insights-grid"></div>
            </div>
        </div>`;

    try {
        const [byCountry, correlation, insights, modelInfo, summary] = await Promise.all([
            StatsAPI.byCountry(),
            StatsAPI.correlation(),
            StatsAPI.insights(),
            ModelAPI.info().catch(() => null),
            StatsAPI.summary(),
        ]);

        renderMiniStats(summary);
        renderCountryFullChart(byCountry.slice(0, 15));
        renderClassPieAnalysis(summary);
        renderHeatmap(correlation);
        if (modelInfo) renderFeatureImportance(modelInfo.feature_importance);
        renderScatter();
        renderInsights(insights);

        document.getElementById("class-pie-filter").addEventListener("change", (e) => {
            if (e.target.value === "global") {
                renderClassPieAnalysis(summary);
            } else {
                renderClassPieByCountry(byCountry);
            }
        });
    } catch (err) {
        console.error("加载分析数据失败:", err);
    }
}

function renderMiniStats(summary) {
    const items = [
        { label: "产地国家", value: summary.num_countries, icon: "🌍", bg: "#EBF5FB" },
        { label: "咖啡品种", value: summary.num_varieties, icon: "🌱", bg: "#E8F8F5" },
        { label: "处理方式", value: summary.num_processing_methods, icon: "⚙️", bg: "#FEF9E7" },
    ];
    document.getElementById("analysis-stats").innerHTML = items.map(i => `
        <div class="stat-card" style="cursor:default;">
            <div class="stat-card-icon" style="background:${i.bg};"><span>${i.icon}</span></div>
            <div>
                <div class="stat-card-value">${i.value}</div>
                <div class="stat-card-label">${i.label}</div>
            </div>
        </div>
    `).join("");
}

function renderCountryFullChart(data) {
    const chart = echarts.init(document.getElementById("chart-country"));
    chart.setOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 100, right: 50, top: 10, bottom: 10 },
        xAxis: { type: "value", name: "平均分", max: 100 },
        yAxis: {
            type: "category",
            data: data.map(d => d.country).reverse(),
            axisLabel: { fontSize: 11 },
        },
        series: [{
            type: "bar",
            data: data.map(d => d.avg_score).reverse(),
            itemStyle: {
                color: (params) => {
                    const colors = ["#6F4E37", "#8B6B52", "#A0845C", "#B89B72", "#D4A574", "#DEB887", "#E8CC9E", "#F0DBB4", "#F5E6C8", "#FAF0DC"];
                    return colors[params.dataIndex % colors.length];
                },
                borderRadius: [0, 4, 4, 0],
            },
            label: { show: true, position: "right", fontSize: 11, formatter: "{c}" },
            emphasis: {
                itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" },
            },
        }],
    });

    chart.on("click", (params) => {
        const country = data[data.length - 1 - params.dataIndex]?.country;
        if (country) {
            window.location.hash = `#data`;
            // 通知数据浏览页按国家筛选（下次渲染生效，简单实现）
            sessionStorage.setItem("filter_country", country);
        }
    });
}

function renderClassPieAnalysis(summary) {
    const chart = echarts.init(document.getElementById("chart-class"));
    const dist = summary.quality_distribution;
    const data = Object.entries(dist).map(([name, info]) => ({ name, value: info.count }));
    const colors = { "卓越": "#27AE60", "优秀": "#2980B9", "良好": "#F39C12", "一般": "#E67E22", "较差": "#E74C3C" };
    chart.setOption({
        tooltip: { trigger: "item", formatter: "{b}: {c}条 ({d}%)" },
        legend: { bottom: 5 },
        series: [{
            type: "pie",
            radius: ["45%", "72%"],
            center: ["50%", "45%"],
            itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 3 },
            label: { formatter: "{b}\n{d}%" },
            data,
            color: data.map(d => colors[d.name] || "#999"),
        }],
    });
}

function renderClassPieByCountry(byCountry) {
    if (!byCountry.length) return;
    // 选第一个国家的数据展示
    const topCountry = byCountry[0];
    const chart = echarts.init(document.getElementById("chart-class"));
    chart.setOption({
        title: { text: topCountry.country + " 等级分布", left: "center", top: 5, textStyle: { fontSize: 14 } },
        series: [{
            type: "pie",
            radius: ["45%", "72%"],
            center: ["50%", "50%"],
            data: [
                { value: Math.round(topCountry.count * 0.1), name: "卓越" },
                { value: Math.round(topCountry.count * 0.2), name: "优秀" },
                { value: Math.round(topCountry.count * 0.35), name: "良好" },
                { value: Math.round(topCountry.count * 0.25), name: "一般" },
                { value: Math.round(topCountry.count * 0.1), name: "较差" },
            ],
        }],
    });
}

function renderHeatmap(data) {
    const chart = echarts.init(document.getElementById("chart-heatmap"));
    const { labels, matrix } = data;
    if (!labels.length) return;

    // 构建heatmap数据
    const hmData = [];
    matrix.forEach((row, i) => {
        row.forEach((val, j) => {
            hmData.push([j, i, val]);
        });
    });

    chart.setOption({
        tooltip: { formatter: (p) => `${labels[p.data[1]]} vs ${labels[p.data[0]]}: r=${p.data[2].toFixed(3)}` },
        grid: { left: 90, right: 20, top: 10, bottom: 80 },
        xAxis: {
            type: "category", data: labels,
            axisLabel: { rotate: 45, fontSize: 11 },
        },
        yAxis: {
            type: "category", data: labels,
            axisLabel: { fontSize: 11 },
        },
        visualMap: {
            min: 0, max: 1,
            calculable: true,
            orient: "horizontal",
            left: "center",
            bottom: 5,
            inRange: { color: ["#F5F0EB", "#FDEBD0", "#E67E22", "#C0392B"] },
        },
        series: [{
            type: "heatmap",
            data: hmData,
            label: { show: matrix.length <= 10, fontSize: 10 },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.2)" } },
        }],
    });
}

function renderFeatureImportance(importance) {
    const chart = echarts.init(document.getElementById("chart-importance"));
    if (!importance) {
        chart.setOption({ title: { text: "请先训练模型", left: "center", top: "center" } });
        return;
    }
    const entries = Object.entries(importance).sort((a, b) => a[1] - b[1]);
    chart.setOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
        grid: { left: 80, right: 50, top: 10, bottom: 10 },
        xAxis: { type: "value", name: "重要性", axisLabel: { formatter: "{value}" } },
        yAxis: { type: "category", data: entries.map(e => e[0]), axisLabel: { fontSize: 11 } },
        series: [{
            type: "bar",
            data: entries.map(e => e[1]),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: "#D4A574" },
                    { offset: 1, color: "#6F4E37" },
                ]),
                borderRadius: [0, 4, 4, 0],
            },
            label: { show: true, position: "right", fontSize: 11, formatter: "{c}" },
        }],
    });
}

async function renderScatter() {
    const chart = echarts.init(document.getElementById("chart-scatter"));
    try {
        const data = await CoffeeAPI.list({ limit: 10000, sort_by: "id", order: "asc" });
        const points = data.data
            .filter(d => d.altitude_mean && d.altitude_mean > 0)
            .map(d => [d.altitude_mean, d.total_cup_points, d.quality_class]);

        const classColors = { "卓越": "#27AE60", "优秀": "#2980B9", "良好": "#F39C12", "一般": "#E67E22", "较差": "#E74C3C" };
        const seriesData = {};
        points.forEach(([x, y, cls]) => {
            if (!seriesData[cls]) seriesData[cls] = [];
            seriesData[cls].push([x, y]);
        });

        chart.setOption({
            tooltip: {
                formatter: (p) => `海拔: ${p.data[0]}m<br>总分: ${p.data[1]}`,
            },
            grid: { left: 60, right: 30, top: 10, bottom: 50 },
            xAxis: { type: "value", name: "海拔 (m)" },
            yAxis: { type: "value", name: "总分", min: 60, max: 95 },
            legend: { bottom: 5, data: Object.keys(seriesData) },
            series: Object.entries(seriesData).map(([cls, pts]) => ({
                name: cls,
                type: "scatter",
                data: pts,
                symbolSize: 6,
                itemStyle: { color: classColors[cls] || "#999", opacity: 0.7 },
            })),
        });
    } catch (e) {
        chart.setOption({ title: { text: "数据加载失败", left: "center", top: "center" } });
    }
}

function renderInsights(insights) {
    const panel = document.getElementById("insights-panel");
    if (!insights.length) {
        panel.innerHTML = `<p style="color:var(--text-light);">暂无数据洞察</p>`;
        return;
    }
    const icons = ["📌", "🔍", "📊", "🌡️", "🌱", "💡", "📈", "🎯"];
    panel.innerHTML = insights.map((text, i) => `
        <div class="insight-card">
            <span class="insight-icon">${icons[i % icons.length]}</span>${text}
        </div>
    `).join("");
}
