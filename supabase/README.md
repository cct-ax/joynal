# Supabase 設定ガイド

このディレクトリは Supabase（DB・Auth）の設定を **コードとして** 管理します。

| パス | 役割 |
|------|------|
| `migrations/` | PostgreSQL マイグレーション SQL |
| `config.toml` | Auth 設定（メールテンプレ・OTP・送信レート制限など） |
| `templates/` | メール本文の HTML（例: `recovery.html`） |

---

## パスワードリセットの仕組み（OTP方式）

リンクではなく **6桁の確認コード（OTP）** を送る方式です。`redirect_to` を使わないので Redirect URLs の登録は不要です。

```
/forgot-password   メール入力 → POST /api/auth/reset-password（コード送信）
      ↓ /reset-password へ遷移（email は引き継ぎ）
/reset-password    email＋6桁コード＋新パスワード
      → POST /api/auth/reset-password-otp
         （verifyOtp(type=recovery) → updateUser → 全セッション失効 signOut）
      → /login で新パスワードで再ログイン
```

関連コード:
- 画面: `app/pages/forgot-password.vue`（申請）, `app/pages/reset-password.vue`（コード＋新パス）
- API: `server/api/auth/reset-password.post.ts`（コード送信）, `reset-password-otp.post.ts`（検証＋更新）
- スキーマ: `shared/types/schemas.ts`（`resetPasswordSchema` / `resetWithOtpSchema` / `resetPasswordOtpBodySchema`）

> ログイン中のパスワード変更は別系統（`PasswordChangeModal` → `POST /api/auth/update-password`）。

---

## Auth 設定（config.toml）の使い方

### 何を設定しているか
```toml
[auth.email]
otp_length = 6     # 確認コードの桁数
otp_expiry = 900   # 確認コードの有効期限（秒）= 15分

[auth.email.template.recovery]
subject = "【Joynal】パスワード再設定コード"
content_path = "./supabase/templates/recovery.html"   # メール本文

[auth.rate_limit]
email_sent = 30    # 1時間あたりのメール送信上限
```

### 編集したいとき
| 変えたいもの | 場所 |
|------|------|
| メール本文 | `supabase/templates/recovery.html`（`{{ .Token }}` が6桁コードに展開される） |
| メール件名 | `config.toml` の `[auth.email.template.recovery] subject` |
| コードの有効期限・桁数 | `config.toml` の `otp_expiry` / `otp_length` |
| 送信レート制限 | `config.toml` の `[auth.rate_limit] email_sent` |

メールで使える変数（recovery）: `{{ .Token }}`（6桁コード）, `{{ .Email }}`, `{{ .SiteURL }}` など。**recovery は `{{ .Token }}` を使う**（`{{ .ConfirmationURL }}` を入れるとリンク方式に戻ってしまうので使わない）。

### 反映方法
- **ローカル**: `supabase start` で `config.toml` が自動適用される。
- **本番**: 事前に `supabase link --project-ref <project-ref>` した上で
  ```bash
  supabase config push
  ```
  ⚠️ **注意**: `config push` はリモートの Auth 設定を **config.toml の内容で上書き** します（config.toml に書いていないキーは CLI 既定値になる）。既存の `site_url` / SMTP / 外部プロバイダ等を意図せず戻さないよう、**push 前に内容をレビュー**してください。
- **CLI を使わない場合**: `config.toml` / `templates/recovery.html` を正（source-of-truth）とし、**同じ内容をダッシュボードに手入力**します。
  - Authentication → Emails → Templates → **Reset Password**（件名・本文）
  - Authentication → 設定の **Email OTP expiry**（有効期限）

---

## 本番デプロイ前チェックリスト

- [ ] recovery メールが **`{{ .Token }}`（6桁コード）表示**になっている（リンクではない）
- [ ] OTP 有効期限が短め（例: 15分）
- [ ] **カスタム SMTP** を設定（Authentication → SMTP Settings）。既定の共有メールは数通/時のレート制限でテスト用
- [ ] 差出人名・差出人アドレスを設定
- [ ] （リンク方式は廃止したので **Redirect URLs の登録は不要**）

---

## マイグレーション

DB スキーマ変更は `migrations/` に SQL を追加します（命名 `YYYYMMDD_NN_説明.sql`）。適用後はアプリ側の型を再生成:

```bash
pnpm supabase:types   # shared/types/database.types.ts を更新（編集禁止ファイル）
```
