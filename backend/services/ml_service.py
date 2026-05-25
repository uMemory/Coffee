"""多模型加载 / 预测 / SHAP 服务"""
import json
import os

import joblib
import numpy as np
import pandas as pd

from backend.config import Config
from backend.ml.preprocess import prepare_features, FEATURE_LABELS_ZH

_models = {}
_metadata = None

MODEL_FILES = {
    "rf": "rf_model.pkl",
    "xgb": "xgb_model.pkl",
    "lgbm": "lgbm_model.pkl",
    "gbdt": "gbdt_model.pkl",
}

MODEL_LABELS = {
    "rf": "随机森林",
    "xgb": "XGBoost",
    "lgbm": "LightGBM",
    "gbdt": "GBDT",
}


def _get_model_path(model_name="rf"):
    if model_name == "rf" and not os.path.exists(os.path.join(Config.MODEL_DIR, "rf_model.pkl")):
        return Config.MODEL_PATH  # fallback to rf_coffee_model.pkl
    return os.path.join(Config.MODEL_DIR, MODEL_FILES.get(model_name, f"{model_name}_model.pkl"))


def load_model(model_name="rf"):
    if model_name not in _models:
        path = _get_model_path(model_name)
        if not os.path.exists(path):
            raise FileNotFoundError(f"模型文件不存在: {path}，请先运行 ml/train.py")
        _models[model_name] = joblib.load(path)
    return _models[model_name]


def get_available_models():
    models = []
    for name, filename in MODEL_FILES.items():
        path = os.path.join(Config.MODEL_DIR, filename)
        if os.path.exists(path) or (name == "rf" and os.path.exists(Config.MODEL_PATH)):
            models.append(name)
    return models


def get_compare_data():
    path = os.path.join(Config.MODEL_DIR, "model_compare.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    # 回退：只有RF
    meta_path = Config.METADATA_PATH
    if os.path.exists(meta_path):
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        return {
            "models": [{
                "name": "rf",
                "r2": meta.get("r2_score", 0),
                "rmse": meta.get("rmse", 0),
                "feature_importance": meta.get("feature_importance", {}),
                "training_time": "N/A",
                "best_params": meta.get("best_params", {}),
                "n_estimators": meta.get("best_params", {}).get("n_estimators", 100),
            }],
            "best_model": "rf",
            "features": meta.get("features", []),
            "trained_date": meta.get("trained_date", ""),
        }
    return None


def assign_quality_class(score):
    if score >= 85: return "卓越"
    if score >= 80: return "优秀"
    if score >= 75: return "良好"
    if score >= 70: return "一般"
    return "较差"


def predict(features_dict, model_name="rf"):
    model = load_model(model_name)
    df = pd.DataFrame([features_dict])
    X, used_cols = prepare_features(df)

    # 获取训练时的特征列表
    expected = used_cols
    try:
        expected = model.feature_names_in_
    except AttributeError:
        pass

    for col in expected:
        if col not in X.columns:
            X[col] = 0.0
    X = X[expected]

    # 置信区间：仅 RF 支持（使用树间方差）
    is_rf = hasattr(model, "estimators_") and not hasattr(model, "staged_predict")
    if is_rf:
        try:
            trees = model.estimators_
            # sklearn GBDT: estimators_ 是 list[list[tree]], RF: list[tree]
            if len(trees) > 0 and hasattr(trees[0], "__iter__") and not hasattr(trees[0], "predict"):
                trees = [t[0] for t in trees]  # flatten GBDT-style
            tree_preds = np.array([t.predict(X.values)[0] for t in trees])
            pred = float(np.mean(tree_preds))
            std = float(np.std(tree_preds))
            lower = round(max(0, pred - 1.96 * std), 2)
            upper = round(min(100, pred + 1.96 * std), 2)
        except (TypeError, IndexError, AttributeError):
            pred = float(model.predict(X)[0])
            lower = upper = None
    else:
        pred = float(model.predict(X)[0])
        lower = upper = None

    return {
        "predicted_score": round(pred, 2),
        "quality_class": assign_quality_class(pred),
        "confidence_interval": {"lower": lower, "upper": upper},
        "model": model_name,
    }


def compute_shap(features_dict, model_name="rf"):
    """计算SHAP值用于可解释性（使用近似方法）"""
    model = load_model(model_name)
    df = pd.DataFrame([features_dict])
    X, used_cols = prepare_features(df)

    try:
        expected = model.feature_names_in_
    except AttributeError:
        expected = used_cols

    for col in expected:
        if col not in X.columns:
            X[col] = 0.0
    X = X[expected]

    # 使用特征重要性作为近似SHAP值
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        # 将特征重要性转换为SHAP近似值（实际SHAP值 = 特征重要性 × 特征值 × 缩放因子）
        raw_importances = dict(zip(expected, importances))
        base_pred = float(model.predict(X)[0])
        feat_values = X.values[0]

        # 简易SHAP: 特征贡献 = 特征重要性 * (特征值 - 均值) / 标准差 的近似
        shap_values = {}
        for i, col in enumerate(expected):
            # 近似: 特征重要性作为贡献比例 * 预测值
            contribution = float(importances[i]) * base_pred * 0.1
            # 根据特征值调整方向
            feat_val = feat_values[i]
            if feat_val > X[col].median() if hasattr(X[col], 'median') else 5:
                shap_values[FEATURE_LABELS_ZH.get(col, col)] = round(contribution, 4)
            else:
                shap_values[FEATURE_LABELS_ZH.get(col, col)] = round(-contribution * 0.5, 4)
    else:
        shap_values = {FEATURE_LABELS_ZH.get(c, c): 0 for c in used_cols}

    return {
        "shap_values": shap_values,
        "feature_names": [FEATURE_LABELS_ZH.get(c, c) for c in expected],
        "model": model_name,
    }


def get_feature_info():
    return [
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
