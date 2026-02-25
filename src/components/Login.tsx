import { useState } from 'react'
import { LogIn, User as UserIcon, Lock, Eye, EyeOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { User } from '../types'

import { authService } from '../services/api'

interface LoginProps {
    onLogin: (user: User, token?: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const res = await authService.login({ username, password })
            onLogin(res.data.user, res.data.token)
        } catch (error: any) {
            setError(error.response?.data?.error || 'Usuário ou senha inválidos')
        }
    }

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass"
                style={{
                    padding: '3rem',
                    borderRadius: '2.5rem',
                    width: '100%',
                    maxWidth: '450px',
                    boxShadow: 'var(--panel-shadow)',
                    textAlign: 'center'
                }}
            >
                <div style={{
                    marginBottom: '2.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <img
                        src="/logo.png"
                        alt="Cara Crachá"
                        style={{
                            height: '100px',
                            width: 'auto',
                        }}
                        onError={(e) => {
                            // Fallback to Icon if image is missing
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.fallback-icon');
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}
                    />
                    <div className="fallback-icon" style={{
                        display: 'none',
                        width: '80px',
                        height: '80px',
                        borderRadius: '2rem',
                        background: 'var(--accent-color)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)'
                    }}>
                        <LogIn size={40} />
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                            <UserIcon size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Nome de usuário"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={{ paddingLeft: '3rem', margin: 0 }}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                            <Lock size={18} />
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ paddingLeft: '3rem', paddingRight: '3rem', margin: 0 }}
                        />
                        <div
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '1rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </div>
                    </div>

                    {error && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '50px', borderRadius: '1rem', fontSize: '1rem', marginTop: '1rem', fontWeight: 800 }}>
                        Entrar no Sistema
                    </button>
                </form>
            </motion.div>
        </div>
    )
}
