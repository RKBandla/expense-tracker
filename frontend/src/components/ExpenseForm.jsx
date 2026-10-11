import { useEffect, useState } from 'react'
import { CATEGORIES } from '../api'

function today() {
    return new Date().toISOString().slice(0, 10) // yyyy-mm-dd
}

const EMPTY = { title: '', amount: '', category: 'Food', date: today() }

// Used for BOTH "add" and "edit".
// editing = the expense being edited, or null when adding a new one.
function ExpenseForm({ editing, onSave, onCancel }) {
    const [form, setForm] = useState(EMPTY)
    const [saving, setSaving] = useState(false)

    // When the user clicks "Edit" on a row, fill the form with that expense
    useEffect(() => {
        if (editing) {
            setForm({
                title: editing.title,
                amount: String(editing.amount),
                category: editing.category,
                date: editing.date,
            })
        } else {
            setForm({ ...EMPTY, date: today() })
        }
    }, [editing])

    function update(field, value) {
        setForm({ ...form, [field]: value })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setSaving(true)
        const ok = await onSave({ ...form, amount: Number(form.amount) })
        setSaving(false)
        if (ok && !editing) {
            setForm({ ...EMPTY, date: today() }) // clear after adding
        }
    }

    return (
        <form className="card form" onSubmit={handleSubmit}>
            <h2>{editing ? 'Edit expense' : 'Add expense'}</h2>
            <div className="form-row">
                <label>
                    Title
                    <input value={form.title} onChange={(e) => update('title', e.target.value)} required />
                </label>
                <label>
                    Amount ($)
                    <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={form.amount}
                        onChange={(e) => update('amount', e.target.value)}
                        required
                    />
                </label>
                <label>
                    Category
                    <select value={form.category} onChange={(e) => update('category', e.target.value)}>
                        {CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Date
                    <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required />
                </label>
            </div>
            <div className="buttons">
                <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editing ? 'Save changes' : 'Add expense'}
                </button>
                {editing && (
                    <button type="button" className="secondary" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>
        </form>
    )
}

export default ExpenseForm