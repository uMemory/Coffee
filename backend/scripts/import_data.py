"""CSV数据导入MySQL脚本"""
import re
import sys
import os

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.config import Config
from backend.app import create_app
from backend.extensions import db
from backend.models.coffee import Coffee


def parse_altitude(alt_str):
    """解析海拔字符串为数值均值"""
    if pd.isna(alt_str) or str(alt_str).strip() == "":
        return None
    s = str(alt_str).strip().lower()
    # 移除 'm' 和 'masl' 后缀
    s = re.sub(r"\s*(m|masl|meters?)\s*$", "", s)
    # 移除逗号
    s = s.replace(",", "")
    # 匹配范围如 "1200-1500"
    m_range = re.match(r"^\s*(\d+\.?\d*)\s*[-–—to]+\s*(\d+\.?\d*)\s*$", s)
    if m_range:
        return (float(m_range.group(1)) + float(m_range.group(2))) / 2
    # 匹配 "above X" / "> X"
    m_above = re.match(r"^\s*(?:above|over|>|大于)?\s*(\d+\.?\d*)\s*$", s)
    if m_above:
        val = float(m_above.group(1))
        return val * 1.1  # 粗略推算
    # 匹配 "below X" / "< X"
    m_below = re.match(r"^\s*(?:below|under|<|小于)?\s*(\d+\.?\d*)\s*$", s)
    if m_below:
        val = float(m_below.group(1))
        return val * 0.9
    # 纯数字
    m_num = re.match(r"^\s*(\d+\.?\d*)\s*$", s)
    if m_num:
        return float(m_num.group(1))
    return None


def assign_quality_class(score):
    if score is None:
        return "未知"
    if score >= 85:
        return "卓越"
    if score >= 80:
        return "优秀"
    if score >= 75:
        return "良好"
    if score >= 70:
        return "一般"
    return "较差"


def normalize_col(name):
    """将CSV列名标准化为首选格式（大小写不敏感）"""
    key = name.strip().lower()
    mapping = {
        "country_of_origin": "country_of_origin",
        "country.of.origin": "country_of_origin",
        "farm_name": "farm_name",
        "farm.name": "farm_name",
        "number_of_bags": "number_of_bags",
        "number.of.bags": "number_of_bags",
        "bag_weight": "bag_weight",
        "bag.weight": "bag_weight",
        "variety": "variety",
        "processing_method": "processing_method",
        "processing.method": "processing_method",
        "altitude": "altitude",
        "region": "region",
        "aroma": "aroma",
        "flavor": "flavor",
        "aftertaste": "aftertaste",
        "acidity": "acidity",
        "body": "body",
        "balance": "balance",
        "uniformity": "uniformity",
        "clean_cup": "clean_cup",
        "clean.cup": "clean_cup",
        "sweetness": "sweetness",
        "moisture": "moisture",
        "moisture_percentage": "moisture",
        "moisture.percentage": "moisture",
        "total_cup_points": "total_cup_points",
        "total.cup.points": "total_cup_points",
        "category_one_defects": "category_one_defects",
        "category.one.defects": "category_one_defects",
        "quakers": "quakers",
        "color": "color",
        "species": "species",
        "owner": "owner",
        "producer": "producer",
        "in_country_partner": "in_country_partner",
        "in.country.partner": "in_country_partner",
        "harvest_year": "harvest_year",
        "harvest.year": "harvest_year",
        "expiration": "expiration",
        "certification_body": "certification_body",
        "certification.body": "certification_body",
        "certification_address": "certification_address",
        "certification.address": "certification_address",
        "certification_contact": "certification_contact",
        "certification.contact": "certification_contact",
        "unit_of_measurement": "unit_of_measurement",
        "unit.of.measurement": "unit_of_measurement",
        "altitude_low_meters": "altitude_low_meters",
        "altitude.low.meters": "altitude_low_meters",
        "altitude_high_meters": "altitude_high_meters",
        "altitude.high.meters": "altitude_high_meters",
        "altitude_mean_meters": "altitude_mean_meters",
        "altitude.mean.meters": "altitude_mean_meters",
    }
    return mapping.get(key, name)


SENSORY_FIELDS = [
    "aroma", "flavor", "aftertaste", "acidity", "body",
    "balance", "uniformity", "clean_cup", "sweetness", "moisture",
]


