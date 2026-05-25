/* ========== 共享工具函数 ========== */
function toEnglishClass(zh) {
    const map = { "卓越": "excellent", "优秀": "very-good", "良好": "good", "一般": "average", "较差": "below-avg", "below-average": "below-avg" };
    return map[zh] || "below-avg";
}

const QUALITY_COLORS = { "卓越": "#2F8F62", "优秀": "#315F88", "良好": "#D99A21", "一般": "#C96F2D", "较差": "#C94E46" };
const CHART_GRADIENT_START = "#9A6B43";
const CHART_GRADIENT_END = "#D9A441";

/* ========== API请求封装 ========== */

const API_BASE = "/api";

function getToken() {
    return localStorage.getItem("token");
}

async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(API_BASE + url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.hash = "#login";
        throw new Error("登录已过期，请重新登录");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.msg || "请求失败");
    }

    return data;
}

/* ===== 认证 ===== */
const AuthAPI = {
    register: (username, password, email) =>
        apiFetch("/auth/register", {
            method: "POST",
            body: JSON.stringify({ username, password, email }),
        }),
    login: (username, password) =>
        apiFetch("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        }),
    me: () => apiFetch("/auth/me"),
};

/* ===== 咖啡数据 ===== */
const CoffeeAPI = {
    list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/coffee?${qs}`);
    },
    get: (id) => apiFetch(`/coffee/${id}`),
    countries: () => apiFetch("/coffee/countries"),
    varieties: () => apiFetch("/coffee/varieties"),
};

/* ===== 统计分析 ===== */
const StatsAPI = {
    summary: () => apiFetch("/stats/summary"),
    byCountry: () => apiFetch("/stats/by-country"),
    distribution: () => apiFetch("/stats/distribution"),
    correlation: () => apiFetch("/stats/correlation"),
    topCoffees: () => apiFetch("/stats/top-coffees"),
    insights: () => apiFetch("/stats/insights"),
    countryDetail: (country) => apiFetch(`/stats/country/${encodeURIComponent(country)}`),
};

/* ===== 模型 ===== */
const ModelAPI = {
    features: () => apiFetch("/model/features"),
    info: () => apiFetch("/model/info"),
    predict: (features) =>
        apiFetch("/model/predict", {
            method: "POST",
            body: JSON.stringify(features),
        }),
    history: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/model/history?${qs}`);
    },
};
