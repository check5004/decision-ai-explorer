# Decision Atelier

[公開デモを開く](https://check5004.github.io/decision-ai-explorer/)

Jev・Microsoftなど5つの判断モデルを、同じ入力で並列比較する日本語の1ページアプリです。6つの架空の業務・ゲーム例を編集し、日本語の結果・確率・通信込み所要時間・API返却料金をモデル別に確認できます。

**本物のAPIだけを使います。初期状態に推論結果はありません。** ブラウザーの表示テスト・ユニットテストと、認証済み実推論の検証を区別しています。

## 構成

- 完全静的フロントエンド。GitHub Pagesで公開できます。
- 本番アプリにフレームワーク・外部フォント・分析タグ・サードパーティースクリプトはありません。Playwrightは開発時の表示テストにだけ使用します。
- ブラウザーからOpenRouterへ直接POSTします。推論は端末内ではなくリモートです。
- APIキーは利用者が画面で入力し、確認して「このブラウザーに保存」を押したときだけ端末のブラウザー保存領域（localStorage）へ保存します。入力欄は設定直後に消去し、リロード後も使えます。
- キーをバンドル、Git、サーバー環境変数、ログ、診断・結果ファイルへ入れません。ブラウザー保存は暗号化された保管庫ではなく、同じオリジンの別ページや拡張機能からアクセスされるリスクがあります。共有端末で保存しないでください。
- 付属のNodeサーバー/Dockerは静的ファイルの配信用です。推論プロキシではありません。
- 一括比較ボタンは、表示された5モデルへ同じ入力を並列送信します。単体実行もできます。クリックなしの自動実行、自動再試行、失敗時の別モデルへのフォールバック、疑似推論はありません。

## 比較する5モデル

2026-10-16の[OpenRouter公式Decisions catalog](https://openrouter.ai/api/v1/models?output_modalities=decisions)と各モデルの公式ページで、共通の `choice / noul / score` 対応を確認しています。互換性は文書での確認で、認証済み実推論の成功を保証するものではありません。

| 表示名 | 要求ID | 確認済みcanonical ID | 入力USD / 100万tokens | context |
|---|---|---|---:|---:|
| Microsoft Decision 1 | microsoft/microsoft-decision-1 | microsoft/microsoft-decision-1-20261009 | $0.042 | 32,768 |
| Jev 1.14 | typesafe/jev-1.14 | typesafe/jev-1.14-20261014 | $0.042 | 262,144 |
| Perplexity Decider V1.1 | perplexity/pplx-decider-v1.1-27b | perplexity/pplx-decider-v1.1-27b-20261006 | $0.020 | 262,144 |
| Liquid d1 | liquid/d1 | liquid/d1-20260930 | $0.020 | 65,536 |
| Mercury Decide Free | inception/mercury-decide:free | inception/mercury-decide-20260930 | $0 | 65,536 |

出力料金はいずれもcatalog上$0です。価格・無料枠・利用制限は変更される場合があります。実際の料金表示は各API応答の `usage.cost` のみを使い、未返却を0にしません。Mercuryは明示した `:free` の要求IDを送り、有料版へ切り替えません。

JevはTypeSafeの判断モデルです。[公式Jevガイド](https://openrouter.ai/docs/guides/community/jev)に従い、変動するlatest aliasではなく1.14を使用します。追加モデルの互換性: [Perplexity](https://openrouter.ai/perplexity/pplx-decider-v1.1-27b) / [Liquid](https://openrouter.ai/liquid/d1) / [Mercury](https://openrouter.ai/inception/mercury-decide:free)。共通形式に収まらない画像用boxや特殊な行動採点APIは実装しません。

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
2. ページ右上「APIキーを設定」から入力し、ブラウザーへの保存・料金・送信先を確認して「このブラウザーに保存」。この時点ではAPIを呼びません。
3. お題のカードを選び、日本語の項目で条件を確認・編集します。JSONと判断基準は「詳細設定」から変更できます。
4. 主ボタン「5モデルを同時に比較」は、クリック時点の同じ入力・判断基準を5モデルへ並列送信します。対象名と5リクエストであることをボタン前に表示します。「選択モデルだけ実行」はプルダウンで選んだ1モデルへ送ります。追加の実行確認ダイアログは出しません。
5. 一括比較はPCでは横並び、狭い画面では縦並びです。一部モデルが失敗しても他の結果を保持します。結果の表で日本語の候補・意味・割合を比べます。選択型は選ばれた行を緑で表示し、段階評価と条件の度合いは別形式で表示します。生の応答・トークン・モデルIDは詳細を開いて確認できます。単体結果・比較全体をJSONとして保存でき、認証ヘッダーは含みません。単体モデルを切り替えても入力は共通で、結果と速度集計はモデル別です。「直前の比較結果を表示」で前の比較に戻れます。
6. 右上の接続設定から「保存したキーを削除」で、使用中のキーと保存データを消せます。リロードではキーは消えません。保存・読み込み・削除がブラウザーに拒否された場合は、完了扱いにせず画面に説明を表示します。

「キー保存済み」はこのブラウザーへの保存を確認したという意味で、認証成功の表示ではありません。認証は実行時に初めて確認します。認証が拒否された場合は、そのキーが引き続き保存されている場合に削除し、再設定を求めます。別タブで新しく保存されたキーは削除しません。結果・入力の編集・実行履歴は永続化せず、リロードで消えます。

## APIの実装

通常のChat Completionsではなく、専用のalpha Decisions APIです。

- URL: `https://openrouter.ai/api/alpha/decisions`
- Model: 上の5つの要求IDだけを許可（初期選択はMicrosoft）
- Body: `{ model, state, questions }`
- 各質問: `type`, `instructions`, `criteria`
- `choice`: 選択肢キー、確率分布、confidence
- `noul`: 命題がtrueである度合いを表す0〜1の数値
- `score`: 基準インデックスの確率加重平均、インデックスごとの確率分布、confidence

返却モデルIDは加工せず表示します。要求したモデルごとに、その要求IDまたは上表の公式に確認したcanonical IDへの完全一致だけを速度集計へ含めます。別の登録モデルのID、任意の日付、接頭辞だけの一致は受理しません。要求ID・返却ID・照合根拠は詳細とJSON保存に保持します。未知のIDでも応答内容は確認でき、警告付きで速度集計から除外します。

生成された理由文・チャット・ストリーミング出力は要求しません。confidenceは分布の集中度であり、正解確率ではありません。noulのfalseの棒はUIで計算した `1 - noul` です。モデルが返していない説明文は作りません。

各モデルの参考料金・contextは上表の確認時点の値です。APIはalphaのため、提供状況や仕様が変わる可能性があります。

- [公式モデル・料金](https://openrouter.ai/microsoft/microsoft-decision-1)
- [Decisions API仕様](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request)
- [MicrosoftのDecisionモデル説明](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/how-to/use-foundry-models-microsoft-decision)

## 速度・料金の読み方

- **総応答時間**: `performance.now()`で、単体は送信開始、並列比較は全モデル共通の比較開始から、各応答本文の受信・JSON解析までを計測。ネットワーク、OpenRouterのルーティング、提供元、ブラウザーの処理を含み、モデル単体の純粋な推論時間ではありません。
- **ヘッダー到着**: fetchが応答ヘッダーを受け取るまで。最初のトークンの時間ではありません。
- **中央値**: このタブで取得に成功し、返却モデルIDがその要求モデルの確認済みIDに完全一致したリクエストのみを、要求モデル別に集計。初回の呼び出しも除外しません。失敗は別扱いです。
- **料金**: 応答の `usage.cost`。不明な費用は0と扱わず「未報告」と表示。セッションの金額は報告済みの部分合計で、請求全体の保証ではありません。
- 1リクエストで複数質問を送った場合、計測時間は全体の値です。質問1件当たりの時間ではありません。
- 45秒でブラウザー側の通信を中断します。処理が提供元で完了した場合、キャンセル・タイムアウト・ネットワークエラーでも課金される可能性があります。

PoCは20,000バイト/リクエスト、最大6質問、最大8選択肢、同時最大5リクエスト、2.5秒の開始間隔、1タブ20リクエスト（比較1回で5件）に制限します。これらはUX上の抑止であり、強制的な請求上限ではありません。OpenRouter側のキー上限を使ってください。実行中はモデル・入力・お題の変更と二重実行を禁止し、「通信を中断」は進行中の全リクエストを中断します。完了済みの結果は保持し、再実行時は新旧の比較を混ぜません。

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
