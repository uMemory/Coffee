/* ================================================================
   数据浏览 — 表格 / 筛选 / 排序 / 详情
   ================================================================ */

let tState = { page: 1, limit: 20, country: "", variety: "", quality_class: "", sort_by: "total_cup_points", order: "desc", search: "" };

const T_COLS = [
    { key: "id", label: "ID", sort: true, w: "50px" },
    { key: "country_of_origin", label: "国家", sort: true },
    { key: "farm_name", label: "农场", sort: false },
    { key: "variety", label: "品种", sort: false },
    { key: "processing_method", label: "处理方式", sort: false },
    { key: "aroma", label: "香气", sort: true },
    { key: "flavor", label: "风味", sort: true },
    { key: "aftertaste", label: "余韵", sort: true },
    { key: "total_cup_points", label: "总分", sort: true },
    { key: "quality_class", label: "等级", sort: false },
];

async function renderDataTable() {
    const c = document.getElementById("app-content");
    c.innerHTML = `
        <div class="page-header">
            <div class="page-header-left"><h1>数据浏览</h1><p>探索全球咖啡品质数据 · 支持筛选、排序和详情查看</p></div>
        </div>
        <div id="filter-bar" class="filter-bar card"></div>
        <div class="card" style="overflow-x:auto;padding:0;">
            <table class="data-table"><thead id="table-head"></thead><tbody id="table-body"></tbody></table>
        </div>
        <div id="pagination" class="pagination"></div>`;
    // 恢复上次国家筛选
    const saved = sessionStorage.getItem("filter_country");
    if (saved) { tState.country = saved; sessionStorage.removeItem("filter_country"); }
    await loadFilters();
    await loadTable();
}

async function loadFilters() {
    let countries = [], varieties = [];
    try { [countries, varieties] = await Promise.all([CoffeeAPI.countries(), CoffeeAPI.varieties()]); } catch (e) {}
    document.getElementById("filter-bar").innerHTML = `
        <select id="f-country" class="form-control" style="width:150px;"><option value="">全部国家</option>${countries.map(c => `<option value="${c}">${c}</option>`).join("")}</select>
        <select id="f-variety" class="form-control" style="width:150px;"><option value="">全部品种</option>${varieties.map(v => `<option value="${v}">${v}</option>`).join("")}</select>
        <select id="f-class" class="form-control" style="width:130px;"><option value="">全部等级</option>${["卓越","优秀","良好","一般","较差"].map(g => `<option value="${g}">${g}</option>`).join("")}</select>
        <input type="text" id="f-search" class="form-control" placeholder="搜索农场/产区..." value="${tState.search}" style="width:200px;">
        <button id="btn-filter" class="btn btn-primary btn-sm">筛选</button>
        <button id="btn-reset" class="btn btn-ghost btn-sm">重置</button>
        <select id="f-limit" class="form-control" style="width:90px;margin-left:auto;"><option value="10">10条</option><option value="20" selected>20条</option><option value="50">50条</option></select>`;
    document.getElementById("f-country").value = tState.country;
    document.getElementById("f-variety").value = tState.variety;
    document.getElementById("f-class").value = tState.quality_class;
    document.getElementById("f-limit").value = tState.limit;
    document.getElementById("btn-filter").onclick = () => {
        tState.country = document.getElementById("f-country").value;
        tState.variety = document.getElementById("f-variety").value;
        tState.quality_class = document.getElementById("f-class").value;
        tState.search = document.getElementById("f-search").value.trim();
        tState.page = 1;
        loadTable();
    };
    document.getElementById("btn-reset").onclick = () => {
        tState = { page: 1, limit: 20, country: "", variety: "", quality_class: "", sort_by: "total_cup_points", order: "desc", search: "" };
        renderDataTable();
    };
    document.getElementById("f-limit").onchange = (e) => { tState.limit = +e.target.value; tState.page = 1; loadTable(); };
}

async function loadTable() {
    const r = await CoffeeAPI.list({
        page: tState.page, limit: tState.limit, country: tState.country || undefined,
        variety: tState.variety || undefined, quality_class: tState.quality_class || undefined,
        sort_by: tState.sort_by, order: tState.order, search: tState.search || undefined,
    });
    renderHead();
    renderBody(r.data);
    renderPagination(r);
}

function sortArrow(k) { return k === tState.sort_by ? (tState.order === "desc" ? " ▾" : " ▴") : ""; }

function renderHead() {
    document.getElementById("table-head").innerHTML = `<tr>${T_COLS.map(c => {
        const a = c.sort ? sortArrow(c.key) : "";
        return `<th data-sort="${c.key}" style="${c.w ? `width:${c.w};` : ""}cursor:${c.sort ? "pointer" : "default"};">${c.label}${a}</th>`;
    }).join("")}</tr>`;
    document.querySelectorAll("#table-head th[data-sort]").forEach(th => {
        if (!T_COLS.find(c => c.key === th.dataset.sort)?.sort) return;
        th.addEventListener("click", () => {
            const k = th.dataset.sort;
            tState.sort_by === k ? (tState.order = tState.order === "desc" ? "asc" : "desc") : (tState.sort_by = k, tState.order = "desc");
            tState.page = 1; loadTable();
        });
    });
}

