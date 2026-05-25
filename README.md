# 全球咖啡品质评级系统

云计算期末大作业 — Flask + MySQL + 多模型对比 + Docker Compose

> 基于 CQI (Coffee Quality Institute) 全球咖啡品质数据库（1311 条记录，37 国，30 品种），构建集数据浏览、多维分析、机器学习预测于一体的全栈 Web 应用。

---

## 技术栈

| 层次 | 技术 | 说明 |
|------|------|------|
| 后端框架 | Flask 3.1 + SQLAlchemy | RESTful API，ORM 操作 MySQL |
| 数据库 | MySQL 8.0 | 三表（users/coffees/predictions） |
| 前端 | 原生 HTML/CSS/JS + ECharts 5.5 | SPA 单页应用，Poppins 字体 |
| ML 框架 | scikit-learn + XGBoost + LightGBM | 四模型 GridSearchCV 对比 |
| 可解释性 | SHAP | 特征贡献瀑布图 |
| 认证 | JWT (flask-jwt-extended) | 24h Token，无状态鉴权 |
| 部署 | Docker Compose | Nginx + Flask/Gunicorn + MySQL 三容器 |

---

## 功能模块

| 页面 | 路由 | 功能 |
|------|------|------|
| 登录/注册 | `#login` / `#register` | JWT 认证，用户名密码注册登录 |
| 数据概览 | `#dashboard` | 6 维 KPI 卡片 + Top10 国家柱状图 + 等级环形图 + 分数分布 |
| 数据浏览 | `#data` | 筛选(国家/品种/等级) + 排序 + 分页 + 行详情风味雷达图 |
| 数据分析 | `#analysis` | 柱状图/环形图/热力图/特征重要性/散点图 + 自动洞察 |
| 模型预测 | `#predict` | 11 维参数输入 + 4 模型可选 + 仪表盘 + SHAP 解释 |
| 模型对比 | `#models` | 四模型 R²/RMSE 柱状图 + 指标卡片 + 特征重要性 |
| 预测历史 | `#history` | 分页表格 + 详情弹窗 + 删除 |

---

## 项目结构

```
Cloud_Computing/
├── backend/
│   ├── app.py                     # Flask 工厂函数 (自动建表)
│   ├── config.py                  # MySQL/JWT/路径配置
│   ├── extensions.py              # db, jwt 扩展
│   ├── requirements.txt           # Python 依赖
│   ├── Dockerfile                 # Flask 容器镜像
│   ├── gunicorn_config.py         # Gunicorn: 4 workers, :8000
│   ├── models/
│   │   ├── user.py                # User 模型
│   │   └── coffee.py              # Coffee + Prediction 模型
│   ├── routes/
│   │   ├── auth.py                # 注册 / 登录 / 当前用户
│   │   ├── coffee.py              # 数据 CRUD + 分页筛选
│   │   ├── stats.py               # 聚合统计 + 相关性 + 洞察
│   │   └── model_route.py         # 预测 / SHAP / 模型对比 / 历史
│   ├── services/
│   │   ├── coffee_service.py      # 数据查询逻辑
│   │   ├── stats_service.py       # 统计分析 + 洞察生成
│   │   └── ml_service.py          # 多模型加载 + 预测 + SHAP
│   ├── ml/
│   │   ├── train.py               # 四模型训练脚本
│   │   ├── preprocess.py          # 特征工程 (海拔解析等)
│   │   └── models/                # .pkl 模型 + model_compare.json
│   └── scripts/
│       └── import_data.py         # CSV → MySQL 导入
├── frontend/
│   ├── index.html                 # SPA 外壳 (顶部导航栏)
│   ├── images/                    # logo.png, banner-bg.png 等
│   ├── css/style.css              # GrandCoffee 橙色主题
│   └── js/
│       ├── app.js                 # 路由 + 认证状态 + Toast
│       ├── api.js                 # API 封装 + 工具函数
│       ├── echarts-theme.js       # ECharts 自定义主题
│       ├── auth.js                # 登录/注册
│       ├── dashboard.js           # 数据概览仪表盘
│       ├── datatable.js           # 数据浏览表格
│       ├── analysis.js            # 数据分析 (5图表+洞察)
│       ├── model-test.js          # 模型预测 (多模型+SHAP)
│       ├── model-compare.js       # 模型对比 (4模型卡片+图表)
│       └── history.js             # 预测历史 (详情+删除)
├── nginx/
│   └── nginx.conf                 # 反向代理: / → 静态文件, /api/* → Flask
├── docker-compose.yml             # Flask + MySQL + Nginx 编排
├── coffee_quality.sql             # 建库建表 DDL (容器自动执行)
├── data/
│   └── coffee_quality.csv         # 数据集 (需自行下载)
├── wsgi.py                        # Gunicorn 入口
├── report/                        # 实验报告 + SVG 架构图
└── README.md
```

