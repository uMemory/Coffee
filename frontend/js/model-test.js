/* ========== 模型预测页面 ========== */

async function renderModelTest() {
    const container = document.getElementById("app-content");
    container.innerHTML = `
        <div class="page-header">
            <h1>模型预测</h1>
            <p>输入咖啡感官评分参数，使用机器学习模型预测品质总分</p>
        </div>
        <div class="predict-layout">
            <div class="card predict-input">
                <h3 style="margin-bottom:16px;color:var(--dark);">参数输入</h3>
                <div id="feature-inputs"></div>
                <div style="display:flex;gap:12px;margin-top:20px;">
                    <button id="btn-random" class="btn btn-sm" style="border:1px solid var(--border);">随机填充</button>
                    <button id="btn-reset-form" class="btn btn-sm" style="border:1px solid var(--border);">重置</button>
                    <button id="btn-predict" class="btn btn-primary btn-lg" style="flex:1;">预 测</button>
                </div>
                <div id="predict-error" style="color:var(--below-avg);font-size:13px;margin-top:10px;display:none;"></div>
            </div>
            <div class="card predict-result" id="predict-result">
                <div class="predict-placeholder">
                    <div style="font-size:64px;margin-bottom:16px;">🔮</div>
                    <p>请填写参数后点击预测</p>
                </div>
            </div>
        </div>`;

    try {
        const features = await ModelAPI.features();
        renderFeatureInputs(features);
        loadFormEvents(features);
    } catch (err) {
        document.getElementById("feature-inputs").innerHTML = `<p style="color:red;">加载特征失败: ${err.message}</p>`;
    }
}

function renderFeatureInputs(features) {
    const container = document.getElementById("feature-inputs");
    const leftFeatures = features.slice(0, Math.ceil(features.length / 2));
    const rightFeatures = features.slice(Math.ceil(features.length / 2));

    container.innerHTML = `
        <div class="form-row">
            <div>${leftFeatures.map(f => featureField(f)).join("")}</div>
            <div>${rightFeatures.map(f => featureField(f)).join("")}</div>
        </div>`;
}

function featureField(f) {
    return `
        <div class="form-group">
            <label>${f.label} (${f.min}-${f.max}${f.unit})</label>
            <div class="range-input">
                <input type="range" name="${f.name}" min="${f.min}" max="${f.max}" step="${f.step}" value="${(f.min + f.max) / 2}" data-target="num-${f.name}">
                <input type="number" id="num-${f.name}" name="${f.name}-num" min="${f.min}" max="${f.max}" step="${f.step}" value="${(f.min + f.max) / 2}" style="width:80px;" class="form-control">
            </div>
        </div>`;
}

function loadFormEvents(features) {
    // 滑动条与数字输入同步
    features.forEach(f => {
        const slider = document.querySelector(`input[name="${f.name}"]`);
        const numInput = document.getElementById(`num-${f.name}`);
        if (slider && numInput) {
            slider.addEventListener("input", () => { numInput.value = slider.value; });
            numInput.addEventListener("change", () => {
                const v = parseFloat(numInput.value);
                if (!isNaN(v) && v >= f.min && v <= f.max) slider.value = v;
            });
        }
    });

    // 随机填充
    document.getElementById("btn-random").addEventListener("click", async () => {
        try {
            const data = await CoffeeAPI.list({ limit: 1, page: Math.floor(Math.random() * 50) + 1 });
            if (data.data.length) {
                const coffee = data.data[0];
                features.forEach(f => {
                    const val = coffee[f.name];
                    if (val != null) {
                        const slider = document.querySelector(`input[name="${f.name}"]`);
                        const numInput = document.getElementById(`num-${f.name}`);
                        if (slider) slider.value = val;
                        if (numInput) numInput.value = val;
                    }
                });
            }
        } catch (e) { /* ignore */ }
    });

    // 重置
    document.getElementById("btn-reset-form").addEventListener("click", () => {
        features.forEach(f => {
            const mid = (f.min + f.max) / 2;
            const slider = document.querySelector(`input[name="${f.name}"]`);
            const numInput = document.getElementById(`num-${f.name}`);
            if (slider) slider.value = mid;
            if (numInput) numInput.value = mid;
        });
    });

    // 预测
    document.getElementById("btn-predict").addEventListener("click", async () => {
        const errorEl = document.getElementById("predict-error");
        errorEl.style.display = "none";
        const btn = document.getElementById("btn-predict");

        const inputFeatures = {};
        features.forEach(f => {
            const slider = document.querySelector(`input[name="${f.name}"]`);
            inputFeatures[f.name] = parseFloat(slider?.value || 0);
        });

        btn.disabled = true;
        btn.textContent = "预测中...";

        try {
            const result = await ModelAPI.predict(inputFeatures);
            renderPredictionResult(result, inputFeatures, features);
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = "block";
        } finally {
            btn.disabled = false;
            btn.textContent = "预 测";
        }
    });
}

function renderPredictionResult(result, inputFeatures, featureDefs) {
    const container = document.getElementById("predict-result");
    const cls = toEnglishClass(result.quality_class);
    const classColorsMap = { "excellent": "#2F8F62", "very-good": "#315F88", "good": "#D99A21", "average": "#C96F2D", "below-avg": "#C94E46" };

    container.innerHTML = `
        <div id="gauge-chart" style="width:100%;height:280px;"></div>
        <div class="predict-score">${result.predicted_score}</div>
        <div class="predict-class"><span class="quality-tag ${cls}">${result.quality_class}</span></div>
        ${result.confidence_interval.lower ? `
            <div class="predict-ci">置信区间: ${result.confidence_interval.lower} ~ ${result.confidence_interval.upper}</div>
        ` : ""}`;

    // 仪表盘图
    const gaugeChart = echarts.init(document.getElementById("gauge-chart"));
    gaugeChart.setOption({
        series: [{
            type: "gauge",
            startAngle: 210,
            endAngle: -30,
            min: 0,
            max: 100,
            center: ["50%", "55%"],
            radius: "90%",
            axisLine: {
                lineStyle: {
                    width: 20,
                    color: [
                        [0.6, "#C94E46"],
                        [0.7, "#C96F2D"],
                        [0.75, "#D99A21"],
                        [0.8, "#315F88"],
                        [0.85, "#2F8F62"],
                        [1, "#1ABC9C"],
                    ],
                },
            },
            pointer: { length: "70%", width: 6 },
            detail: { show: false },
            data: [{ value: result.predicted_score }],
        }],
    });
}


