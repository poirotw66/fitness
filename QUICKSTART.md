# 快速開始指南

## 前置需求

- Node.js 18+ 和 npm
- Python 3.11+
- Google Gemini API Key（從 [Google AI Studio](https://makersuite.google.com/app/apikey) 獲取）

## 1. 克隆專案

```bash
git clone <your-repo-url>
cd fitness
```

## 2. 設置後端

```bash
cd backend

# 創建虛擬環境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安裝依賴
pip install -r requirements.txt

# 設置環境變數
cp .env.example .env
# 編輯 .env 文件，填入：
# - GEMINI_API_KEY=your-api-key
# - SECRET_KEY=your-secret-key (用於 JWT 簽名)

# 初始化資料庫
python -c "from app.models.database import init_db; init_db()"

# 運行後端
python run.py
```

後端將運行在 http://localhost:8000

## 3. 設置前端

打開新的終端窗口：

```bash
cd frontend

# 安裝依賴
npm install

# 設置環境變數（可選，默認使用 http://localhost:8000/api）
# 創建 .env 文件並設置：
# VITE_API_URL=http://localhost:8000/api

# 運行前端
npm run dev
```

前端將運行在 http://localhost:3000

## 4. 使用應用

1. 訪問 http://localhost:3000
2. 註冊新帳號
3. 登入後進入對話界面
4. 開始與 AI 助手對話，例如：
   - "我今天早餐吃了兩個雞蛋和一片吐司"
   - "我剛才跑了30分鐘"
   - "我今天攝入了多少卡路里？"
   - "給我一些減肥建議"

## 5. 查看報告

點擊右側面板的"查看完整報告"按鈕，或訪問 http://localhost:3000/reports 查看詳細的健康報告和數據視覺化。

## 故障排除

### 後端無法啟動
- 確認已安裝所有依賴：`pip install -r requirements.txt`
- 確認 .env 文件已正確設置
- 確認資料庫已初始化

### 前端無法連接後端
- 確認後端正在運行
- 檢查 VITE_API_URL 環境變數是否正確
- 檢查瀏覽器控制台是否有 CORS 錯誤

### AI 回應錯誤
- 確認 GEMINI_API_KEY 已正確設置
- 檢查 API key 是否有效且有足夠的配額

## 下一步

- 查看 [README.md](README.md) 了解部署到生產環境的步驟
- 查看 API 文檔：http://localhost:8000/docs

