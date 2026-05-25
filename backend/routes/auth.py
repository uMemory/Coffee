from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from backend.extensions import db
from backend.models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"msg": "请提供注册信息"}), 400

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    email = data.get("email", "").strip()

    if not username or not password:
        return jsonify({"msg": "用户名和密码不能为空"}), 400
    if len(username) < 3:
        return jsonify({"msg": "用户名至少3个字符"}), 400
    if len(password) < 4:
        return jsonify({"msg": "密码至少4个字符"}), 400

    if User.find_by_username(username):
        return jsonify({"msg": "用户名已存在"}), 409

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"msg": "注册成功", "user_id": user.id}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"msg": "请提供登录信息"}), 400

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"msg": "用户名和密码不能为空"}), 400

    user = User.find_by_username(username)
    if not user or not user.check_password(password):
        return jsonify({"msg": "用户名或密码错误"}), 401

    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": access_token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"msg": "用户不存在"}), 404
    return jsonify({"user": user.to_dict()}), 200
