-- CI 用：驗證 drizzle-kit migrate 之後，資料庫的「形狀」和 schema.ts 的設計意圖一致。
-- 這裡只看結構（表、索引、外鍵、唯一約束），行為面的驗證在 behaviour-checks.sql。
-- 任何一條 RAISE EXCEPTION 都會讓 psql -v ON_ERROR_STOP=1 以非零狀態結束，CI 就會紅。

\echo '== 1. 六張表都要存在 =='
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ')
    INTO missing
    FROM unnest(ARRAY[
           'users', 'accounts', 'sessions', 'verification_tokens',
           'transactions', 'invite_codes'
         ]) AS t
   WHERE to_regclass('public.' || t) IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION '缺少資料表: %', missing;
  END IF;
END $$;

\echo '== 2. transactions 的兩條複合索引，欄位順序也要對 =='
-- 順序很重要：(user_id, date) 的最左前綴是 user_id，所以「某使用者的某段期間」和
-- 「某使用者的全部」都吃得到這條索引；反過來 (date, user_id) 就只有前者有效。
DO $$
DECLARE
  def text;
BEGIN
  SELECT indexdef INTO def
    FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = 'idx_transactions_user_date';
  IF def IS NULL THEN
    RAISE EXCEPTION '缺少索引 idx_transactions_user_date';
  END IF;
  IF def !~ 'USING btree \(user_id, date\)' THEN
    RAISE EXCEPTION 'idx_transactions_user_date 的欄位順序不是 (user_id, date): %', def;
  END IF;

  SELECT indexdef INTO def
    FROM pg_indexes
   WHERE schemaname = 'public' AND indexname = 'idx_transactions_user_category';
  IF def IS NULL THEN
    RAISE EXCEPTION '缺少索引 idx_transactions_user_category';
  END IF;
  IF def !~ 'USING btree \(user_id, category\)' THEN
    RAISE EXCEPTION 'idx_transactions_user_category 的欄位順序不是 (user_id, category): %', def;
  END IF;
END $$;

\echo '== 3. 四條外鍵，且刪除行為符合設計 =='
-- accounts / sessions / transactions 掛 CASCADE：使用者刪掉，他的資料一起走。
-- invite_codes.used_by 刻意留 NO ACTION：邀請碼是稽核紀錄，不該因為使用者被刪就跟著消失，
-- 同時它也擋住「刪掉一個已經用掉邀請碼的使用者」這種會弄丟軌跡的操作。
DO $$
DECLARE
  n int;
  deltype "char";
BEGIN
  SELECT count(*) INTO n
    FROM pg_constraint
   WHERE contype = 'f' AND connamespace = 'public'::regnamespace;
  IF n <> 4 THEN
    RAISE EXCEPTION '預期 4 條外鍵，實際 %', n;
  END IF;

  SELECT count(*) INTO n
    FROM pg_constraint
   WHERE contype = 'f'
     AND confdeltype = 'c'
     AND conrelid IN (
           'public.accounts'::regclass,
           'public.sessions'::regclass,
           'public.transactions'::regclass
         );
  IF n <> 3 THEN
    RAISE EXCEPTION '預期 accounts/sessions/transactions 三條 ON DELETE CASCADE，實際 %', n;
  END IF;

  SELECT confdeltype INTO deltype
    FROM pg_constraint
   WHERE contype = 'f' AND conrelid = 'public.invite_codes'::regclass;
  IF deltype <> 'a' THEN
    RAISE EXCEPTION 'invite_codes.used_by 應為 ON DELETE NO ACTION，實際 confdeltype=%', deltype;
  END IF;
END $$;

\echo '== 4. 唯一約束 =='
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(c, ', ')
    INTO missing
    FROM unnest(ARRAY[
           'users_email_unique',
           'invite_codes_code_unique',
           'sessions_session_token_unique',
           'verification_tokens_token_unique'
         ]) AS c
   WHERE NOT EXISTS (
           SELECT 1 FROM pg_constraint
            WHERE conname = c AND contype = 'u'
              AND connamespace = 'public'::regnamespace
         );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION '缺少唯一約束: %', missing;
  END IF;
END $$;

\echo '== 5. 關鍵欄位的 NOT NULL =='
-- password_hash 允許 NULL 等於允許「沒有密碼的帳號」，是認證面的破口，所以在 CI 釘住。
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(format('%s.%s', tbl, col), ', ')
    INTO missing
    FROM (VALUES
           ('users', 'email'),
           ('users', 'password_hash'),
           ('users', 'total_prompt_tokens'),
           ('users', 'total_completion_tokens'),
           ('transactions', 'user_id'),
           ('transactions', 'amount'),
           ('transactions', 'type'),
           ('transactions', 'category'),
           ('transactions', 'date'),
           ('invite_codes', 'code')
         ) AS want(tbl, col)
   WHERE NOT EXISTS (
           SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = want.tbl
              AND column_name = want.col
              AND is_nullable = 'NO'
         );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION '下列欄位應為 NOT NULL 但不是（或不存在）: %', missing;
  END IF;
END $$;

\echo 'schema assertions: OK'
