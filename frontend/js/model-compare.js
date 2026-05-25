/* ================================================================
   模型对比 — 多模型指标对比 + 可视化
   ================================================================ */

async function renderModelCompare() {
    const c = document.getElementById("app-content");
    c.innerHTML = `
        <div class="page-header"><div class="page-header-left"><h1>模型对比</h1><p>多模型性能对比 · R² / RMSE / 训练时间 · 选择最优模型进行预测</p></div></div>
        <div class="chart-row">
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">模型 R² 对比</span><span class="chart-card-badge">越高越好</span></div><div id="ch-r2" style="height:360px;"></div></div>
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">模型 RMSE 对比</span><span class="chart-card-badge">越低越好</span></div><div id="ch-rmse" style="height:360px;"></div></div>
        </div>
        <div id="model-cards" class="model-grid"></div>
        <div class="chart-full">
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">特征重要性对比（Top 模型）</span></div><div id="ch-importance-compare" style="height:380px;"></div></div>
        </div>`;

    try {
        const data = await ModelAPI.compare();
        renderModelCards(data);
        renderCompareCharts(data);
    } catch (err) {
        c.innerHTML += `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">模型数据加载失败</div><div class="empty-state-hint">${err.message} — 请确保已完成多模型训练</div></div>`;
    }
}

function renderModelCards(data) {
    const models = data.models || [];
    if (!models.length) return;
    const best = models.reduce((a, b) => (a.r2 || 0) > (b.r2 || 0) ? a : b);

    document.getElementById("model-cards").innerHTML = models.map(m => {
        const isBest = m.name === best.name;
        return `<div class="model-card" style="${isBest ? 'border:2px solid #f76d37;' : ''}">
            <div class="model-card-header">
                <span class="model-card-name">${modelLabel(m.name)}</span>
                ${isBest ? '<span class="model-card-badge best">最优</span>' : ''}
            </div>
            <div class="model-metric"><span>R²</span><span class="model-metric-value" style="color:${(m.r2||0) > 0.85 ? 'var(--green)' : '#6f6f6f'};">${(m.r2||0).toFixed(4)}</span></div>
            <div class="model-metric"><span>RMSE</span><span class="model-metric-value">${(m.rmse||0).toFixed(4)}</span></div>
            ${m.training_time ? `<div class="model-metric"><span>训练时间</span><span class="model-metric-value">${m.training_time}</span></div>` : ""}
            ${m.best_params ? `<div class="model-metric"><span>最佳参数</span><span class="model-metric-value" style="font-size:11px;">${JSON.stringify(m.best_params)}</span></div>` : ""}
            ${m.n_estimators ? `<div class="model-metric"><span>树数量</span><span class="model-metric-value">${m.n_estimators}</span></div>` : ""}
        </div>`;
    }).join("");
}

function renderCompareCharts(data) {
    const models = data.models || [];
    if (!models.length) return;
    const names = models.map(m => modelLabel(m.name));

    // R² chart
    const chR2 = initChart("ch-r2");
    chR2 && chR2.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 50, right: 50, top: 8, bottom: 40 },
        xAxis: { type: "category", data: names, axisLabel: { rotate: 30, fontSize: 11 } },
        yAxis: { type: "value", name: "R²", min: 0.7, max: 1 },
        series: [{
            type: "bar", data: models.map(m => m.r2 || 0),
            itemStyle: {
                color: p => p.data === Math.max(...models.map(m => m.r2 || 0)) ? "#2fa866" : "#252525",
                borderRadius: [6, 6, 0, 0],
            },
            label: { show: true, position: "top", fontSize: 11, formatter: p => (typeof p.data === 'number' ? p.data : p.value).toFixed(4) },
        }],
    });

    // RMSE chart
    const chRMSE = initChart("ch-rmse");
    chRMSE && chRMSE.setOption({
        tooltip: { trigger: "axis" },
        grid: { left: 50, right: 50, top: 8, bottom: 40 },
        xAxis: { type: "category", data: names, axisLabel: { rotate: 30, fontSize: 11 } },
        yAxis: { type: "value", name: "RMSE" },
        series: [{
            type: "bar", data: models.map(m => m.rmse || 0),
            itemStyle: {
                color: p => p.data === Math.min(...models.map(m => m.rmse || 0)) ? "#2fa866" : "#e57b26",
                borderRadius: [6, 6, 0, 0],
            },
            label: { show: true, position: "top", fontSize: 11, formatter: p => (typeof p.data === 'number' ? p.data : p.value).toFixed(4) },
        }],
    });

    // Importance comparison
    const chImp = initChart("ch-importance-compare");
    const bestModel = models.reduce((a, b) => (a.r2 || 0) > (b.r2 || 0) ? a : b);
    if (chImp && bestModel?.feature_importance) {
        const entries = Object.entries(bestModel.feature_importance).sort((a, b) => a[1] - b[1]);
        chImp.setOption({
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            grid: { left: 100, right: 60, top: 8, bottom: 8 },
            xAxis: { type: "value", name: "重要性" },
            yAxis: { type: "category", data: entries.map(e => e[0]), axisLabel: { fontSize: 10 } },
            series: [{
                type: "bar", data: entries.map(e => e[1]),
                itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: "#f76d37" }, { offset: 1, color: "#252525" }]), borderRadius: [0, 4, 4, 0] },
                label: { show: true, position: "right", fontSize: 10, formatter: p => (typeof p.data === 'number' ? p.data : p.value).toFixed(3) },
            }],
        });
    }
}

function modelLabel(m) {
    const map = { "rf": "随机森林", "xgb": "XGBoost", "lgbm": "LightGBM", "gbdt": "GBDT" };
    return map[m] || m;
}
