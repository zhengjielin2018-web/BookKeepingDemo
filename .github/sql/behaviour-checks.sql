-- CI 用：把 schema 的設計意圖當成「行為」來驗，而不只是看結構欄位對不對。
-- 每一段都對應到 server/api 裡真的會發生的操作，詳見 docs/database-design.md。
-- 全部在一個 transaction 裡做，最後 ROLLBACK，不留任何測試資料。

BEGIN;

\echo '== A. 準備測試資料 =='
INSERT INTO users (id, email, name, password_hash)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'Alice', 'hash-a'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com',   'Bob',   'hash-b');

INSERT INTO transactions (user_id, amount, type, category, description, date)
VALUES
  ('11111111-1111-1111-1111-111111111111', 200,  '支出', '飲食', '拉麵',   '2026-09-01'),
  ('11111111-1111-1111-1111-111111111111', 120,  '支出', '交通', '捷運',   '2026-09-02'),
  ('11111111-1111-1111-1111-111111111111', 350,  '支出', '飲食', '牛肉麵', '2026-09-15'),
  ('22222222-2222-2222-2222-222222222222', 9999, '支出', '飲食', 'Bob 的秘密晚餐', '2026-09-02');

\echo '== B. Email 唯一約束真的擋得住重複註冊 =='
DO $$
BEGIN
  BEGIN
    INSERT INTO users (email, password_hash) VALUES ('alice@example.com', 'hash-c');
    RAISE EXCEPTION '重複的 email 竟然被寫進去了';
  EXCEPTION
    WHEN unique_violation THEN NULL;  -- 預期行為
  END;
END $$;

\echo '== C. 外鍵擋住「掛在不存在使用者底下」的交易 =='
DO $$
BEGIN
  BEGIN
    INSERT INTO transactions (user_id, amount, type, category, date)
    VALUES ('99999999-9999-9999-9999-999999999999', 100, '支出', '飲食', '2026-09-01');
    RAISE EXCEPTION '孤兒交易竟然被寫進去了';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;  -- 預期行為
  END;
END $$;

\echo '== D. 多租戶隔離：帶 user_id 的查詢不會撈到別人的資料 =='
-- 對應 server/api/chat.post.ts 每一支查詢都會 eq(transactions.userId, userId)。
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
    FROM transactions
   WHERE user_id = '11111111-1111-1111-1111-111111111111'
     AND date BETWEEN '2026-09-01' AND '2026-09-30';
  IF n <> 3 THEN
    RAISE EXCEPTION 'Alice 九月應有 3 筆，實際 %（可能撈到 Bob 的資料）', n;
  END IF;
END $$;

\echo '== E. 分類彙總的結果正確（對應 groupBy=category 那條路徑）=='
DO $$
DECLARE
  food_total bigint;
BEGIN
  SELECT sum(amount) INTO food_total
    FROM transactions
   WHERE user_id = '11111111-1111-1111-1111-111111111111'
     AND category = '飲食'
     AND date BETWEEN '2026-09-01' AND '2026-09-30'
   GROUP BY category;
  IF food_total IS DISTINCT FROM 550 THEN
    RAISE EXCEPTION 'Alice 九月飲食應為 550，實際 %', food_total;
  END IF;
END $$;

\echo '== F. 主要查詢真的吃得到索引，而不是全表掃描 =='
-- 幾筆測試資料的表，Postgres 選 seq scan 才是對的，所以先灌一批量再 ANALYZE，
-- 讓查詢計畫的判斷有統計基礎；enable_seqscan=off 是第二道保險。
-- 這兩條會失敗的典型情況：有人把索引欄位順序改成 (date, user_id)，或把索引砍了。
INSERT INTO users (id, email, password_hash)
VALUES ('33333333-3333-3333-3333-333333333333', 'bulk@example.com', 'hash-bulk');

INSERT INTO transactions (user_id, amount, type, category, date)
SELECT
  '33333333-3333-3333-3333-333333333333',
  (g % 500) + 1,
  CASE WHEN g % 7 = 0 THEN '收入' ELSE '支出' END,
  (ARRAY['飲食', '交通', '娛樂', '居住', '醫療'])[(g % 5) + 1],
  DATE '2024-01-01' + (g % 1000)
FROM generate_series(1, 5000) AS g;

ANALYZE transactions;

SET LOCAL enable_seqscan = off;

DO $$
DECLARE
  plan text;
BEGIN
  EXECUTE $q$
    EXPLAIN (FORMAT JSON)
    SELECT category, sum(amount)
      FROM transactions
     WHERE user_id = '33333333-3333-3333-3333-333333333333'
       AND date BETWEEN '2024-03-01' AND '2024-03-31'
     GROUP BY category
  $q$ INTO plan;

  IF plan NOT LIKE '%idx_transactions_user_date%' THEN
    RAISE EXCEPTION '日期區間查詢沒有走 idx_transactions_user_date，計畫為: %', plan;
  END IF;
END $$;

DO $$
DECLARE
  plan text;
BEGIN
  EXECUTE $q$
    EXPLAIN (FORMAT JSON)
    SELECT *
      FROM transactions
     WHERE user_id = '33333333-3333-3333-3333-333333333333'
       AND category = '醫療'
  $q$ INTO plan;

  IF plan NOT LIKE '%idx_transactions_user_category%' THEN
    RAISE EXCEPTION '分類查詢沒有走 idx_transactions_user_category，計畫為: %', plan;
  END IF;
END $$;

RESET enable_seqscan;
\echo '== G. 刪除使用者時，交易跟著 CASCADE 掉 =='
DO $$
DECLARE
  n int;
BEGIN
  DELETE FROM users WHERE id = '22222222-2222-2222-2222-222222222222';
  SELECT count(*) INTO n
    FROM transactions
   WHERE user_id = '22222222-2222-2222-2222-222222222222';
  IF n <> 0 THEN
    RAISE EXCEPTION 'CASCADE 沒生效，仍留下 % 筆孤兒交易', n;
  END IF;
END $$;

\echo '== H. invite_codes.used_by 是 NO ACTION：擋住刪除已用碼的使用者 =='
-- 這是刻意的：邀請碼是稽核紀錄，不能因為刪使用者就默默斷掉軌跡。
INSERT INTO invite_codes (code, used_by, used_at)
VALUES ('CI-TEST-CODE', '11111111-1111-1111-1111-111111111111', now());

DO $$
BEGIN
  BEGIN
    DELETE FROM users WHERE id = '11111111-1111-1111-1111-111111111111';
    RAISE EXCEPTION '使用者被刪掉了，但他用掉的邀請碼還指著他（外鍵沒擋住）';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;  -- 預期行為
  END;
END $$;

\echo '== I. 邀請碼代碼唯一 =='
DO $$
BEGIN
  BEGIN
    INSERT INTO invite_codes (code) VALUES ('CI-TEST-CODE');
    RAISE EXCEPTION '重複的邀請碼竟然被寫進去了';
  EXCEPTION
    WHEN unique_violation THEN NULL;  -- 預期行為
  END;
END $$;

ROLLBACK;

\echo 'behaviour checks: OK'
