"""多模型训练脚本 — RF / XGBoost / LightGBM / GBDT 对比"""
import json
import os
import sys
import time
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.model_selection import train_test_split, GridSearchCV

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.config import Config
from backend.ml.preprocess import prepare_features, FEATURE_LABELS_ZH, FEATURE_COLS_ALL
from backend.scripts.import_data import normalize_col


def train_all_models(csv_path=None, model_dir=None):
    if csv_path is None:
        csv_path = Config.CSV_PATH
    if model_dir is None:
        model_dir = Config.MODEL_DIR

    if not os.path.exists(csv_path):
        print(f"[错误] CSV不存在: {csv_path}")
        return

    print(f"[加载] {csv_path}")
    df = pd.read_csv(csv_path, encoding="utf-8", on_bad_lines="skip")
    df.columns = [normalize_col(c) for c in df.columns]
    df["total_cup_points"] = pd.to_numeric(df["total_cup_points"], errors="coerce")

    # 编码分类特征
    cat_cols = ["country_of_origin", "variety", "processing_method"]
    for col in cat_cols:
        if col in df.columns:
            # Label encoding
            df[f"{col}_encoded"] = df[col].astype("category").cat.codes
            df[f"{col}_encoded"] = pd.to_numeric(df[f"{col}_encoded"], errors="coerce").fillna(-1)

    X_base, feature_cols = prepare_features(df)
    # 添加编码后的分类特征
    extra_cols = [f"{c}_encoded" for c in cat_cols if f"{c}_encoded" in df.columns]
    for ec in extra_cols:
        X_base[ec] = df[ec]
    all_features = feature_cols + extra_cols

    y = df["total_cup_points"]
    valid = y.notna() & X_base.notna().all(axis=1)
    X = X_base[valid]
    y = y[valid]

    print(f"[数据] 样本: {len(y)}, 特征: {len(all_features)}")
    print(f"[特征] {all_features}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    os.makedirs(model_dir, exist_ok=True)
    all_results = []
    feature_importances = {}

    # ====== 1. Random Forest ======
    print("\n" + "=" * 50)
    print("[模型 1/4] Random Forest")
    t0 = time.time()
    rf = RandomForestRegressor(random_state=42)
    rf_grid = GridSearchCV(rf, {
        "n_estimators": [100, 200], "max_depth": [10, 15, None], "min_samples_split": [2, 5],
    }, cv=5, scoring="r2", n_jobs=-1, verbose=0)
    rf_grid.fit(X_train, y_train)
    rf_best = rf_grid.best_estimator_
    rf_pred = rf_best.predict(X_test)
    rf_r2 = r2_score(y_test, rf_pred)
    rf_rmse = mean_squared_error(y_test, rf_pred) ** 0.5
    rf_time = time.time() - t0
    rf_imp = dict(zip(all_features, rf_best.feature_importances_))
    feature_importances["rf"] = {FEATURE_LABELS_ZH.get(k, k): round(float(v), 4) for k, v in sorted(rf_imp.items(), key=lambda x: x[1], reverse=True)}
    joblib.dump(rf_best, os.path.join(model_dir, "rf_model.pkl"))
    all_results.append({"name": "rf", "r2": round(rf_r2, 4), "rmse": round(rf_rmse, 4), "training_time": f"{rf_time:.1f}s", "best_params": {k: v for k, v in rf_grid.best_params_.items()}, "n_estimators": len(rf_best.estimators_), "feature_importance": feature_importances["rf"]})
    print(f"  R²={rf_r2:.4f}  RMSE={rf_rmse:.4f}  时间={rf_time:.1f}s")

    # ====== 2. XGBoost ======
    print("\n[模型 2/4] XGBoost")
    try:
        import xgboost as xgb
        t0 = time.time()
        xgb_model = xgb.XGBRegressor(objective="reg:squarederror", random_state=42, verbosity=0)
        xgb_grid = GridSearchCV(xgb_model, {
            "n_estimators": [100, 200], "max_depth": [4, 6, 8], "learning_rate": [0.05, 0.1],
        }, cv=5, scoring="r2", n_jobs=-1, verbose=0)
        xgb_grid.fit(X_train, y_train)
        xgb_best = xgb_grid.best_estimator_
        xgb_pred = xgb_best.predict(X_test)
        xgb_r2 = r2_score(y_test, xgb_pred)
        xgb_rmse = mean_squared_error(y_test, xgb_pred) ** 0.5
        xgb_time = time.time() - t0
        xgb_imp = dict(zip(all_features, xgb_best.feature_importances_))
        feature_importances["xgb"] = {FEATURE_LABELS_ZH.get(k, k): round(float(v), 4) for k, v in sorted(xgb_imp.items(), key=lambda x: x[1], reverse=True)}
        joblib.dump(xgb_best, os.path.join(model_dir, "xgb_model.pkl"))
        all_results.append({"name": "xgb", "r2": round(xgb_r2, 4), "rmse": round(xgb_rmse, 4), "training_time": f"{xgb_time:.1f}s", "best_params": {k: v for k, v in xgb_grid.best_params_.items()}, "feature_importance": feature_importances["xgb"]})
        print(f"  R²={xgb_r2:.4f}  RMSE={xgb_rmse:.4f}  时间={xgb_time:.1f}s")
    except ImportError:
        print("  XGBoost未安装，跳过")

    # ====== 3. LightGBM ======
    print("\n[模型 3/4] LightGBM")
    try:
        import lightgbm as lgb
        t0 = time.time()
        lgb_model = lgb.LGBMRegressor(random_state=42, verbose=-1)
        lgb_grid = GridSearchCV(lgb_model, {
            "n_estimators": [100, 200], "max_depth": [6, 10, -1], "learning_rate": [0.05, 0.1], "num_leaves": [31, 63],
        }, cv=5, scoring="r2", n_jobs=-1, verbose=0)
        lgb_grid.fit(X_train, y_train)
        lgb_best = lgb_grid.best_estimator_
        lgb_pred = lgb_best.predict(X_test)
        lgb_r2 = r2_score(y_test, lgb_pred)
        lgb_rmse = mean_squared_error(y_test, lgb_pred) ** 0.5
        lgb_time = time.time() - t0
        lgb_imp = dict(zip(all_features, lgb_best.feature_importances_ / lgb_best.feature_importances_.sum()))
        feature_importances["lgbm"] = {FEATURE_LABELS_ZH.get(k, k): round(float(v), 4) for k, v in sorted(lgb_imp.items(), key=lambda x: x[1], reverse=True)}
        joblib.dump(lgb_best, os.path.join(model_dir, "lgbm_model.pkl"))
        all_results.append({"name": "lgbm", "r2": round(lgb_r2, 4), "rmse": round(lgb_rmse, 4), "training_time": f"{lgb_time:.1f}s", "best_params": {k: v for k, v in lgb_grid.best_params_.items()}, "feature_importance": feature_importances["lgbm"]})
        print(f"  R²={lgb_r2:.4f}  RMSE={lgb_rmse:.4f}  时间={lgb_time:.1f}s")
    except ImportError:
        print("  LightGBM未安装，跳过")

    # ====== 4. GBDT ======
    print("\n[模型 4/4] Gradient Boosting (GBDT)")
    t0 = time.time()
    gbdt = GradientBoostingRegressor(random_state=42)
    gbdt_grid = GridSearchCV(gbdt, {
        "n_estimators": [100, 200], "max_depth": [3, 5], "learning_rate": [0.05, 0.1],
    }, cv=5, scoring="r2", n_jobs=-1, verbose=0)
    gbdt_grid.fit(X_train, y_train)
    gbdt_best = gbdt_grid.best_estimator_
    gbdt_pred = gbdt_best.predict(X_test)
    gbdt_r2 = r2_score(y_test, gbdt_pred)
    gbdt_rmse = mean_squared_error(y_test, gbdt_pred) ** 0.5
    gbdt_time = time.time() - t0
    gbdt_imp = dict(zip(all_features, gbdt_best.feature_importances_))
    feature_importances["gbdt"] = {FEATURE_LABELS_ZH.get(k, k): round(float(v), 4) for k, v in sorted(gbdt_imp.items(), key=lambda x: x[1], reverse=True)}
    joblib.dump(gbdt_best, os.path.join(model_dir, "gbdt_model.pkl"))
    all_results.append({"name": "gbdt", "r2": round(gbdt_r2, 4), "rmse": round(gbdt_rmse, 4), "training_time": f"{gbdt_time:.1f}s", "best_params": {k: v for k, v in gbdt_grid.best_params_.items()}, "feature_importance": feature_importances["gbdt"]})
    print(f"  R²={gbdt_r2:.4f}  RMSE={gbdt_rmse:.4f}  时间={gbdt_time:.1f}s")

    # ====== 保存对比结果 ======
    best = max(all_results, key=lambda x: x["r2"])
    best["best"] = True

    compare_data = {
        "models": all_results,
        "best_model": best["name"],
        "n_records": len(y),
        "features": all_features,
        "trained_date": datetime.now().isoformat(),
    }

    compare_path = os.path.join(model_dir, "model_compare.json")
    with open(compare_path, "w", encoding="utf-8") as f:
        json.dump(compare_data, f, ensure_ascii=False, indent=2)

    # 保持向后兼容：复制RF模型为默认
    import shutil
    rf_src = os.path.join(model_dir, "rf_model.pkl")
    rf_dst = os.path.join(model_dir, "rf_coffee_model.pkl")
    if os.path.exists(rf_src):
        shutil.copy(rf_src, rf_dst)

    print(f"\n[完成] 共训练 {len(all_results)} 个模型")
    print(f"[最优] {best['name']} — R²={best['r2']:.4f}  RMSE={best['rmse']:.4f}")
    print(f"[保存] 对比数据 → {compare_path}")


if __name__ == "__main__":
    train_all_models()
