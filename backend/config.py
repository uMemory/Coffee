from urllib.parse import quote_plus
import os


class Config:
    MYSQL_HOST = os.environ.get("MYSQL_HOST", "localhost")
    MYSQL_PORT = os.environ.get("MYSQL_PORT", "3306")
    MYSQL_USER = os.environ.get("MYSQL_USER", "root")
    MYSQL_PASSWORD = quote_plus(os.environ.get("MYSQL_PASSWORD", "mysql@123"))
    MYSQL_DB = os.environ.get("MYSQL_DB", "coffee_quality_db")
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
        f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
        "?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "coffee-quality-jwt-secret-2026")
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24小时

    # ML模型路径
    MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml", "models")
    MODEL_PATH = os.path.join(MODEL_DIR, "rf_coffee_model.pkl")
    METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

    # CSV数据路径
    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    CSV_PATH = os.path.join(DATA_DIR, "coffee_quality.csv")
