-- ============================================================
--  Vector Editor 协作白板 — MySQL 数据库 DDL
-- ============================================================
--  数据库: vector_editor (或自定义名称)
--  字符集: utf8mb4 (支持完整 Unicode，包括 emoji)
--  排序规则: utf8mb4_unicode_ci
--  引擎: InnoDB (支持事务和外键)
--
--  使用说明:
--    1. 确保已创建数据库: CREATE DATABASE vector_editor
--    2. 执行本文件建表
--    3. application.yml/properties 中配置:
--       spring.datasource.url=jdbc:mysql://localhost:3306/vector_editor
--       spring.jpa.hibernate.ddl-auto=none  (不自动建表，使用本SQL)
-- ============================================================

USE `vector_editor`;

-- -----------------------------------------------------------
--  表1: users — 用户表
-- -----------------------------------------------------------
--  存储系统用户信息，密码以 BCrypt 哈希存储
--  与 canvases 表为 一对多 关系（一个用户拥有多个画布）
CREATE TABLE IF NOT EXISTS `users` (
    `id`         BIGINT          NOT NULL AUTO_INCREMENT COMMENT '用户主键，自增ID',
    `username`   VARCHAR(64)     NOT NULL                COMMENT '用户名，唯一，3-20字符',
    `email`      VARCHAR(128)    NOT NULL                COMMENT '邮箱地址，唯一',
    `password`   VARCHAR(255)    NOT NULL                COMMENT 'BCrypt加密后的密码哈希',
    `nickname`   VARCHAR(32)     DEFAULT NULL            COMMENT '昵称，为空时默认取username',
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',

    -- 主键约束
    PRIMARY KEY (`id`),

    -- 唯一约束：用户名和邮箱不可重复
    UNIQUE KEY `uk_username` (`username`),
    UNIQUE KEY `uk_email` (`email`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表';


-- -----------------------------------------------------------
--  表2: canvases — 画布表
-- -----------------------------------------------------------
--  存储画布元数据和图形元素数据
--  elements 字段以 JSON 数组字符串存储 GraphElement[] 全量数据
--  room_id 用于协同绘制的画室邀请码机制
CREATE TABLE IF NOT EXISTS `canvases` (
    `id`              BIGINT          NOT NULL AUTO_INCREMENT COMMENT '画布主键，自增ID',
    `user_id`         BIGINT          NOT NULL                COMMENT '画布拥有者用户ID，外键→users.id',
    `name`            VARCHAR(128)    NOT NULL DEFAULT '未命名图形' COMMENT '画布名称',
    `canvas_width`    INT             NOT NULL DEFAULT 1200     COMMENT '画布宽度（像素）',
    `canvas_height`   INT             NOT NULL DEFAULT 800      COMMENT '画布高度（像素）',
    `background_color` VARCHAR(32)    NOT NULL DEFAULT '#ffffff' COMMENT '背景颜色（十六进制格式）',
    `elements`        LONGTEXT        NOT NULL                 COMMENT '图形元素JSON数组 (GraphElement[])',
    `room_id`         VARCHAR(36)     DEFAULT NULL             COMMENT '画室UUID邀请码，用于协同绘图',
    `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后修改时间',

    -- 主键约束
    PRIMARY KEY (`id`),

    -- 外键约束：关联用户表
    CONSTRAINT `fk_canvases_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
        ON DELETE CASCADE           -- 用户删除时级联删除其所有画布
        ON UPDATE RESTRICT,

    -- 唯一约束：room_id 全局唯一（每个UUID只能对应一个画布）
    UNIQUE KEY `uk_room_id` (`room_id`),

    -- 索引：按用户查询画布列表（常用查询）
    INDEX `idx_user_id` (`user_id`)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='画布数据表';


-- ============================================================
--  初始数据（可选）
-- ============================================================

-- 插入测试用户（密码: 123456 的 BCrypt 哈希值示例）
-- 注意: 实际生产环境应通过注册接口创建用户，而非直接 INSERT
-- INSERT INTO `users` (`username`, `email`, `password`, `nickname`) VALUES
-- ('admin',   'admin@example.com', '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '管理员'),
-- ('test',    'test@example.com',  '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi', '测试用户');


-- ============================================================
--  验证查询（执行后可用于确认建表成功）
-- ============================================================

-- 查看表结构
-- DESC `users`;
-- DESC `canvases`;

-- 查看索引
-- SHOW INDEX FROM `users`;
-- SHOW INDEX FROM `canvases`;

-- 查看外键关系
-- SELECT
--     TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME,
--     REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME,
--     DELETE_RULE, UPDATE_RULE
-- FROM information_schema.KEY_COLUMN_USAGE
-- WHERE REFERENCED_TABLE_SCHEMA = 'vector_editor'
--   AND REFERENCED_TABLE_NAME IS NOT NULL;
