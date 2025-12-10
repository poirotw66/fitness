import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function StatsPanel() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await api.get('/stats/today')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (collapsed) {
    return (
      <div className="w-12 bg-white border-l border-gray-200 flex items-center justify-center">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">今日統計</h2>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500">載入中...</div>
        ) : stats ? (
          <>
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">卡路里</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">攝入</span>
                  <span className="font-semibold text-green-600">{stats.calories_in || 0} kcal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">消耗</span>
                  <span className="font-semibold text-red-600">{stats.calories_out || 0} kcal</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">淨值</span>
                  <span className={`font-semibold ${(stats.calories_in || 0) - (stats.calories_out || 0) >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                    {(stats.calories_in || 0) - (stats.calories_out || 0)} kcal
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">營養成分</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">蛋白質</span>
                  <span className="font-semibold">{stats.protein || 0} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">碳水化合物</span>
                  <span className="font-semibold">{stats.carbs || 0} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">脂肪</span>
                  <span className="font-semibold">{stats.fat || 0} g</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">運動</h3>
              <div className="text-sm text-gray-600">
                {stats.exercise_count || 0} 次運動
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">無數據</div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <Link
          to="/reports"
          className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          查看完整報告
        </Link>
      </div>
    </div>
  )
}

export default StatsPanel


