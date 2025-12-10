import { useState, useEffect } from 'react'
import api from '../services/api'

function ConversationHistory({ currentConversationId, onSelectConversation, onNewConversation }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetchConversations()
    
    // Listen for conversation updates
    const handleUpdate = () => {
      fetchConversations()
    }
    window.addEventListener('conversationUpdated', handleUpdate)
    
    return () => {
      window.removeEventListener('conversationUpdated', handleUpdate)
    }
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/chat/conversations')
      console.log('Conversations response:', response.data)
      if (response.data && Array.isArray(response.data)) {
        setConversations(response.data)
      } else {
        console.warn('Unexpected response format:', response.data)
        setConversations([])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      console.error('Error details:', error.response?.data)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return '今天'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天'
    } else {
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
    }
  }

  if (collapsed) {
    return (
      <div className="w-12 bg-white border-r border-gray-200 flex items-center justify-center">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded"
          title="展開對話歷史"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">對話歷史</h2>
        <div className="flex gap-2">
          <button
            onClick={onNewConversation}
            className="p-1 hover:bg-gray-100 rounded"
            title="新對話"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-gray-100 rounded"
            title="收起"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500 text-sm">載入中...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">尚無對話記錄</div>
        ) : (
          <div className="p-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-3 rounded-lg mb-1 hover:bg-gray-100 transition-colors ${
                  currentConversationId === conv.id ? 'bg-indigo-50 border border-indigo-200' : ''
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">{formatDate(conv.date)}</div>
                <div className="text-sm text-gray-900 truncate">
                  {conv.preview || '新對話'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ConversationHistory

