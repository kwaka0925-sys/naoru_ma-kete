# Meta広告マネージャー連携 セットアップ手順書

このドキュメントは、本アプリ（naoru_ma-kete）に **Meta広告マネージャー** の実績データを自動取得させるための、**人間側での事前作業** をまとめたものです。

すべての作業が完了すると、以下4つの値が手元に揃います。これを `.env` に貼り付ければアプリ側の同期機能が動きます。

```
META_APP_ID=...
META_APP_SECRET=...
META_ACCESS_TOKEN=...
META_AD_ACCOUNT_ID=act_1335477837049931
```

---

## 対象アカウント

| 項目 | 値 |
| --- | --- |
| 広告アカウントID | `act_1335477837049931` |
| ビジネスマネージャID | `1056693755630295` |
| 取得対象期間 | 月次（Campaignテーブルの `period` 単位） |

---

## 前提

- 上記ビジネスマネージャ (`1056693755630295`) に対して **管理者権限** を持っていること
- 広告アカウント `act_1335477837049931` に **アクセス可能** であること
- Meta for Developers アカウントが作成済みであること（未作成なら https://developers.facebook.com/ で登録）

---

## STEP 1: Meta for Developers アプリを作成

1. https://developers.facebook.com/apps/ にアクセス
2. 右上「アプリを作成」をクリック
3. ユースケースで **「ビジネス」** を選択 → 次へ
4. アプリ情報を入力
   - アプリ名: 例）`naoru-marketing-dashboard`
   - アプリの連絡先メールアドレス: 任意
   - ビジネスポートフォリオ: `1056693755630295` のビジネスを選択
5. 「アプリを作成」をクリック
6. 作成後、左メニュー「アプリの設定 → ベーシック」を開き、以下を控える
   - **アプリID** → `META_APP_ID` に使う
   - **app secret**（「表示」ボタン + パスワード入力で取得） → `META_APP_SECRET` に使う

### 必要プロダクトの追加

左メニュー「プロダクトを追加」から **「Marketing API」** を追加する。

---

## STEP 2: システムユーザーを作成（推奨）

個人のアクセストークンは有効期限が短いため、**システムユーザーの長期トークン** を使う。

1. https://business.facebook.com/settings にアクセス
2. ビジネス `1056693755630295` を選択
3. 左メニュー **「ユーザー → システムユーザー」** を開く
4. 「追加」→ システムユーザー名を入力（例: `naoru-api-bot`）、ロールは **「通常のシステムユーザー」** を選択
5. 作成

---

## STEP 3: システムユーザーに広告アカウントを割り当て

1. 作成したシステムユーザーを選択
2. 「資産を追加」→ **「広告アカウント」** を選択
3. 広告アカウント `act_1335477837049931` をチェック
4. 権限: **「広告アカウントの管理」** または最低でも **「パフォーマンスを表示」** を ON
5. 「変更を保存」

---

## STEP 4: システムユーザーにアプリを割り当て

1. 同じシステムユーザー画面で「資産を追加」→ **「アプリ」**
2. STEP 1で作ったアプリを選択
3. 「アプリの開発」を ON
4. 保存

---

## STEP 5: アクセストークンを生成

1. システムユーザー画面で **「新しいトークンを生成」** をクリック
2. **アプリ**: STEP 1 で作ったアプリを選択
3. **トークンの有効期限**: **「無期限」** を選択
4. **権限（スコープ）**: 以下にチェック
   - `ads_read`（必須・実績データ取得）
   - `ads_management`（任意・将来的に同期エンドポイント以外で操作する場合）
   - `business_management`（任意・ビジネス情報取得する場合）
5. 「トークンを生成」をクリック
6. 表示されたトークン文字列を **必ずコピー**（この画面を閉じると二度と表示されません）
   → `META_ACCESS_TOKEN` に使う

> ⚠️ このトークンは **シークレット** です。Slack やチケット本文に貼らず、`.env` や Vercel の環境変数ダッシュボードにのみ保存してください。

---

## STEP 6: トークンが正しく動くか確認（オプション）

ターミナルで以下を叩き、エラーなくJSONが返ればOK:

```bash
curl -G "https://graph.facebook.com/v21.0/act_1335477837049931/insights" \
  -d "access_token=YOUR_TOKEN_HERE" \
  -d "fields=spend,impressions,clicks,reach" \
  -d "date_preset=this_month"
```

期待するレスポンス例:
```json
{
  "data": [
    {
      "spend": "12345.67",
      "impressions": "100000",
      "clicks": "1234",
      "reach": "50000",
      "date_start": "2026-04-01",
      "date_stop": "2026-04-24"
    }
  ]
}
```

`"error"` を含むレスポンスが返る場合は、STEP 3 の広告アカウント割り当て権限が不足している可能性が高い。

---

## STEP 7: `.env` に反映

ローカル開発:
```bash
cp .env.example .env
# エディタで開いて META_* の4つを埋める
```

Vercel 本番環境:
- Vercel ダッシュボード → Project → Settings → Environment Variables
- `META_APP_ID` / `META_APP_SECRET` / `META_ACCESS_TOKEN` / `META_AD_ACCOUNT_ID` を追加
- 環境は **Production / Preview / Development** いずれも同じ値で可（本番用と検証用を分けたい場合はアプリを2つ作る）

---

## 取得される指標のマッピング

アプリ側の同期処理（Phase 2 で実装）は、Meta Insights API から以下を取得し `Campaign` テーブルに保存します:

| Meta API フィールド | Campaignカラム | 備考 |
| --- | --- | --- |
| `spend` | `spend` | 広告費（円） |
| `impressions` | `impressions` | インプレッション |
| `clicks` | `clicks` | クリック数 |
| `actions[omni_purchase]` | `leads` | コンバージョン（購入/申込）|
| `purchase_roas[omni_purchase]` | （計算用）| ROAS |
| `campaign_name` | — | ログ用 |

店舗との紐付けは **キャンペーン名に店舗名を含める命名規則** を前提にします（例: `【新宿店】4月LP誘導`）。命名規則は別途チームで統一してください。

---

## トラブルシューティング

| 症状 | 原因と対処 |
| --- | --- |
| `(#200) Requires ads_read permission` | STEP 5 のスコープに `ads_read` が入っていない → 再発行 |
| `(#100) Tried accessing nonexisting field` | Marketing API バージョン不一致 → `v21.0` を使用 |
| `(#17) User request limit reached` | レート制限 → 同期頻度を1時間に1回程度に制限 |
| トークンが数時間で失効する | システムユーザー経由ではなく個人トークンを使っている → STEP 2 からやり直す |

---

## 次のステップ

4つの環境変数が揃ったら、アプリ側で以下を実装します（別PRで対応予定）:

- `lib/meta-client.ts`: Marketing API ラッパー
- `app/api/meta/sync/route.ts`: 同期エンドポイント
- ダッシュボードに「Meta広告を同期」ボタン
- Campaign テーブルへの upsert（`storeId + media + period` キー）
