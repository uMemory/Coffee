from datetime import datetime

from backend.extensions import db


class Coffee(db.Model):
    __tablename__ = "coffees"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    country_of_origin = db.Column(db.String(50))
    farm_name = db.Column(db.String(200))
    variety = db.Column(db.String(100))
    processing_method = db.Column(db.String(100))
    altitude = db.Column(db.String(50))
    altitude_mean = db.Column(db.Float)
    region = db.Column(db.String(200))
    aroma = db.Column(db.Float)
    flavor = db.Column(db.Float)
    aftertaste = db.Column(db.Float)
    acidity = db.Column(db.Float)
    body = db.Column(db.Float)
    balance = db.Column(db.Float)
    uniformity = db.Column(db.Float)
    clean_cup = db.Column(db.Float)
    sweetness = db.Column(db.Float)
    moisture = db.Column(db.Float)
    total_cup_points = db.Column(db.Float)
    quality_class = db.Column(db.String(20))

    def to_dict(self):
        return {
            "id": self.id,
            "country_of_origin": self.country_of_origin,
            "farm_name": self.farm_name,
            "variety": self.variety,
            "processing_method": self.processing_method,
            "altitude": self.altitude,
            "altitude_mean": self.altitude_mean,
            "region": self.region,
            "aroma": self.aroma,
            "flavor": self.flavor,
            "aftertaste": self.aftertaste,
            "acidity": self.acidity,
            "body": self.body,
            "balance": self.balance,
            "uniformity": self.uniformity,
            "clean_cup": self.clean_cup,
            "sweetness": self.sweetness,
            "moisture": self.moisture,
            "total_cup_points": self.total_cup_points,
            "quality_class": self.quality_class,
        }


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"))
    input_features = db.Column(db.JSON)
    predicted_score = db.Column(db.Float)
    predicted_class = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "input_features": self.input_features,
            "predicted_score": self.predicted_score,
            "predicted_class": self.predicted_class,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
