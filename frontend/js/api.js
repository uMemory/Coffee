/* ================================================================
   API 封装 + 共享工具函数
   ================================================================ */

const API_BASE = "/api";

/* -------- 工具函数 -------- */
function toEnglishClass(zh) {
    const map = { "卓越": "excellent", "优秀": "very-good", "良好": "good", "一般": "average", "较差": "below-avg", "below-average": "below-avg" };
    return map[zh] || "below-avg";
}

const QUALITY_COLORS = { "卓越": "#2fa866", "优秀": "#2374ab", "良好": "#f5a623", "一般": "#e57b26", "较差": "#d64545" };

function getScoreClass(score) {
    if (score >= 85) return "score-high";
    if (score >= 75) return "score-mid";
    return "score-low";
}

function formatTime(isoStr) {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* -------- HTTP 核心 -------- */
function getToken() { return localStorage.getItem("token"); }

async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
    const response = await fetch(API_BASE + url, { ...options, headers });
    if (response.status === 401) {
        localStorage.removeItem("token"); localStorage.removeItem("user");
        window.location.hash = "#login";
        throw new Error("登录已过期，请重新登录");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.msg || "请求失败");
    return data;
}

/* -------- 认证 -------- */
const AuthAPI = {
    register: (u, p, e) => apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ username: u, password: p, email: e }) }),
    login: (u, p) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p }) }),
    me: () => apiFetch("/auth/me"),
};

/* -------- 咖啡数据 -------- */
const CoffeeAPI = {
    list: (params = {}) => {
        const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString();
        return apiFetch(`/coffee?${qs}`);
    },
    get: (id) => apiFetch(`/coffee/${id}`),
    countries: () => apiFetch("/coffee/countries"),
    varieties: () => apiFetch("/coffee/varieties"),
};

/* -------- 统计分析 -------- */
const StatsAPI = {
    summary: () => apiFetch("/stats/summary"),
    byCountry: () => apiFetch("/stats/by-country"),
    distribution: () => apiFetch("/stats/distribution"),
    correlation: () => apiFetch("/stats/correlation"),
    topCoffees: () => apiFetch("/stats/top-coffees"),
    insights: () => apiFetch("/stats/insights"),
    countryDetail: (c) => apiFetch(`/stats/country/${encodeURIComponent(c)}`),
};

/* -------- 模型 -------- */
const ModelAPI = {
    features: () => apiFetch("/model/features"),
    info: () => apiFetch("/model/info"),
    predict: (features, model) => apiFetch("/model/predict", { method: "POST", body: JSON.stringify({ features, model }) }),
    history: (params = {}) => {
        const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString();
        return apiFetch(`/model/history?${qs}`);
    },
    compare: () => apiFetch("/model/compare"),
    list: () => apiFetch("/model/list"),
    shap: (features, model) => apiFetch("/model/shap", { method: "POST", body: JSON.stringify({ features, model }) }),
    deleteHistory: (id) => apiFetch(`/model/history/${id}`, { method: "DELETE" }),
};
