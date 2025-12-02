function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-2xl px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-gray-900 shadow-sm'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

export default ChatMessage

