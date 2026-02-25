import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    UserPlus,
    Trash2,
    Shield,
    Key,
    User as UserIcon,
    UserCheck,
    AlertCircle,
    X
} from 'lucide-react'
import { User, UserRole } from '../types'

interface UserManagerProps {
    users: (User & { password?: string })[]
    onAddUser: (user: Omit<User, 'id'> & { password: string }) => void
    onDeleteUser: (id: string) => void
    currentUser: User
}

export default function UserManager({ users, onAddUser, onDeleteUser, currentUser }: UserManagerProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [newUsername, setNewUsername] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [newName, setNewName] = useState('')
    const [newRole, setNewRole] = useState<UserRole>('USER')
    const [error, setError] = useState('')

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
            setError('Todos os campos são obrigatórios')
            return
        }

        if (users.find(u => u.username.toLowerCase() === newUsername.toLowerCase())) {
            setError('Este nome de usuário já existe')
            return
        }

        onAddUser({
            username: newUsername,
            password: newPassword,
            name: newName,
            role: newRole
        })

        // Reset and close
        setNewUsername('')
        setNewPassword('')
        setNewName('')
        setNewRole('USER')
        setIsAddModalOpen(false)
    }

    return (
        <div style={{ padding: '3rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '0.5rem' }}>Gestão de Usuários</h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                        Crie e gerencie contas de acesso ao sistema.
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsAddModalOpen(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.8rem 1.8rem',
                        fontSize: '1rem',
                        fontWeight: 700,
                        borderRadius: '1rem',
                        boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                    }}
                >
                    <UserPlus size={20} /> Novo Usuário
                </button>
            </div>

            <div style={{
                background: 'white',
                borderRadius: '2rem',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--panel-shadow)',
                overflow: 'hidden'
            }} className="fade-in">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nome</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Usuário</th>
                            <th style={{ textAlign: 'left', padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Nível de Acesso</th>
                            <th style={{ textAlign: 'right', padding: '1.25rem 2rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                <td style={{ padding: '1.25rem 2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '12px',
                                            background: 'rgba(99, 102, 241, 0.1)',
                                            color: 'var(--accent-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <UserIcon size={20} />
                                        </div>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{user.name} {user.id === currentUser.id && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>(Você)</span>}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 2rem', color: '#64748b', fontWeight: 600 }}>@{user.username}</td>
                                <td style={{ padding: '1.25rem 2rem' }}>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '0.75rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        background: user.role === 'MASTER' ? 'rgba(245, 158, 11, 0.1)' : user.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.1)' : '#f1f5f9',
                                        color: user.role === 'MASTER' ? '#d97706' : user.role === 'ADMIN' ? 'var(--accent-color)' : '#64748b'
                                    }}>
                                        <Shield size={12} /> {user.role}
                                    </div>
                                </td>
                                <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                    {user.id !== currentUser.id && (
                                        <button
                                            onClick={() => onDeleteUser(user.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                padding: '0.5rem',
                                                cursor: 'pointer',
                                                borderRadius: '0.5rem',
                                                transition: 'all 0.2s'
                                            }}
                                            className="hover-bg-red"
                                            title="Excluir Usuário"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            <AnimatePresence>
                {isAddModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(15, 23, 42, 0.4)',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                background: 'white',
                                padding: '2.5rem',
                                borderRadius: '2rem',
                                maxWidth: '450px',
                                width: '90%',
                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                                border: '1px solid rgba(255,255,255,0.7)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div style={{ textAlign: 'left' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>Novo Usuário</h2>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Configure o acesso do novo colaborador.</p>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ textAlign: 'left' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Nome Completo</label>
                                    <div style={{ position: 'relative' }}>
                                        <UserIcon size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            placeholder="Ex: João Silva"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            className="modal-input"
                                            style={{ paddingLeft: '3rem', margin: 0 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ textAlign: 'left' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Nome de Usuário (Login)</label>
                                    <div style={{ position: 'relative' }}>
                                        <UserCheck size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            placeholder="Ex: joao.silva"
                                            value={newUsername}
                                            onChange={e => setNewUsername(e.target.value)}
                                            className="modal-input"
                                            style={{ paddingLeft: '3rem', margin: 0 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ textAlign: 'left' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Senha Provisória</label>
                                    <div style={{ position: 'relative' }}>
                                        <Key size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="password"
                                            placeholder="Digite a senha"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="modal-input"
                                            style={{ paddingLeft: '3rem', margin: 0 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ textAlign: 'left' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Nível de Acesso</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setNewRole('ADMIN')}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '0.75rem',
                                                border: `2px solid ${newRole === 'ADMIN' ? 'var(--accent-color)' : '#f1f5f9'}`,
                                                background: newRole === 'ADMIN' ? 'rgba(99, 102, 241, 0.05)' : 'white',
                                                color: newRole === 'ADMIN' ? 'var(--accent-color)' : '#64748b',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Administrador
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewRole('USER')}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '0.75rem',
                                                border: `2px solid ${newRole === 'USER' ? 'var(--accent-color)' : '#f1f5f9'}`,
                                                background: newRole === 'USER' ? 'rgba(99, 102, 241, 0.05)' : 'white',
                                                color: newRole === 'USER' ? 'var(--accent-color)' : '#64748b',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            Operador
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        padding: '0.75rem',
                                        borderRadius: '0.75rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}>
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{
                                        marginTop: '1rem',
                                        height: '50px',
                                        fontSize: '1rem',
                                        fontWeight: 800,
                                        borderRadius: '1rem',
                                        boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                                    }}
                                >
                                    Criar Conta
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .modal-input {
                    width: 100%;
                    height: 48px;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.75rem;
                    padding: 0 1rem;
                    font-size: 0.95rem;
                    background: #f8fafc;
                    transition: border-color 0.2s;
                }
                .modal-input:focus {
                    outline: none;
                    border-color: var(--accent-color);
                    background: white;
                }
                .hover-bg-red:hover {
                    background: rgba(239, 68, 68, 0.1) !important;
                }
            `}</style>
        </div>
    )
}
