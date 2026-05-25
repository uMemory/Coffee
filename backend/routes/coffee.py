from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from backend.services.coffee_service import (
    get_paginated_coffees,
    get_coffee_by_id,
    get_distinct_countries,
    get_distinct_varieties,
)

coffee_bp = Blueprint("coffee", __name__)


@coffee_bp.route("", methods=["GET"])
@jwt_required()
def list_coffees():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 20, type=int)
    limit = min(limit, 100)
    country = request.args.get("country", None)
    variety = request.args.get("variety", None)
    quality_class = request.args.get("quality_class", None)
    sort_by = request.args.get("sort_by", "total_cup_points")
    order = request.args.get("order", "desc")
    search = request.args.get("search", None)

    # 白名单校验排序字段
    allowed_sort = [
        "total_cup_points", "aroma", "flavor", "aftertaste", "acidity",
        "body", "balance", "uniformity", "clean_cup", "sweetness",
        "moisture", "altitude_mean", "country_of_origin", "id",
    ]
    if sort_by not in allowed_sort:
        sort_by = "total_cup_points"
    if order not in ("asc", "desc"):
        order = "desc"

    result = get_paginated_coffees(
        page=page, limit=limit, country=country, variety=variety,
        quality_class=quality_class, sort_by=sort_by, order=order, search=search,
    )
    return jsonify(result), 200


@coffee_bp.route("/countries", methods=["GET"])
@jwt_required()
def list_countries():
    return jsonify(get_distinct_countries()), 200


@coffee_bp.route("/varieties", methods=["GET"])
@jwt_required()
def list_varieties():
    return jsonify(get_distinct_varieties()), 200


@coffee_bp.route("/<int:coffee_id>", methods=["GET"])
@jwt_required()
def get_coffee(coffee_id):
    coffee = get_coffee_by_id(coffee_id)
    if not coffee:
        return jsonify({"msg": "记录不存在"}), 404
    return jsonify(coffee), 200
