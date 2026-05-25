"""WSGI入口 - Gunicorn启动"""
from backend.app import create_app

app = create_app()
