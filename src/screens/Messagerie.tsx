import { useState } from 'react'
import { Send, Smile, Paperclip, Search, Plus, X } from 'lucide-react'

const CONVERSATIONS = [
  { id: 'equipe-it', name: "Équipe IT", isGroup: true, lastMsg: "Rachid : Réunion à 14h demain", time: "12:34", unread: 3, avatars: ['RE', 'AI', 'YB'] },
  { id: 'rachid', name: "Rachid El Amri", isGroup: false, lastMsg: "Bien reçu, merci !", time: "11:20", unread: 0, avatar: 'RE' },
  { id: 'nadia', name: "Nadia Bensouda", isGroup: false, lastMsg: "Tu peux m'envoyer le fichier ?", time: "10:05", unread: 1, avatar: 'NB' },
  { id: 'rh', name: "RH & Administration", isGroup: true, lastMsg: "Sarah : Le planning est publié 🎉", time: "Hier", unread: 0, avatars: ['SA', 'RE', 'KB'] },
  { id: 'amine', name: "Amine Idrissi", isGroup: false, lastMsg: "On se voit demain pour le deploy ?", time: "Hier", unread: 0, avatar: 'AI' },
]

const MESSAGES: Record<string, { sender: string; text: string; time: string; isMe: boolean }[]> = {
  'equipe-it': [
    { sender: 'Rachid El Amri', text: "Bonjour l'équipe ! Réunion de sprint demain à 14h.", time: "09:15", isMe: false },
    { sender: 'Amine Idrissi', text: "OK pour moi ! On fait ça en salle Casablanca ?", time: "09:22", isMe: false },
    { sender: 'Youssef', text: "Parfait, je serai là. Est-ce qu'on peut aussi parler du déploiement ?", time: "09:31", isMe: true },
    { sender: 'Rachid El Amri', text: "Bien sûr, ajouté à l'ordre du jour 📋", time: "09:45", isMe: false },
    { sender: 'Nadia Bensouda', text: "Je rejoins en remote, je vous envoie le lien Meet.", time: "10:02", isMe: false },
    { sender: 'Youssef', text: "Super, merci Nadia 👍", time: "10:05", isMe: true },
    { sender: 'Rachid El Amri', text: "Réunion à 14h demain, tout le monde est confirmé ✅", time: "12:34", isMe: false },
  ],
  'rachid': [
    { sender: 'Rachid', text: "Youssef, tu peux me faire un point sur l'avancement du module congés ?", time: "10:15", isMe: false },
    { sender: 'Youssef', text: "Bien sûr ! Le backend est prêt, je finalise le frontend aujourd'hui.", time: "10:32", isMe: true },
    { sender: 'Rachid', text: "Excellent, merci pour la rapidité !", time: "11:20", isMe: false },
    { sender: 'Youssef', text: "Bien reçu, merci !", time: "11:25", isMe: true },
  ],
  'nadia': [
    { sender: 'Nadia', text: "Salut Youssef, tu peux m'envoyer le fichier de configuration Vite ?", time: "09:50", isMe: false },
    { sender: 'Youssef', text: "Je te l'envoie tout de suite 📎", time: "10:05", isMe: true },
  ],
}

