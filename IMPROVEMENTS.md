# 專案改進建議

本文檔列出了專案中可以改進的地方，按照優先級和類別組織。

## 🔴 高優先級（安全性與穩定性）

### 1. 錯誤處理與資料庫交易管理

**問題：**
- 多數路由缺少 try-catch 錯誤處理
- 資料庫操作沒有適當的 rollback 機制
- 多個 commit 操作可能導致部分失敗

**建議：**
- 為所有路由添加統一的錯誤處理裝飾器
- 使用資料庫交易上下文管理器確保原子性
- 在發生錯誤時自動 rollback

**範例改進：**
```python
# 創建統一的錯誤處理裝飾器
from functools import wraps
from fastapi import HTTPException

def handle_db_errors(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        db = kwargs.get('db')
        try:
            result = await func(*args, **kwargs)
            db.commit()
            return result
        except Exception as e:
            if db:
                db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
    return wrapper
```

### 2. 安全性問題

**問題：**
- CORS 允許所有來源 (`allow_origins=["*"]`)
- SECRET_KEY 有預設值，生產環境不安全
- 缺少速率限制（Rate Limiting）
- 缺少輸入驗證和清理

**建議：**
- 在生產環境中限制 CORS 來源
- 要求 SECRET_KEY 必須從環境變數讀取
- 添加速率限制中間件（如 `slowapi`）
- 添加輸入驗證和清理

**改進範例：**
```python
# main.py
import os
from fastapi.middleware.cors import CORSMiddleware

# 從環境變數讀取允許的來源
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
if not ALLOWED_ORIGINS or ALLOWED_ORIGINS == [""]:
    raise ValueError("ALLOWED_ORIGINS must be set in production")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# security.py
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY must be set in environment variables")
```

### 3. 日誌系統

**問題：**
- 只有 `report_scheduler.py` 使用標準 logging
- 其他路由使用 `print()` 或沒有日誌
- 缺少結構化日誌

**建議：**
- 統一使用 Python logging 模組
- 配置結構化日誌（JSON 格式）
- 添加日誌級別配置
- 記錄關鍵操作和錯誤

**改進範例：**
```python
# 創建 app/utils/logger.py
import logging
import sys
from pythonjsonlogger import jsonlogger

def setup_logging():
    log_handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        '%(asctime)s %(name)s %(levelname)s %(message)s'
    )
    log_handler.setFormatter(formatter)
    
    logger = logging.getLogger()
    logger.addHandler(log_handler)
    logger.setLevel(logging.INFO)
    
    return logger
```

## 🟡 中優先級（代碼品質與維護性）

### 4. 代碼重複

**問題：**
- 統計計算邏輯在多個地方重複（`stats.py`, `reports.py`, `report_scheduler.py`）
- BMR/TDEE 計算函數重複定義

**建議：**
- 創建統一的統計服務類
- 將計算函數移到共享模組

**改進範例：**
```python
# app/services/stats_service.py
class StatsService:
    @staticmethod
    def get_daily_stats(db: Session, user_id: int, target_date: date):
        """統一的統計計算方法"""
        # 統一的實現
        pass
```

### 5. 資料庫遷移

**問題：**
- 使用 `create_all()` 直接創建表，不適合生產環境
- 缺少版本控制和遷移腳本

**建議：**
- 使用 Alembic 進行資料庫遷移管理
- 創建初始遷移腳本

### 6. 測試覆蓋

**問題：**
- 完全沒有單元測試或整合測試

**建議：**
- 添加 pytest 測試框架
- 為關鍵功能添加單元測試
- 添加 API 整合測試

**改進範例：**
```python
# tests/test_auth.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_user():
    response = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    })
    assert response.status_code == 200
```

### 7. API 設計一致性

**問題：**
- 錯誤回應格式不一致
- 某些端點返回陣列而非物件
- 缺少 API 版本控制

**建議：**
- 定義統一的錯誤回應模型
- 統一回應格式
- 添加 API 版本前綴（如 `/api/v1/`）

## 🟢 低優先級（性能與優化）

### 8. 資料庫查詢優化

**問題：**
- 潛在的 N+1 查詢問題（如 `get_conversations`）
- 缺少資料庫索引
- 沒有查詢結果分頁

**建議：**
- 使用 `joinedload` 或 `selectinload` 優化關聯查詢
- 為常用查詢欄位添加索引
- 為列表端點添加分頁

**改進範例：**
```python
# 添加索引
class DietLog(Base):
    __tablename__ = "diet_logs"
    # ...
    date = Column(Date, nullable=False, index=True)  # 已有
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)  # 需要添加

# 優化查詢
from sqlalchemy.orm import joinedload

conversations = db.query(Conversation)\
    .options(joinedload(Conversation.messages))\
    .filter(Conversation.user_id == current_user.id)\
    .all()
```

### 9. 快取機制

**問題：**
- 沒有快取機制
- 重複計算 BMR/TDEE 等值

**建議：**
- 添加 Redis 快取
- 快取用戶設定和統計數據

### 10. 配置管理

**問題：**
- 硬編碼值（如 `chunk_size=10`）
- 缺少環境配置管理

**建議：**
- 使用 Pydantic Settings 管理配置
- 將所有配置項移到環境變數或配置檔案

**改進範例：**
```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    gemini_api_key: str
    allowed_origins: list[str] = []
    chunk_size: int = 10
    max_upload_size: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 11. 連接池配置

**問題：**
- 資料庫連接沒有明確的池配置

**建議：**
- 配置適當的連接池大小
- 設置連接超時和重試機制

**改進範例：**
```python
# database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # 檢查連接是否有效
    pool_recycle=3600,   # 1小時回收連接
)
```

## 📋 其他建議

### 12. 文檔完善

**建議：**
- 添加 API 文檔註釋
- 創建開發者指南
- 添加部署文檔

### 13. 監控與健康檢查

**建議：**
- 增強 `/health` 端點，檢查資料庫連接
- 添加指標收集（如 Prometheus）
- 添加錯誤追蹤（如 Sentry）

### 14. 圖片上傳優化

**問題：**
- 沒有檔案大小限制
- 沒有圖片格式驗證
- 沒有圖片壓縮

**建議：**
- 添加檔案大小限制
- 驗證圖片格式
- 添加圖片壓縮功能

### 15. 環境變數驗證

**建議：**
- 在應用啟動時驗證所有必需的環境變數
- 提供清晰的錯誤訊息

## 實施優先順序建議

1. **第一階段（立即實施）：**
   - 錯誤處理與交易管理
   - 安全性修復（CORS、SECRET_KEY）
   - 統一日誌系統

2. **第二階段（短期）：**
   - 代碼重複消除
   - 添加基本測試
   - 資料庫遷移設置

3. **第三階段（中期）：**
   - 查詢優化
   - API 設計統一
   - 配置管理改進

4. **第四階段（長期）：**
   - 快取機制
   - 監控與指標
   - 性能優化

## 總結

這是一個功能完整的專案，但在生產環境準備度方面還有改進空間。優先處理安全性和穩定性問題，然後逐步改善代碼品質和性能。建議按照上述優先順序逐步實施改進。
