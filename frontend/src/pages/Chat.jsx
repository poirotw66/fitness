import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import ChatMessage from '../components/ChatMessage'
import StatsPanel from '../components/StatsPanel'
import api from '../services/api'

function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [mealType, setMealType] = useState('snack')
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // For SSE streaming
      const token = useAuthStore.getState().token
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ message: input }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = { role: 'assistant', content: '' }

      setMessages((prev) => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantMessage.content += parsed.content
                setMessages((prev) => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = { ...assistantMessage }
                  return newMessages
                })
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '抱歉，發生錯誤。請稍後再試。' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('圖片大小不能超過 10MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage({
          file,
          preview: reader.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async () => {
    if (!selectedImage) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedImage.file)
      formData.append('meal_type', mealType)

      const token = useAuthStore.getState().token
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        // Add user message with image
        setMessages((prev) => [
          ...prev,
          {
            role: 'user',
            content: `上傳了食物圖片：${result.data.food_name}`,
            image: selectedImage.preview,
          }
        ])

        // Add assistant response
        const data = result.data
        const responseText = `✅ 圖片分析完成！

**食物名稱**：${data.food_name}
**份量**：${data.serving_size || '未指定'}
**卡路里**：${data.calories} kcal
**蛋白質**：${data.protein} g
**碳水化合物**：${data.carbs} g
**脂肪**：${data.fat} g

${data.has_nutrition_label ? '📋 已識別營養成分表' : '🔍 已推估營養成分'}
${data.estimated ? '(此為推估值，建議參考實際營養標籤)' : ''}

已自動記錄為${mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : mealType === 'dinner' ? '晚餐' : '點心'}！`

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: responseText,
            nutritionData: data,
          }
        ])

        // Refresh stats panel
        // The stats will be updated automatically on next refresh

        // Clear selection
        setSelectedImage(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        alert(`上傳失敗：${result.message || '未知錯誤'}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('上傳圖片時發生錯誤，請稍後再試')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">身體管控 AI 助手</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">歡迎，{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              登出
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg">開始與 AI 助手對話吧！</p>
              <p className="text-sm mt-2">您可以記錄飲食、運動，或詢問健康相關問題</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          {/* Image Preview */}
          {selectedImage && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-4">
                <img
                  src={selectedImage.preview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      選擇餐點類型
                    </label>
                    <select
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="breakfast">早餐</option>
                      <option value="lunch">午餐</option>
                      <option value="dinner">晚餐</option>
                      <option value="snack">點心</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleImageUpload}
                      disabled={uploading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {uploading ? '分析中...' : '上傳並分析'}
                    </button>
                    <button
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 text-sm"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-4">
            <div className="flex-1 flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center gap-2"
                title="上傳食物圖片"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="輸入訊息..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading || uploading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || uploading || !input.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              發送
            </button>
          </form>
        </div>
      </div>

      {/* Stats Panel */}
      <StatsPanel />
    </div>
  )
}

export default Chat

