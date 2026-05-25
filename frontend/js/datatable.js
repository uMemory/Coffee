/* ========== 数据浏览页面 ========== */

let tableState = {
    page: 1,
    limit: 20,
    country: "",
    variety: "",
    quality_class: "",
    sort_by: "total_cup_points",
    order: "desc",
    search: "",
};

const TABLE_COLUMNS = [
    { key: "id", label: "ID", sortable: true, width: "60px" },
    { key: "country_of_origin", label: "国家", sortable: true },
    { key: "farm_name", label: "农场", sortable: false },
    { key: "variety", label: "品种", sortable: false },
    { key: "processing_method", label: "处理方式", sortable: false },
    { key: "aroma", label: "香气", sortable: true },
    { key: "flavor", label: "风味", sortable: true },
    { key: "aftertaste", label: "余韵", sortable: true },
    { key: "acidity", label: "酸度", sortable: true },
    { key: "body", label: "醇厚度", sortable: true },
    { key: "total_cup_points", label: "总分", sortable: true },
    { key: "quality_class", label: "等级", sortable: false },
];

async function renderDataTable() {
    const container = document.getElementById("app-content");
    container.innerHTML = `
        <div class="page-header">
            <h1>数据浏览</h1>
            <p>探索全球咖啡品质数据，支持筛选、排序和详情查看</p>
        </div>
        <div id="filter-bar" class="filter-bar card"></div>
        <div class="card" style="overflow-x:auto;">
            <table class="data-table" id="coffee-table">
                <thead id="table-head"></thead>
                <tbody id="table-body"></tbody>
            </table>
        </div>
        <div id="pagination" class="pagination"></div>`;

    await loadFilters();
    await loadTable();
}

async function loadFilters() {
    const bar = document.getElementById("filter-bar");
    let countries = [];
    let varieties = [];
    try {
        [countries, varieties] = await Promise.all([
            CoffeeAPI.countries(),
            CoffeeAPI.varieties(),
        ]);
    } catch (e) { /* 忽略 */ }

    bar.innerHTML = `
        <select id="filter-country" class="form-control" style="width:160px;">
            <option value="">全部国家</option>
            ${countries.map(c => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <select id="filter-variety" class="form-control" style="width:160px;">
            <option value="">全部品种</option>
            ${varieties.map(v => `<option value="${v}">${v}</option>`).join("")}
        </select>
        <select id="filter-class" class="form-control" style="width:140px;">
            <option value="">全部等级</option>
            <option value="卓越">卓越</option>
            <option value="优秀">优秀</option>
            <option value="良好">良好</option>
            <option value="一般">一般</option>
            <option value="较差">较差</option>
        </select>
        <input type="text" id="filter-search" class="form-control" placeholder="搜索农场/产区..." value="${tableState.search}">
        <button id="btn-filter" class="btn btn-primary btn-sm">筛选</button>
        <button id="btn-reset" class="btn btn-sm" style="border:1px solid var(--border);">重置</button>
        <select id="filter-limit" class="form-control" style="width:100px;margin-left:auto;">
            <option value="10">10条</option>
            <option value="20" selected>20条</option>
            <option value="50">50条</option>
        </select>`;

    document.getElementById("filter-country").value = tableState.country;
    document.getElementById("filter-variety").value = tableState.variety;
    document.getElementById("filter-class").value = tableState.quality_class;
    document.getElementById("filter-search").value = tableState.search;
    document.getElementById("filter-limit").value = tableState.limit;

    document.getElementById("btn-filter").addEventListener("click", () => {
        tableState.country = document.getElementById("filter-country").value;
        tableState.variety = document.getElementById("filter-variety").value;
        tableState.quality_class = document.getElementById("filter-class").value;
        tableState.search = document.getElementById("filter-search").value.trim();
        tableState.page = 1;
        loadTable();
    });
    document.getElementById("btn-reset").addEventListener("click", () => {
        tableState = { page: 1, limit: 20, country: "", variety: "", quality_class: "", sort_by: "total_cup_points", order: "desc", search: "" };
        renderDataTable();
    });
    document.getElementById("filter-limit").addEventListener("change", (e) => {
        tableState.limit = parseInt(e.target.value);
        tableState.page = 1;
        loadTable();
    });
}

