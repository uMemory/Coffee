"""特征工程预处理"""
import re

import pandas as pd


FEATURE_COLS_SENSORY = [
    "aroma", "flavor", "aftertaste", "acidity", "body",
    "balance", "uniformity", "clean_cup", "sweetness",
]
FEATURE_COLS_ALL = FEATURE_COLS_SENSORY + ["moisture", "altitude_mean"]


def parse_altitude(alt_str):
    """解析海拔字符串为数值均值"""
    if pd.isna(alt_str) or str(alt_str).strip() == "":
        return None
    s = str(alt_str).strip().lower()
    s = re.sub(r"\s*(m|masl|meters?)\s*$", "", s)
    s = s.replace(",", "")
    m_range = re.match(r"^\s*(\d+\.?\d*)\s*[-–—to]+\s*(\d+\.?\d*)\s*$", s)
    if m_range:
        return (float(m_range.group(1)) + float(m_range.group(2))) / 2
    m_above = re.match(r"^\s*(?:above|over|>|大于)?\s*(\d+\.?\d*)\s*$", s)
    if m_above:
        return float(m_above.group(1)) * 1.1
    m_below = re.match(r"^\s*(?:below|under|<|小于)?\s*(\d+\.?\d*)\s*$", s)
    if m_below:
        return float(m_below.group(1)) * 0.9
    m_num = re.match(r"^\s*(\d+\.?\d*)\s*$", s)
    if m_num:
        return float(m_num.group(1))
    return None


def prepare_features(df):
    """准备ML训练/预测用的特征矩阵"""
    df = df.copy()

    # 解析海拔
    if "altitude" in df.columns and "altitude_mean" not in df.columns:
        df["altitude_mean"] = df["altitude"].apply(parse_altitude)
    elif "altitude_low_meters" in df.columns and "altitude_high_meters" in df.columns:
        df["altitude_mean"] = (df["altitude_low_meters"] + df["altitude_high_meters"]) / 2
    elif "altitude_mean_meters" in df.columns:
        df["altitude_mean"] = df["altitude_mean_meters"]

    # 确保数值类型
    for col in FEATURE_COLS_ALL:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # 获取可用特征
    available = [c for c in FEATURE_COLS_ALL if c in df.columns]
    X = df[available].copy()

    # 缺失值填充(中位数)
    for col in available:
        median_val = X[col].median()
        if pd.isna(median_val):
            median_val = 0.0
        X[col] = X[col].fillna(median_val)

    return X, available


FEATURE_LABELS_ZH = {
    "aroma": "香气",
    "flavor": "风味",
    "aftertaste": "余韵",
    "acidity": "酸度",
    "body": "醇厚度",
    "balance": "平衡度",
    "uniformity": "均匀度",
    "clean_cup": "干净杯",
    "sweetness": "甜度",
    "moisture": "水分",
    "altitude_mean": "海拔",
}
