# 圖片上傳功能說明

## 功能概述

新增了食物圖片上傳和分析功能，可以：
1. 上傳食物圖片
2. 使用 Gemini AI 視覺模型分析圖片
3. 自動識別營養成分表（如果圖片中包含）
4. 推估營養成分和卡路里（如果沒有營養成分表）
5. 自動保存到飲食記錄

## 後端實現

### 新增文件

1. **`backend/app/services/image_service.py`**
   - 使用 Gemini 1.5 Pro 視覺模型分析圖片
   - 優先識別營養成分表
   - 如果沒有營養成分表，則推估營養成分

2. **`backend/app/routes/upload.py`**
   - `/api/upload/image` API 端點
   - 接收圖片文件和餐點類型
   - 返回分析結果並自動保存

### API 使用方式

```bash
POST /api/upload/image
Content-Type: multipart/form-data

Parameters:
- file: 圖片文件（必需）
- meal_type: 餐點類型（breakfast/lunch/dinner/snack，默認 snack）

Response:
{
  "success": true,
  "message": "圖片分析完成並已保存",
  "data": {
    "food_name": "食物名稱",
    "serving_size": "份量",
    "calories": 200,
    "protein": 10,
    "carbs": 30,
    "fat": 5,
    "has_nutrition_label": true/false,
    "estimated": true/false,
    "meal_type": "snack",
    "diet_log_id": 123
  }
}
```

## 前端實現

### 修改的文件

1. **`frontend/src/pages/Chat.jsx`**
   - 添加圖片選擇和預覽功能
   - 添加餐點類型選擇器
   - 添加上傳處理邏輯
   - 顯示分析結果

2. **`frontend/src/components/ChatMessage.jsx`**
   - 支持顯示圖片
   - 支持顯示營養數據卡片

### 使用方式

1. 在對話界面點擊圖片圖標
2. 選擇食物圖片
3. 選擇餐點類型（早餐/午餐/晚餐/點心）
4. 點擊「上傳並分析」
5. 系統會自動分析並保存結果

## 依賴項

### 後端新增依賴
- `Pillow==10.1.0` - 圖片處理

### 前端
- 無新增依賴（使用原生 File API）

## 注意事項

1. **圖片大小限制**：前端限制為 10MB
2. **支持的格式**：所有常見圖片格式（JPEG, PNG, GIF, WebP 等）
3. **模型選擇**：
   - 優先使用 `gemini-1.5-pro`（支持視覺）
   - 備選 `gemini-pro-vision`
   - 最後備選 `gemini-pro`
4. **營養成分表識別**：
   - 如果圖片中包含營養成分表，會優先提取表格數據
   - 如果沒有，則根據食物外觀推估
5. **錯誤處理**：
   - 如果分析失敗，會返回錯誤信息
   - 不會影響其他功能的使用

## 測試建議

1. **測試營養成分表識別**：
   - 上傳包含營養成分表的食物包裝圖片
   - 驗證是否正確提取表格數據

2. **測試推估功能**：
   - 上傳普通食物圖片（無營養成分表）
   - 驗證是否正確推估營養成分

3. **測試錯誤處理**：
   - 上傳非食物圖片
   - 上傳過大圖片
   - 驗證錯誤提示

4. **測試數據保存**：
   - 上傳圖片後檢查統計面板
   - 驗證數據是否正確保存到資料庫

## 未來改進

1. 支持批量上傳多張圖片
2. 支持圖片裁剪和編輯
3. 改進營養成分表識別準確度
4. 添加食物識別置信度評分
5. 支持手動修正分析結果

