-- 为主体报表添加计划名称字段
ALTER TABLE subject_report ADD COLUMN plan_name VARCHAR(200) AFTER shop_name; 