import { useState } from 'react'
import { Plus, Copy, Trash2, Edit2, CheckCircle2, Globe, Lock, User as UserIcon, LayoutGrid, List } from 'lucide-react'
import { motion } from 'framer-motion'
import { BadgeTemplate, User } from '../types'

interface TemplateDashboardProps {
    templates: BadgeTemplate[]
    activeTemplateId: string | null
    currentUser: User
    onCreate: () => void
    onEdit: (id: string) => void
    onRename: (id: string) => void
    onDuplicate: (id: string) => void
    onDelete: (id: string) => void
    onTogglePublic: (id: string) => void
}

export default function TemplateDashboard({ templates, activeTemplateId, currentUser, onCreate, onEdit, onRename, onDuplicate, onDelete, onTogglePublic }: TemplateDashboardProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    const filteredTemplates = templates.filter(t => {
        if (currentUser.role === 'MASTER') return true
        if (t.ownerId === currentUser.id) return true
        return t.isPublic
    })

    return (
        <div style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1e293b', marginBottom: '0.5rem' }}>Meus Crachás</h1>
                    <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                        {currentUser.role === 'USER' ? 'Selecione um crachá para iniciar a operação.' : 'Gerencie seus designs de crachás em um único lugar.'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{
                        display: 'flex',
                        background: '#f1f5f9',
                        padding: '0.4rem',
                        borderRadius: '0.75rem',
                        marginRight: '1rem'
                    }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                background: viewMode === 'grid' ? 'white' : 'transparent',
                                color: viewMode === 'grid' ? 'var(--accent-color)' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <LayoutGrid size={16} /> Grid
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: 'none',
                                background: viewMode === 'list' ? 'white' : 'transparent',
                                color: viewMode === 'list' ? 'var(--accent-color)' : '#64748b',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <List size={16} /> Lista
                        </button>
                    </div>

                    {currentUser.role !== 'USER' && (
                        <button
                            className="btn btn-primary"
                            onClick={onCreate}
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
                            <Plus size={20} /> Novo Crachá
                        </button>
                    )}
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '2rem'
                }}>
                    {/* Create New Card - Show only if empty */}
                    {templates.length === 0 && (
                        <motion.div
                            whileHover={{ scale: 1.02, y: -5 }}
                            onClick={onCreate}
                            style={{
                                background: 'rgba(99, 102, 241, 0.03)',
                                border: '2px dashed rgba(99, 102, 241, 0.3)',
                                borderRadius: '2rem',
                                height: '220px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--accent-color)',
                                gap: '1rem',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <div style={{
                                width: '56px',
                                height: '56px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                borderRadius: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Plus size={28} />
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Criar Meu Primeiro Crachá</span>
                        </motion.div>
                    )}

                    {/* Template Cards */}
                    {filteredTemplates.map((template) => {
                        const isActive = template.id === activeTemplateId;
                        return (
                            <motion.div
                                key={template.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ scale: 1.02, y: -5 }}
                                onClick={() => onEdit(template.id)}
                                style={{
                                    background: 'white',
                                    border: isActive ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                    borderRadius: '2rem',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: isActive ? '0 20px 25px -5px rgba(99, 102, 241, 0.2)' : 'var(--panel-shadow)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {isActive && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        right: '1rem',
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        zIndex: 10
                                    }}>
                                        <CheckCircle2 size={12} /> ATIVO
                                    </div>
                                )}

                                <div style={{
                                    height: '100px',
                                    background: isActive ? 'rgba(99, 102, 241, 0.05)' : '#f8fafc',
                                    borderRadius: '1.25rem',
                                    marginBottom: '1.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isActive ? 'var(--accent-color)' : '#cbd5e1'
                                }}>
                                    <div style={{
                                        width: template.orientation === 'vertical' ? '30px' : '45px',
                                        height: template.orientation === 'vertical' ? '45px' : '30px',
                                        border: `2px solid ${isActive ? 'var(--accent-color)' : '#e2e8f0'}`,
                                        borderRadius: '4px'
                                    }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.name}</h3>
                                        {currentUser.role !== 'USER' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRename(template.id); }}
                                                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#94a3b8', borderRadius: '4px' }}
                                                className="hover-bg"
                                                title="Renomear"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); if (currentUser.role !== 'USER') onTogglePublic(template.id); }}
                                            style={{ background: 'none', border: 'none', padding: '2px', cursor: currentUser.role !== 'USER' ? 'pointer' : 'default', color: '#94a3b8' }}
                                            title={template.isPublic ? 'Público (Todos veem)' : 'Privado (Só você vê)'}
                                        >
                                            {template.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                                        </button>
                                        {template.ownerId !== currentUser.id && <UserIcon size={14} style={{ color: '#94a3b8' }} />}
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                                    {template.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}
                                </p>

                                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{
                                            flex: 2,
                                            height: '40px',
                                            borderRadius: '0.75rem',
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (currentUser.role === 'USER') {
                                                if (!isActive) onEdit(template.id);
                                            } else {
                                                onEdit(template.id);
                                            }
                                        }}
                                    >
                                        {currentUser.role === 'USER' ? (isActive ? 'Selecionado' : 'Selecionar') : (isActive ? 'Editando' : 'Editar')}
                                    </button>
                                    {currentUser.role !== 'USER' && (
                                        <>
                                            <button
                                                className="btn btn-ghost"
                                                style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    padding: 0,
                                                    borderRadius: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDuplicate(template.id);
                                                }}
                                                title="Duplicar"
                                            >
                                                <Copy size={18} />
                                            </button>
                                            {(currentUser.role === 'MASTER' || template.ownerId === currentUser.id) && (
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        padding: 0,
                                                        borderRadius: '0.75rem',
                                                        color: '#ef4444',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(template.id);
                                                    }}
                                                    title="Excluir"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div style={{
                    background: 'white',
                    borderRadius: '2rem',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    boxShadow: 'var(--panel-shadow)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                            <tr>
                                <th style={{ padding: '1.25rem 2rem', fontWeight: 800, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Crachá</th>
                                <th style={{ padding: '1.25rem 2rem', fontWeight: 800, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Orientação</th>
                                <th style={{ padding: '1.25rem 2rem', fontWeight: 800, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Privacidade</th>
                                <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontWeight: 800, color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTemplates.map((template) => {
                                const isActive = template.id === activeTemplateId;
                                return (
                                    <tr key={template.id} style={{ borderBottom: '1px solid #f1f5f9', background: isActive ? 'rgba(99, 102, 241, 0.02)' : 'transparent' }}>
                                        <td style={{ padding: '1.25rem 2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    background: isActive ? 'rgba(99, 102, 241, 0.1)' : '#f8fafc',
                                                    borderRadius: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: isActive ? 'var(--accent-color)' : '#cbd5e1'
                                                }}>
                                                    <div style={{
                                                        width: template.orientation === 'vertical' ? '12px' : '18px',
                                                        height: template.orientation === 'vertical' ? '18px' : '12px',
                                                        border: `1.5px solid ${isActive ? 'var(--accent-color)' : '#cbd5e1'}`,
                                                        borderRadius: '2px'
                                                    }} />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 800, color: '#1e293b' }}>{template.name}</span>
                                                        {isActive && <span style={{ color: 'var(--accent-color)', fontSize: '0.65rem', fontWeight: 900, background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.5rem' }}>ATIVO</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{template.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}</span>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.85rem' }}>
                                                {template.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                                                <span>{template.isPublic ? 'Público' : 'Privado'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    className={`btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                                                    style={{ height: '36px', padding: '0 1rem', fontSize: '0.8rem', fontWeight: 700 }}
                                                    onClick={() => onEdit(template.id)}
                                                >
                                                    {currentUser.role === 'USER' ? (isActive ? 'Selecionado' : 'Selecionar') : (isActive ? 'Editando' : 'Editar')}
                                                </button>
                                                {currentUser.role !== 'USER' && (
                                                    <>
                                                        <button
                                                            className="btn btn-ghost"
                                                            style={{ width: '36px', height: '36px', padding: 0 }}
                                                            onClick={() => onDuplicate(template.id)}
                                                            title="Duplicar"
                                                        >
                                                            <Copy size={16} />
                                                        </button>
                                                        {(currentUser.role === 'MASTER' || template.ownerId === currentUser.id) && (
                                                            <button
                                                                className="btn btn-ghost"
                                                                style={{ width: '36px', height: '36px', padding: 0, color: '#ef4444' }}
                                                                onClick={() => onDelete(template.id)}
                                                                title="Excluir"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
