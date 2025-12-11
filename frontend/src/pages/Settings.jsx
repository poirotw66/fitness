import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../context/authStore'
import api from '../services/api'

function Settings() {
  const [settings, setSettings] = useState({
    gender: '',
    height: '',
    weight: '',
    age: '',
    activity_level: '',
  })
  const [calculated, setCalculated] = useState({
    bmr: null,
    tdee: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings')
      setSettings({
        gender: response.data.gender || '',
        height: response.data.height || '',
        weight: response.data.weight || '',
        age: response.data.age || '',
        activity_level: response.data.activity_level || '',
      })
      setCalculated({
        bmr: response.data.bmr,
        tdee: response.data.tdee,
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const response = await api.put('/settings', settings)
      setCalculated({
        bmr: response.data.bmr,
        tdee: response.data.tdee,
      })
      alert('設定已儲存')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const activityLevelOptions = [
    { value: 'sedentary', label: '低活動量（久坐族）', description: '幾乎都坐著、沒有規律運動', factor: '× 1.2' },
    { value: 'light', label: '中活動量（一般活動者）', description: '一週運動 1–3 次，或工作中會走動', factor: '× 1.375' },
    { value: 'moderate', label: '高活動量（運動量大）', description: '一週運動 3–6 次，或工作體力活較多', factor: '× 1.55' },
    { value: 'very_active', label: '非常高活動量（重訓者、體力職業）', description: '每天高強度訓練', factor: '× 1.725' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-gray-900">設定</h1>
        <div className="flex items-center gap-4">
          <Link
            to="/chat"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            返回對話
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            登出
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              性別
            </label>
            <select
              name="gender"
              value={settings.gender}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">請選擇</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              身高 (cm)
            </label>
            <input
              type="number"
              name="height"
              value={settings.height}
              onChange={handleChange}
              min="0"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例如：170"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              體重 (kg)
            </label>
            <input
              type="number"
              name="weight"
              value={settings.weight}
              onChange={handleChange}
              min="0"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例如：70"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年齡
            </label>
            <input
              type="number"
              name="age"
              value={settings.age}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例如：30"
            />
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              活動度
            </label>
            <div className="space-y-2">
              {activityLevelOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    settings.activity_level === option.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="activity_level"
                    value={option.value}
                    checked={settings.activity_level === option.value}
                    onChange={handleChange}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.factor}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* BMR and TDEE Display */}
          {(calculated.bmr || calculated.tdee) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-indigo-900 mb-4">計算結果</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-indigo-700 mb-1">基礎代謝率 (BMR)</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    {calculated.bmr ? `${calculated.bmr.toFixed(2)} kcal` : '-'}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1">
                    使用 Mifflin-St Jeor 公式計算
                  </div>
                </div>
                <div>
                  <div className="text-sm text-indigo-700 mb-1">每日熱量消耗 (TDEE)</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    {calculated.tdee ? `${calculated.tdee.toFixed(2)} kcal` : '-'}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1">
                    BMR × 活動係數
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '儲存中...' : '儲存設定'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Settings

