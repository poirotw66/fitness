function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl px-4 py-3 rounded-lg ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-900 shadow-sm'
        }`}
      >
        {/* Show image if present */}
        {message.image && (
          <div className="mb-2">
            <img
              src={message.image}
              alt="Uploaded food"
              className="max-w-xs rounded-lg"
            />
          </div>
        )}
        
        {/* Show nutrition data if present */}
        {message.nutritionData && (
          <div className={`mb-3 p-3 rounded-lg ${
            isUser ? 'bg-indigo-700' : 'bg-gray-50'
          }`}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className={isUser ? 'text-indigo-200' : 'text-gray-600'}>卡路里</span>
                <span className={`block font-semibold ${isUser ? 'text-white' : 'text-gray-900'}`}>
                  {message.nutritionData.calories} kcal
                </span>
              </div>
              <div>
                <span className={isUser ? 'text-indigo-200' : 'text-gray-600'}>蛋白質</span>
                <span className={`block font-semibold ${isUser ? 'text-white' : 'text-gray-900'}`}>
                  {message.nutritionData.protein} g
                </span>
              </div>
              <div>
                <span className={isUser ? 'text-indigo-200' : 'text-gray-600'}>碳水化合物</span>
                <span className={`block font-semibold ${isUser ? 'text-white' : 'text-gray-900'}`}>
                  {message.nutritionData.carbs} g
                </span>
              </div>
              <div>
                <span className={isUser ? 'text-indigo-200' : 'text-gray-600'}>脂肪</span>
                <span className={`block font-semibold ${isUser ? 'text-white' : 'text-gray-900'}`}>
                  {message.nutritionData.fat} g
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className={`whitespace-pre-wrap ${isUser ? 'text-white' : 'text-gray-900'}`}>
          {message.content.split('\n').map((line, index) => {
            // Format lines that look like "標籤：值"
            if (line.includes('：') && !line.startsWith('✅') && !line.startsWith('📋') && !line.startsWith('🔍') && !line.startsWith('(')) {
              const [label, ...valueParts] = line.split('：')
              const value = valueParts.join('：')
              return (
                <div key={index} className="mb-1">
                  <span className={isUser ? 'text-indigo-200' : 'text-gray-600 font-medium'}>{label}：</span>
                  <span className={isUser ? 'text-white' : 'text-gray-900'}>{value}</span>
                </div>
              )
            }
            // Format success/status messages
            if (line.startsWith('✅') || line.startsWith('📋') || line.startsWith('🔍')) {
              return (
                <div key={index} className={`mb-2 ${isUser ? 'text-white' : 'text-gray-700'}`}>
                  {line}
                </div>
              )
            }
            // Format note lines (in parentheses)
            if (line.startsWith('(') && line.endsWith(')')) {
              return (
                <div key={index} className={`text-sm mb-2 ${isUser ? 'text-indigo-200' : 'text-gray-500'}`}>
                  {line}
                </div>
              )
            }
            // Empty lines
            if (line.trim() === '') {
              return <div key={index} className="h-2" />
            }
            // Regular lines
            return (
              <div key={index} className={isUser ? 'text-white' : 'text-gray-900'}>
                {line}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage


