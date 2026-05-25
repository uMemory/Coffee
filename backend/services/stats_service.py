"""统计分析服务"""
from backend.extensions import db
from backend.models.coffee import Coffee

SENSORY_COLS = [
    "aroma", "flavor", "aftertaste", "acidity", "body",
    "balance", "uniformity", "clean_cup", "sweetness",
]


def get_summary():
    """仪表盘汇总统计数据"""
    total = Coffee.query.count()
    avg_score = db.session.query(db.func.avg(Coffee.total_cup_points)).scalar() or 0
    max_score = db.session.query(db.func.max(Coffee.total_cup_points)).scalar() or 0
    min_score = db.session.query(db.func.min(Coffee.total_cup_points)).scalar() or 0
    num_countries = db.session.query(Coffee.country_of_origin).distinct().count()
    num_varieties = db.session.query(Coffee.variety).distinct().count()
    num_processing = db.session.query(Coffee.processing_method).distinct().count()

    # 最高分国家
    top_country_row = (
        db.session.query(
            Coffee.country_of_origin,
            db.func.avg(Coffee.total_cup_points).label("avg_score"),
        )
        .group_by(Coffee.country_of_origin)
        .having(db.func.count(Coffee.id) >= 5)
        .order_by(db.func.avg(Coffee.total_cup_points).desc())
        .first()
    )

    # 各等级占比
    class_counts = dict(
        db.session.query(
            Coffee.quality_class,
            db.func.count(Coffee.id),
        ).group_by(Coffee.quality_class).all()
    )

    def pct(k):
        return round(class_counts.get(k, 0) / total * 100, 1) if total > 0 else 0

    return {
        "total_records": total,
        "avg_score": round(float(avg_score), 2),
        "max_score": round(float(max_score), 2),
        "min_score": round(float(min_score), 2),
        "num_countries": num_countries,
        "num_varieties": num_varieties,
        "num_processing_methods": num_processing,
        "top_country": top_country_row[0] if top_country_row else "N/A",
        "top_country_avg_score": round(float(top_country_row[1]), 2) if top_country_row else 0,
        "quality_distribution": {
            "卓越": {"count": class_counts.get("卓越", 0), "pct": pct("卓越")},
            "优秀": {"count": class_counts.get("优秀", 0), "pct": pct("优秀")},
            "良好": {"count": class_counts.get("良好", 0), "pct": pct("良好")},
            "一般": {"count": class_counts.get("一般", 0), "pct": pct("一般")},
            "较差": {"count": class_counts.get("较差", 0), "pct": pct("较差")},
        },
    }


def get_country_detail(country_name):
    """单个国家的详细统计（含等级分布）"""
    query = Coffee.query.filter(Coffee.country_of_origin == country_name)
    total = query.count()
    if total == 0:
        return None

    avg_score = query.with_entities(db.func.avg(Coffee.total_cup_points)).scalar() or 0
    max_score = query.with_entities(db.func.max(Coffee.total_cup_points)).scalar() or 0
    min_score = query.with_entities(db.func.min(Coffee.total_cup_points)).scalar() or 0

    class_counts = dict(
        query.with_entities(Coffee.quality_class, db.func.count(Coffee.id))
        .group_by(Coffee.quality_class).all()
    )

    def pct(k):
        return round(class_counts.get(k, 0) / total * 100, 1) if total > 0 else 0

    return {
        "country": country_name,
        "total": total,
        "avg_score": round(float(avg_score), 2),
        "max_score": round(float(max_score), 2),
        "min_score": round(float(min_score), 2),
        "quality_distribution": {
            "卓越": {"count": class_counts.get("卓越", 0), "pct": pct("卓越")},
            "优秀": {"count": class_counts.get("优秀", 0), "pct": pct("优秀")},
            "良好": {"count": class_counts.get("良好", 0), "pct": pct("良好")},
            "一般": {"count": class_counts.get("一般", 0), "pct": pct("一般")},
            "较差": {"count": class_counts.get("较差", 0), "pct": pct("较差")},
        },
    }


