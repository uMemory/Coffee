"""训练RandomForest模型并保存"""
import json
import os
import sys
from datetime import datetime

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.model_selection import train_test_split, GridSearchCV

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.config import Config
from backend.ml.preprocess import prepare_features, FEATURE_LABELS_ZH


def train_model(csv_path=None, model_dir=None):
    if csv_path is None:
        csv_path = Config.CSV_PATH
    if model_dir is None:
        model_dir = Config.MODEL_DIR

    if not os.path.exists(csv_path):
        print(f"[错误] CSV文件不存在: {csv_path}")
        return

    print(f"[加载] CSV: {csv_path}")
    df = pd.read_csv(csv_path, encoding="utf-8", on_bad_lines="skip")

    # 标准列名
    from backend.scripts.import_data import normalize_col
    df.columns = [normalize_col(c) for c in df.columns]

    # 确保target存在
    if "total_cup_points" not in df.columns:
        print("[错误] 缺少 total_cup_points 列")
        return

    df["total_cup_points"] = pd.to_numeric(df["total_cup_points"], errors="coerce")

    # 准备特征
    X, feature_cols = prepare_features(df)
    y = df["total_cup_points"]

    # 移除target为NaN的行
    valid = y.notna()
    X = X[valid]
    y = y[valid]

    print(f"[数据] 有效样本数: {len(y)}, 特征数: {len(feature_cols)}")
    print(f"[特征] {feature_cols}")

    # 划分训练/测试集
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # GridSearchCV
    print("\n[训练] 开始GridSearchCV...")
    param_grid = {
        "n_estimators": [100, 200, 300],
        "max_depth": [10, 15, 20, None],
        "min_samples_split": [2, 5, 10],
    }
    rf = RandomForestRegressor(random_state=42)
    grid = GridSearchCV(rf, param_grid, cv=5, scoring="r2", n_jobs=-1, verbose=1)
    grid.fit(X_train, y_train)

    best_model = grid.best_estimator_
    print(f"\n[最佳参数] {grid.best_params_}")
    print(f"[最佳CV R²] {grid.best_score_:.4f}")

    # 评估
    y_pred = best_model.predict(X_test)
    r2 = r2_score(y_test, y_pred)
    rmse = mean_squared_error(y_test, y_pred) ** 0.5

    print(f"\n[测试集评估]")
    print(f"  R²   = {r2:.4f}")
    print(f"  RMSE = {rmse:.4f}")

    # 特征重要性
    importance = dict(zip(feature_cols, best_model.feature_importances_))
    importance_sorted = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    print(f"\n[特征重要性]")
    for name, imp in importance_sorted:
        label = FEATURE_LABELS_ZH.get(name, name)
        print(f"  {label}: {imp:.4f}")

    # 保存模型
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "rf_coffee_model.pkl")
    joblib.dump(best_model, model_path)
    print(f"\n[保存] 模型 → {model_path}")

    # 保存元信息
    metadata = {
        "model_type": "RandomForestRegressor",
        "r2_score": round(float(r2), 4),
        "rmse": round(float(rmse), 4),
        "feature_importance": {
            FEATURE_LABELS_ZH.get(k, k): round(float(v), 4)
            for k, v in importance_sorted
        },
        "features": feature_cols,
        "feature_labels": [FEATURE_LABELS_ZH.get(c, c) for c in feature_cols],
        "best_params": {k: v for k, v in grid.best_params_.items()},
        "n_records": len(y),
        "trained_date": datetime.now().isoformat(),
    }
    metadata_path = os.path.join(model_dir, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    print(f"[保存] 元信息 → {metadata_path}")

    print("\n[完成] 模型训练结束")


if __name__ == "__main__":
    train_model()
