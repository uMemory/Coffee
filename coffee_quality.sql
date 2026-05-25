-- 咖啡品质评级系统 - 数据库初始化脚本
-- 在MySQL容器启动时自动执行

CREATE DATABASE IF NOT EXISTS coffee_quality_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE coffee_quality_db;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email         VARCHAR(100),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 咖啡数据表
CREATE TABLE IF NOT EXISTS coffees (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    country_of_origin   VARCHAR(50),
    farm_name           VARCHAR(200),
    variety             VARCHAR(100),
    processing_method   VARCHAR(100),
    altitude            VARCHAR(50),
    altitude_mean       FLOAT,
    region              VARCHAR(200),
    aroma               FLOAT COMMENT '香气(0-10)',
    flavor              FLOAT COMMENT '风味(0-10)',
    aftertaste          FLOAT COMMENT '余韵(0-10)',
    acidity             FLOAT COMMENT '酸度(0-10)',
    body                FLOAT COMMENT '醇厚度(0-10)',
    balance             FLOAT COMMENT '平衡度(0-10)',
    uniformity          FLOAT COMMENT '均匀度(0-10)',
    clean_cup           FLOAT COMMENT '干净杯(0-10)',
    sweetness           FLOAT COMMENT '甜度(0-10)',
    moisture            FLOAT COMMENT '水分(%)',
    total_cup_points    FLOAT COMMENT '总分(0-100)',
    quality_class       VARCHAR(20) COMMENT '品质等级',
    INDEX idx_country (country_of_origin),
    INDEX idx_score (total_cup_points)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 预测历史表
CREATE TABLE IF NOT EXISTS predictions (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT,
    input_features  JSON,
    predicted_score FLOAT,
    predicted_class VARCHAR(20),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