export default function Messagerie() {
  const [activeConv, setActiveConv] = useState('equipe-it')
  const [message, setMessage] = useState('')
  const [allMessages, setAllMessages] = useState(MESSAGES)
  const [showInvite, setShowInvite] = useState(true)

  const conv = CONVERSATIONS.find(c => c.id === activeConv)!
  const msgs = allMessages[activeConv] ?? []

  const sendMsg = () => {
    if (!message.trim()) return
    setAllMessages(prev => ({
      ...prev,
      [activeConv]: [...(prev[activeConv] ?? []), {
        sender: 'Youssef', text: message.trim(), time: new Date().toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }), isMe: true
      }]
    }))
    setMessage('')
  }

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Messagerie</h2>
            <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
              <Plus size={14} style={{ color: '#6B7280' }} />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 border border-gray-200" style={{ background: '#F7F8FA' }}>
            <Search size={13} style={{ color: '#9CA3AF' }} />
            <input placeholder="Rechercher..." className="bg-transparent text-xs outline-none flex-1" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {CONVERSATIONS.map(conv => (
            <button
              key={conv.id}
              onClick={() => setActiveConv(conv.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              style={{ background: activeConv === conv.id ? '#F0F4FF' : undefined }}
            >
              <div className="relative flex-shrink-0">
                {conv.isGroup ? (
                  <div className="relative w-9 h-9">
                    <div className="absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: '#0F1E3D', top: 0, left: 0 }}>{conv.avatars![0]}</div>
                    <div className="absolute w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white border border-white"
                      style={{ background: '#C9A227', top: 5, left: 8 }}>{conv.avatars![1]}</div>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: '#0F1E3D' }}>{conv.avatar}</div>
                )}
                {conv.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                    style={{ background: '#EF4444', fontSize: 9 }}>{conv.unread}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900 truncate">{conv.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{conv.time}</span>
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMsg}</div>
              </div>
            </button>
          ))}
          <div className="px-4 py-3">
            <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">+ 50 autres personnes</button>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#0F1E3D' }}>{conv.isGroup ? conv.avatars![0] : conv.avatar}</div>
          <div>
            <div className="font-semibold text-sm text-gray-900">{conv.name}</div>
            <div className="text-xs text-gray-400">{conv.isGroup ? '5 participants · En ligne' : 'En ligne'}</div>
          </div>
        </div>

        {/* Invite notification */}
        {showInvite && activeConv === 'equipe-it' && (
          <div className="mx-5 mt-4 flex items-center gap-3 p-3 rounded-xl border"
            style={{ background: '#F0F4FF', borderColor: '#DBEAFE' }}>
            <span className="text-lg">👥</span>
            <div className="flex-1 text-xs" style={{ color: '#1E40AF' }}>
              <strong>Rachid El Amri</strong> vous invite à rejoindre le groupe <strong>Équipe IT</strong>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowInvite(false)} className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
                style={{ background: '#3B82F6', color: '#fff' }}>Rejoindre</button>
              <button onClick={() => setShowInvite(false)} className="text-xs px-2 py-1.5 rounded-lg hover:bg-blue-50">
                <X size={12} style={{ color: '#6B7280' }} />
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {msgs.map((msg, i) => (
            <div key={i} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!msg.isMe && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ background: '#0F1E3D' }}>
                  {msg.sender.charAt(0)}
                </div>
              )}
              <div className={`max-w-xs lg:max-w-md`}>
                {!msg.isMe && (
                  <div className="text-xs text-gray-400 mb-1">{msg.sender}</div>
                )}
                <div className="px-3.5 py-2.5 rounded-2xl text-sm"
                  style={{
                    background: msg.isMe ? '#0F1E3D' : '#F3F4F6',
                    color: msg.isMe ? '#fff' : '#111827',
                    borderRadius: msg.isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}>
                  {msg.text}
                </div>
                <div className={`text-xs text-gray-400 mt-0.5 ${msg.isMe ? 'text-right' : ''}`}>{msg.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
          <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-400">
            <Paperclip size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200" style={{ background: '#F7F8FA' }}>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder="Écrivez votre message..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button className="text-gray-400 hover:text-gray-600 transition-colors"><Smile size={16} /></button>
          </div>
          <button
            onClick={sendMsg}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white transition-all hover:opacity-90"
            style={{ background: message.trim() ? '#0F1E3D' : '#E5E7EB' }}
          >
            <Send size={15} style={{ color: message.trim() ? '#fff' : '#9CA3AF' }} />
          </button>
        </div>
      </div>
    </div>
  )
}
