import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import ChatMessage from '../components/ChatMessage'
import StatsPanel from '../components/StatsPanel'
import ConversationHistory from '../components/ConversationHistory'
import api from '../services/api'

function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [mealType, setMealType] = useState('snack')
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [exerciseType, setExerciseType] = useState('壁球')
  const [customExerciseType, setCustomExerciseType] = useState('')
  const [exerciseDuration, setExerciseDuration] = useState('')
  const [exerciseIntensity, setExerciseIntensity] = useState('moderate')
  const [submittingExercise, setSubmittingExercise] = useState(false)
  const [availableExerciseTypes, setAvailableExerciseTypes] = useState(['羽毛球', '壁球'])
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

  // Load conversation history on mount
  useEffect(() => {
    const loadOnMount = async () => {
      try {
        // Try to load last conversation from localStorage first
        const lastConversationId = localStorage.getItem('lastConversationId')
        if (lastConversationId) {
          try {
            await loadConversation(parseInt(lastConversationId))
            return
          } catch (e) {
            // If loading fails, try to load latest
            console.log('Failed to load last conversation, loading latest')
          }
        }
        
        // Load the most recent conversation
        await loadConversationHistory()
      } catch (error) {
        console.error('Error loading conversation on mount:', error)
      }
    }
    
    loadOnMount()
    
    // Load available exercise types
    const loadExerciseTypes = async () => {
      try {
        const response = await api.get('/exercise/types')
        if (response.data && response.data.exercise_types) {
          setAvailableExerciseTypes(response.data.exercise_types)
          if (response.data.default) {
            setExerciseType(response.data.default)
          }
        }
      } catch (error) {
        console.error('Error loading exercise types:', error)
      }
    }
    loadExerciseTypes()
  }, [])

  const loadConversationHistory = async () => {
    try {
      const response = await api.get('/chat/conversations')
      if (response.data && response.data.length > 0) {
        // Load the most recent conversation
        const latestConv = response.data[0]
        await loadConversation(latestConv.id)
      }
    } catch (error) {
      console.error('Error loading conversation history:', error)
    }
  }

  const loadConversation = async (conversationId) => {
    try {
      setLoadingHistory(true)
      const response = await api.get(`/chat/conversations/${conversationId}`)
      const conv = response.data
      
      setCurrentConversationId(conv.id)
      // Save to localStorage
      localStorage.setItem('lastConversationId', conv.id.toString())
      
      // Convert messages to display format
      const formattedMessages = conv.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        created_at: msg.created_at,
        // Preserve image and nutritionData if they exist in the message
        image: msg.image,
        nutritionData: msg.nutritionData
      }))
      
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Error loading conversation:', error)
      // If conversation not found, clear localStorage and load latest
      localStorage.removeItem('lastConversationId')
      await loadConversationHistory()
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([])
    localStorage.removeItem('lastConversationId')
  }

  const handleSelectConversation = (conversationId) => {
    loadConversation(conversationId)
  }

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
        body: JSON.stringify({ 
          message: input,
          conversation_id: currentConversationId 
        }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = { role: 'assistant', content: '' }
      let receivedConversationId = null

      setMessages((prev) => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // When done, reload conversation to get all messages from database
              if (receivedConversationId) {
                setTimeout(async () => {
                  await loadConversation(receivedConversationId)
                  window.dispatchEvent(new Event('conversationUpdated'))
                }, 300)
              }
              continue
            }

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
              // Update conversation ID if provided
              if (parsed.conversation_id) {
                receivedConversationId = parsed.conversation_id
                setCurrentConversationId(receivedConversationId)
                // Save to localStorage
                localStorage.setItem('lastConversationId', receivedConversationId.toString())
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
      // Add conversation_id to formData if exists
      if (currentConversationId) {
        formData.append('conversation_id', currentConversationId.toString())
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        // Update conversation ID if provided
        if (result.conversation_id) {
          setCurrentConversationId(result.conversation_id)
          localStorage.setItem('lastConversationId', result.conversation_id.toString())
        }
        
        // Reload conversation to get all messages from database
        if (result.conversation_id) {
          setTimeout(async () => {
            await loadConversation(result.conversation_id)
            window.dispatchEvent(new Event('conversationUpdated'))
          }, 300)
        } else {
          // Fallback: add messages locally if no conversation_id
          const data = result.data
          setMessages((prev) => [
            ...prev,
            {
              role: 'user',
              content: `上傳了食物圖片：${data.food_name}`,
              image: selectedImage.preview,
            },
            {
              role: 'assistant',
              content: `✅ 圖片分析完成！\n\n食物名稱：${data.food_name}\n卡路里：${data.calories} kcal\n已自動記錄為${data.meal_type === 'breakfast' ? '早餐' : data.meal_type === 'lunch' ? '午餐' : data.meal_type === 'dinner' ? '晚餐' : '點心'}！`,
              nutritionData: data,
            }
          ])
        }

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

  const handleExerciseSubmit = async (e) => {
    e.preventDefault()
    if (!exerciseDuration || parseFloat(exerciseDuration) <= 0) {
      alert('請輸入有效的運動時間')
      return
    }

    setSubmittingExercise(true)
    try {
      const exerciseTypeToUse = exerciseType === '自訂' ? customExerciseType : exerciseType
      
      if (!exerciseTypeToUse || exerciseTypeToUse.trim() === '') {
        alert('請輸入運動項目名稱')
        return
      }

      const response = await api.post('/exercise/record', {
        exercise_type: exerciseType === '自訂' ? 'custom' : exerciseType,
        duration: parseFloat(exerciseDuration),
        intensity: exerciseIntensity,
        custom_type: exerciseType === '自訂' ? customExerciseType : null,
        conversation_id: currentConversationId
      })

      if (response.data.success) {
        // Reload conversation to get messages from database
        if (currentConversationId || response.data.conversation_id) {
          const convId = response.data.conversation_id || currentConversationId
          if (convId) {
            setCurrentConversationId(convId)
            localStorage.setItem('lastConversationId', convId.toString())
            setTimeout(async () => {
              await loadConversation(convId)
              window.dispatchEvent(new Event('conversationUpdated'))
            }, 300)
          }
        } else {
          // Fallback: add messages locally if no conversation
          const userMessage = {
            role: 'user',
            content: `記錄運動：${exerciseTypeToUse}，${exerciseDuration} 分鐘，${exerciseIntensity === 'low' ? '低強度' : exerciseIntensity === 'moderate' ? '中強度' : '高強度'}`
          }
          const assistantMessage = {
            role: 'assistant',
            content: `✅ 運動記錄已保存！\n\n運動項目：${exerciseTypeToUse}\n時長：${exerciseDuration} 分鐘\n強度：${exerciseIntensity === 'low' ? '低強度' : exerciseIntensity === 'moderate' ? '中強度' : '高強度'}\n消耗卡路里：${response.data.calories_burned} kcal`
          }
          setMessages((prev) => [...prev, userMessage, assistantMessage])
        }
        
        // Close modal and reset form
        setShowExerciseModal(false)
        setExerciseDuration('')
        setCustomExerciseType('')
        setExerciseType('壁球')
        setExerciseIntensity('moderate')
        
        // Trigger stats refresh
        window.dispatchEvent(new Event('conversationUpdated'))
      }
    } catch (error) {
      console.error('Error recording exercise:', error)
      alert(error.response?.data?.detail || '記錄運動時發生錯誤，請稍後再試')
    } finally {
      setSubmittingExercise(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Conversation History Sidebar */}
      <ConversationHistory
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">身體管控 AI 助手</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">歡迎，{user?.username}</span>
            <Link
              to="/settings"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              設定
            </Link>
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
          {loadingHistory ? (
            <div className="text-center text-gray-500 mt-20">
              <p>載入對話中...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg">開始與 AI 助手對話吧！</p>
              <p className="text-sm mt-2">您可以記錄飲食、運動，或詢問健康相關問題</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} />
            ))
          )}
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
              <button
                type="button"
                onClick={() => setShowExerciseModal(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center gap-2"
                title="記錄運動"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
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

      {/* Exercise Record Modal */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">記錄運動</h2>
              <button
                onClick={() => {
                  setShowExerciseModal(false)
                  setExerciseDuration('')
                  setCustomExerciseType('')
                  setExerciseType('壁球')
                  setExerciseIntensity('moderate')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleExerciseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  運動項目
                </label>
                <select
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submittingExercise}
                >
                  {availableExerciseTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  <option value="自訂">自訂項目</option>
                </select>
              </div>

              {exerciseType === '自訂' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    輸入運動項目名稱
                  </label>
                  <input
                    type="text"
                    value={customExerciseType}
                    onChange={(e) => setCustomExerciseType(e.target.value)}
                    placeholder="例如：桌球、排球..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={submittingExercise}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  運動時間（分鐘）
                </label>
                <input
                  type="number"
                  value={exerciseDuration}
                  onChange={(e) => setExerciseDuration(e.target.value)}
                  placeholder="例如：30"
                  min="1"
                  max="600"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submittingExercise}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  運動強度
                </label>
                <select
                  value={exerciseIntensity}
                  onChange={(e) => setExerciseIntensity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submittingExercise}
                >
                  <option value="low">低強度</option>
                  <option value="moderate">中強度</option>
                  <option value="high">高強度</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {exerciseIntensity === 'low' && '輕鬆的運動，例如：慢速、輕鬆對打'}
                  {exerciseIntensity === 'moderate' && '中等強度，例如：正常速度、一般對打'}
                  {exerciseIntensity === 'high' && '高強度，例如：快速、激烈對打'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowExerciseModal(false)
                    setExerciseDuration('')
                    setCustomExerciseType('')
                    setExerciseType('壁球')
                    setExerciseIntensity('moderate')
                  }}
                  disabled={submittingExercise}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submittingExercise || !exerciseDuration}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingExercise ? '記錄中...' : '記錄運動'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat

