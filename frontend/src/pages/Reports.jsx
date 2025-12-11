import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import ReactMarkdown from 'react-markdown'
import api from '../services/api'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

function Reports() {
  const [reports, setReports] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchReports()
  }, [selectedDate])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/reports?date=${selectedDate}`)
      setReports(response.data)
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async () => {
    try {
      setGenerating(true)
      const response = await api.post(`/reports/generate?date=${selectedDate}`)
      if (response.data.success) {
        // Refresh reports to show the new AI report
        await fetchReports()
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('生成報告失敗，請稍後再試')
    } finally {
      setGenerating(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const chartData = reports.length > 0 ? [
    { name: '蛋白質', value: reports[0].protein || 0 },
    { name: '碳水化合物', value: reports[0].carbs || 0 },
    { name: '脂肪', value: reports[0].fat || 0 },
  ] : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">健康報告</h1>
        <div className="flex items-center gap-4">
          <Link
            to="/chat"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            返回對話
          </Link>
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Date Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            選擇日期
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20">載入中...</div>
        ) : reports.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <p>該日期尚無報告</p>
            <Link
              to="/chat"
              className="text-indigo-600 hover:text-indigo-800 mt-4 inline-block"
            >
              開始記錄飲食和運動
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* BMR and TDEE Info */}
            {(reports[0].bmr || reports[0].tdee) && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-indigo-900 mb-4">基礎代謝資訊</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reports[0].bmr && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">基礎代謝率 (BMR)</p>
                          <p className="text-2xl font-bold text-indigo-600 mt-1">{reports[0].bmr} kcal</p>
                          <p className="text-xs text-gray-500 mt-1">維持基本生理功能所需熱量</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  {reports[0].tdee && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">每日熱量消耗 (TDEE)</p>
                          <p className="text-2xl font-bold text-purple-600 mt-1">{reports[0].tdee} kcal</p>
                          <p className="text-xs text-gray-500 mt-1">包含活動的總熱量消耗</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">總攝入</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {reports[0].calories_in || 0} kcal
                </p>
                {reports[0].tdee && (
                  <p className="text-xs text-gray-500 mt-1">
                    {reports[0].calories_in > reports[0].tdee ? '超過目標' : '低於目標'} {Math.abs(reports[0].calories_in - reports[0].tdee).toFixed(0)} kcal
                  </p>
                )}
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">總消耗</h3>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {reports[0].calories_out || 0} kcal
                </p>
                {reports[0].total_duration > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {reports[0].total_duration >= 60 
                      ? `${Math.floor(reports[0].total_duration / 60)} 小時 ${Math.round(reports[0].total_duration % 60)} 分鐘`
                      : `${Math.round(reports[0].total_duration)} 分鐘`}
                  </p>
                )}
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">淨卡路里</h3>
                <p className="text-2xl font-bold text-indigo-600 mt-2">
                  {(reports[0].calories_in || 0) - (reports[0].calories_out || 0)} kcal
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {((reports[0].calories_in || 0) - (reports[0].calories_out || 0)) > 0 ? '攝入大於消耗' : '消耗大於攝入'}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">運動次數</h3>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {reports[0].exercise_count || 0} 次
                </p>
                {reports[0].exercises && reports[0].exercises.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {reports[0].exercises.length} 項運動
                  </p>
                )}
              </div>
            </div>


            {/* Nutrition and Exercise Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Nutrition Charts */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">營養成分分析</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-3">營養成分分布</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-3">營養成分詳情</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-700 font-medium">蛋白質</span>
                            <span className="text-sm font-semibold text-blue-600">{reports[0].protein || 0} g</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full transition-all"
                              style={{ width: `${reports[0].recommended_protein ? Math.min(((reports[0].protein || 0) / reports[0].recommended_protein) * 100, 100) : Math.min(((reports[0].protein || 0) / 150) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            建議每日攝取：{reports[0].recommended_protein ? `${reports[0].recommended_protein.toFixed(1)} g` : '150g（預設）'}
                            {reports[0].recommended_protein && reports[0].protein && (
                              <span className={`ml-2 ${reports[0].protein >= reports[0].recommended_protein ? 'text-green-600' : 'text-orange-600'}`}>
                                ({reports[0].protein >= reports[0].recommended_protein ? '已達標' : '未達標'})
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-700 font-medium">碳水化合物</span>
                            <span className="text-sm font-semibold text-green-600">{reports[0].carbs || 0} g</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-green-600 h-2.5 rounded-full transition-all"
                              style={{ width: `${reports[0].recommended_carbs ? Math.min(((reports[0].carbs || 0) / reports[0].recommended_carbs) * 100, 100) : Math.min(((reports[0].carbs || 0) / 300) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            建議每日攝取：{reports[0].recommended_carbs ? `${reports[0].recommended_carbs.toFixed(1)} g` : '300g（預設）'}
                            {reports[0].recommended_carbs && reports[0].carbs && (
                              <span className={`ml-2 ${reports[0].carbs >= reports[0].recommended_carbs ? 'text-green-600' : 'text-orange-600'}`}>
                                ({reports[0].carbs >= reports[0].recommended_carbs ? '已達標' : '未達標'})
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-700 font-medium">脂肪</span>
                            <span className="text-sm font-semibold text-yellow-600">{reports[0].fat || 0} g</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-yellow-600 h-2.5 rounded-full transition-all"
                              style={{ width: `${reports[0].recommended_fat ? Math.min(((reports[0].fat || 0) / reports[0].recommended_fat) * 100, 100) : Math.min(((reports[0].fat || 0) / 100) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            建議每日攝取：{reports[0].recommended_fat ? `${reports[0].recommended_fat.toFixed(1)} g` : '100g（預設）'}
                            {reports[0].recommended_fat && reports[0].fat && (
                              <span className={`ml-2 ${reports[0].fat >= reports[0].recommended_fat ? 'text-green-600' : 'text-orange-600'}`}>
                                ({reports[0].fat >= reports[0].recommended_fat ? '已達標' : '未達標'})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exercise Summary Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">運動總覽</h3>
                {reports[0].exercises && reports[0].exercises.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200">
                      <p className="text-3xl font-bold text-red-600">{Math.round(reports[0].calories_out || 0)}</p>
                      <p className="text-sm text-gray-600 mt-1">總消耗卡路里</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">運動次數</span>
                        <span className="font-semibold">{reports[0].exercise_count || 0} 次</span>
                      </div>
                      {reports[0].total_duration > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">總時長</span>
                          <span className="font-semibold">
                            {reports[0].total_duration >= 60 
                              ? `${Math.floor(reports[0].total_duration / 60)} 小時 ${Math.round(reports[0].total_duration % 60)} 分鐘`
                              : `${Math.round(reports[0].total_duration)} 分鐘`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-2">運動項目列表</p>
                      <div className="space-y-2">
                        {reports[0].exercises.map((exercise, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                            <span className="text-gray-700">{exercise.exercise_type}</span>
                            <span className="text-red-600 font-medium">{Math.round(exercise.calories_burned)} kcal</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-sm">尚無運動記錄</p>
                  </div>
                )}
              </div>
            </div>

            {/* Report Content */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">AI 生成報告</h3>
                {reports[0].has_ai_report ? (
                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {generating ? '重新生成中...' : '重新生成報告'}
                  </button>
                ) : (
                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? '生成中...' : '立即生成報告'}
                  </button>
                )}
              </div>
              {reports[0].report_content ? (
                <div className="prose prose-sm sm:prose-base max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 pb-2 border-b border-gray-200" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-semibold text-gray-900 mt-5 mb-3" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-base font-semibold text-gray-800 mt-3 mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="text-gray-700 mb-3 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700" {...props} />,
                      li: ({node, ...props}) => <li className="ml-4 mb-1" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-6 border-gray-300" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-600 my-4" {...props} />,
                    }}
                  >
                    {reports[0].report_content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p className="mb-4">尚未生成 AI 報告</p>
                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generating ? '生成中...' : '立即生成報告'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Reports


