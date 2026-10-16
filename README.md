# Decision Atelier

[公開デモを開く](https://check5004.github.io/decision-ai-explorer/)

Microsoft Decision-1を使って「選ぶ・見極める・測る」を試す、日本語の1ページ・フィーチャーギャラリーです。6つの架空の業務・ゲーム例を、同じ実験台で編集・実行できます。

**本物のAPIだけを使います。初期状態に推論結果はありません。** ブラウザーの表示テスト・ユニットテストと、認証済み実推論の検証を区別しています。

## 構成

- 完全静的フロントエンド。GitHub Pagesで公開できます。
- 本番アプリにフレームワーク・外部フォント・分析タグ・サードパーティースクリプトはありません。Playwrightは開発時の表示テストにだけ使用します。
- ブラウザーからOpenRouterへ直接POSTします。推論は端末内ではなくリモートです。
- APIキーは利用者が画面で入力します。タブのJavaScriptメモリだけに保持し、入力欄は設定直後に消去します。リロード・離脱で破棄します。
- キーをバンドル、Git、ブラウザー保存領域、サーバー環境変数、ログに入れません。
- 付属のNodeサーバー/Dockerは静的ファイルの配信用です。推論プロキシではありません。
- 別モデルへのフォールバック、疑似推論、自動実行、自動再試行はありません。

## 6つの実験

| 例 | ネイティブの型 | 結果が反映されるUI |
|---|---|---|
| 問い合わせの振り分け | `choice` | 対応チームの候補 |
| リリース前の確認 | `noul` | レビュー候補 / 不足確認 / 要確認 |
| 在庫の補充スコア | `score` | 補充優先度の連続スコア |
| 呼び出すツールを選ぶ | `choice` | 次に使う読み取りツールの候補 |
| 文章のトーンを判定 | `choice` | 編集アクションの候補 |
| ゲームNPCの行動選択 | `choice` | 架空のキャラクターの次の行動 |

実際のチーム通知、デプロイ、発注、外部ツール呼び出し、ゲームエンジンの制御は行いません。例の判断をUIに反映するPoCです。人の採用・信用・医療などの高リスクな適格性判定には利用しないでください。

## すぐに起動

Node.js 22以上（推奨24）で、依存関係のインストールは不要です。

```sh
npm run check
npm start
# http://localhost:8080
```

`file://`ではなくHTTPサーバーを使ってください。ES Modulesを使用しています。

### Docker

```sh
docker build -t decision-atelier .
docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  -p 127.0.0.1:8080:8080 decision-atelier
```

または `docker compose up --build`。キーをDockerへ渡す必要はありません。`PORT`環境変数に対応し、デフォルトは8080です。

### 操作

1. OpenRouterで少額の利用上限を付けたキーを用意します。キーをチャットやソースコードに貼らないでください。
2. ページ右上「APIキーを設定」から入力し、料金・送信先を確認して「このタブだけで使う」。この時点ではAPIを呼びません。
3. お題のカードを選び、日本語の項目で条件を確認・編集します。JSONと判断基準は「詳細設定」から変更できます。
4. 「この条件で判断する」を押すと1リクエストを送ります。
5. 結果の表で日本語の候補・意味・割合を比べます。選択型は選ばれた行を緑で表示し、段階評価と条件の度合いは別形式で表示します。生の応答・トークン・モデルIDは詳細を開いて確認できます。結果はJSONとして保存でき、認証ヘッダーは含みません。
6. 右上の接続設定から「キーを破棄」、またはリロードでキーを消せます。

「キー設定済み」は文字列をこのタブに保持したという意味で、認証成功の表示ではありません。認証は実行時に初めて確認します。

## APIの実装

通常のChat Completionsではなく、専用のalpha Decisions APIです。

- URL: `https://openrouter.ai/api/alpha/decisions`
- Model: `microsoft/microsoft-decision-1`
- Body: `{ model, state, questions }`
- 各質問: `type`, `instructions`, `criteria`
- `choice`: 選択肢キー、確率分布、confidence
- `noul`: 命題がtrueである度合いを表す0〜1の数値
- `score`: 基準インデックスの確率加重平均、インデックスごとの確率分布、confidence

返却モデルIDは加工せず表示します。OpenRouterは要求の別名を版付きIDに解決する場合がありますが、Microsoft固有の返却IDは実推論前には確認できていません。要求IDと異なる応答も生の実応答として表示し、注意を付け、実行履歴内のDecision-1速度集計から除外します。別モデルへの再試行は行いません。

生成された理由文・チャット・ストリーミング出力は要求しません。confidenceは分布の集中度であり、正解確率ではありません。noulのfalseの棒はUIで計算した `1 - noul` です。モデルが返していない説明文は作りません。

2026-10-15の公式モデルページでは入力 **$0.042 / 1M tokens**、出力 **$0 / 1M tokens**、コンテキスト **32,768 tokens**。無料モデルではなく、料金や提供状況は変更される可能性があります。

- [公式モデル・料金](https://openrouter.ai/microsoft/microsoft-decision-1)
- [Decisions API仕様](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request)
- [MicrosoftのDecisionモデル説明](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-microsoft-decision)

## 速度・料金の読み方

- **総応答時間**: `performance.now()`でfetch直前からレスポンス本文の受信・JSON解析までを計測。ネットワーク、OpenRouterのルーティング、提供元の処理を含みます。
- **ヘッダー到着**: fetchが応答ヘッダーを受け取るまで。最初のトークンの時間ではありません。
- **中央値**: このタブで取得に成功し、返却モデルIDが要求IDと完全一致したリクエストのみ。初回の呼び出しも除外しません。失敗は別扱いです。
- **料金**: 応答の `usage.cost`。不明な費用は0と扱わず「未報告」と表示。セッションの金額は報告済みの部分合計で、請求全体の保証ではありません。
- 1リクエストで複数質問を送った場合、計測時間は全体の値です。質問1件当たりの時間ではありません。
- 45秒でブラウザー側の通信を中断します。処理が提供元で完了した場合、キャンセル・タイムアウト・ネットワークエラーでも課金される可能性があります。

PoCは20,000バイト/リクエスト、最大6質問、最大8選択肢、同時1リクエスト、2.5秒のクリック間隔、1タブ20試行に制限します。これらはUX上の抑止であり、強制的な請求上限ではありません。OpenRouter側のキー上限を使ってください。

## 公開・Cloud Run

[デプロイ手順](docs/DEPLOYMENT.md)を参照してください。静的サイトで足りるため、無料の静的ホスティングが第一候補です。Cloud Runへ公開できるコンテナも用意していますが、Cloud Runやビルド・イメージ保存、API料金の完全無料は保証しません。

## 検証

```sh
npm run check  # 構文、静的セキュリティチェック、Node組み込みテスト
npm run build  # public/の既知ファイルだけをdist/へコピー
```

ブラウザ回帰テスト（開発時のみ）:

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:browser
```

ブラウザテストは外部通信を遮断し、明示した合成応答だけを使います。実際のキーや有料APIは使いません。スクリーンショットにも `TEST-ONLY-MOCK` と表示します。レスポンスfixtureは`tests/`内にあり、公開アプリやDockerには含めません。fixtureでの合格は本番モデルの成功を意味しません。CIのPages公開はmainブランチだけに限定しています。

[検証記録](docs/VERIFICATION.md) / [安全性とデータの扱い](SECURITY.md)

非公式PoCです。Microsoft、OpenRouterとの提携を意味しません。
