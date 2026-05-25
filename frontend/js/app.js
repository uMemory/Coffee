/* ================================================================
   App — 路由 / 认证 / Toast / 全局状态 (Top Nav version)
   ================================================================ */

const App = {
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "null"),

    routes: {
        "#login": renderAuthPage, "#register": renderAuthPage,
        "#dashboard": renderDashboard, "#data": renderDataTable,
        "#analysis": renderAnalysis, "#predict": renderModelTest,
        "#models": renderModelCompare, "#history": renderHistory,
    },

    async init() {
        if (this.token) {
            try { const d = await AuthAPI.me(); this.user = d.user; localStorage.setItem("user", JSON.stringify(d.user)); }
            catch { this.logout(true); }
        }
        this.updateNav(); this.handleRoute();
        window.addEventListener("hashchange", () => this.handleRoute());
    },

    isLoggedIn() { return !!this.token && !!this.user; },

    logout(silent) {
        this.token = null; this.user = null;
        localStorage.removeItem("token"); localStorage.removeItem("user");
        if (!silent) window.location.hash = "#login";
        this.updateNav();
    },

    updateNav() {
        const navLinks = document.getElementById("nav-links");
        const navUser = document.querySelector(".nav-user");
        if (!this.isLoggedIn()) {
            navLinks.style.display = "none";
            navUser.style.display = "none";
        } else {
            navLinks.style.display = "";
            navUser.style.display = "";
            const uname = this.user?.username || "";
            document.getElementById("nav-username").textContent = uname;
            document.getElementById("nav-avatar").textContent = uname.charAt(0).toUpperCase();
        }
    },

    handleRoute() {
        const hash = window.location.hash || "#dashboard";
        if (!this.isLoggedIn() && hash !== "#login" && hash !== "#register") { window.location.hash = "#login"; return; }
        if (this.isLoggedIn() && (hash === "#login" || hash === "#register")) { window.location.hash = "#dashboard"; return; }
        document.querySelectorAll(".nav-link").forEach(l => l.classList.toggle("active", l.getAttribute("href") === hash));
        const fn = this.routes[hash];
        if (fn) { document.getElementById("app-content").innerHTML = ""; fn(); }
        else window.location.hash = "#dashboard";
    },
};

/* ===== Toast ===== */
function showToast(msg, type) {
    type = type || "info";
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(40px)"; el.style.transition = "all 0.3s ease"; setTimeout(() => el.remove(), 300); }, 3500);
}

/* ===== ECharts helper ===== */
function initChart(domId) {
    const dom = typeof domId === "string" ? document.getElementById(domId) : domId;
    if (!dom || dom.offsetWidth === 0) return null;
    const existing = echarts.getInstanceByDom(dom);
    if (existing) existing.dispose();
    return echarts.init(dom);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-logout").addEventListener("click", () => App.logout());
    App.init();
});
