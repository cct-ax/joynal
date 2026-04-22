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
| UPDATE | 自分のみ | 自分のみ | 自分のみ | 全員分○ |
| DELETE | × | × | × | ○ |

> SELECT を全員に許可するのは、名前・社員IDのドロップダウン表示に必要なため。

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

-- 認証済みユーザーは全プロフィールを読める（名前・社員ID表示のため）
CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 管理者のみ追加可能
CREATE POLICY "profiles_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 管理者は全員を更新可、本人は自分のみ更新可
CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR id = auth.uid())
  WITH CHECK (public.is_admin() OR id = auth.uid());

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

## 補足

### メンター交代後の日報閲覧について

`is_my_trainee()`は`mentor_assignments`の現在のレコードを参照する。担当変更は既存レコードのUPDATEで行うため、新しいメンター・OJTは変更後すぐに過去の日報を含めすべて閲覧可能になる。旧担当者はアクセス不可となる。

### `is_active = false`のユーザーのアクセス制限

`is_active = false`のユーザーはSupabase Auth側で無効化（ban）することでログイン自体を禁止する。RLSでの制御は不要。