async function loadTable() {
    const result = await CoffeeAPI.list({
        page: tableState.page,
        limit: tableState.limit,
        country: tableState.country || undefined,
        variety: tableState.variety || undefined,
        quality_class: tableState.quality_class || undefined,
        sort_by: tableState.sort_by,
        order: tableState.order,
        search: tableState.search || undefined,
    });

    renderTableHead();
    renderTableBody(result.data);
    renderPagination(result);
}

function getSortArrow(key) {
    if (key !== tableState.sort_by) return "";
    return tableState.order === "desc" ? " ▼" : " ▲";
}

function renderTableHead() {
    const thead = document.getElementById("table-head");
    thead.innerHTML = `<tr>${TABLE_COLUMNS.map(col => {
        const arrow = col.sortable ? getSortArrow(col.key) : "";
        return `<th data-sort="${col.key}" style="${col.width ? `width:${col.width};` : ""}">${col.label}${arrow}</th>`;
    }).join("")}</tr>`;

    thead.querySelectorAll("th[data-sort]").forEach(th => {
        th.addEventListener("click", () => {
            const key = th.dataset.sort;
            if (tableState.sort_by === key) {
                tableState.order = tableState.order === "desc" ? "asc" : "desc";
            } else {
                tableState.sort_by = key;
                tableState.order = "desc";
            }
            tableState.page = 1;
            loadTable();
        });
    });
}

function getScoreClass(score) {
    if (score >= 85) return "score-high";
    if (score >= 75) return "score-mid";
    return "score-low";
}

function renderTableBody(data) {
    const tbody = document.getElementById("table-body");
    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="${TABLE_COLUMNS.length}" style="text-align:center;padding:40px;color:var(--text-light);">暂无数据</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(row => `
        <tr data-id="${row.id}">
            <td>${row.id}</td>
            <td>${row.country_of_origin || "-"}</td>
            <td>${row.farm_name || "-"}</td>
            <td>${row.variety || "-"}</td>
            <td>${row.processing_method || "-"}</td>
            <td>${row.aroma?.toFixed(1) || "-"}</td>
            <td>${row.flavor?.toFixed(1) || "-"}</td>
            <td>${row.aftertaste?.toFixed(1) || "-"}</td>
            <td>${row.acidity?.toFixed(1) || "-"}</td>
            <td>${row.body?.toFixed(1) || "-"}</td>
            <td class="${getScoreClass(row.total_cup_points)}">${row.total_cup_points?.toFixed(1)}</td>
            <td><span class="quality-tag ${toEnglishClass(row.quality_class)}">${row.quality_class}</span></td>
        </tr>
    `).join("");

    tbody.querySelectorAll("tr").forEach(tr => {
        tr.addEventListener("click", async () => {
            const id = parseInt(tr.dataset.id);
            showCoffeeDetail(id);
        });
    });
}

function renderPagination(result) {
    const container = document.getElementById("pagination");
    const { page, pages, total } = result;
    container.innerHTML = `
        <button ${page <= 1 ? "disabled" : ""} id="btn-prev">上一页</button>
        <span class="page-info">第 ${page} / ${pages} 页（共 ${total} 条）</span>
        <button ${page >= pages ? "disabled" : ""} id="btn-next">下一页</button>`;

    document.getElementById("btn-prev").addEventListener("click", () => {
        if (tableState.page > 1) { tableState.page--; loadTable(); }
    });
    document.getElementById("btn-next").addEventListener("click", () => {
        if (tableState.page < pages) { tableState.page++; loadTable(); }
    });
}

