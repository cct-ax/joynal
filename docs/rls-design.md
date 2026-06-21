# RLS（Row Level Security）設計書

## 基本方針

- 全テーブルでRLSを有効化し、デフォルトでアクセスを拒否する
- `auth.uid()`で現在のログインユーザーを特定する
- ロール判定・担当新人判定はヘルパー関数にまとめ、各ポリシーから呼び出す
- `SECURITY DEFINER`関数でRLSを回避してロール情報を安全に取得する

---

## アクセス権限マトリクス

### `profiles`テーブル

| 操作 | 新人 | メンター | OJT | 管理者 |
|------|:----:|:-------:|:---:|:------:|
| SELECT | 全員分○ | 全員分○ | 全員分○ | 全員分○ |
| INSERT | × | × | × | ○ |
| UPDATE | × | × | × | 全員分○ |
| DELETE | × | × | × | ○ |

> 一般ユーザー（新人/メンター/OJT）は自己編集も不可（×）。UPDATE は管理者のみ。

> SELECT を全員に許可するのは、名前・社員ID・ロールのドロップダウン/表示に必要なため。
> ただし **`email` カラムだけは PII 保護のため authenticated から除外**している（migration `20260529_01`、
> カラム権限 `GRANT SELECT (...) ` で email を含めない）。email を要する管理者操作（一覧・作成・更新）は
> サーバー側で service role 経由に切り替えている。`/api/users/me` も email を返さない。
>
> **自己権限昇格の遮断**: `authenticated`/`anon` の UPDATE 権限はカラム/テーブル権限で剥奪済み
> （migration `20260601_01`、`REVOKE UPDATE ON public.profiles`）。剥奪前は公開 anon key + 自分の JWT の
> 直接 REST で `PATCH /rest/v1/profiles?id=eq.<self> {"role":"admin"}` が通り自己昇格できた（CRITICAL）。
> プロフィール編集は全て管理者→service role 経由のため、剥奪しても機能影響はない。
>
> **SECURITY DEFINER 関数のハードニング**: `is_admin` / `is_my_trainee` / `handle_updated_at` は
> `search_path = ''` を固定済み（migration `20260601_01`）。本文は `public.` 修飾済み・`now()` は
> `pg_catalog` で常時解決できるため、空 search_path で安全。

### `daily_reports`テーブル

| 操作 | 新人 | メンター | OJT | 管理者 |
|------|:----:|:-------:|:---:|:------:|
| SELECT | 自分のみ | 担当新人のみ | 担当新人のみ | 全員分○ |
| INSERT | 自分のみ | × | × | × |
| UPDATE | 自分のみ | × | × | × |
| DELETE | 自分のみ | × | × | × |

### `comments`テーブル

| 操作 | 新人 | メンター | OJT | 管理者 |
|------|:----:|:-------:|:---:|:------:|
| SELECT | 自分宛のみ | 担当新人宛のみ | 担当新人宛のみ | 全員分○ |
| INSERT | × | 担当新人宛のみ | 担当新人宛のみ | × |
| UPDATE | × | 自分が書いたのみ | 自分が書いたのみ | × |
| DELETE | × | × | × | × |

> コメントは上書き（UPDATE）仕様のため、DELETEは不要。

### `mentor_assignments`テーブル

| 操作 | 新人 | メンター | OJT | 管理者 |
|------|:----:|:-------:|:---:|:------:|
| SELECT | 自分のみ | 自分が含まれる行のみ | 自分が含まれる行のみ | 全員分○ |
| INSERT | × | × | × | ○ |
| UPDATE | × | × | × | ○ |
| DELETE | × | × | × | ○ |

### `ai_summaries`テーブル

| 操作 | 新人 | メンター | OJT | 管理者 |
|------|:----:|:-------:|:---:|:------:|
| SELECT | 自分の self 行のみ | 担当新人の mentor 行のみ | 担当新人の mentor 行のみ | 全員分○ |
| INSERT | 自分の self 行のみ | 担当新人の mentor 行のみ | 担当新人の mentor 行のみ | ○ |
| UPDATE | 自分の self 行のみ | 担当新人の mentor 行のみ | 担当新人の mentor 行のみ | ○ |
| DELETE | × | × | × | × |

> サマリーは upsert（INSERT/UPDATE）運用のため DELETE は不要。`audience` で self（本人の振り返り）と mentor（観察）を分離する。

---

## ヘルパー関数