def import_csv_to_db(csv_path=None):
    if csv_path is None:
        csv_path = Config.CSV_PATH

    if not os.path.exists(csv_path):
        print(f"[错误] CSV文件不存在: {csv_path}")
        print("请将CQI咖啡品质数据集放入 data/coffee_quality.csv")
        return

    print(f"[加载] 读取CSV: {csv_path}")
    df = pd.read_csv(csv_path, encoding="utf-8", on_bad_lines="skip")

    # 标准化列名
    df.columns = [normalize_col(c) for c in df.columns]
    print(f"[列名] {list(df.columns)}")

    # 解析海拔
    if "altitude" in df.columns and "altitude_mean" not in df.columns:
        df["altitude_mean"] = df["altitude"].apply(parse_altitude)
    elif "altitude_low_meters" in df.columns and "altitude_high_meters" in df.columns:
        df["altitude_mean"] = (df["altitude_low_meters"] + df["altitude_high_meters"]) / 2
    elif "altitude_mean_meters" in df.columns:
        df["altitude_mean"] = df["altitude_mean_meters"]

    if "altitude_mean" not in df.columns:
        df["altitude_mean"] = None

    # 确保总分为总杯测分
    if "total_cup_points" not in df.columns:
        available = [c for c in SENSORY_FIELDS if c in df.columns]
        if available:
            df["total_cup_points"] = df[available].mean(axis=1)

    # 填充数值缺失值
    for col in SENSORY_FIELDS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df["total_cup_points"] = pd.to_numeric(df["total_cup_points"], errors="coerce")
    df["altitude_mean"] = pd.to_numeric(df["altitude_mean"], errors="coerce")

    num_cols = [c for c in SENSORY_FIELDS + ["total_cup_points", "altitude_mean"] if c in df.columns]
    for col in num_cols:
        df[col] = df[col].fillna(df[col].median() if not df[col].isna().all() else 0)

    # 填充分类缺失值
    cat_cols = ["country_of_origin", "farm_name", "variety", "processing_method", "region", "altitude"]
    for col in cat_cols:
        if col in df.columns:
            df[col] = df[col].fillna("未知")

    # 分配品质等级
    df["quality_class"] = df["total_cup_points"].apply(assign_quality_class)

    app = create_app()
    with app.app_context():
        # 清空旧数据
        existing = db.session.query(Coffee).count()
        if existing > 0:
            print(f"[清空] 删除现有 {existing} 条记录")
            Coffee.query.delete()
            db.session.commit()

        # 批量插入
        batch_size = 500
        rows = []
        total = len(df)
        for i, (_, row) in enumerate(df.iterrows()):
            coffee_data = {
                "country_of_origin": str(row.get("country_of_origin", "未知")),
                "farm_name": str(row.get("farm_name", "未知")),
                "variety": str(row.get("variety", "未知")),
                "processing_method": str(row.get("processing_method", "未知")),
                "altitude": str(row.get("altitude", "未知")),
                "altitude_mean": float(row["altitude_mean"]) if pd.notna(row.get("altitude_mean")) else None,
                "region": str(row.get("region", "未知")),
                "aroma": float(row["aroma"]) if pd.notna(row.get("aroma")) else None,
                "flavor": float(row["flavor"]) if pd.notna(row.get("flavor")) else None,
                "aftertaste": float(row["aftertaste"]) if pd.notna(row.get("aftertaste")) else None,
                "acidity": float(row["acidity"]) if pd.notna(row.get("acidity")) else None,
                "body": float(row["body"]) if pd.notna(row.get("body")) else None,
                "balance": float(row["balance"]) if pd.notna(row.get("balance")) else None,
                "uniformity": float(row["uniformity"]) if pd.notna(row.get("uniformity")) else None,
                "clean_cup": float(row["clean_cup"]) if pd.notna(row.get("clean_cup")) else None,
                "sweetness": float(row["sweetness"]) if pd.notna(row.get("sweetness")) else None,
                "moisture": float(row["moisture"]) if pd.notna(row.get("moisture")) else None,
                "total_cup_points": float(row["total_cup_points"]),
                "quality_class": str(row["quality_class"]),
            }
            rows.append(Coffee(**coffee_data))

            if len(rows) >= batch_size:
                db.session.add_all(rows)
                db.session.commit()
                print(f"[进度] {min(i + 1, total)}/{total}")
                rows = []

        if rows:
            db.session.add_all(rows)
            db.session.commit()

        final_count = db.session.query(Coffee).count()
        print(f"[完成] 共导入 {final_count} 条记录")

        # 打印统计摘要
        print(f"\n====== 导入数据摘要 ======")
        print(f"记录总数: {final_count}")
        print(f"产地国家数: {db.session.query(Coffee.country_of_origin).distinct().count()}")
        print(f"品种数: {db.session.query(Coffee.variety).distinct().count()}")
        print(f"平均总分: {db.session.query(db.func.avg(Coffee.total_cup_points)).scalar():.2f}")
        print(f"最高分: {db.session.query(db.func.max(Coffee.total_cup_points)).scalar():.2f}")
        print(f"最低分: {db.session.query(db.func.min(Coffee.total_cup_points)).scalar():.2f}")


if __name__ == "__main__":
    import_csv_to_db()
