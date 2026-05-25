/* ========== 应用路由与状态管理 ========== */

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
        "#history": renderHistory,
    },

    async init() {
        // 验证token
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
        const navbar = document.getElementById("navbar");
        const navLinks = document.getElementById("nav-links");
        const navUser = document.querySelector(".nav-user");

        if (!this.isLoggedIn()) {
            navLinks.style.display = "none";
            navUser.style.display = "none";
        } else {
            navLinks.style.display = "flex";
            navUser.style.display = "flex";
            document.getElementById("nav-username").textContent = this.user?.username || "";
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

        // 更新导航高亮
        document.querySelectorAll(".nav-link").forEach(link => {
            link.classList.toggle("active", link.getAttribute("href") === hash);
        });

        const renderFn = this.routes[hash];
        if (renderFn) {
            renderFn();
        } else {
            window.location.hash = "#dashboard";
        }
    },
};

// 退出登录
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-logout").addEventListener("click", () => App.logout());
    App.init();
});