def get_by_country():
    """各国聚合统计数据"""
    results = (
        db.session.query(
            Coffee.country_of_origin,
            db.func.count(Coffee.id).label("count"),
            db.func.round(db.func.avg(Coffee.total_cup_points), 2).label("avg_score"),
            db.func.round(db.func.max(Coffee.total_cup_points), 2).label("max_score"),
            db.func.round(db.func.min(Coffee.total_cup_points), 2).label("min_score"),
            db.func.round(db.func.avg(Coffee.aroma), 2).label("avg_aroma"),
            db.func.round(db.func.avg(Coffee.flavor), 2).label("avg_flavor"),
            db.func.round(db.func.avg(Coffee.aftertaste), 2).label("avg_aftertaste"),
            db.func.round(db.func.avg(Coffee.acidity), 2).label("avg_acidity"),
            db.func.round(db.func.avg(Coffee.body), 2).label("avg_body"),
            db.func.round(db.func.avg(Coffee.balance), 2).label("avg_balance"),
        )
        .group_by(Coffee.country_of_origin)
        .order_by(db.func.avg(Coffee.total_cup_points).desc())
        .all()
    )

    return [
        {
            "country": r[0],
            "count": r[1],
            "avg_score": float(r[2]) if r[2] else 0,
            "max_score": float(r[3]) if r[3] else 0,
            "min_score": float(r[4]) if r[4] else 0,
            "avg_aroma": float(r[5]) if r[5] else 0,
            "avg_flavor": float(r[6]) if r[6] else 0,
            "avg_aftertaste": float(r[7]) if r[7] else 0,
            "avg_acidity": float(r[8]) if r[8] else 0,
            "avg_body": float(r[9]) if r[9] else 0,
            "avg_balance": float(r[10]) if r[10] else 0,
        }
        for r in results
        if r[0]
    ]


