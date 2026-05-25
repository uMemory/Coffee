"""ML模型加载与预测服务"""
import json
import os

import joblib
import numpy as np
import pandas as pd

from backend.config import Config
from backend.ml.preprocess import prepare_features, FEATURE_LABELS_ZH

_model = None
_metadata = None


def load_model():
    global _model, _metadata
    if _model is None:
        model_path = Config.MODEL_PATH
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"模型文件不存在: {model_path}，请先运行 ml/train.py 训练模型")
        _model = joblib.load(model_path)
        metadata_path = Config.METADATA_PATH
        if os.path.exists(metadata_path):
            with open(metadata_path, "r", encoding="utf-8") as f:
                _metadata = json.load(f)
    return _model


def get_metadata():
    if _metadata is None:
        load_model()
    return _metadata


def assign_quality_class(score):
    if score >= 85:
        return "卓越"
    if score >= 80:
        return "优秀"
    if score >= 75:
        return "良好"
    if score >= 70:
        return "一般"
    return "较差"


def predict(features_dict):
    """预测咖啡品质分"""
    model = load_model()

    # 构建DataFrame
    df = pd.DataFrame([features_dict])

    # 预处理
    X, used_cols = prepare_features(df)

    # 确保列顺序与训练时一致
    expected_features = get_metadata().get("features", used_cols) if _metadata else used_cols
    for col in expected_features:
        if col not in X.columns:
            X[col] = 0.0
    X = X[expected_features]

    # 预测
    if hasattr(model, "estimators_"):
        # RandomForest: 获取每棵树预测用于置信区间
        tree_preds = np.array([tree.predict(X.values)[0] for tree in model.estimators_])
        pred = np.mean(tree_preds)
        std = np.std(tree_preds)
        lower = max(0, pred - 1.96 * std)
        upper = min(100, pred + 1.96 * std)
    else:
        pred = model.predict(X)[0]
        lower = upper = None

    quality_class = assign_quality_class(pred)

    return {
        "predicted_score": round(float(pred), 2),
        "quality_class": quality_class,
        "confidence_interval": {
            "lower": round(float(lower), 2) if lower is not None else None,
            "upper": round(float(upper), 2) if upper is not None else None,
        },
    }


def get_feature_info():
    """获取模型输入特征信息"""
    features = [
        {"name": "aroma", "label": "香气", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "flavor", "label": "风味", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "aftertaste", "label": "余韵", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "acidity", "label": "酸度", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "body", "label": "醇厚度", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "balance", "label": "平衡度", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "uniformity", "label": "均匀度", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "clean_cup", "label": "干净杯", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "sweetness", "label": "甜度", "min": 0, "max": 10, "step": 0.1, "unit": "分"},
        {"name": "moisture", "label": "水分", "min": 0, "max": 15, "step": 0.1, "unit": "%"},
        {"name": "altitude_mean", "label": "海拔均值", "min": 0, "max": 3000, "step": 10, "unit": "m"},
    ]
    return features
