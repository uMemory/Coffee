# 全球咖啡品质评级系统

云计算期末大作业 — Flask + MySQL + scikit-learn + ECharts

## 项目简介

基于 CQI (Coffee Quality Institute) 全球咖啡品质数据，构建全栈 Web 应用。用户可以浏览、分析全球咖啡品质数据，并使用机器学习模型预测咖啡品质评分。

## 技术栈

| 层 | 选择 |
|---|------|
| 后端 | Flask + SQLAlchemy |
| 数据库 | MySQL 8.0 |
| 前端 | 原生 HTML/CSS/JS + ECharts |
| ML | scikit-learn RandomForestRegressor |
| 认证 | JWT (flask-jwt-extended) |
| 部署 | Docker Compose (Flask + MySQL + Nginx) |

## 功能模块

| 页面 | 功能 |
|------|------|
| 登录/注册 | 用户认证，JWT Token |
| 数据概览 | 6张统计卡片 + Top10柱状图 + 等级环形图 + 分数分布 |
| 数据浏览 | 筛选(国家/品种/等级) + 排序 + 分页 + 行详情雷达图 |
| 数据分析 | 柱状图/环形图/热力图/重要性图/散点图 + 自动分析结论 |
| 模型预测 | 11维参数输入 + 仪表盘结果 + 置信区间 |
| 预测历史 | 历史记录分页查看 |

## 项目结构

```
Cloud_Computing/
├── backend/
│   ├── app.py                  # Flask 工厂函数
│   ├── config.py               # 数据库/JWT/模型路径配置
│   ├── extensions.py           # SQLAlchemy, JWT 扩展初始化
│   ├── requirements.txt        # Python 依赖
│   ├── Dockerfile              # Flask 容器镜像
│   ├── gunicorn_config.py      # Gunicorn 配置
│   ├── models/
│   │   ├── user.py             # 用户模型
│   │   └── coffee.py           # 咖啡 + 预测模型
│   ├── routes/
│   │   ├── auth.py             # /api/auth/* 注册登录
│   │   ├── coffee.py           # /api/coffee/* 数据CRUD
│   │   ├── stats.py            # /api/stats/* 聚合统计
│   │   └── model_route.py      # /api/model/* 预测+历史
│   ├── services/
│   │   ├── coffee_service.py   # 数据查询
│   │   ├── stats_service.py    # 统计分析 + insight自动生成
│   │   └── ml_service.py       # 模型加载 + 预测
│   ├── ml/
│   │   ├── train.py            # 训练脚本
│   │   ├── preprocess.py       # 特征工程
│   │   └── models/             # .pkl 模型文件
│   └── scripts/
│       └── import_data.py      # CSV → MySQL 导入
├── frontend/
│   ├── index.html              # SPA 外壳
│   ├── css/style.css           # 咖啡主题样式 + 响应式
│   └── js/
│       ├── app.js              # 路由 + 认证状态
│       ├── api.js              # API 封装
│       ├── auth.js             # 登录注册
│       ├── dashboard.js        # 数据概览
│       ├── datatable.js        # 数据浏览
│       ├── analysis.js         # 数据分析
│       ├── model-test.js       # 模型预测
│       └── history.js          # 预测历史
├── nginx/
│   └── nginx.conf              # Nginx 反向代理配置
├── docker-compose.yml          # Flask + MySQL + Nginx
├── coffee_quality.sql          # 建库建表 DDL
├── data/
│   └── coffee_quality.csv      # 数据集
└── wsgi.py                     # Gunicorn 入口
```

## 数据集

CQI 咖啡品质数据集 (Coffee Quality Institute Arabica Dataset)

- **来源**: https://github.com/jldbc/coffee-quality-database
- **下载地址**: https://raw.githubusercontent.com/jldbc/coffee-quality-database/master/data/arabica_data_cleaned.csv
- **样本数**: 1,311 条
- **字段**: 产地国家、农场、品种、处理方式、海拔、产区，以及香气/风味/余韵/酸度/醇厚度/平衡度等感官评分(0-10)，总分 Total.Cup.Points(0-100)

下载数据集：
```bash
curl -L -o data/coffee_quality.csv \
  https://raw.githubusercontent.com/jldbc/coffee-quality-database/master/data/arabica_data_cleaned.csv
```

## 数据库

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增主键 |
| username | VARCHAR(50) UNIQUE | 用户名 |
| password_hash | VARCHAR(255) | 密码哈希 |
| email | VARCHAR(100) | 邮箱 |
| created_at | DATETIME | 注册时间 |
| last_login | DATETIME | 最后登录 |