def get_distribution(bin_size=5):
    """分数区间分布"""
    results = (
        db.session.query(
            Coffee.total_cup_points,
        ).all()
    )
    scores = [r[0] for r in results if r[0] is not None]
    if not scores:
        return []

    min_s = min(scores)
    max_s = max(scores)
    bins = []
    start = int(min_s // bin_size) * bin_size
    for low in range(start, int(max_s) + bin_size, bin_size):
        high = low + bin_size
        count = sum(1 for s in scores if low <= s < high)
        bins.append({
            "range": f"{low}-{high}",
            "low": low,
            "high": high,
            "count": count,
        })
    return bins


def get_correlation():
    """计算感官维度之间的相关性矩阵(SQL方式)"""
    from backend.extensions import db

    # 查询所有感官列数据
    rows = db.session.query(
        Coffee.aroma, Coffee.flavor, Coffee.aftertaste, Coffee.acidity,
        Coffee.body, Coffee.balance, Coffee.uniformity, Coffee.clean_cup,
        Coffee.sweetness, Coffee.total_cup_points,
    ).all()

    if not rows:
        return {"labels": [], "matrix": []}

    import math
    n = len(rows)
    labels = ["香气", "风味", "余韵", "酸度", "醇厚度", "平衡度", "均匀度", "干净杯", "甜度", "总分"]
    m = len(labels)

    # 计算均值
    cols = list(zip(*rows))
    means = [sum(c) / n for c in cols]
    stds = [math.sqrt(sum((x - means[i]) ** 2 for x in c) / n) for i, c in enumerate(cols)]

    # 计算相关性矩阵
    matrix = []
    for i in range(m):
        row = []
        for j in range(m):
            if stds[i] == 0 or stds[j] == 0:
                row.append(1.0 if i == j else 0.0)
            else:
                cov = sum(
                    (cols[i][k] - means[i]) * (cols[j][k] - means[j])
                    for k in range(n)
                ) / n
                row.append(round(cov / (stds[i] * stds[j]), 3))
        matrix.append(row)

    return {"labels": labels, "matrix": matrix}


def get_top_coffees(limit=10):
    """Top N 最高分咖啡"""
    coffees = (
        Coffee.query
        .order_by(Coffee.total_cup_points.desc())
        .limit(limit)
        .all()
    )
    return [c.to_dict() for c in coffees]


def get_insights():
    """自动生成分析结论"""
    insights = []

    total = Coffee.query.count()
    if total == 0:
        return insights

    avg_all = db.session.query(db.func.avg(Coffee.total_cup_points)).scalar() or 0

    # 最高分国家
    top_country = (
        db.session.query(
            Coffee.country_of_origin,
            db.func.avg(Coffee.total_cup_points),
            db.func.count(Coffee.id),
        )
        .group_by(Coffee.country_of_origin)
        .having(db.func.count(Coffee.id) >= 5)
        .order_by(db.func.avg(Coffee.total_cup_points).desc())
        .first()
    )
    if top_country:
        insights.append(
            f"{top_country[0]}的平均品质分最高，达到 {top_country[1]:.1f} 分"
            f"（共{top_country[2]}个样本）"
        )

    # 最高分处理方式
    top_proc = (
        db.session.query(
            Coffee.processing_method,
            db.func.avg(Coffee.total_cup_points),
            db.func.count(Coffee.id),
        )
        .group_by(Coffee.processing_method)
        .having(db.func.count(Coffee.id) >= 5)
        .order_by(db.func.avg(Coffee.total_cup_points).desc())
        .first()
    )
    if top_proc:
        insights.append(
            f"{top_proc[0]}处理法的咖啡平均品质分最高，为 {top_proc[1]:.1f} 分"
        )

    # 处理方式对比
    proc_results = (
        db.session.query(
            Coffee.processing_method,
            db.func.avg(Coffee.total_cup_points),
        )
        .group_by(Coffee.processing_method)
        .having(db.func.count(Coffee.id) >= 5)
        .order_by(db.func.avg(Coffee.total_cup_points).desc())
        .all()
    )
    if len(proc_results) >= 2:
        best = proc_results[0]
        worst = proc_results[-1]
        diff = best[1] - worst[1]
        if diff > 1:
            insights.append(
                f"{best[0]}法比{worst[0]}法平均高 {diff:.1f} 分，"
                f"处理方式对品质有显著影响"
            )

    # 海拔影响
    high_alt = (
        db.session.query(db.func.avg(Coffee.total_cup_points))
        .filter(Coffee.altitude_mean >= 1500)
        .scalar()
    )
    low_alt = (
        db.session.query(db.func.avg(Coffee.total_cup_points))
        .filter(Coffee.altitude_mean < 1500, Coffee.altitude_mean > 0)
        .scalar()
    )
    if high_alt and low_alt:
        diff = high_alt - low_alt
        insights.append(
            f"高海拔产区(≥1500m)平均分 {high_alt:.1f}，"
            f"低海拔产区(<1500m)平均分 {low_alt:.1f}，"
            f"{'高海拔' if diff > 0 else '低海拔'}咖啡品质更优"
        )

    # 品种多样性
    top_variety = (
        db.session.query(
            Coffee.variety,
            db.func.count(Coffee.id),
            db.func.avg(Coffee.total_cup_points),
        )
        .group_by(Coffee.variety)
        .having(db.func.count(Coffee.id) >= 5)
        .order_by(db.func.avg(Coffee.total_cup_points).desc())
        .first()
    )
    if top_variety:
        insights.append(
            f"评分最高的品种是 {top_variety[0]}，"
            f"平均 {top_variety[2]:.1f} 分（共{top_variety[1]}个样本）"
        )

    # 卓越占比
    excellent_pct = (
        Coffee.query.filter(Coffee.quality_class == "卓越").count() / total * 100
    )
    insights.append(
        f"全球仅有 {excellent_pct:.1f}% 的咖啡达到「卓越」等级（≥85分），"
        f"高品质咖啡仍是稀缺资源"
    )

    # 各维度概述
    avg_body = (
        db.session.query(db.func.avg(Coffee.body)).scalar() or 0
    )
    avg_acidity = (
        db.session.query(db.func.avg(Coffee.acidity)).scalar() or 0
    )
    if avg_body > avg_acidity:
        insights.append(
            f"全球咖啡整体醇厚度({avg_body:.1f})优于酸度({avg_acidity:.1f})，"
            f"口感偏向饱满风格"
        )
    else:
        insights.append(
            f"全球咖啡整体酸度({avg_acidity:.1f})优于醇厚度({avg_body:.1f})，"
            f"口感偏向明亮风格"
        )

    return insights
