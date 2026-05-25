/* ================================================================
   App — 路由 / 认证 / Toast / 全局状态
   ================================================================ */

const App = {
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "null"),

    routes: {
        "#login": renderAuthPage,
        "#register": renderAuthPage,
        "#dashboard": renderDashboard,
        "#data": renderDataTable,
        "#analysis": renderAnalysis,
        "#predict": renderModelTest,
        "#models": renderModelCompare,
        "#history": renderHistory,
    },

    async init() {
        if (this.token) {
            try {
                const data = await AuthAPI.me();
                this.user = data.user;
                localStorage.setItem("user", JSON.stringify(data.user));
            } catch {
                this.logout(true);
            }
        }
        this.updateNav();
        this.handleRoute();
        window.addEventListener("hashchange", () => this.handleRoute());
    },

    isLoggedIn() {
        return !!this.token && !!this.user;
    },

    logout(silent = false) {
        this.token = null;
        this.user = null;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (!silent) {
            window.location.hash = "#login";
        }
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
        if (!this.isLoggedIn() && hash !== "#login" && hash !== "#register") {
            window.location.hash = "#login";
            return;
        }
        if (this.isLoggedIn() && (hash === "#login" || hash === "#register")) {
            window.location.hash = "#dashboard";
            return;
        }
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.toggle("active", link.getAttribute("href") === hash);
        });
        const renderFn = this.routes[hash];
        if (renderFn) {
            document.getElementById("app-content").innerHTML = "";
            renderFn();
        } else {
            window.location.hash = "#dashboard";
        }
    },
};

/* ===== Toast 通知 ===== */
function showToast(msg, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(60px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ===== 全局 ECharts 辅助 ===== */
function initChart(domId) {
    const dom = typeof domId === "string" ? document.getElementById(domId) : domId;
    if (!dom || dom.offsetWidth === 0) return null;
    const existing = echarts.getInstanceByDom(dom);
    if (existing) existing.dispose();
    return echarts.init(dom);
}

/* ===== 启动 ===== */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-logout").addEventListener("click", () => App.logout());
    App.init();
});
