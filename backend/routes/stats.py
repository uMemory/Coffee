from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from backend.services.stats_service import (
    get_summary,
    get_by_country,
    get_country_detail,
    get_distribution,
    get_correlation,
    get_top_coffees,
    get_insights,
)

stats_bp = Blueprint("stats", __name__)


@stats_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    return jsonify(get_summary()), 200


@stats_bp.route("/by-country", methods=["GET"])
@jwt_required()
def by_country():
    return jsonify(get_by_country()), 200


@stats_bp.route("/country/<country_name>", methods=["GET"])
@jwt_required()
def country_detail(country_name):
    result = get_country_detail(country_name)
    if not result:
        return jsonify({"msg": "国家不存在或无数据"}), 404
    return jsonify(result), 200


@stats_bp.route("/distribution", methods=["GET"])
@jwt_required()
def distribution():
    return jsonify(get_distribution()), 200


@stats_bp.route("/correlation", methods=["GET"])
@jwt_required()
def correlation():
    return jsonify(get_correlation()), 200


@stats_bp.route("/top-coffees", methods=["GET"])
@jwt_required()
def top_coffees():
    return jsonify(get_top_coffees()), 200


@stats_bp.route("/insights", methods=["GET"])
@jwt_required()
def insights():
    return jsonify(get_insights()), 200
