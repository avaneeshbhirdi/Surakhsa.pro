import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    setLoading(true)
    const { data } = await supabase.from('events').select('*, profiles(full_name)').order('created_at', { ascending: false })
    if (data) setEvents(data)
    setLoading(false)
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event? This will remove all associated data.')) return
    await supabase.from('events').delete().eq('id', id)
    loadEvents()
  }

  return (
    <div>
      <div className="flex flex-between mb-6">
        <h1 className="admin-page-title" style={{ marginBottom: 0 }}>Manage Events</h1>
        <button className="btn btn-outline btn-sm" onClick={loadEvents}>Refresh</button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="admin-table">
          <table>
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Admin</th>
                <th>Status</th>
                <th>Capacity</th>
                <th>PIN</th>
                <th>Date Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 'bold', color: '#fff' }}>{e.name}</td>
                  <td>{e.profiles?.full_name || 'Unknown'}</td>
                  <td>
                    <span className={`badge badge-${e.status === 'ACTIVE' ? 'safe' : e.status === 'ENDED' ? 'danger' : 'info'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td>{e.total_capacity}</td>
                  <td style={{ fontFamily: 'monospace' }}>{e.pin}</td>
                  <td>{new Date(e.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteEvent(e.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-4)' }}>No events found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
