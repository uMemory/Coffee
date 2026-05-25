/* ========== 预测历史页面 ========== */

let historyState = { page: 1, limit: 20 };

async function renderHistory() {
    const container = document.getElementById("app-content");
    container.innerHTML = `
        <div class="page-header">
            <h1>预测历史</h1>
            <p>查看您之前的咖啡品质预测记录</p>
        </div>
        <div class="card" style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>序号</th>
                        <th>预测时间</th>
                        <th>输入参数摘要</th>
                        <th>预测分数</th>
                        <th>等级</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="history-body"></tbody>
            </table>
        </div>
        <div id="history-pagination" class="pagination"></div>`;

    loadHistory();
}

async function loadHistory() {
    try {
        const result = await ModelAPI.history({
            page: historyState.page,
            limit: historyState.limit,
        });

        renderHistoryTable(result.data);
        renderHistoryPagination(result);
    } catch (err) {
        document.getElementById("history-body").innerHTML =
            `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">加载失败: ${err.message}</div></div></td></tr>`;
    }
}

function renderHistoryTable(data) {
    const tbody = document.getElementById("history-body");
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="6">
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">暂无预测记录</div>
                <p style="font-size:13px;margin-top:8px;">前往 <a href="#predict" style="color:var(--primary);">模型预测</a> 页面开始使用</p>
            </div>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = data.map((row, i) => {
        const feat = row.input_features || {};
        const summary = Object.entries(feat).slice(0, 4)
            .map(([k, v]) => `${k}=${parseFloat(v).toFixed(1)}`)
            .join(", ") + (Object.keys(feat).length > 4 ? "..." : "");
        const cls = toEnglishClass(row.predicted_class);

        return `
        <tr>
            <td>${(historyState.page - 1) * historyState.limit + i + 1}</td>
            <td>${formatTime(row.created_at)}</td>
            <td title="${JSON.stringify(feat, null, 2)}">${summary}</td>
            <td class="${getScoreClassForHistory(row.predicted_score)}">${row.predicted_score?.toFixed(1)}</td>
            <td><span class="quality-tag ${cls}">${row.predicted_class}</span></td>
            <td><button class="btn btn-sm btn-primary view-detail" data-row='${JSON.stringify(row)}'>查看详情</button></td>
        </tr>`;
    }).join("");

    tbody.querySelectorAll(".view-detail").forEach(btn => {
        btn.addEventListener("click", () => {
            const row = JSON.parse(btn.dataset.row);
            showHistoryDetail(row);
        });
    });
}

function renderHistoryPagination(result) {
    const container = document.getElementById("history-pagination");
    const { page, pages, total } = result;
    container.innerHTML = `
        <button ${page <= 1 ? "disabled" : ""} id="hp-prev">上一页</button>
        <span class="page-info">第 ${page} / ${pages} 页（共 ${total} 条）</span>
        <button ${page >= pages ? "disabled" : ""} id="hp-next">下一页</button>`;

    document.getElementById("hp-prev").addEventListener("click", () => {
        if (historyState.page > 1) { historyState.page--; loadHistory(); }
    });
    document.getElementById("hp-next").addEventListener("click", () => {
        if (historyState.page < pages) { historyState.page++; loadHistory(); }
    });
}

function showHistoryDetail(row) {
    const overlay = document.getElementById("modal-overlay");
    const content = document.getElementById("modal-content");
    const feat = row.input_features || {};
    const cls = toEnglishClass(row.predicted_class);

    content.innerHTML = `
        <button class="modal-close" id="modal-close">&times;</button>
        <h2 style="margin-bottom:20px;">预测详情</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
            <div>
                <h4 style="margin-bottom:12px;color:var(--primary);">输入参数</h4>
                <table style="width:100%;font-size:13px;">
                    ${Object.entries(feat).map(([k, v]) =>
                        `<tr><td style="padding:6px 12px;color:var(--text-light);">${k}</td><td style="padding:6px 12px;font-weight:500;">${parseFloat(v).toFixed(1)}</td></tr>`
                    ).join("")}
                </table>
            </div>
            <div style="text-align:center;">
                <h4 style="margin-bottom:12px;color:var(--primary);">预测结果</h4>
                <div style="font-size:56px;font-weight:800;color:var(--primary);">${row.predicted_score?.toFixed(1)}</div>
                <div style="margin-top:8px;"><span class="quality-tag ${cls}" style="font-size:16px;padding:6px 20px;">${row.predicted_class}</span></div>
                <div style="margin-top:12px;font-size:13px;color:var(--text-light);">预测时间: ${formatTime(row.created_at)}</div>
                <div id="history-gauge" style="width:100%;height:220px;margin-top:16px;"></div>
            </div>
        </div>`;

    overlay.style.display = "flex";
    document.getElementById("modal-close").addEventListener("click", () => {
        overlay.style.display = "none";
    });
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.style.display = "none";
    });

    // 小仪表盘
    const gaugeChart = echarts.init(document.getElementById("history-gauge"));
    gaugeChart.setOption({
        series: [{
            type: "gauge",
            startAngle: 210, endAngle: -30, min: 0, max: 100,
            center: ["50%", "55%"], radius: "85%",
            axisLine: { lineStyle: { width: 15, color: [[0.6,"#C94E46"],[0.7,"#C96F2D"],[0.75,"#D99A21"],[0.8,"#315F88"],[0.85,"#2F8F62"],[1,"#1ABC9C"]] } },
            pointer: { length: "65%", width: 5 },
            detail: { show: false },
            data: [{ value: row.predicted_score }],
        }],
    });
}

function formatTime(isoStr) {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getScoreClassForHistory(score) {
    if (score >= 85) return "score-high";
    if (score >= 75) return "score-mid";
    return "score-low";
}