function renderBody(data) {
    const tbody = document.getElementById("table-body");
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="${T_COLS.length}"><div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无数据</div></div></td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(r => `
        <tr data-id="${r.id}" style="cursor:pointer;">
            ${T_COLS.map(c => {
                const v = r[c.key];
                if (c.key === "total_cup_points") return `<td class="${getScoreClass(v)}">${v?.toFixed(1)}</td>`;
                if (c.key === "quality_class") return `<td><span class="quality-tag ${toEnglishClass(v)}">${v}</span></td>`;
                return `<td>${v ?? "-"}</td>`;
            }).join("")}
        </tr>`).join("");
    tbody.querySelectorAll("tr").forEach(tr => {
        tr.addEventListener("click", () => showCoffeeDetail(parseInt(tr.dataset.id)));
    });
}

function renderPagination(r) {
    document.getElementById("pagination").innerHTML = `
        <button class="pagination-btn" ${r.page <= 1 ? "disabled" : ""} id="tb-prev">← 上一页</button>
        <span class="page-info">第 ${r.page} / ${r.pages} 页 · 共 ${r.total} 条</span>
        <button class="pagination-btn" ${r.page >= r.pages ? "disabled" : ""} id="tb-next">下一页 →</button>`;
    document.getElementById("tb-prev").onclick = () => { if (tState.page > 1) { tState.page--; loadTable(); } };
    document.getElementById("tb-next").onclick = () => { if (tState.page < r.pages) { tState.page++; loadTable(); } };
}

async function showCoffeeDetail(id) {
    try {
        const coffee = await CoffeeAPI.get(id);
        const overlay = document.getElementById("modal-overlay");
        document.getElementById("modal-content").innerHTML = `
            <button class="modal-close">&times;</button>
            <h2 style="margin-bottom:24px;font-size:20px;font-weight:800;">${coffee.country_of_origin} · ${coffee.farm_name || "未知农场"}</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                <div>
                    <h4 style="margin-bottom:12px;color:#252525;font-size:14px;">基本信息</h4>
                    <table style="width:100%;font-size:13px;">
                        ${[["国家",coffee.country_of_origin],["产区",coffee.region],["农场",coffee.farm_name],["品种",coffee.variety],["处理方式",coffee.processing_method],["海拔",coffee.altitude],["海拔均值",coffee.altitude_mean?coffee.altitude_mean+"m":"-"]].map(([k,v]) => `<tr><td style="padding:5px 12px;color:#6f6f6f;">${k}</td><td style="padding:5px 12px;font-weight:600;">${v||"-"}</td></tr>`).join("")}
                    </table>
                    <h4 style="margin:20px 0 12px;color:#252525;font-size:14px;">评分</h4>
                    <table style="width:100%;font-size:13px;">
                        ${[["香气",coffee.aroma],["风味",coffee.flavor],["余韵",coffee.aftertaste],["酸度",coffee.acidity],["醇厚度",coffee.body],["平衡度",coffee.balance],["均匀度",coffee.uniformity],["干净杯",coffee.clean_cup],["甜度",coffee.sweetness],["水分",coffee.moisture+"%"],["总分",coffee.total_cup_points],["等级",coffee.quality_class]].map(([k,v]) => `<tr><td style="padding:5px 12px;color:#6f6f6f;">${k}</td><td style="padding:5px 12px;font-weight:600;">${v!=null?(typeof v==="number"?v.toFixed(1):v):"-"}</td></tr>`).join("")}
                    </table>
                </div>
                <div>
                    <h4 style="margin-bottom:12px;color:#252525;font-size:14px;">风味雷达图</h4>
                    <div id="detail-radar" style="height:400px;"></div>
                </div>
            </div>`;
        overlay.style.display = "flex";
        overlay.querySelector(".modal-close").onclick = () => overlay.style.display = "none";
        overlay.onclick = (e) => { if (e.target === overlay) overlay.style.display = "none"; };
        const radarChart = initChart("detail-radar");
        const fields = ["aroma","flavor","aftertaste","acidity","body","balance","uniformity","clean_cup"];
        const labels = ["香气","风味","余韵","酸度","醇厚度","平衡度","均匀度","干净杯"];
        radarChart.setOption({
            tooltip: {},
            legend: { data: ["本咖啡","全球均值"], bottom: 0 },
            radar: { indicator: labels.map(l => ({ name: l, max: 10 })), shape: "polygon", radius: "65%" },
            series: [{
                type: "radar",
                data: [
                    { name: "本咖啡", value: fields.map(f => coffee[f] || 0), areaStyle: { color: "rgba(37,37,37,0.2)" }, lineStyle: { color: "#252525", width: 2 }, itemStyle: { color: "#252525" } },
                    { name: "全球均值", value: fields.map(() => 7.5), areaStyle: { color: "rgba(200,200,200,0.08)" }, lineStyle: { color: "#ccc", width: 1, type: "dashed" }, itemStyle: { color: "#999" } },
                ],
            }],
        });
    } catch (err) { showToast("加载详情失败: " + err.message, "error"); }
}