async function showCoffeeDetail(id) {
    try {
        const coffee = await CoffeeAPI.get(id);
        const overlay = document.getElementById("modal-overlay");
        const content = document.getElementById("modal-content");

        content.innerHTML = `
            <button class="modal-close" id="modal-close">&times;</button>
            <h2 style="margin-bottom:20px;color:var(--dark);">${coffee.country_of_origin} - ${coffee.farm_name || "未知农场"}</h2>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
                <div>
                    <h4 style="margin-bottom:12px;color:var(--primary);">基本信息</h4>
                    <table style="width:100%;font-size:13px;">
                        ${[
                            ["国家", coffee.country_of_origin],
                            ["产区", coffee.region],
                            ["农场", coffee.farm_name],
                            ["品种", coffee.variety],
                            ["处理方式", coffee.processing_method],
                            ["海拔", coffee.altitude],
                            ["海拔均值", coffee.altitude_mean ? coffee.altitude_mean + "m" : "-"],
                        ].map(([k, v]) => `<tr><td style="padding:6px 12px;color:var(--text-light);">${k}</td><td style="padding:6px 12px;font-weight:500;">${v || "-"}</td></tr>`).join("")}
                    </table>
                    <h4 style="margin:20px 0 12px;color:var(--primary);">评分详情</h4>
                    <table style="width:100%;font-size:13px;">
                        ${[
                            ["香气 Aroma", coffee.aroma],
                            ["风味 Flavor", coffee.flavor],
                            ["余韵 Aftertaste", coffee.aftertaste],
                            ["酸度 Acidity", coffee.acidity],
                            ["醇厚度 Body", coffee.body],
                            ["平衡度 Balance", coffee.balance],
                            ["均匀度 Uniformity", coffee.uniformity],
                            ["干净杯 Clean Cup", coffee.clean_cup],
                            ["甜度 Sweetness", coffee.sweetness],
                            ["水分 Moisture", coffee.moisture],
                            ["总分", coffee.total_cup_points],
                            ["等级", coffee.quality_class],
                        ].map(([k, v]) => `<tr><td style="padding:6px 12px;color:var(--text-light);">${k}</td><td style="padding:6px 12px;font-weight:500;">${v != null ? (typeof v === "number" ? v.toFixed(1) : v) : "-"}</td></tr>`).join("")}
                    </table>
                </div>
                <div>
                    <h4 style="margin-bottom:12px;color:var(--primary);">风味雷达图</h4>
                    <div id="detail-radar" style="height:400px;"></div>
                </div>
            </div>`;

        overlay.style.display = "flex";
        document.getElementById("modal-close").addEventListener("click", () => {
            overlay.style.display = "none";
        });
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.style.display = "none";
        });

        // 雷达图
        const radarChart = echarts.init(document.getElementById("detail-radar"));
        const radarFields = ["aroma", "flavor", "aftertaste", "acidity", "body", "balance", "uniformity", "clean_cup"];
        const radarLabels = ["香气", "风味", "余韵", "酸度", "醇厚度", "平衡度", "均匀度", "干净杯"];
        radarChart.setOption({
            tooltip: {},
            legend: { data: ["本咖啡", "全球均值"], bottom: 0 },
            radar: {
                indicator: radarLabels.map(l => ({ name: l, max: 10 })),
                shape: "polygon",
                radius: "65%",
            },
            series: [{
                type: "radar",
                data: [
                    {
                        name: "本咖啡",
                        value: radarFields.map(f => coffee[f] || 0),
                        areaStyle: { color: "rgba(111,78,55,0.3)" },
                        lineStyle: { color: "#6F4E37", width: 2 },
                        itemStyle: { color: "#6F4E37" },
                    },
                    {
                        name: "全球均值",
                        value: radarFields.map(() => 7.5),
                        areaStyle: { color: "rgba(200,200,200,0.1)" },
                        lineStyle: { color: "#ccc", width: 1, type: "dashed" },
                        itemStyle: { color: "#999" },
                    },
                ],
            }],
        });
    } catch (err) {
        alert("加载详情失败: " + err.message);
    }
}
