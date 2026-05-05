import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: '' })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('profiles').update({ is_active: !currentStatus }).eq('id', id)
    loadUsers()
  }

  const deleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      await supabase.from('profiles').delete().eq('id', id)
      loadUsers()
    }
  }

  const startEdit = (user: any) => {
    setEditingId(user.id)
    setEditForm({ full_name: user.full_name, role: user.role })
  }

  const saveEdit = async (id: string) => {
    await supabase.from('profiles').update({ 
      full_name: editForm.full_name, 
      role: editForm.role 
    }).eq('id', id)
    setEditingId(null)
    loadUsers()
  }

  return (
    <div>
      <div className="flex flex-between mb-6">
        <h1 className="admin-page-title" style={{ marginBottom: 0 }}>Manage Users</h1>
        <button className="btn btn-outline btn-sm" onClick={loadUsers}>Refresh</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="admin-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '800px' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Auth ID (User)</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    {editingId === u.id ? (
                      <input 
                        type="text" 
                        value={editForm.full_name} 
                        onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                        style={{ background: '#2A1018', border: '1px solid #3D1A22', color: '#fff', padding: '4px' }}
                      />
                    ) : (
                      u.full_name
                    )}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{u.auth_user_id?.substring(0, 8) || 'PIN-Only'}...</td>
                  <td>
                    {editingId === u.id ? (
                        <select 
                          value={editForm.role} 
                          onChange={e => setEditForm({...editForm, role: e.target.value})}
                          style={{ background: '#2A1018', border: '1px solid #3D1A22', color: '#fff', padding: '4px' }}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EVENT_MANAGER">EVENT_MANAGER</option>
                          <option value="COORDINATOR">COORDINATOR</option>
                          <option value="GUEST">GUEST</option>
                        </select>
                    ) : (
                      u.role
                    )}
                  </td>
                  <td>
                    <span style={{ color: u.is_active ? 'var(--color-safe)' : 'var(--color-danger)' }}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="flex" style={{ gap: '8px' }}>
                      {editingId === u.id ? (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => saveEdit(u.id)}>Save</button>
                          <button className="btn btn-sm btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn btn-sm btn-outline" onClick={() => startEdit(u)}>Edit</button>
                          <button 
                            className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-primary'}`}
                            onClick={() => toggleStatus(u.id, u.is_active)}
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-4)' }}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
