FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖（利用Docker缓存）
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制项目代码
COPY . /app/

# 创建模型目录
RUN mkdir -p /app/backend/ml/models

# 暴露端口
EXPOSE 8000

# Gunicorn启动
CMD ["gunicorn", "wsgi:app", "-c", "backend/gunicorn_config.py"]
