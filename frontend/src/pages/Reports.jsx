import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">總攝入</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {reports[0].calories_in || 0} kcal
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">總消耗</h3>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {reports[0].calories_out || 0} kcal
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">淨卡路里</h3>
                <p className="text-2xl font-bold text-indigo-600 mt-2">
                  {(reports[0].calories_in || 0) - (reports[0].calories_out || 0)} kcal
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">運動次數</h3>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {reports[0].exercise_count || 0} 次
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">營養成分分布</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
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

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">營養成分詳情</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">蛋白質</span>
                      <span className="text-sm font-semibold">{reports[0].protein || 0} g</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(((reports[0].protein || 0) / 150) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">碳水化合物</span>
                      <span className="text-sm font-semibold">{reports[0].carbs || 0} g</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${Math.min(((reports[0].carbs || 0) / 300) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">脂肪</span>
                      <span className="text-sm font-semibold">{reports[0].fat || 0} g</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{ width: `${Math.min(((reports[0].fat || 0) / 100) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
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
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {reports[0].report_content}
                  </p>
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


