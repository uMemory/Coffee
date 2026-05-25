/* ========== 登录/注册页面 ========== */

function renderAuthPage() {
    const hash = window.location.hash;
    const isLogin = hash === "#login" || hash === "";
    const container = document.getElementById("app-content");

    container.innerHTML = `
    <div class="auth-page">
        <div class="auth-card">
            <div class="auth-tabs">
                <button class="auth-tab ${isLogin ? 'active' : ''}" id="tab-login">登录</button>
                <button class="auth-tab ${!isLogin ? 'active' : ''}" id="tab-register">注册</button>
            </div>
            <div class="auth-body" id="auth-body"></div>
        </div>
    </div>`;

    document.getElementById("tab-login").addEventListener("click", () => {
        window.location.hash = "#login";
    });
    document.getElementById("tab-register").addEventListener("click", () => {
        window.location.hash = "#register";
    });

    if (isLogin) {
        renderLoginForm();
    } else {
        renderRegisterForm();
    }
}

function renderLoginForm() {
    const body = document.getElementById("auth-body");
    body.innerHTML = `
        <h2>欢迎回来</h2>
        <form id="login-form">
            <div class="form-group">
                <label>用户名</label>
                <input type="text" name="username" class="form-control" placeholder="请输入用户名" required autocomplete="username">
            </div>
            <div class="form-group">
                <label>密码</label>
                <input type="password" name="password" class="form-control" placeholder="请输入密码" required autocomplete="current-password">
            </div>
            <div id="login-error" class="form-error" style="margin-bottom:12px;display:none;"></div>
            <button type="submit" class="btn btn-primary" style="width:100%;">登 录</button>
        </form>`;

    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById("login-error");
        errorEl.style.display = "none";
        const btn = e.target.querySelector("button");
        btn.disabled = true;
        btn.textContent = "登录中...";

        try {
            const data = await AuthAPI.login(
                e.target.username.value.trim(),
                e.target.password.value
            );
            localStorage.setItem("token", data.access_token);
            localStorage.setItem("user", JSON.stringify(data.user));
            App.token = data.access_token;
            App.user = data.user;
            App.updateNav();
            window.location.hash = "#dashboard";
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = "block";
        } finally {
            btn.disabled = false;
            btn.textContent = "登 录";
        }
    });
}

function renderRegisterForm() {
    const body = document.getElementById("auth-body");
    body.innerHTML = `
        <h2>创建账号</h2>
        <form id="register-form">
            <div class="form-group">
                <label>用户名</label>
                <input type="text" name="username" class="form-control" placeholder="至少3个字符" required>
            </div>
            <div class="form-group">
                <label>邮箱</label>
                <input type="email" name="email" class="form-control" placeholder="选填">
            </div>
            <div class="form-group">
                <label>密码</label>
                <input type="password" name="password" class="form-control" placeholder="至少4个字符" required>
            </div>
            <div class="form-group">
                <label>确认密码</label>
                <input type="password" name="confirm" class="form-control" placeholder="再次输入密码" required>
            </div>
            <div id="register-error" class="form-error" style="margin-bottom:12px;display:none;"></div>
            <button type="submit" class="btn btn-primary" style="width:100%;">注 册</button>
        </form>`;

    document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const errorEl = document.getElementById("register-error");
        errorEl.style.display = "none";

        const password = e.target.password.value;
        const confirm = e.target.confirm.value;
        if (password !== confirm) {
            errorEl.textContent = "两次密码输入不一致";
            errorEl.style.display = "block";
            return;
        }

        const btn = e.target.querySelector("button");
        btn.disabled = true;
        btn.textContent = "注册中...";

        try {
            await AuthAPI.register(
                e.target.username.value.trim(),
                password,
                e.target.email.value.trim()
            );
            alert("注册成功，请登录");
            window.location.hash = "#login";
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.style.display = "block";
        } finally {
            btn.disabled = false;
            btn.textContent = "注 册";
        }
    });
}
