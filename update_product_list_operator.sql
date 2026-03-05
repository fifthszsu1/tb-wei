-- ========================================
-- 修复product_data_merge表的product_list_operator字段
-- 当该字段为空时，从product_list表中获取operator值
-- 关联条件：product_list.product_id = product_data_merge.tmall_product_code
-- ========================================

-- 步骤1：查看需要修复的数据统计（修复前检查）
SELECT 
    '修复前统计' as step,
    COUNT(*) as records_to_fix,
    COUNT(DISTINCT pdm.tmall_product_code) as unique_products,
    SUM(pdm.payment_amount) as total_amount
FROM product_data_merge pdm
INNER JOIN product_list pl ON pl.product_id = pdm.tmall_product_code
WHERE (pdm.product_list_operator IS NULL OR pdm.product_list_operator = '')
    AND pl.operator IS NOT NULL 
    AND pl.operator != '';

-- 步骤2：查看具体哪些产品会被修复
SELECT 
    pdm.tmall_product_code,
    pdm.product_name,
    pdm.platform,
    COUNT(*) as affected_records,
    pl.operator as will_set_to_operator,
    SUM(pdm.payment_amount) as total_amount
FROM product_data_merge pdm
INNER JOIN product_list pl ON pl.product_id = pdm.tmall_product_code
WHERE (pdm.product_list_operator IS NULL OR pdm.product_list_operator = '')
    AND pl.operator IS NOT NULL 
    AND pl.operator != ''
GROUP BY pdm.tmall_product_code, pdm.product_name, pdm.platform, pl.operator
ORDER BY affected_records DESC
LIMIT 20;

-- 步骤3：执行修复（更新operator字段）
-- 注意：执行前请先检查上面的查询结果是否符合预期
UPDATE product_data_merge pdm
INNER JOIN product_list pl ON pl.product_id = pdm.tmall_product_code
SET pdm.product_list_operator = pl.operator
WHERE (pdm.product_list_operator IS NULL OR pdm.product_list_operator = '')
    AND pl.operator IS NOT NULL 
    AND pl.operator != '';

-- 步骤4：查看修复结果统计（修复后验证）
SELECT 
    '修复后验证' as step,
    COUNT(*) as verified_records,
    COUNT(DISTINCT pdm.tmall_product_code) as unique_products_fixed,
    COUNT(DISTINCT pdm.product_list_operator) as unique_operators
FROM product_data_merge pdm
INNER JOIN product_list pl ON pl.product_id = pdm.tmall_product_code
WHERE pdm.product_list_operator = pl.operator
    AND pdm.product_list_operator IS NOT NULL;

-- 步骤5：检查仍然为NULL的记录（需要手动处理）
SELECT 
    '仍需处理' as step,
    COUNT(*) as remaining_null_records,
    COUNT(DISTINCT pdm.tmall_product_code) as unique_products,
    CASE 
        WHEN pl.product_id IS NULL THEN '产品不在product_list中'
        WHEN pl.operator IS NULL OR pl.operator = '' THEN 'product_list中operator也为空'
    END as reason
FROM product_data_merge pdm
LEFT JOIN product_list pl ON pl.product_id = pdm.tmall_product_code
WHERE pdm.product_list_operator IS NULL
GROUP BY reason;