---

## 数据集

**CQI Arabica Dataset** (Coffee Quality Institute)

| 属性 | 值 |
|------|-----|
| 来源 | https://github.com/jldbc/coffee-quality-database |
| 样本数 | 1,311 条 |
| 产地 | 37 个国家 |
| 品种 | 30 种 |
| 字段 | 产地 / 农场 / 品种 / 处理方式 / 海拔 / 产区 / 10 维感官评分 / 总分 |

```bash
curl -L -o data/coffee_quality.csv \
  https://raw.githubusercontent.com/jldbc/coffee-quality-database/master/data/arabica_data_cleaned.csv
```

---

## 数据库

数据库 `coffee_quality_db`，三张表：

| 表 | 记录 | 说明 |
|----|------|------|
| `users` | 注册用户 | username 唯一索引，werkzeug 哈希密码 |
| `coffees` | 1,311 条咖啡数据 | country / score 索引，14 列特征 |
| `predictions` | 用户预测记录 | user_id FK，JSON 存储输入特征 |

品质等级分级：≥85 卓越 · ≥80 优秀 · ≥75 良好 · ≥70 一般 · <70 较差

---

## API 路由

所有 `/api/*` 路由（除 auth）需 `Authorization: Bearer <token>` 头。

### 认证

| 方法 | 路由 | 请求 | 响应 |
|------|------|------|------|
| POST | `/api/auth/register` | `{username, password, email}` | `{msg, user_id}` |
| POST | `/api/auth/login` | `{username, password}` | `{access_token, user}` |
| GET | `/api/auth/me` | — | `{user}` |

### 数据

| 方法 | 路由 | 参数 |
|------|------|------|
| GET | `/api/coffee` | `?page=1&limit=20&country=Ethiopia&sort_by=total_cup_points&order=desc&search=xxx` |
| GET | `/api/coffee/countries` | — |
| GET | `/api/coffee/varieties` | — |
| GET | `/api/coffee/<id>` | — |

### 统计

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/api/stats/summary` | 仪表盘汇总 (总数/均分/等级占比/最高分国家) |
| GET | `/api/stats/by-country` | 各国聚合 (均分/数量/8维感官均分) |
| GET | `/api/stats/country/<name>` | 单国详情 + 等级分布 |
| GET | `/api/stats/distribution` | 分数区间分布 |
| GET | `/api/stats/correlation` | 10×10 Pearson 相关性矩阵 |
| GET | `/api/stats/top-coffees` | Top10 最高分 |
| GET | `/api/stats/insights` | 自动分析洞察 (7 条结论) |

### 模型

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/api/model/features` | 11 维特征列表及范围 |
| GET | `/api/model/list` | 可用模型列表 |
| GET | `/api/model/info` | 模型元信息 (R²/RMSE/特征重要性) |
| GET | `/api/model/compare` | 四模型对比数据 |
| POST | `/api/model/predict` | `{features:{...}, model:"gbdt"}` → 预测结果 |
| POST | `/api/model/shap` | `{features:{...}, model:"gbdt"}` → SHAP 值 |
| GET | `/api/model/history` | 当前用户预测历史 `?page=1&limit=20` |
| DELETE | `/api/model/history/<id>` | 删除预测记录 |

---

## ML 模型

### 训练流程

```
CSV 加载 → 海拔解析 → 分类编码(country/variety/processing) → 缺失值填充
→ 80/20 划分 → GridSearchCV (5-fold) → 保存最优 .pkl + model_compare.json
```

### 模型性能

| 模型 | R² | RMSE | 训练时间 | 最优参数 |
|------|-----|------|----------|----------|
| Random Forest | 0.9368 | 0.6285 | 7.7s | max_depth=15, n=100 |
| XGBoost | 0.9660 | 0.4608 | 2.2s | lr=0.1, depth=4, n=200 |
| LightGBM | 0.9292 | 0.6654 | 16.9s | lr=0.05, depth=6 |
| **GBDT** (最优) | **0.9732** | **0.4093** | 1.1s | lr=0.05, depth=3, n=200 |

### 输入特征 (11 维)

