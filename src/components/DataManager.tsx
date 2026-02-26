import { useRef, useState } from 'react'
import {
    Upload,
    Plus,
    Download,
    Image as ImageIcon,
    X,
    Trash
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { BatchRecord, ModalConfig } from '../types'

interface DataManagerProps {
    records: BatchRecord[];
    onUpdate: (records: BatchRecord[]) => void;
    onColumnsDetected: (columns: string[]) => void;
    availableColumns: string[];
    requestModal: (config: Omit<ModalConfig, 'isOpen'>) => void;
}

export default function DataManager({ records, onUpdate, onColumnsDetected, availableColumns, requestModal }: DataManagerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [editingCell, setEditingCell] = useState<{ rowId: string, col: string } | null>(null)

    // Helper to update columns in parent
    const updateColumns = (newCols: string[]) => {
        onColumnsDetected(newCols)
    }

    const handleAddColumn = () => {
        requestModal({
            type: 'prompt',
            title: 'Nova Coluna',
            message: 'Nome da nova coluna (ex: Cargo, Admissão):',
            onConfirm: (name) => {
                if (!name || name.trim() === '') return
                if (availableColumns.includes(name.trim())) {
                    requestModal({
                        type: 'alert',
                        title: 'Erro',
                        message: 'Esta coluna já existe!'
                    })
                    return
                }
                updateColumns([...availableColumns, name.trim()])
            }
        })
    }

    const handleRemoveColumn = (colName: string) => {
        requestModal({
            type: 'confirm',
            title: 'Remover Coluna',
            message: `Deseja remover a coluna "${colName}"? Os dados desta coluna em todos os registros serão perdidos. Esta ação não pode ser desfeita.`,
            onConfirm: () => {
                updateColumns(availableColumns.filter(c => c !== colName))
                const updatedRecords = records.map(r => {
                    const { [colName]: _, ...rest } = r.data
                    return { ...r, data: rest }
                })
                onUpdate(updatedRecords)
            }
        })
    }

    const handleAddRow = () => {
        console.log('[DataManager] Adding new row');
        const newRecord: BatchRecord = {
            id: crypto.randomUUID(),
            groupName: '',
            data: {}
        }
        availableColumns.forEach(col => newRecord.data[col] = '')
        onUpdate([...records, newRecord])
    }

    const handleUpdateCell = (rowId: string, col: string, value: string) => {
        const updated = records.map(r =>
            r.id === rowId ? { ...r, data: { ...r.data, [col]: value } } : r
        )
        onUpdate(updated)
    }

    const handleUpdateGroup = (rowId: string, group: string) => {
        const updated = records.map(r =>
            r.id === rowId ? { ...r, groupName: group } : r
        )
        onUpdate(updated)
    }

    const handlePhotoUpload = (rowId: string, col: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Auto-create column if it doesn't exist (e.g. 'Foto')
        if (!availableColumns.includes(col)) {
            onColumnsDetected([...availableColumns, col])
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            const base64 = event.target?.result as string
            handleUpdateCell(rowId, col, base64)
            e.target.value = '' // Reset input to allow re-uploading the same file
        }
        reader.readAsDataURL(file)
    }

    const handleDeleteRow = (rowId: string) => {
        requestModal({
            type: 'confirm',
            title: 'Excluir Registro',
            message: 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.',
            onConfirm: () => {
                onUpdate(records.filter(r => r.id !== rowId))
            }
        })
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array', cellDates: true })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

            if (jsonData.length === 0) {
                requestModal({
                    type: 'alert',
                    title: 'Planilha Vazia',
                    message: 'O arquivo selecionado não contém dados válidos.'
                })
                return
            }

            // Detect columns from first row if not already defined
            const headers = Object.keys(jsonData[0])
            updateColumns(headers)

            const newRecords: BatchRecord[] = jsonData.map(row => {
                const recordData: Record<string, string> = {}
                headers.forEach(header => {
                    let val = row[header]
                    if (val instanceof Date) {
                        const d = val.getDate().toString().padStart(2, '0')
                        const m = (val.getMonth() + 1).toString().padStart(2, '0')
                        const y = val.getFullYear()
                        val = `${d}/${m}/${y}`
                    }
                    recordData[header] = String(val ?? '')
                })
                // Extract groupName from a specific column if it exists, or leave empty
                const groupName = (row['Grupo'] || row['grupo'] || '').toString()
                return { id: crypto.randomUUID(), groupName, data: recordData }
            })
            onUpdate(newRecords)
        }
        reader.readAsArrayBuffer(file)
    }

    const downloadTemplate = () => {
        const data = [availableColumns.reduce((acc, col) => ({ ...acc, [col]: '' }), {})]
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo")

        // Use XLSX.writeFile to handle binary data download automatically in most envs
        // But for browser compatibility we can use a more manual approach if needed
        // For Vite/React usually XLSX.writeFile('modelo.xlsx') works fine
        XLSX.writeFile(workbook, 'modelo_cracha.xlsx')
    }

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Dados dos Crachás</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Adicione registros manualmente ou importe via planilha.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-ghost" onClick={downloadTemplate} data-tooltip="Baixar Modelo XLSX">
                        <Download size={18} />
                    </button>
                    <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} data-tooltip="Subir Planilha XLSX">
                        <Upload size={18} />
                    </button>
                    <button className="btn btn-primary" onClick={handleAddRow} data-tooltip="Adicionar Linha">
                        <Plus size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" style={{ display: 'none' }} />
                </div>
            </div>

            <div style={{
                background: 'white',
                borderRadius: '1.5rem',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--panel-shadow)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem', width: '50px' }}>#</th>
                                <th style={{ padding: '1rem', minWidth: '150px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-color)' }}>
                                        Grupo / Turma
                                    </span>
                                </th>
                                {availableColumns.map(col => (
                                    <th key={col} style={{ padding: '1rem', minWidth: '150px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                                {col}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveColumn(col)}
                                                style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: 'flex' }}
                                                onMouseOver={(e) => e.currentTarget.style.color = 'var(--danger)'}
                                                onMouseOut={(e) => e.currentTarget.style.color = '#cbd5e1'}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </th>
                                ))}
                                <th style={{ padding: '1rem', width: '120px' }}>
                                    <button
                                        onClick={handleAddColumn}
                                        className="btn btn-ghost"
                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', color: 'var(--accent-color)' }}
                                    >
                                        <Plus size={12} /> Coluna
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((record, idx) => (
                                <tr key={record.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem', color: '#cbd5e1', fontSize: '0.8rem' }}>{(idx + 1).toString()}</td>
                                    <td style={{ padding: '0.5rem 1rem' }}>
                                        <input
                                            className="input"
                                            placeholder="Ex: CIPA 2026"
                                            value={record.groupName || ''}
                                            onChange={(e) => handleUpdateGroup(record.id, e.target.value)}
                                            style={{ margin: 0, padding: '0.4rem', fontSize: '0.85rem', fontWeight: 600, border: '1px dashed var(--border-color)' }}
                                        />
                                    </td>
                                    {availableColumns.map(col => (
                                        <td key={col} style={{ padding: '0.5rem 1rem' }}>
                                            {record.data[col]?.startsWith('data:image') ? (
                                                <div style={{ position: 'relative', width: '45px', height: '45px', group: 'true' } as any}>
                                                    <img
                                                        src={record.data[col]}
                                                        style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                                                    />
                                                    <label style={{
                                                        position: 'absolute', inset: 0,
                                                        background: 'rgba(99, 102, 241, 0.8)',
                                                        color: 'white', opacity: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
                                                        fontSize: '0.65rem', fontWeight: 800, textAlign: 'center'
                                                    }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0'}>
                                                        ALTERAR
                                                        <input type="file" accept="image/*" style={{ display: 'none' }}
                                                            onChange={(e) => handlePhotoUpload(record.id, col, e)} />
                                                    </label>
                                                </div>
                                            ) : editingCell?.rowId === record.id && editingCell.col === col ? (
                                                <input
                                                    autoFocus
                                                    className="input"
                                                    value={record.data[col] || ''}
                                                    onChange={(e) => handleUpdateCell(record.id, col, e.target.value)}
                                                    onBlur={() => setEditingCell(null)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingCell(null) }}
                                                    style={{ margin: 0, padding: '0.4rem', fontSize: '0.9rem' }}
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => setEditingCell({ rowId: record.id, col })}
                                                    style={{
                                                        padding: '0.4rem',
                                                        fontSize: '0.9rem',
                                                        minHeight: '2rem',
                                                        borderRadius: '0.5rem',
                                                        cursor: 'text',
                                                        border: '1px solid transparent'
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {record.data[col] || (
                                                        <span style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>Vazio...</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        <label
                                            className={`btn ${record.data['Foto'] ? 'btn-primary' : 'btn-ghost'}`}
                                            style={{ padding: '0.4rem', margin: 0 }}
                                            data-tooltip={record.data['Foto'] ? "Foto Já Anexada (Clique para Trocar)" : "Anexar Foto"}
                                        >
                                            <ImageIcon size={16} />
                                            <input type="file" accept="image/*" style={{ display: 'none' }}
                                                onChange={(e) => handlePhotoUpload(record.id, 'Foto', e)} />
                                        </label>
                                        <button className="btn btn-ghost" onClick={() => handleDeleteRow(record.id)} style={{ padding: '0.4rem', color: 'var(--danger)' }} data-tooltip="Excluir Registro">
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {records.length === 0 && (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                            <p style={{ fontWeight: 600 }}>Nenhum dado incluído ainda.</p>
                            <p style={{ fontSize: '0.9rem' }}>Clique em "Adicionar Linha" ou suba uma planilha.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
