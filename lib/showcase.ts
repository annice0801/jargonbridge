// 免登入體驗的示範情境：內容預先寫好，點下去立刻顯示，不呼叫 AI、不傳送任何資料。

export type ShowcaseCard = { term: string; meaning: string };

export type Scenario = {
  id: string;
  prompt: string;
  jargon: string;
  checkpoint: string;
  ng: string;
  best: string;
  cards: ShowcaseCard[];
};

export type Dimension = { id: string; title: string; subtitle: string; scenarios: Scenario[] };

export const DIMENSIONS: Dimension[] = [
  {
    id: "finance",
    title: "財務防護與商業合規",
    subtitle: "預算、合約、個資",
    scenarios: [
      {
        id: "budget-cut",
        prompt: "老闆把明年的專案預算砍了 30%，但功能一個都不准少，我該怎麼辦？",
        jargon:
          "基於 MoSCoW 框架進行範疇階層重構，鎖定 P0 核心價值路徑；將 P1/P2 功能轉入二期迭代，並建立實獲值（EVM）預警機制，確保關鍵商業指標（North Star Metric）不受預算縮減影響。",
        checkpoint: "核心價值範疇協商（Scope Negotiation）與資源邊界控制",
        ng: "好，我們會想辦法全部做完，大家加班趕一下應該可以。",
        best:
          "預算少三成，我不會承諾全部照做。我會先用 MoSCoW 把功能分級，確保直接影響營收的 P0 照原時程上線，P1、P2 排進第二期。每兩週用實獲值追蹤進度和花費，一旦偏離就提早回報，讓您決定要加資源還是再砍範圍。",
        cards: [
          { term: "MoSCoW", meaning: "把需求分成 Must、Should、Could、Won't 四級，決定先做什麼、這次不做什麼。" },
          { term: "EVM 實獲值管理", meaning: "同時看「花了多少錢」和「完成了多少價值」，提早發現專案超支或落後。" },
          { term: "North Star Metric", meaning: "最能代表產品為使用者創造價值的那一個核心指標。" },
        ],
      },
      {
        id: "data-sharing",
        prompt: "業務說客戶要我們把會員名單直接給合作廠商做行銷，叫我先做再說，我要照做嗎？",
        jargon:
          "依個資法目的外利用限制與最小必要原則，先確認會員同意範圍；若需共享，改採去識別化資料或經同意的名單，並與合作方簽署資料處理協議（DPA），明定用途、保存期限與稽核權。",
        checkpoint: "合規風險攔截與替代方案設計",
        ng: "業務說客戶要，我們就先匯出 Excel 給對方。",
        best:
          "這件事我不建議先做再說。會員當初只同意我們自己使用資料，直接交給第三方可能違反個資法。我可以提兩個做法：一是只給去識別化的統計數據，二是先發同意書，只分享有勾選同意的會員。正式交出資料前，也需要法務和對方簽資料處理協議。",
        cards: [
          { term: "最小必要原則", meaning: "只蒐集、只分享完成目的所需的最少資料。" },
          { term: "去識別化", meaning: "把姓名、電話等能認出個人的欄位移除或替換，讓資料無法對應到特定人。" },
          { term: "DPA 資料處理協議", meaning: "雙方約定資料能怎麼用、存多久、出事誰負責的合約。" },
        ],
      },
      {
        id: "custom-demand",
        prompt: "最大的客戶說不幫他客製一個功能就不續約，但做了會拖垮我們主線產品，怎麼回？",
        jargon:
          "評估營收集中度與客製化的總持有成本（TCO），將需求抽象為可配置的產品化能力；若無法通用化，採專案報價與獨立分支，並以 SLA 與合約條款鎖定維護邊界。",
        checkpoint: "大客戶依賴風險與產品化取捨",
        ng: "客戶最大，他要什麼我們就做什麼。",
        best:
          "我會先算清楚兩筆帳：這個客戶佔營收多少，和客製功能未來每年的維護成本。如果其他客戶也有類似需求，就把它做成可設定的產品功能，大家都能用；如果只有他需要，就用專案方式另外報價，並在合約寫清楚維護範圍，避免拖慢主線。",
        cards: [
          { term: "TCO 總持有成本", meaning: "不只看開發費，也算進之後的維護、支援和機會成本。" },
          { term: "產品化", meaning: "把單一客戶的需求，做成多數客戶都能設定使用的標準功能。" },
          { term: "SLA", meaning: "服務等級協議，寫明服務要多穩定、出問題多快回應。" },
        ],
      },
    ],
  },
  {
    id: "rd",
    title: "產研技術衝突與架構折衷",
    subtitle: "時程、技術債、上線",
    scenarios: [
      {
        id: "refactor",
        prompt: "工程說要先花三個月重構，業務說下個月就要新功能，夾在中間怎麼辦？",
        jargon:
          "採用絞殺者模式（Strangler Fig）漸進式重構，將技術債償還拆入每個 Sprint 的固定容量；新功能以 Feature Flag 隔離上線，兼顧交付節奏與系統可維護性。",
        checkpoint: "技術債與商業交付的平衡（Trade-off）",
        ng: "那就先做業務要的，重構以後有空再說。",
        best:
          "我不會二選一。我會請工程把重構拆小，每個 Sprint 固定留兩成時間處理最影響新功能的那幾塊。新功能先用功能開關上線，出問題可以馬上關掉。這樣業務下個月拿得到功能，系統也一點一點變健康。",
        cards: [
          { term: "技術債", meaning: "為了趕進度留下的權宜做法，之後要花更多時間修。" },
          { term: "Strangler Fig 絞殺者模式", meaning: "新系統一塊一塊取代舊系統，不用一次全部重寫。" },
          { term: "Feature Flag", meaning: "功能開關，不用重新部署就能開啟或關閉某個功能。" },
        ],
      },
      {
        id: "launch-risk",
        prompt: "上線前一天發現效能有問題，要延期還是硬上？",
        jargon:
          "召開 Go/No-Go 會議，依 SLO 與錯誤預算判斷風險；若採上線，以金絲雀發布（Canary Release）限縮影響範圍，並備妥回滾（Rollback）方案與監控告警閾值。",
        checkpoint: "上線決策的風險控管",
        ng: "應該沒那麼嚴重，先上了再說，有問題再修。",
        best:
          "我會先量化影響：慢在哪個流程、影響多少使用者。如果核心流程還在服務水準內，就先開放 5% 的流量上線，盯著錯誤率和回應時間，一超標就自動退回舊版。如果結帳這類關鍵流程受影響，我會建議延後兩天，並主動通知相關部門新的時程。",
        cards: [
          { term: "Go/No-Go", meaning: "上線前的決策會議，依檢查清單決定要不要發布。" },
          { term: "Canary Release 金絲雀發布", meaning: "先讓一小部分使用者用新版本，確認沒問題再全面開放。" },
          { term: "Rollback", meaning: "出問題時快速退回上一個穩定版本。" },
        ],
      },
      {
        id: "api-contract",
        prompt: "前端和後端團隊為了 API 格式吵了兩週，進度完全卡住，怎麼收斂？",
        jargon:
          "以 OpenAPI 規格先行（API-first）定義介面契約，導入消費者驅動契約測試（Consumer-Driven Contract），並以架構決策紀錄（ADR）留存取捨理由，避免重複爭議。",
        checkpoint: "跨團隊介面治理與決策收斂",
        ng: "叫他們自己去討論，吵完再跟我說。",
        best:
          "我會把爭論從「誰對」改成「怎麼驗證」。先請兩邊一起寫出 API 規格文件，前端可以用假資料先開發；再加上自動化測試，規格一改就會被抓出來。最後把這次為什麼這樣決定寫成一頁紀錄，下次不用再吵一次。",
        cards: [
          { term: "API-first", meaning: "先把介面規格定好，前後端再依規格各自開發。" },
          { term: "Contract Testing 契約測試", meaning: "自動檢查雙方是否都遵守約定好的 API 格式。" },
          { term: "ADR 架構決策紀錄", meaning: "記下重要技術決定、當時的考量和放棄的選項。" },
        ],
      },
    ],
  },
  {
    id: "ai",
    title: "AI 工程與 Token 成本治理",
    subtitle: "成本、品質、自建或採購",
    scenarios: [
      {
        id: "token-bill",
        prompt: "老闆問為什麼 AI 功能這個月帳單暴增三倍，我要怎麼解釋？",
        jargon:
          "建立 Token 用量歸因（Cost Attribution），拆解至功能與使用者層級的單位經濟（Unit Economics）；導入 Prompt Caching、模型路由（Model Routing）與輸出長度上限，將每次請求成本收斂至目標區間。",
        checkpoint: "AI 成本可觀測性與單位經濟",
        ng: "因為大家比較常用 AI，所以就比較貴。",
        best:
          "我先把帳單拆到每個功能，發現七成成本來自摘要功能，因為每次都把整份文件重送一遍。我的計畫有三步：重複的內容改用快取，簡單的問題交給較便宜的模型，再限制回覆長度。目標是把每次使用的成本降回原本的水準，並每週回報。",
        cards: [
          { term: "Unit Economics 單位經濟", meaning: "算出每位使用者或每次使用的成本和收益，判斷規模越大是賺還是賠。" },
          { term: "Prompt Caching", meaning: "把重複送出的長內容暫存起來，下次只付少量費用。" },
          { term: "Model Routing 模型路由", meaning: "依問題難度自動分派給不同價位的模型。" },
        ],
      },
      {
        id: "hallucination",
        prompt: "我們的 AI 客服有時候會亂回答，客戶開始抱怨了，怎麼辦？",
        jargon:
          "以 RAG 將回答錨定（Grounding）於官方知識庫，建立評測集（Eval Set）量化幻覺率；加上護欄（Guardrails）與信心門檻，低信心時轉人工（Human-in-the-loop）。",
        checkpoint: "生成式 AI 品質治理",
        ng: "AI 本來就會出錯，我們再調一下 prompt 看看。",
        best:
          "我會先收集客訴裡答錯的題目，做成一份固定的測試題，量出現在答錯的比例。接著讓 AI 只根據官方文件回答、並附上出處；找不到答案就老實說不知道，直接轉真人客服。每次修改都用同一份測試題驗證，確定答錯率真的下降。",
        cards: [
          { term: "Hallucination 幻覺", meaning: "AI 很有自信地講出錯誤或捏造的內容。" },
          { term: "RAG", meaning: "先從資料庫找出相關文件，再讓 AI 依內容回答。" },
          { term: "Eval Set 評測集", meaning: "一份固定的測試題，用來客觀比較每次修改的好壞。" },
        ],
      },
      {
        id: "fine-tune",
        prompt: "主管問我們要不要自己訓練模型，還是繼續用 API 就好？",
        jargon:
          "以建置或採購（Build vs. Buy）框架評估總持有成本與差異化價值；先以 RAG 與 Prompt 工程建立評測基準（Baseline），確認 API 方案無法達標，才投入 Fine-tuning。",
        checkpoint: "技術投資決策與 ROI 論證",
        ng: "自己訓練比較厲害，以後也比較有技術壁壘。",
        best:
          "我建議先不要自己訓練。我會先用現有的 API 加上我們的資料做出基準版本，量出準確率和成本。只有在三個條件同時成立時才值得自己訓練：API 版達不到品質目標、用量大到訓練比較划算，而且這個能力是我們和競品的主要差異。",
        cards: [
          { term: "Build vs. Buy", meaning: "評估自己開發還是採購現成方案，比較成本、速度和差異化。" },
          { term: "Fine-tuning 微調", meaning: "用自己的資料再訓練模型，讓它更擅長特定任務。" },
          { term: "Baseline 基準", meaning: "先做出最簡單可行的版本，作為之後比較改善幅度的起點。" },
        ],
      },
    ],
  },
  {
    id: "martech",
    title: "MarTech 顧客旅程與私域防騷擾",
    subtitle: "推播、會員資料、成效",
    scenarios: [
      {
        id: "over-push",
        prompt: "行銷想每天推播三次衝轉換，結果退訂率一直飆，要怎麼跟他們溝通？",
        jargon:
          "導入頻率上限（Frequency Capping）與疲勞度模型，依 RFM 分群做差異化觸及；建立偏好中心（Preference Center），以顧客終身價值（LTV）而非單次轉換評估推播策略。",
        checkpoint: "短期轉換與長期顧客價值的平衡",
        ng: "推播本來就會有人退訂，多推一點總會有人買。",
        best:
          "我會用數字說明：每多一次推播帶來的訂單，和因此退訂、未來再也收不到訊息的會員相比，長期其實是賠的。建議依購買頻率分群，常買的人維持頻率，久沒互動的降到每週一次，並讓會員自己選想收的內容。用兩週測試比較營收和退訂率。",
        cards: [
          { term: "Frequency Capping", meaning: "限制同一個人在一段時間內最多收到幾則訊息。" },
          { term: "RFM 分群", meaning: "依最近購買時間、購買頻率、消費金額把會員分組。" },
          { term: "LTV 顧客終身價值", meaning: "一位顧客在整段關係中預期帶來的總營收。" },
        ],
      },
      {
        id: "data-silo",
        prompt: "會員資料散在 POS、官網和 LINE 三個地方，同一個人在系統裡變成三個人，怎麼整合？",
        jargon:
          "導入 CDP 進行身分解析（Identity Resolution），以手機或會員 ID 作為合併鍵建立單一顧客視圖（Single Customer View），再將分群受眾同步至行銷自動化（MA）與 BI。",
        checkpoint: "顧客資料架構與跨系統整合",
        ng: "請工程每個月把三份 Excel 合在一起就好。",
        best:
          "我會先定一個共同的識別方式，例如手機號碼加會員編號，把三個系統的資料自動對在一起，讓每位顧客只有一份完整紀錄。整合好的名單再自動送到行銷工具和報表系統，行銷看到的就是同一個人完整的購買和互動紀錄，也不會重複發訊息。",
        cards: [
          { term: "CDP 顧客資料平台", meaning: "把各系統的顧客資料集中、整合成每人一份完整檔案的平台。" },
          { term: "Identity Resolution 身分解析", meaning: "判斷不同系統裡的紀錄是不是同一個人，並合併起來。" },
          { term: "Single Customer View", meaning: "同一位顧客在所有通路的資料，整合在一個畫面上。" },
        ],
      },
      {
        id: "attribution",
        prompt: "老闆要我證明上一檔行銷活動到底有沒有用，不要只給我點擊數。",
        jargon:
          "以對照組（Holdout Group）進行增量測試（Incrementality Test），量化活動帶來的淨增營收；搭配多觸點歸因（Multi-touch Attribution）拆解各通路貢獻，計算實際 ROAS。",
        checkpoint: "行銷成效的因果驗證",
        ng: "這次點擊率很高，大家反應都不錯，應該有效。",
        best:
          "點擊不等於營收，所以我會留一組條件相同、但沒收到活動訊息的會員當對照組。兩組營收的差距，才是這檔活動真正多帶來的生意。再扣掉活動成本，算出每花一塊錢帶回多少營收，下次就知道預算該加碼還是收手。",
        cards: [
          { term: "Holdout Group 對照組", meaning: "刻意不給活動的一組人，用來比較活動到底有沒有效果。" },
          { term: "Incrementality 增量", meaning: "因為這個活動才多出來的成果，不是本來就會發生的部分。" },
          { term: "ROAS", meaning: "廣告投資報酬率：每花一塊廣告費帶回多少營收。" },
        ],
      },
    ],
  },
];
