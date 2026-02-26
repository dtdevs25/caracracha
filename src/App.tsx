import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BadgeTemplate, BatchRecord, ModalConfig, User } from './types'
import {
    Palette,
    Users,
    Printer,
    LayoutGrid,
    Contact,
    Info,
    LogOut,
    Download,
    Loader2,
    Shield
} from 'lucide-react'
import BadgeDesigner from './components/BadgeDesigner'
import DataManager from './components/DataManager'
import PrinterQueue from './components/PrinterQueue'
import Login from './components/Login'
import TemplateDashboard from './components/TemplateDashboard'
import UserManager from './components/UserManager'
import { generateBadgesPDF } from './utils/pdfGenerator'
import { authService, templateService, recordService } from './services/api'

const DEFAULT_TEMPLATE: BadgeTemplate = {
    id: 'default',
    name: 'Modelo Padrão',
    ownerId: 'system',
    isPublic: true,
    orientation: 'horizontal',
    bleed: 3,
    front: { background: null, layers: [] },
    back: { background: null, layers: [] }
}

function App() {
    const [activeTab, setActiveTab] = useState('home')
    const [isLoading, setIsLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('badge_user')
        return saved ? JSON.parse(saved) : null
    })

    const [templates, setTemplates] = useState<BadgeTemplate[]>([])
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
    const [records, setRecords] = useState<BatchRecord[]>([])
    const [columns, setColumns] = useState<string[]>(() => {
        const saved = localStorage.getItem('badge_columns')
        return saved ? JSON.parse(saved) : []
    })
    const [users, setUsers] = useState<User[]>([])
    const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

    // Modal State
    const [modalConfig, setModalConfig] = useState<ModalConfig>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: ''
    })

    const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0]

    // Load Initial Data
    useEffect(() => {
        if (currentUser) {
            const fetchData = async () => {
                setIsLoading(true)
                try {
                    const [templatesRes, usersRes] = await Promise.all([
                        templateService.getTemplates(),
                        currentUser.role === 'MASTER' ? authService.getUsers() : Promise.resolve({ data: [] })
                    ])
                    setTemplates(templatesRes.data)
                    setUsers(usersRes.data)
                } catch (error) {
                    console.error('Error fetching data:', error)
                } finally {
                    setIsLoading(false)
                }
            }
            fetchData()
            localStorage.setItem('badge_user', JSON.stringify(currentUser))
        } else {
            localStorage.removeItem('badge_user')
            localStorage.removeItem('badge_token')
        }
    }, [currentUser])

    // Load records when template changes
    useEffect(() => {
        if (activeTemplateId) {
            recordService.getRecords(activeTemplateId).then((res: { data: BatchRecord[] }) => {
                setRecords(res.data)
            })
        }
    }, [activeTemplateId])

    useEffect(() => {
        localStorage.setItem('badge_columns', JSON.stringify(columns))
    }, [columns])

    const handleCreateTemplate = async (name: string) => {
        if (!name.trim() || !currentUser) return;
        const newTemplateData: Partial<BadgeTemplate> = {
            ...DEFAULT_TEMPLATE,
            name,
            ownerId: currentUser.id,
            isPublic: currentUser.role === 'MASTER'
        }

        try {
            const res = await templateService.saveTemplate(newTemplateData)
            setTemplates([...templates, res.data])
            setActiveTemplateId(res.data.id)
            setActiveTab('designer')
        } catch (error) {
            console.error('Error creating template:', error)
        }
    }

    const requestCreateTemplate = () => {
        setModalConfig({
            isOpen: true,
            type: 'prompt',
            title: 'Novo Crachá',
            message: 'Digite o nome do seu novo projeto de crachá:',
            onConfirm: (name) => {
                if (name && name.trim()) {
                    handleCreateTemplate(name)
                } else {
                    setModalConfig({
                        isOpen: true,
                        type: 'alert',
                        title: 'Erro',
                        message: 'O nome do crachá é obrigatório!',
                        onConfirm: () => requestCreateTemplate()
                    })
                }
            }
        })
    }

    const handleDuplicateTemplate = (id: string) => {
        const source = templates.find(t => t.id === id)
        if (source) {
            const copy: BadgeTemplate = {
                ...source,
                id: Math.random().toString(36).substr(2, 9),
                name: `${source.name} (Cópia)`
            }
            setTemplates([...templates, copy])
        }
    }

    const handleRenameTemplate = (id: string) => {
        const target = templates.find(t => t.id === id)
        if (!target) return

        setModalConfig({
            isOpen: true,
            type: 'prompt',
            title: 'Renomear Crachá',
            message: `Digite o novo nome para "${target.name}":`,
            defaultValue: target.name,
            onConfirm: (newName) => {
                if (newName && newName.trim()) {
                    updateActiveTemplate({ ...target, name: newName })
                }
            }
        })
    }

    const handleDeleteTemplate = (id: string) => {
        const target = templates.find(t => t.id === id)
        if (!target) return

        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Excluir Crachá',
            message: `Tem certeza que deseja excluir o modelo "${target.name}"? Esta ação não poderá ser desfeita.`,
            onConfirm: async () => {
                try {
                    await templateService.deleteTemplate(id)
                    setTemplates(templates.filter(t => t.id !== id))
                    if (activeTemplateId === id) setActiveTemplateId(null)
                } catch (error) {
                    console.error('Error deleting template:', error)
                }
            }
        })
    }

    const handleTogglePublic = async (id: string) => {
        const target = templates.find(t => t.id === id)
        if (!target) return
        updateActiveTemplate({ ...target, isPublic: !target.isPublic })
    }

    const updateActiveTemplate = async (updates: BadgeTemplate) => {
        try {
            const res = await templateService.saveTemplate(updates)
            setTemplates(templates.map(t => t.id === updates.id ? res.data : t))
        } catch (error) {
            console.error('Error updating template:', error)
        }
    }

    const saveRecords = async (newRecords: BatchRecord[]) => {
        if (!activeTemplateId) return
        try {
            await recordService.saveRecords(activeTemplateId, newRecords)
            setRecords(newRecords)
        } catch (error) {
            console.error('Error saving records:', error)
        }
    }

    const handleDownloadPDF = async () => {
        if (!activeTemplate || records.length === 0) {
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Atenção',
                message: 'Selecione um projeto e tenha dados importados para gerar o PDF.'
            });
            return;
        }

        setIsDownloadingPDF(true);
        try {
            await generateBadgesPDF(activeTemplate, records, (progress: number) => {
                console.log(`Progresso PDF: ${progress}%`);
            });
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            setModalConfig({
                isOpen: true,
                type: 'alert',
                title: 'Erro',
                message: 'Ocorreu um erro ao gerar o PDF dos crachás.'
            });
        } finally {
            setIsDownloadingPDF(false);
        }
    }

    const handleLogout = () => {
        setCurrentUser(null)
        setActiveTemplateId(null)
        setActiveTab('home')
        localStorage.removeItem('badge_token')
    }

    const handleAddUser = async (userData: any) => {
        try {
            const res = await authService.createUser(userData)
            setUsers([...users, res.data])
        } catch (error) {
            console.error('Error adding user:', error)
        }
    }

    const handleDeleteUser = (id: string) => {
        if (id === currentUser?.id) return
        const target = users.find(u => u.id === id)
        if (!target) return

        setModalConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Excluir Usuário',
            message: `Tem certeza que deseja excluir o usuário "${target.name}"? Esta ação não poderá ser desfeita.`,
            onConfirm: async () => {
                try {
                    await authService.deleteUser(id)
                    setUsers(users.filter(u => u.id !== id))
                } catch (error) {
                    console.error('Error deleting user:', error)
                }
            }
        })
    }

    if (!currentUser) {
        return <Login onLogin={(user, token) => {
            if (token) localStorage.setItem('badge_token', token);
            setCurrentUser(user);
        }} />
    }

    if (isLoading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', background: '#f8fafc' }}>
                <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
                    <p style={{ color: '#64748b', fontWeight: 600 }}>Carregando dados...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="app-container">
            {/* Vertical Navigation (Left) */}
            <nav className="floating-nav">
                <div
                    className={`nav-bubble ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveTab('home')}
                    data-tooltip="1. Meus Crachás (Projetos)"
                >
                    <Contact size={24} />
                </div>

                <div
                    className={`nav-bubble ${activeTab === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data')}
                    data-tooltip="2. Incluir Dados"
                >
                    <Users size={24} />
                </div>

                {currentUser.role !== 'USER' && (
                    <div
                        className={`nav-bubble ${activeTab === 'designer' ? 'active' : ''}`}
                        onClick={() => {
                            if (activeTemplateId) setActiveTab('designer')
                            else setModalConfig({
                                isOpen: true,
                                type: 'alert',
                                title: 'Atenção',
                                message: 'Selecione um projeto primeiro nos "Meus Crachás".'
                            })
                        }}
                        data-tooltip="3. Designer de Layout"
                    >
                        <Palette size={24} />
                    </div>
                )}

                <div
                    className={`nav-bubble ${activeTab === 'printer' ? 'active' : ''}`}
                    onClick={() => {
                        if (activeTemplateId) setActiveTab('printer')
                        else setModalConfig({
                            isOpen: true,
                            type: 'alert',
                            title: 'Atenção',
                            message: 'Selecione um crachá primeiro para acessar a fila de impressão.'
                        })
                    }}
                    data-tooltip="4. Fila de Impressão"
                >
                    <Printer size={24} />
                </div>

                {currentUser.role === 'MASTER' && (
                    <div
                        className={`nav-bubble ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                        data-tooltip="Gestão de Usuários"
                    >
                        <Shield size={24} />
                    </div>
                )}

                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }} />

                <div
                    className={`nav-bubble ${isDownloadingPDF ? 'loading' : ''}`}
                    onClick={handleDownloadPDF}
                    data-tooltip={isDownloadingPDF ? 'Gerando PDF...' : 'Baixar Todos (PDF)'}
                    style={{ color: 'var(--accent-color)' }}
                >
                    {isDownloadingPDF ? <Loader2 className="animate-spin" size={24} /> : <Download size={24} />}
                </div>
            </nav>

            {/* Main Content Area */}
            <main style={{ position: 'relative', paddingTop: '80px', flex: 1, height: '100vh', overflow: 'auto' }}>
                <header style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '70px',
                    background: 'white',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem',
                    zIndex: 100
                }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <img
                            src="/logo.png"
                            alt="Logo"
                            style={{ height: '45px', width: 'auto' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ color: '#475569', fontSize: '0.95rem', fontWeight: 700 }}>
                            {currentUser.name}
                        </div>
                        <div
                            onClick={handleLogout}
                            style={{
                                cursor: 'pointer',
                                color: 'var(--danger)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.5rem',
                                borderRadius: '0.5rem',
                                transition: 'all 0.2s',
                                background: 'transparent'
                            }}
                            className="hover-fade"
                            data-tooltip="Sair do Sistema"
                        >
                            <LogOut size={24} />
                        </div>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {activeTab === 'home' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <TemplateDashboard
                                templates={templates}
                                activeTemplateId={activeTemplateId}
                                onCreate={requestCreateTemplate}
                                onEdit={(id: string) => { setActiveTemplateId(id); setActiveTab('designer'); }}
                                onRename={handleRenameTemplate}
                                onDuplicate={handleDuplicateTemplate}
                                onDelete={handleDeleteTemplate}
                                onTogglePublic={handleTogglePublic}
                                currentUser={currentUser}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'designer' && activeTemplate && (
                        <motion.div
                            key="designer"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <BadgeDesigner
                                template={activeTemplate}
                                onUpdate={updateActiveTemplate}
                                availableColumns={columns}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'data' && (
                        <motion.div
                            key="data"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass"
                            style={{ padding: '2rem', borderRadius: '1.5rem', boxShadow: 'var(--panel-shadow)' }}
                        >
                            <DataManager
                                records={records}
                                onUpdate={saveRecords}
                                onColumnsDetected={setColumns}
                                availableColumns={columns}
                                requestModal={(config) => setModalConfig({ ...config, isOpen: true })}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'printer' && activeTemplate && (
                        <motion.div
                            key="printer"
                            initial={{ opacity: 0, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, filter: 'blur(0)' }}
                            exit={{ opacity: 0, filter: 'blur(10px)' }}
                        >
                            <PrinterQueue
                                template={activeTemplate}
                                records={records}
                                onUpdateTemplate={updateActiveTemplate}
                            />
                        </motion.div>
                    )}
                    {activeTab === 'users' && currentUser.role === 'MASTER' && (
                        <motion.div
                            key="users"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            style={{ width: '100%', height: '100%', overflow: 'auto' }}
                        >
                            <UserManager
                                users={users}
                                onAddUser={handleAddUser}
                                onDeleteUser={handleDeleteUser}
                                currentUser={currentUser}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Custom Modal */}
            <AnimatePresence>
                {modalConfig.isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.4)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '1rem'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                background: 'white',
                                borderRadius: '2rem',
                                width: '100%',
                                maxWidth: modalConfig.type === 'onboarding' ? '600px' : '400px',
                                padding: '2rem',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                color: '#1e293b'
                            }}
                        >
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '1.25rem', textAlign: modalConfig.type === 'onboarding' ? 'center' : 'left' }}>
                                {modalConfig.title}
                            </h3>

                            {modalConfig.type === 'onboarding' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                                    <p style={{ color: '#64748b', textAlign: 'center', fontSize: '1.1rem' }}>
                                        Para criar seus crachás com facilidade, siga esta sequência lógica:
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {[
                                            { icon: <LayoutGrid />, title: '1. Projetos', desc: 'Selecione ou crie um modelo de crachá.' },
                                            { icon: <Users />, title: '2. Dados', desc: 'Importe sua planilha Excel ou adicione manualmente.' },
                                            { icon: <Palette />, title: '3. Designer', desc: 'Ajuste as informações e o layout visual.' },
                                            { icon: <Printer />, title: '4. Impressão', desc: 'Gere os arquivos e envie para a impressora.' }
                                        ].map((step, i) => (
                                            <div key={i} style={{ padding: '1.25rem', borderRadius: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                <div style={{ color: 'var(--accent-color)', marginBottom: '0.75rem' }}>{step.icon}</div>
                                                <div style={{ fontWeight: 800, marginBottom: '0.25rem' }}>{step.title}</div>
                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{step.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ padding: '1rem', borderRadius: '1rem', background: 'rgba(99, 102, 241, 0.05)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <Info size={24} style={{ color: 'var(--accent-color)' }} />
                                        <p style={{ fontSize: '0.85rem', color: '#475569' }}>
                                            <strong>Dica:</strong> No menu lateral, os ícones já estão organizados nesta mesma ordem para agilizar seu trabalho.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.6 }}>{modalConfig.message}</p>
                                    {modalConfig.type === 'prompt' && (
                                        <input
                                            autoFocus
                                            className="input"
                                            defaultValue={modalConfig.defaultValue}
                                            style={{ marginBottom: '1.5rem', width: '100%' }}
                                            id="modal-input"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = (document.getElementById('modal-input') as HTMLInputElement).value;
                                                    modalConfig.onConfirm?.(val);
                                                    setModalConfig(prev => ({ ...prev, isOpen: false }));
                                                }
                                            }}
                                        />
                                    )}
                                </>
                            )}

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {(modalConfig.type === 'confirm' || modalConfig.type === 'prompt') && (
                                    <button
                                        className="btn btn-ghost"
                                        style={{ flex: 1, borderRadius: '1rem', fontWeight: 700 }}
                                        onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1, borderRadius: '1rem', fontWeight: 700 }}
                                    onClick={() => {
                                        const val = modalConfig.type === 'prompt'
                                            ? (document.getElementById('modal-input') as HTMLInputElement).value
                                            : undefined;
                                        modalConfig.onConfirm?.(val);
                                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                                    }}
                                >
                                    {modalConfig.type === 'onboarding' ? 'Entendido!' : 'OK'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default App
