import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from backend.config import Config
from backend.extensions import db, jwt


def create_app():
    # 前端目录 (backend/../frontend)
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

    app = Flask(__name__, static_folder=frontend_dir, static_url_path="")
    app.config.from_object(Config)

    # 初始化扩展
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # 注册蓝图
    from backend.routes.auth import auth_bp
    from backend.routes.coffee import coffee_bp
    from backend.routes.stats import stats_bp
    from backend.routes.model_route import model_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(coffee_bp, url_prefix="/api/coffee")
    app.register_blueprint(stats_bp, url_prefix="/api/stats")
    app.register_blueprint(model_bp, url_prefix="/api/model")

    # 自动建表（Docker 首次启动）
    with app.app_context():
        db.create_all()

    # SPA: 所有非API路由返回index.html
    @app.route("/")
    @app.route("/<path:path>")
    def serve_frontend(path=""):
        if path and os.path.exists(os.path.join(frontend_dir, path)):
            return send_from_directory(frontend_dir, path)
        return send_from_directory(frontend_dir, "index.html")

    return app