```sql
-- 現在のユーザーが管理者かどうかを返す
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 指定した新人が現在のユーザー（メンター・OJT）の担当かどうかを返す
CREATE OR REPLACE FUNCTION public.is_my_trainee(p_trainee_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE (mentor_id = auth.uid() OR ojt_id = auth.uid())
      AND trainee_id = p_trainee_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## RLSポリシー

---

### `profiles`テーブル

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全プロフィールの行を読める（名前・社員ID・ロール表示のため）。
-- email カラムは migration 20260529_01 のカラム権限で authenticated から除外している。
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 管理者のみ追加可能
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 管理者のみ更新可（自己権限昇格の遮断のため一般ユーザーの自己編集は不可）。
-- 加えて authenticated/anon の UPDATE 権限自体を migration 20260601_01 で REVOKE 済み（二重の防御）。
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 管理者のみ削除可（通常は無効化で対応）
CREATE POLICY "profiles_delete"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());
```

---

### `daily_reports`テーブル

```sql
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- 新人は自分の、メンター・OJTは担当新人の、管理者は全日報を読める
CREATE POLICY "daily_reports_select"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_my_trainee(user_id)
  );

-- 新人のみ、自分のuser_idで挿入可能
CREATE POLICY "daily_reports_insert"
  ON public.daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainee'
  );

-- 新人のみ、自分の日報を更新可能
CREATE POLICY "daily_reports_update"
  ON public.daily_reports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainee'
  );

-- 新人のみ、自分の日報を削除可能
CREATE POLICY "daily_reports_delete"
  ON public.daily_reports FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainee'
  );
```

---

### `comments`テーブル

```sql
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 新人は自分宛の、メンター・OJTは担当新人宛の、管理者は全コメントを読める
CREATE POLICY "comments_select"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR trainee_id = auth.uid()
    OR public.is_my_trainee(trainee_id)
  );

-- メンター・OJTのみ、担当新人宛にコメントを挿入可能（commenter_idは自分）
CREATE POLICY "comments_insert"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    commenter_id = auth.uid()
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    AND public.is_my_trainee(trainee_id)
  );

-- 自分が書いたコメントのみ更新可能（上書き仕様）
CREATE POLICY "comments_update"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (commenter_id = auth.uid())
  WITH CHECK (commenter_id = auth.uid());
```

---

### `mentor_assignments`テーブル

```sql
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

-- 新人は自分の、メンター・OJTは自分が含まれる、管理者は全レコードを読める
CREATE POLICY "mentor_assignments_select"
  ON public.mentor_assignments FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR trainee_id = auth.uid()
    OR mentor_id = auth.uid()
    OR ojt_id = auth.uid()
  );

-- 管理者のみ挿入・更新・削除可能
CREATE POLICY "mentor_assignments_insert"
  ON public.mentor_assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "mentor_assignments_update"
  ON public.mentor_assignments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "mentor_assignments_delete"
  ON public.mentor_assignments FOR DELETE
  TO authenticated
  USING (public.is_admin());
```

---

### `ai_summaries`テーブル

`comments` と同型。`audience` で self（本人）と mentor（担当・管理者）を分岐する。書き込みは `serverSupabaseClient`（ユーザー JWT）経由＝RLS 適用。

```sql
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

-- self 行は本人、mentor 行は担当メンター/OJT、admin は全て読める
CREATE POLICY "ai_summaries_select"
  ON public.ai_summaries FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (audience = 'self' AND user_id = auth.uid())
    OR (
      audience = 'mentor'
      AND public.is_my_trainee(user_id)
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    )
  );

-- self 行は本人(trainee)、mentor 行は担当メンター/OJT、admin は全て挿入できる
CREATE POLICY "ai_summaries_insert"
  ON public.ai_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (
      audience = 'self'
      AND user_id = auth.uid()
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'trainee'
    )
    OR (
      audience = 'mentor'
      AND public.is_my_trainee(user_id)
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    )
  );

-- upsert の UPDATE 経路。SELECT と同条件
CREATE POLICY "ai_summaries_update"
  ON public.ai_summaries FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (audience = 'self' AND user_id = auth.uid())
    OR (
      audience = 'mentor'
      AND public.is_my_trainee(user_id)
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (audience = 'self' AND user_id = auth.uid())
    OR (
      audience = 'mentor'
      AND public.is_my_trainee(user_id)
      AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('mentor', 'ojt')
    )
  );
```

---

## 補足

### メンター交代後の日報閲覧について

`is_my_trainee()`は`mentor_assignments`の現在のレコードを参照する。担当変更は既存レコードのUPDATEで行うため、新しいメンター・OJTは変更後すぐに過去の日報を含めすべて閲覧可能になる。旧担当者はアクセス不可となる。

### `is_active = false`のユーザーのアクセス制限

`is_active = false`のユーザーはSupabase Auth側で無効化（ban）することでログイン自体を禁止する。RLSでの制御は不要。
