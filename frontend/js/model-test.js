/* ================================================================
   模型预测 — 多模型选择 + SHAP 可解释性
   ================================================================ */

let currentFeatures = null;
let currentModel = "rf";

async function renderModelTest() {
    const c = document.getElementById("app-content");
    c.innerHTML = `
        <div class="page-header"><div class="page-header-left"><h1>模型预测</h1><p>输入感官参数 · 选择模型 · 获取品质预测与可解释性分析</p></div></div>
        <div class="predict-layout">
            <div class="card predict-form">
                <div class="chart-card-header" style="margin-bottom:16px;">
                    <span class="chart-card-title">特征参数</span>
                    <select id="model-select" class="form-control" style="width:140px;"></select>
                </div>
                <div id="feature-inputs" style="max-height:520px;overflow-y:auto;padding-right:4px;"></div>
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button id="btn-random" class="btn btn-ghost btn-sm">随机填充</button>
                    <button id="btn-reset" class="btn btn-ghost btn-sm">重置</button>
                    <button id="btn-predict" class="btn btn-accent btn-lg" style="flex:1;">预 测</button>
                </div>
                <div id="predict-error" style="color:var(--red);font-size:12px;margin-top:8px;display:none;"></div>
            </div>
            <div class="predict-result" id="predict-result">
                <div class="predict-placeholder"><div class="predict-placeholder-icon">🔮</div><p>请填写参数后点击预测</p></div>
            </div>
        </div>
        <div id="shap-section" class="chart-full" style="display:none;margin-top:24px;">
            <div class="chart-card"><div class="chart-card-header"><span class="chart-card-title">SHAP 特征贡献分析</span><span class="chart-card-badge">当前预测</span></div><div id="ch-shap" style="height:340px;"></div></div>
        </div>`;

    // 加载特征和模型列表
    try {
        const [features, modelList] = await Promise.all([
            ModelAPI.features(), ModelAPI.list().catch(() => ["rf"]),
        ]);
        currentFeatures = features;
        const modelNames = Array.isArray(modelList) ? modelList : (modelList?.models || ["rf"]);
        document.getElementById("model-select").innerHTML = modelNames.map(m => `<option value="${m}">${modelLabel(m)}</option>`).join("");
        document.getElementById("model-select").onchange = (e) => { currentModel = e.target.value; };
        renderFeatureInputs(features);
        bindFormEvents(features);
    } catch (err) {
        document.getElementById("feature-inputs").innerHTML = `<p style="color:var(--red);">加载失败: ${err.message}</p>`;
    }
}

function modelLabel(m) {
    const map = { "rf": "随机森林", "xgb": "XGBoost", "lgbm": "LightGBM", "gbdt": "GBDT" };
    return map[m] || m.toUpperCase();
}

function renderFeatureInputs(features) {
    const half = Math.ceil(features.length / 2);
    document.getElementById("feature-inputs").innerHTML = `
        <div class="form-row">${[features.slice(0,half), features.slice(half)].map(group => `<div>${group.map(f => featureField(f)).join("")}</div>`).join("")}</div>`;
}

function featureField(f) {
    const mid = ((f.max + f.min) / 2).toFixed(f.step < 1 ? 1 : 0);
    return `<div class="form-group">
        <label class="form-label">${f.label} <span style="font-weight:400;color:var(--gray-400);">(${f.min}-${f.max}${f.unit})</span></label>
        <div class="range-input">
            <input type="range" name="${f.name}" min="${f.min}" max="${f.max}" step="${f.step}" value="${mid}" data-num="num-${f.name}">
            <input type="number" id="num-${f.name}" class="form-control" value="${mid}" min="${f.min}" max="${f.max}" step="${f.step}">
        </div>
    </div>`;
}

