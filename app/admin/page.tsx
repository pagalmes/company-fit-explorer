'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '../../src/lib/supabase'
import { useRouter } from 'next/navigation'
import AuthWrapper from '../../src/components/AuthWrapper'
import { Users, Plus, Upload, LogOut, Settings, Database, Trash2 } from 'lucide-react'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.users)
      } else {
        setMessage(data.error)
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to fetch users')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteName
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Invitation sent! Share this link: ${data.inviteLink}`)
        setMessageType('success')
        setInviteEmail('')
        setInviteName('')
        fetchUsers()
      } else {
        setMessage(data.error)
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to send invitation')
      setMessageType('error')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleImportData = async (userId: string) => {
    // For now, we'll use the existing JSON data from your current app
    // In a real scenario, you'd have a file upload or data import form
    const sampleData = {
      userProfile: {
        id: "user-1",
        name: "Demo User",
        targetRole: "Software Engineer",
        mustHaves: ["Remote work", "Good work-life balance", "Competitive salary"],
        wantToHave: ["Startup environment", "Learning opportunities"],
        experience: ["React", "TypeScript", "Node.js"],
        targetCompanies: "Tech startups and established companies"
      },
      companies: [
        {
          id: 1,
          name: "Example Corp",
          industry: "Technology",
          stage: "Late Stage",
          matchScore: 85,
          location: "San Francisco, CA",
          employees: "500-1000",
          remote: "Remote-Friendly",
          openRoles: 5,
          connections: [],
          connectionTypes: {},
          matchReasons: ["Great culture", "Competitive salary", "Remote work"],
          color: "#10B981",
          logo: "https://ui-avatars.com/api/?name=Example+Corp&background=10B981&color=fff"
        }
      ]
    }

    try {
      const response = await fetch('/api/admin/import-user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userData: sampleData
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Sample data imported successfully!')
        setMessageType('success')
        fetchUsers()
      } else {
        setMessage(data.error)
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to import data')
      setMessageType('error')
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('User deleted successfully!')
        setMessageType('success')
        fetchUsers()
      } else {
        setMessage(data.error || 'Failed to delete user')
        setMessageType('error')
      }
    } catch (error) {
      setMessage('Failed to delete user')
      setMessageType('error')
    }
  }

  return (
    <AuthWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/60 backdrop-blur-sm shadow-sm border-b border-blue-200/40">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
                  <p className="text-slate-600 mt-1">Manage users and system configuration</p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-white/60 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg border ${
              messageType === 'success' 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Invite User */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/40 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Plus className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-900">Invite New User</h2>
            </div>
            
            <form onSubmit={handleInviteUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                required
              />
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full name"
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
                required
              />
              <button
                type="submit"
                disabled={inviteLoading}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/40 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-900">Users</h2>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Data Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user: any) => (
                      <tr key={user.id} className="border-b border-slate-100 hover:bg-white/40">
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">{user.full_name || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {user.user_company_data && user.user_company_data.length > 0 ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              Has Data
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                              No Data
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {user.role !== 'admin' && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleImportData(user.id)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="Import Sample Data"
                              >
                                <Database className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {users.length === 0 && (
                  <div className="text-center py-8 text-slate-600">
                    No users found. Start by inviting your first user!
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthWrapper>
  )
}