### coffees 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增主键 |
| country_of_origin | VARCHAR(50) | 产地国家 |
| farm_name | VARCHAR(200) | 农场名 |
| variety | VARCHAR(100) | 品种 |
| processing_method | VARCHAR(100) | 处理方式 |
| altitude / altitude_mean | VARCHAR / FLOAT | 海拔 |
| region | VARCHAR(200) | 产区 |
| aroma ~ sweetness | FLOAT | 感官评分(0-10) |
| moisture | FLOAT | 水分(%) |
| total_cup_points | FLOAT | 总分(0-100) |
| quality_class | VARCHAR(20) | 品质等级 |

品质等级: ≥85→卓越, ≥80→优秀, ≥75→良好, ≥70→一般, <70→较差

### predictions 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT PK | 自增主键 |
| user_id | INT FK | 用户ID |
| input_features | JSON | 输入特征 |
| predicted_score | FLOAT | 预测分数 |
| predicted_class | VARCHAR(20) | 预测等级 |
| created_at | DATETIME | 预测时间 |

## API 路由

除 `/api/auth/*` 外，均需 `Authorization: Bearer <token>` 请求头。

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 → `{access_token}` |
| GET | `/api/auth/me` | 当前用户 |
| GET | `/api/coffee` | 分页列表 `?page&limit&country&sort_by&order&search` |
| GET | `/api/coffee/countries` | 国家列表 |
| GET | `/api/coffee/varieties` | 品种列表 |
| GET | `/api/coffee/<id>` | 单条详情 |
| GET | `/api/stats/summary` | 仪表盘汇总 |
| GET | `/api/stats/by-country` | 各国聚合统计 |
| GET | `/api/stats/distribution` | 分数分布 |
| GET | `/api/stats/correlation` | 特征相关性矩阵 |
| GET | `/api/stats/top-coffees` | Top10 最高分 |
| GET | `/api/stats/insights` | 自动分析结论 |
| GET | `/api/model/features` | 模型特征信息 |
| GET | `/api/model/info` | 模型元信息(R²/RMSE) |
| POST | `/api/model/predict` | 预测(自动保存历史) |
| GET | `/api/model/history` | 预测历史 `?page&limit` |

## ML 模型

- **模型**: RandomForestRegressor
- **输入特征(11维)**: aroma, flavor, aftertaste, acidity, body, balance, uniformity, clean_cup, sweetness, moisture, altitude_mean
- **目标**: total_cup_points (0-100)
- **训练**: GridSearchCV 5折交叉验证
- **评估**: R², RMSE, 特征重要性

## 本地运行

### 前提条件
- Python 3.10+
- MySQL 5.7+ (本地服务运行中)
- 正确配置 `backend/config.py` 中的 MySQL 连接信息

### 步骤

```bash
# 1. 安装依赖
pip install -r backend/requirements.txt

# 2. 下载数据集
curl -L -o data/coffee_quality.csv \
  https://raw.githubusercontent.com/jldbc/coffee-quality-database/master/data/arabica_data_cleaned.csv

# 3. 创建数据库并建表
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS coffee_quality_db CHARACTER SET utf8mb4"
python -c "from backend.app import create_app; from backend.extensions import db; app=create_app(); app.app_context().push(); db.create_all()"

# 4. 导入数据
python backend/scripts/import_data.py

# 5. 训练模型
python backend/ml/train.py

# 6. 启动 Flask
cd backend && flask run --host=0.0.0.0 --port=5000
# 访问 http://localhost:5000
```

## Docker 部署 (Ubuntu 云服务器)

```bash
# 安装 Docker
sudo apt update && sudo apt install -y docker.io docker-compose

# 克隆项目
git clone <repo-url> && cd Cloud_Computing

# 下载数据集
curl -L -o data/coffee_quality.csv \
  https://raw.githubusercontent.com/jldbc/coffee-quality-database/master/data/arabica_data_cleaned.csv

# 一键启动 (MySQL + Flask + Nginx)
sudo docker compose up -d --build

# 进入 Flask 容器导入数据并训练模型
sudo docker exec -it coffee-flask bash
python backend/scripts/import_data.py
python backend/ml/train.py

# 访问 http://<服务器IP>
```

### Docker 容器架构

```
浏览器 → Nginx(:80) → /        → 静态文件 (frontend/)
                     → /api/*   → Gunicorn(:8000) → Flask → MySQL(:3306)
```

## 配色方案

| 用途 | 色值 |
|------|------|
| 主色(咖啡棕) | #6F4E37 |
| 辅助色(浅咖) | #D4A574 |
| 背景(奶油白) | #F5F0EB |
| 卓越 | #27AE60 |
| 优秀 | #2980B9 |
| 良好 | #F39C12 |
| 一般 | #E67E22 |
| 较差 | #E74C3C |
