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

  const fixMealTypes = async () => {
    try {
      const response = await api.post('/admin/fix-meal-types')
      alert(response.data.message)
      // Refresh stats after fixing
      fetchStats()
    } catch (error) {
      console.error('Error fixing meal types:', error)
      alert('修正失敗，請稍後再試')
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

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">（{getTodayDate()}）今日統計</h2>
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
            {/* BMR and TDEE */}
            {(stats.bmr || stats.tdee) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-indigo-900 mb-3">基礎代謝資訊</h3>
                <div className="space-y-2">
                  {stats.bmr && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-indigo-700">基礎代謝率 (BMR)</span>
                      <span className="text-sm font-semibold text-indigo-900">{stats.bmr} kcal</span>
                    </div>
                  )}
                  {stats.tdee && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-indigo-700">每日熱量消耗 (TDEE)</span>
                      <span className="text-sm font-semibold text-indigo-900">{stats.tdee} kcal</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">卡路里</h3>
              <div className="space-y-3">
                {/* Meals Detail */}
                {stats.meals && stats.meals.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {stats.meals.map((meal, idx) => (
                      <div key={idx} className="pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">{meal.meal_type_name}</span>
                          <span className="text-sm font-semibold text-green-600">{Math.round(meal.calories)} kcal</span>
                        </div>
                        {meal.items && meal.items.length > 0 && (
                          <div className="pl-2 space-y-0.5">
                            {meal.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="flex justify-between text-xs text-gray-600">
                                <span className="truncate flex-1">{item.food_name}</span>
                                <span className="ml-2">{Math.round(item.calories)} kcal</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mb-2">尚無飲食記錄</div>
                )}
                
                {/* Summary */}
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">總攝入</span>
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
                  {stats.vegetables !== undefined && (
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                      <span className="text-sm text-gray-600">蔬菜</span>
                      <span className="font-semibold text-green-600">{Math.round(stats.vegetables || 0)} g</span>
                    </div>
                  )}
                  {stats.recommended_vegetables && (
                    <div className="text-xs text-gray-500 mt-1">
                      建議：{stats.recommended_vegetables.toFixed(0)} g
                      {stats.vegetables && (
                        <span className={`ml-2 ${stats.vegetables >= stats.recommended_vegetables ? 'text-green-600' : 'text-orange-600'}`}>
                          ({stats.vegetables >= stats.recommended_vegetables ? '已達標' : '未達標'})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">運動</h3>
              {stats.exercises && stats.exercises.length > 0 ? (
                <div className="space-y-2">
                  {stats.exercises.map((exercise, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex justify-between items-start">
                        <span className="text-gray-700 font-medium">{exercise.exercise_type}</span>
                        <span className="text-gray-600">{exercise.calories_burned} kcal</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {exercise.duration >= 60 
                          ? `${Math.floor(exercise.duration / 60)} 小時 ${Math.round(exercise.duration % 60)} 分鐘`
                          : `${Math.round(exercise.duration)} 分鐘`}
                      </div>
                    </div>
                  ))}
                  {stats.total_duration > 0 && (
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">總時長</span>
                        <span className="font-medium text-gray-700">
                          {stats.total_duration >= 60
                            ? `${Math.floor(stats.total_duration / 60)} 小時 ${Math.round(stats.total_duration % 60)} 分鐘`
                            : `${Math.round(stats.total_duration)} 分鐘`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">尚無運動記錄</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">無數據</div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <Link
          to="/reports"
          className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          查看完整報告
        </Link>
        <button
          onClick={fixMealTypes}
          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
          title="修正今日餐點類型（如果顯示錯誤）"
        >
          修正餐點類型
        </button>
      </div>
    </div>
  )
}

export default StatsPanel