function bindFormEvents(features) {
    features.forEach(f => {
        const slider = document.querySelector(`input[name="${f.name}"]`);
        const num = document.getElementById(`num-${f.name}`);
        if (slider && num) {
            slider.oninput = () => num.value = parseFloat(slider.value).toFixed(f.step < 1 ? 1 : 0);
            num.onchange = () => { const v = parseFloat(num.value); if (!isNaN(v) && v >= f.min && v <= f.max) slider.value = v; };
        }
    });
    document.getElementById("btn-random").onclick = async () => {
        try {
            const data = await CoffeeAPI.list({ limit: 1, page: Math.floor(Math.random() * 50) + 1 });
            if (data.data.length) {
                features.forEach(f => {
                    const v = data.data[0][f.name];
                    if (v != null) {
                        const s = document.querySelector(`input[name="${f.name}"]`);
                        const n = document.getElementById(`num-${f.name}`);
                        if (s) s.value = v;
                        if (n) n.value = parseFloat(v).toFixed(f.step < 1 ? 1 : 0);
                    }
                });
            }
        } catch (e) {}
    };
    document.getElementById("btn-reset").onclick = () => {
        features.forEach(f => {
            const mid = ((f.max + f.min) / 2).toFixed(f.step < 1 ? 1 : 0);
            const s = document.querySelector(`input[name="${f.name}"]`);
            const n = document.getElementById(`num-${f.name}`);
            if (s) s.value = mid;
            if (n) n.value = mid;
        });
    };
    document.getElementById("btn-predict").onclick = async () => {
        const errEl = document.getElementById("predict-error");
        errEl.style.display = "none";
        const btn = document.getElementById("btn-predict");
        const input = {};
        features.forEach(f => { input[f.name] = parseFloat(document.querySelector(`input[name="${f.name}"]`)?.value || 0); });
        btn.disabled = true; btn.textContent = "预测中...";
        try {
            const result = await ModelAPI.predict(input, currentModel);
            renderResult(result);
            // 尝试加载 SHAP
            try {
                const shapData = await ModelAPI.shap(input, currentModel);
                if (shapData?.shap_values) renderSHAP(shapData);
            } catch (e) { document.getElementById("shap-section").style.display = "none"; }
        } catch (err) {
            errEl.textContent = err.message;
            errEl.style.display = "block";
        } finally {
            btn.disabled = false; btn.textContent = "预 测";
        }
    };
}

function renderResult(result) {
    const cls = toEnglishClass(result.quality_class);
    document.getElementById("predict-result").innerHTML = `
        <div id="gauge-chart" style="width:100%;height:260px;"></div>
        <div class="predict-score-big">${result.predicted_score}</div>
        <div class="predict-grade"><span class="quality-tag ${cls}" style="font-size:14px;padding:5px 18px;">${result.quality_class}</span></div>
        ${result.confidence_interval?.lower ? `<div class="predict-ci-label">置信区间: ${result.confidence_interval.lower} ~ ${result.confidence_interval.upper}</div>` : ""}
        <div style="margin-top:12px;font-size:12px;color:var(--gray-400);">模型: ${modelLabel(result.model || currentModel)}</div>`;
    const g = initChart("gauge-chart");
    g.setOption({
        series: [{
            type: "gauge", startAngle: 210, endAngle: -30, min: 0, max: 100, center: ["50%","58%"], radius: "88%",
            axisLine: { lineStyle: { width: 18, color: [[0.6,"#C94E46"],[0.7,"#C96F2D"],[0.75,"#D99A21"],[0.8,"#315F88"],[0.85,"#2F8F62"],[1,"#1ABC9C"]] } },
            pointer: { length: "65%", width: 5 },
            detail: { show: false },
            data: [{ value: result.predicted_score }],
        }],
    });
    document.getElementById("shap-section").style.display = "";
}

function renderSHAP(data) {
    const chart = initChart("ch-shap");
    if (!chart || !data?.shap_values) return;
    const values = data.shap_values;
    const names = data.feature_names || Object.keys(values);
    const entries = names.map(n => ({ name: n, value: values[n] || 0 })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    chart.setOption({
        tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: p => `${p[0].name}: ${p[0].value > 0 ? "+" : ""}${p[0].value.toFixed(3)}` },
        grid: { left: 80, right: 50, top: 8, bottom: 8 },
        xAxis: { type: "value", name: "SHAP 贡献值", axisLabel: { fontSize: 11 } },
        yAxis: { type: "category", data: entries.map(e => e.name).reverse(), axisLabel: { fontSize: 10 } },
        series: [{
            type: "bar", data: entries.map(e => e.value).reverse(),
            itemStyle: {
                color: p => p.data > 0 ? "#2F8F62" : "#C94E46",
                borderRadius: p.data > 0 ? [0, 4, 4, 0] : [4, 0, 0, 4],
            },
            label: { show: true, position: "right", fontSize: 10, formatter: v => (v > 0 ? "+" : "") + v.toFixed(3) },
        }],
    });
}
