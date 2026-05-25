from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from backend.extensions import db
from backend.models.coffee import Prediction
from backend.services.ml_service import predict, get_feature_info, get_metadata

model_bp = Blueprint("model", __name__)


@model_bp.route("/features", methods=["GET"])
@jwt_required()
def features():
    return jsonify(get_feature_info()), 200


@model_bp.route("/info", methods=["GET"])
@jwt_required()
def model_info():
    try:
        meta = get_metadata()
        return jsonify(meta), 200
    except FileNotFoundError as e:
        return jsonify({"msg": str(e)}), 503


@model_bp.route("/predict", methods=["POST"])
@jwt_required()
def predict_score():
    data = request.get_json()
    if not data:
        return jsonify({"msg": "请提供特征参数"}), 400

    # 提取特征
    feature_names = [f["name"] for f in get_feature_info()]
    features = {}
    for name in feature_names:
        if name in data:
            val = data[name]
            if val == "" or val is None:
                return jsonify({"msg": f"参数 {name} 不能为空"}), 400
            features[name] = float(val)

    if len(features) != len(feature_names):
        missing = set(feature_names) - set(features.keys())
        return jsonify({"msg": f"缺少参数: {', '.join(missing)}"}), 400

    try:
        result = predict(features)
    except FileNotFoundError as e:
        return jsonify({"msg": str(e)}), 503

    # 保存预测历史
    user_id = int(get_jwt_identity())
    prediction = Prediction(
        user_id=user_id,
        input_features=features,
        predicted_score=result["predicted_score"],
        predicted_class=result["quality_class"],
        created_at=datetime.utcnow(),
    )
    db.session.add(prediction)
    db.session.commit()

    return jsonify(result), 200


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
        "total": total,
        "page": page,
        "pages": total_pages,
        "limit": limit,
    }), 200
