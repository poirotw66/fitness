# 身體管控 AI Agent 系統

一個以對話式 AI Agent 為核心的身體管控系統，用戶通過自然語言對話記錄飲食和運動，AI 助手（基於 Gemini 2.5 Flash）提供健康諮詢、實時統計分析，並自動生成每日健康報告。

## 技術架構

### 前端
- React + Vite
- Tailwind CSS
- React Router
- Zustand (狀態管理)
- Recharts (數據視覺化)
- Axios (HTTP 客戶端)

### 後端
- Python FastAPI
- LangGraph (Agent 框架)
- LangChain (LLM 整合)
- Google Gemini 2.5 Flash
- SQLAlchemy (ORM)
- SQLite (開發) / PostgreSQL (生產)

## 專案結構

```
fitness/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/    # React 組件
│   │   ├── pages/         # 頁面組件
│   │   ├── services/      # API 服務
│   │   ├── context/       # 狀態管理
│   │   └── App.jsx
│   └── package.json
├── backend/           # Python 後端
│   ├── app/
│   │   ├── models/        # 資料庫模型
│   │   ├── routes/        # API 路由
│   │   ├── auth/          # 認證模組
│   │   ├── agents/        # LangGraph Agent
│   │   └── services/      # 業務邏輯服務
│   ├── requirements.txt
│   ├── Dockerfile
│   └── run.py
└── README.md
```

## 本地開發設置

### 前端設置

```bash
cd frontend
npm install
npm run dev
```

前端將運行在 http://localhost:3000

### 後端設置

1. 創建虛擬環境：
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 安裝依賴：
```bash
pip install -r requirements.txt
```

3. 設置環境變數：
```bash
cp .env.example .env
# 編輯 .env 文件，填入 GEMINI_API_KEY 和 SECRET_KEY
```

4. 初始化資料庫：
```bash
python -c "from app.models.database import init_db; init_db()"
```

5. 運行後端：
```bash
python run.py
```

後端將運行在 http://localhost:8000

## 部署

### 前端部署到 GitHub Pages

1. 構建前端：
```bash
cd frontend
npm run build
```

2. 配置 GitHub Pages：
   - 在 GitHub 倉庫設置中啟用 GitHub Pages
   - 選擇 `gh-pages` 分支或 `docs` 目錄

### 後端部署到 Google Cloud Run

1. 設置 Google Cloud 項目：
```bash
gcloud config set project YOUR_PROJECT_ID
```

2. 構建並推送 Docker 映像：
```bash
cd backend
gcloud builds submit --config cloudbuild.yaml
```

或者手動部署：
```bash
# 構建映像
docker build -t gcr.io/YOUR_PROJECT_ID/fitness-backend .

# 推送映像
docker push gcr.io/YOUR_PROJECT_ID/fitness-backend

# 部署到 Cloud Run
gcloud run deploy fitness-backend \
  --image gcr.io/YOUR_PROJECT_ID/fitness-backend \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated
```

3. 設置環境變數：
```bash
gcloud run services update fitness-backend \
  --set-env-vars GEMINI_API_KEY=your-key,SECRET_KEY=your-secret,DATABASE_URL=your-db-url
```

## 環境變數

### 後端 (.env)
- `DATABASE_URL`: 資料庫連接字符串
- `SECRET_KEY`: JWT 簽名密鑰
- `GEMINI_API_KEY`: Google Gemini API 密鑰

### 前端 (.env)
- `VITE_API_URL`: 後端 API URL

## API 文檔

後端運行後，訪問 http://localhost:8000/docs 查看 Swagger API 文檔。

## 功能特性

- ✅ 用戶註冊和登入
- ✅ 對話式 AI Agent（基於 LangGraph）
- ✅ 智能提取飲食和運動資訊
- ✅ 實時統計分析
- ✅ 每日健康報告生成
- ✅ 數據視覺化

## 授權

MIT License

