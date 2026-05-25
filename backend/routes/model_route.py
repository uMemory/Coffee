from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from backend.extensions import db
from backend.models.coffee import Prediction
from backend.services.ml_service import (
    predict, get_feature_info, get_compare_data,
    get_available_models, load_model, compute_shap,
)

model_bp = Blueprint("model", __name__)


@model_bp.route("/features", methods=["GET"])
@jwt_required()
def features():
    return jsonify(get_feature_info()), 200


@model_bp.route("/info", methods=["GET"])
@jwt_required()
def model_info():
    data = get_compare_data()
    if not data:
        return jsonify({"msg": "未找到模型数据，请先训练模型"}), 503
    return jsonify(data), 200


@model_bp.route("/list", methods=["GET"])
@jwt_required()
def model_list():
    return jsonify(get_available_models()), 200


@model_bp.route("/compare", methods=["GET"])
@jwt_required()
def compare_models():
    data = get_compare_data()
    if not data:
        return jsonify({"msg": "未找到模型对比数据，请先运行多模型训练"}), 503
    return jsonify(data), 200


@model_bp.route("/predict", methods=["POST"])
@jwt_required()
def predict_score():
    data = request.get_json()
    if not data:
        return jsonify({"msg": "请提供参数"}), 400

    # 兼容两种格式: {features: {...}, model: "rf"} 或直接 {...}
    features = data.get("features", data)
    model_name = data.get("model", "rf")

    # 过滤掉非特征字段
    feature_names = [f["name"] for f in get_feature_info()]
    clean_features = {}
    for name in feature_names:
        if name in features and features[name] is not None and features[name] != "":
            clean_features[name] = float(features[name])

    if len(clean_features) < len(feature_names):
        missing = set(feature_names) - set(clean_features.keys())
        return jsonify({"msg": f"缺少参数: {', '.join(missing)}"}), 400

    try:
        result = predict(clean_features, model_name)
    except FileNotFoundError as e:
        return jsonify({"msg": str(e)}), 503

    # 保存预测历史
    user_id = int(get_jwt_identity())
    prediction = Prediction(
        user_id=user_id,
        input_features=clean_features,
        predicted_score=result["predicted_score"],
        predicted_class=result["quality_class"],
        created_at=datetime.utcnow(),
    )
    db.session.add(prediction)
    db.session.commit()

    # 添加预测ID到返回
    result["prediction_id"] = prediction.id
    return jsonify(result), 200


@model_bp.route("/shap", methods=["POST"])
@jwt_required()
def shap_explain():
    data = request.get_json()
    if not data:
        return jsonify({"msg": "请提供参数"}), 400

    features = data.get("features", data)
    model_name = data.get("model", "rf")

    feature_names = [f["name"] for f in get_feature_info()]
    clean_features = {}
    for name in feature_names:
        if name in features and features[name] is not None and features[name] != "":
            clean_features[name] = float(features[name])

    try:
        shap_data = compute_shap(clean_features, model_name)
        return jsonify(shap_data), 200
    except Exception as e:
        return jsonify({"msg": f"SHAP计算失败: {str(e)}"}), 500


@model_bp.route("/history", methods=["GET"])
@jwt_required()
def prediction_history():
    user_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 20, type=int)
    limit = min(limit, 100)

    query = Prediction.query.filter_by(user_id=user_id).order_by(Prediction.created_at.desc())
    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    items = query.offset((page - 1) * limit).limit(limit).all()

    return jsonify({
        "data": [item.to_dict() for item in items],
        "total": total, "page": page, "pages": total_pages, "limit": limit,
    }), 200
