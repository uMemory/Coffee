"""咖啡数据查询服务"""
from backend.extensions import db
from backend.models.coffee import Coffee


def get_paginated_coffees(page=1, limit=20, country=None, variety=None,
                         quality_class=None, sort_by="total_cup_points",
                         order="desc", search=None):
    """分页+筛选+排序查询"""
    query = Coffee.query

    if country:
        query = query.filter(Coffee.country_of_origin == country)
    if variety:
        query = query.filter(Coffee.variety == variety)
    if quality_class:
        query = query.filter(Coffee.quality_class == quality_class)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            db.or_(
                Coffee.farm_name.like(pattern),
                Coffee.region.like(pattern),
                Coffee.country_of_origin.like(pattern),
            )
        )

    # 排序
    sort_col = getattr(Coffee, sort_by, Coffee.total_cup_points)
    if order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total = query.count()
    total_pages = max(1, (total + limit - 1) // limit)
    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "data": [item.to_dict() for item in items],
        "total": total,
        "page": page,
        "pages": total_pages,
        "limit": limit,
    }


def get_coffee_by_id(coffee_id):
    coffee = db.session.get(Coffee, coffee_id)
    return coffee.to_dict() if coffee else None


def get_distinct_countries():
    return sorted([
        r[0] for r in db.session.query(Coffee.country_of_origin).distinct().all()
        if r[0]
    ])


def get_distinct_varieties():
    return sorted([
        r[0] for r in db.session.query(Coffee.variety).distinct().all()
        if r[0]
    ])