| 特征 | 范围 | 单位 |
|------|------|------|
| aroma 香气 / flavor 风味 / aftertaste 余韵 / acidity 酸度 | 0–10 | 分 |
| body 醇厚度 / balance 平衡度 / uniformity 均匀度 | 0–10 | 分 |
| clean_cup 干净杯 / sweetness 甜度 | 0–10 | 分 |
| moisture 水分 | 0–15 | % |
| altitude_mean 海拔均值 | 0–3000 | m |

---

## 本地运行

### 前提条件
- Python 3.10+
- MySQL 5.7+ 运行中
- 配置 `backend/config.py` 中的 `MYSQL_PASSWORD`（本地默认 `mysql@123`，按实际情况改）

### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/uMemory/Coffee.git
cd Coffee

# 2. 安装依赖
pip install -r backend/requirements.txt

# 3. 下载数据集
curl -L -o data/coffee_quality.csv \
  https://raw.githubusercontent.com/jldbc/coffee-quality-database/master/data/arabica_data_cleaned.csv

# 4. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS coffee_quality_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# 5. 建表
python -c "from backend.app import create_app; create_app()"

# 6. 导入数据
python backend/scripts/import_data.py

# 7. 训练四模型
python backend/ml/train.py

# 8. 启动 (必须在项目根目录)
python -c "from backend.app import create_app; app=create_app(); app.run(host='0.0.0.0', port=5000)"
```

访问 http://localhost:5000

> 如果本地 MySQL 密码不同，设置环境变量 `MYSQL_PASSWORD` 或在 `config.py` 中修改默认值。

---

## Docker 部署 (Ubuntu 云服务器)

### 1. 服务器环境准备

```bash
# 安装 Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose

# 启动 Docker
sudo systemctl enable docker && sudo systemctl start docker

# 开放端口
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 2. 部署应用

```bash
# 克隆项目
git clone https://github.com/uMemory/Coffee.git
cd Coffee

# 下载数据集
curl -L -o data/coffee_quality.csv \
  https://raw.githubusercontent.com/jldbc/coffee-quality-database/master/data/arabica_data_cleaned.csv

# 一键构建 + 启动 (MySQL + Flask + Nginx)
sudo docker compose up -d --build

# 查看容器状态 (三个都应显示 Up / healthy)
sudo docker ps
```

### 3. 导入数据 + 训练模型

```bash
# 进入 Flask 容器
sudo docker exec -it coffee-flask bash

# 在容器内执行
python backend/scripts/import_data.py
python backend/ml/train.py

# 退出容器
exit
```

### 4. 验证

浏览器访问 `http://<服务器公网IP>`，应看到登录页面。注册账号后即可使用全部功能。

### 5. 常用管理命令

```bash
# 查看日志
sudo docker compose logs flask
sudo docker compose logs mysql
sudo docker compose logs nginx

# 重启
sudo docker compose restart

# 停止
sudo docker compose down

# 完全重建 (保留数据卷)
sudo docker compose down
sudo docker compose up -d --build

# 重建 + 清除数据库 (删除数据卷)
sudo docker compose down -v
sudo docker compose up -d --build
```

### 容器架构

```
浏览器 → Nginx(:80) ─┬─ /        → 静态文件 (frontend/)
                     └─ /api/*   → Gunicorn(:8000) → Flask → MySQL(:3306)
```

| 容器 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| coffee-nginx | nginx:alpine | 80 | 反向代理 + 静态文件 |
| coffee-flask | 自构建 (Python 3.11) | 8000 (内部) | Gunicorn 4 workers |
| coffee-mysql | mysql:8.0 | 3306 | 数据卷持久化 |

### 文件挂载

| 宿主机路径 | 容器内路径 | 用途 |
|------------|------------|------|
| `./frontend/` | `/usr/share/nginx/html` | 前端静态文件 |
| `./nginx/nginx.conf` | `/etc/nginx/conf.d/default.conf` | Nginx 配置 |
| `./coffee_quality.sql` | `/docker-entrypoint-initdb.d/` | MySQL 首次启动自动建表 |
| `./backend/ml/models/` | `/app/backend/ml/models/` | 模型文件持久化 |
| `mysql_data` (volume) | `/var/lib/mysql` | 数据库文件持久化 |

---

## 故障排查

| 问题 | 解决 |
|------|------|
| 容器启动失败 | `sudo docker compose logs flask` 查看 Flask 日志 |
| MySQL 连接失败 | 确认 MySQL 容器 healthy: `sudo docker ps` |
| 页面空白 | 检查浏览器控制台 (F12 → Console) |
| API 返回 401 | Token 过期，重新登录 |
| 模型预测失败 | 确保已运行 `python backend/ml/train.py` |
| 端口被占用 | `sudo lsof -i :80` 查看并释放端口 |
