export const EXAMPLES = [
  {
    id: 'support', number: '01', icon: '↗', category: 'CUSTOMER EXPERIENCE', title: '問い合わせを、迷わず届ける。', short: '問い合わせの振り分け',
    description: '内容と状況から、最初に対応するチームを選ぶ。担当者の確認を助ける、サポート受信箱の部品に。',
    idea: 'ヘルプデスクの自動タグ付け・チーム候補の提示', type: 'choice', label: 'ルーティング',
    state: { product: '架空のタスク管理アプリ「Mado」', customer_message: '有料プランに変更したのに、チームのメンバーを追加できません。画面には「上限に達しました」と出ます。請求は完了しています。', plan: 'team', payment_status: 'paid', members: 3, expected_member_limit: 10 },
    questions: { team: { type: 'choice', instructions: '問い合わせの中心的な問題に最も適した最初の対応チームを1つ選ぶ。返金やアカウント変更は実行せず、担当候補だけを示す。', criteria: { technical_support: '契約上は利用できるはずの機能が動作せず、設定または不具合の調査が必要', billing_support: '支払い失敗・二重請求・料金そのものへの問い合わせ', product_guidance: '正常な機能の使い方やプランの説明が必要' } } },
  },
  {
    id: 'release', number: '02', icon: '◉', category: 'DEVELOPER TOOLS', title: '小さな変更にも、出荷の目を。', short: 'リリース前の確認',
    description: 'テストや変更内容を読み、社内レビューに進めるかを判定。デプロイそのものは実行しません。',
    idea: 'CIの補助チェック・レビュー待ちキューの整理', type: 'noul', label: 'Yes / No',
    state: { project: '架空の社内アイコンカタログ', change: '検索ボックスにキーボードショートカットを追加', tests_passed: 42, tests_failed: 0, keyboard_navigation_checked: true, unresolved_critical_bugs: 0, mobile_check: '未実施', release_rule: 'テスト成功、重大な未解決不具合なし、キーボードとモバイルの動作確認をすべて必須とする' },
    questions: { ready_for_review: { type: 'noul', instructions: '提示されたrelease_ruleの全条件を満たす場合だけ、リリース承認レビューに進む準備ができていると判定する。これは助言であり承認やデプロイではない。', criteria: { true: '必須条件をすべて満たしており、リリース承認レビューに進める', false: '必須条件に不足、失敗、または未確認事項がある' } } },
  },
  {
    id: 'inventory', number: '03', icon: '▥', category: 'OPERATIONS', title: '補充の優先度に、ものさしを。', short: '在庫の補充スコア',
    description: '在庫・消費・納期を同じ基準で評価。発注はせず、担当者が見る順番のヒントにします。',
    idea: '店舗バックオフィス・補充候補のダッシュボード', type: 'score', label: '段階評価',
    state: { store: '架空の文具店「余白」', item: 'A5 無地ノート', units_in_stock: 18, typical_daily_sales: 6, supplier_lead_days: 5, incoming_units: 0, promotion_starts_in_days: 3 },
    questions: { replenishment_priority: { type: 'score', instructions: '在庫切れまでの日数、仕入れ納期、入荷予定、販促を踏まえ、補充候補としての優先度を4段階の基準で評価する。発注は行わない。', criteria: ['0: 十分な在庫があり、次の通常点検まで補充検討は不要', '1: 当面は十分だが、次の点検で補充を検討する', '2: 納期に近い余裕しかなく、早めに補充を検討する', '3: 納品前の在庫切れが見込まれるため、すぐに担当者が確認する'] } },
  },
  {
    id: 'tools', number: '04', icon: '⌘', category: 'AGENT BUILDING BLOCKS', title: 'エージェントに、次の一手を。', short: '呼び出すツールを選ぶ',
    description: '目的と手元の情報から、次に使う読み取りツールを選ぶ。外部ツールの呼び出しは行いません。',
    idea: 'エージェントのルーター・不要な検索の削減', type: 'choice', label: 'ツール選択',
    state: { user_request: '架空のプロジェクト「Lumen」の先週の決定事項を、既存の議事録から整理して', available_context: 'プロジェクト名のみ。議事録本文はまだ取得していない。', constraints: ['社内資料に根拠を限定する', 'メッセージの送信やファイルの変更はしない'] },
    questions: { next_tool: { type: 'choice', instructions: 'ユーザーの目的に直接役立ち、制約を守る次の読み取りアクションを1つ選ぶ。ツールは実行せず選択だけする。', criteria: { search_internal_notes: 'プロジェクト名と期間で社内議事録を検索する', search_public_web: '一般公開されているWebページを検索する', answer_from_context: '追加取得をせず、すでにある内容だけで回答する', ask_clarification: '実行に不可欠な対象や条件が曖昧なため、ユーザーに確認する' } } },
  },
  {
    id: 'tone', number: '05', icon: 'Aa', category: 'CONTENT WORKFLOWS', title: '伝わり方を、整えるきっかけに。', short: '文章のトーンを判定',
    description: '架空の製品紹介文を、編集方針に照らして分類。文章生成とは別の、軽量な編集アシスト。',
    idea: 'CMSの編集チェック・ブランドトーンのタグ付け', type: 'choice', label: 'スタイル分類',
    state: { brand: '架空のノートアプリ「Sumi」', style_guide: '穏やかで具体的。大げさな最上級や断定を避け、機能を分かりやすく伝える。', draft: '世界最高のメモ体験が、あなたの毎日を完全に変える！もう二度とアイデアを忘れません。' },
    questions: { editorial_action: { type: 'choice', instructions: '文章の主張の事実確認は行わず、提示されたブランドの文体ルールへの適合性から編集アクションを選ぶ。', criteria: { keep_tone: '文体方針に合っており、トーンを維持してよい', soften_claims: '最上級や強すぎる断定を抑え、具体的な表現に直す必要がある', simplify_language: '難解な言葉や長さが主な問題であり、平易にする必要がある' } } },
  },
  {
    id: 'game', number: '06', icon: '◇', category: 'PLAY & INTERACTION', title: '世界の状態から、キャラクターが動く。', short: 'ゲームNPCの行動選択',
    description: '架空の探索ゲームで、状態に応じて行動候補を選ぶ。ルールとAIの境界を試せる小さな実験。',
    idea: 'NPCの行動ルーター・対話ゲームの分岐づくり', type: 'choice', label: '行動選択',
    state: { game: '架空の探索ゲーム「コケの谷」', character: '郵便ロボット', energy_percent: 12, current_weather: '雨', location: '充電小屋の前', parcel: '急ぎではない種の小包', delivery_distance: '徒歩20分', charging_station_available: true },
    questions: { next_action: { type: 'choice', instructions: '配送を続けるための安全なエネルギー余裕を優先し、ゲーム内キャラクターの次の行動を選ぶ。現実のシステムの制御には使用しない。', criteria: { charge: '近くの充電小屋でエネルギーを回復する', deliver: 'すぐに配達先へ向かう', shelter: '充電せず雨宿りをする', explore: '近くの未探索エリアに寄り道する' } } },
  },
];
