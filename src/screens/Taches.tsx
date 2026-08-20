import { useState } from 'react'
import { Plus, X, MessageSquare, Paperclip, Calendar } from 'lucide-react'

const CATEGORIES = [
  'Projet de digitalisation', 'Tâches administratives', 'Recrutement', 'Onboarding', 'Offboarding'
]

type Status = 'todo' | 'inprogress' | 'done'

interface Task {
  id: number
  title: string
  desc: string
  date: string
  avatar: string
  comments: number
  attachments: number
}

const INITIAL_TASKS: Record<Status, Task[]> = {
  todo: [
    { id: 1, title: 'Mettre à jour le règlement intérieur', desc: 'Révision annuelle du règlement', date: '30 juil 2026', avatar: 'SA', comments: 2, attachments: 1 },
    { id: 2, title: 'Préparer les contrats CDD', desc: 'Contrats pour les 3 nouvelles recrues', date: '1 août 2026', avatar: 'RE', comments: 0, attachments: 2 },
    { id: 3, title: 'Organiser la session de formation', desc: 'Formation sécurité données — 50 participants', date: '28 juil 2026', avatar: 'NB', comments: 5, attachments: 0 },
  ],
  inprogress: [
    { id: 4, title: 'Déploiement module Congés', desc: 'Migration vers la nouvelle version', date: '25 juil 2026', avatar: 'YB', comments: 8, attachments: 3 },
    { id: 5, title: 'Entretiens candidats — Chef projet IT', desc: 'Planifier les entretiens physiques', date: '27 juil 2026', avatar: 'RE', comments: 3, attachments: 1 },
  ],
  done: [
    { id: 6, title: 'Publication des offres d\'emploi', desc: 'LinkedIn, site carrière et Rekrute.ma', date: '20 juil 2026', avatar: 'SA', comments: 1, attachments: 0 },
    { id: 7, title: 'Onboarding Fatima Ouali', desc: 'Accueil et configuration poste de travail', date: '18 juil 2026', avatar: 'NB', comments: 4, attachments: 2 },
  ],
}

const COLUMN_STYLES: Record<Status, { label: string; color: string; bg: string }> = {
  todo:       { label: 'À faire', color: '#6366F1', bg: '#EEF2FF' },
  inprogress: { label: 'En cours', color: '#F59E0B', bg: '#FEF3C7' },
  done:       { label: 'Terminé', color: '#10B981', bg: '#D1FAE5' },
}

export default function Taches() {
  const [category, setCategory] = useState(CATEGORIES[0])
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [showModal, setShowModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', status: 'todo' as Status, desc: '' })

  const addTask = () => {
    if (!newTask.title.trim()) return
    const task: Task = {
      id: Date.now(),
      title: newTask.title,
      desc: newTask.desc,
      date: new Date().toLocaleDateString('fr-MA', { day: 'numeric', month: 'short', year: 'numeric' }),
      avatar: 'SA',
      comments: 0,
      attachments: 0,
    }
    setTasks(prev => ({ ...prev, [newTask.status]: [...prev[newTask.status], task] }))
    setShowModal(false)
    setNewTask({ title: '', status: 'todo', desc: '' })
  }

  const removeTask = (status: Status, id: number) => {
    setTasks(prev => ({ ...prev, [status]: prev[status].filter(t => t.id !== id) }))
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tâches</h1>
        <button onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" style={{ background: '#000000' }}>
          + Nouvelle tâche
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className="px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={{
              background: category === cat ? '#000000' : '#fff',
              color: category === cat ? '#fff' : '#6B7280',
              border: `1px solid ${category === cat ? '#000000' : '#E5E7EB'}`,
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-3 gap-5">
        {(Object.keys(COLUMN_STYLES) as Status[]).map(status => {
          const col = COLUMN_STYLES[status]
          const colTasks = tasks[status]
          return (
            <div key={status}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{col.label}</span>
                  <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: col.bg, color: col.color }}>{colTasks.length}</span>
                </div>
                <button onClick={() => { setNewTask(n => ({ ...n, status })); setShowModal(true) }}
                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100">
                  <Plus size={13} style={{ color: '#9CA3AF' }} />
                </button>
              </div>
              <div className="space-y-3 min-h-32">
                {colTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-all group cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-gray-900 leading-tight">{task.title}</h4>
                      <button onClick={() => removeTask(status, task.id)}
                        className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 flex-shrink-0">
                        <X size={10} style={{ color: '#9CA3AF' }} />
                      </button>
                    </div>
                    {task.desc && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{task.desc}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={11} /> {task.date}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.comments > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MessageSquare size={11} /> {task.comments}
                          </div>
                        )}
                        {task.attachments > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Paperclip size={11} /> {task.attachments}
                          </div>
                        )}
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: '#000000' }}>{task.avatar}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Nouvelle tâche</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nom de la tâche</label>
                <input value={newTask.title} onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))}
                  placeholder="Ex : Préparer les contrats..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Statut</label>
                <select value={newTask.status} onChange={e => setNewTask(n => ({ ...n, status: e.target.value as Status }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none">
                  <option value="todo">À faire</option>
                  <option value="inprogress">En cours</option>
                  <option value="done">Terminé</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea value={newTask.desc} onChange={e => setNewTask(n => ({ ...n, desc: e.target.value }))}
                  rows={3} placeholder="Détails de la tâche..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">Annuler</button>
              <button onClick={addTask} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: '#000000' }}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
