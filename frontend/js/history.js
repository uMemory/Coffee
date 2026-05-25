/* ================================================================
   预测历史页
   ================================================================ */

let hState = { page: 1, limit: 20 };

async function renderHistory() {
    const c = document.getElementById("app-content");
    c.innerHTML = `
        <div class="page-header"><div class="page-header-left"><h1>预测历史</h1><p>查看您的历史预测记录</p></div></div>
        <div class="card" style="overflow-x:auto;padding:0;">
            <table class="data-table"><thead><tr><th>序号</th><th>时间</th><th>输入摘要</th><th>预测分数</th><th>等级</th><th>模型</th><th>操作</th></tr></thead><tbody id="hist-body"></tbody></table>
        </div>
        <div id="hist-pagination" class="pagination"></div>`;
    loadHistory();
}

async function loadHistory() {
    try {
        const r = await ModelAPI.history({ page: hState.page, limit: hState.limit });
        renderHistBody(r.data);
        renderHistPagination(r);
    } catch (err) {
        document.getElementById("hist-body").innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-text">加载失败</div></div></td></tr>`;
    }
}

function renderHistBody(data) {
    const tbody = document.getElementById("hist-body");
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-text">暂无预测记录</div><div class="empty-state-hint">前往 <a href="#predict" style="color:var(--accent-400);">模型预测</a> 开始使用</div></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map((r, i) => {
        const feat = r.input_features || {};
        const summary = Object.entries(feat).slice(0, 3).map(([k, v]) => `${v?.toFixed?.(1) ?? v}`).join(", ") + "...";
        return `<tr>
            <td>${(hState.page-1)*hState.limit + i + 1}</td>
            <td>${formatTime(r.created_at)}</td>
            <td title="${JSON.stringify(feat)}">${summary}</td>
            <td class="${getScoreClass(r.predicted_score)}">${r.predicted_score?.toFixed(1)}</td>
            <td><span class="quality-tag ${toEnglishClass(r.predicted_class)}">${r.predicted_class}</span></td>
            <td style="font-size:12px;color:var(--gray-500);">${r.model || "随机森林"}</td>
            <td><button class="btn btn-ghost btn-sm view-detail" data-r='${JSON.stringify(r)}'>详情</button></td>
        </tr>`;
    }).join("");
    tbody.querySelectorAll(".view-detail").forEach(btn => {
        btn.addEventListener("click", () => showHistDetail(JSON.parse(btn.dataset.r)));
    });
}

function renderHistPagination(r) {
    document.getElementById("hist-pagination").innerHTML = `
        <button class="pagination-btn" ${r.page<=1?"disabled":""} id="hp-prev">← 上一页</button>
        <span class="page-info">第 ${r.page}/${r.pages} 页 · 共 ${r.total} 条</span>
        <button class="pagination-btn" ${r.page>=r.pages?"disabled":""} id="hp-next">下一页 →</button>`;
    document.getElementById("hp-prev").onclick = () => { if (hState.page > 1) { hState.page--; loadHistory(); } };
    document.getElementById("hp-next").onclick = () => { if (hState.page < r.pages) { hState.page++; loadHistory(); } };
}

function showHistDetail(row) {
    const overlay = document.getElementById("modal-overlay");
    const feat = row.input_features || {};
    document.getElementById("modal-content").innerHTML = `
        <button class="modal-close">&times;</button>
        <h2 style="margin-bottom:20px;">预测详情</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
            <div>
                <h4 style="margin-bottom:12px;color:var(--brand-700);">输入参数</h4>
                <table style="width:100%;font-size:13px;">${Object.entries(feat).map(([k,v]) => `<tr><td style="padding:5px 12px;color:var(--gray-500);">${k}</td><td style="padding:5px 12px;font-weight:600;">${(+v).toFixed(1)}</td></tr>`).join("")}</table>
            </div>
            <div style="text-align:center;">
                <div style="font-size:56px;font-weight:900;color:var(--brand-700);">${row.predicted_score?.toFixed(1)}</div>
                <div style="margin-top:8px;"><span class="quality-tag ${toEnglishClass(row.predicted_class)}" style="font-size:15px;padding:5px 18px;">${row.predicted_class}</span></div>
                <div style="margin-top:12px;font-size:13px;color:var(--gray-500);">${formatTime(row.created_at)}</div>
                <div id="hist-gauge" style="width:100%;height:200px;margin-top:12px;"></div>
            </div>
        </div>`;
    overlay.style.display = "flex";
    overlay.querySelector(".modal-close").onclick = () => overlay.style.display = "none";
    overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = "none"; };
    const g = initChart("hist-gauge");
    g.setOption({
        series: [{
            type: "gauge", startAngle: 210, endAngle: -30, min: 0, max: 100, center: ["50%","58%"], radius: "85%",
            axisLine: { lineStyle: { width: 14, color: [[0.6,"#C94E46"],[0.7,"#C96F2D"],[0.75,"#D99A21"],[0.8,"#315F88"],[0.85,"#2F8F62"],[1,"#1ABC9C"]] } },
            pointer: { length: "60%", width: 4 },
            detail: { show: false },
            data: [{ value: row.predicted_score }],
        }],
    });
}
