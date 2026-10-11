import { useEffect, useState } from 'react'
import { getExpenses, getSummary, createExpense, updateExpense, deleteExpense } from './api'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import SummaryBox from './components/SummaryBox'

function App() {
    const [expenses, setExpenses] = useState([])
    const [summary, setSummary] = useState({})
    const [filter, setFilter] = useState('')       // '' = all categories
    const [editing, setEditing] = useState(null)   // expense being edited, or null
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    // Load the list AND the summary together
    async function loadAll(category = filter) {
        setLoading(true)
        setError('')
        try {
            const [list, totals] = await Promise.all([getExpenses(category), getSummary()])
            setExpenses(list)
            setSummary(totals)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Runs once when the page opens
    useEffect(() => {
        loadAll()
    }, [])

    function changeFilter(category) {
        setFilter(category)
        loadAll(category)
    }

    // Called by ExpenseForm. Returns true if it worked (so the form can clear itself).
    async function handleSave(expense) {
        setError('')
        setMessage('')
        try {
            if (editing) {
                await updateExpense(editing._id, expense)
                setMessage('Expense updated')
                setEditing(null)
            } else {
                await createExpense(expense)
                setMessage('Expense added')
            }
            await loadAll()
            return true
        } catch (err) {
            setError(err.message) // e.g. "amount must be a number greater than 0"
            return false
        }
    }

    async function handleDelete(expense) {
        if (!window.confirm('Delete "' + expense.title + '"?')) return
        setError('')
        setMessage('')
        try {
            await deleteExpense(expense._id)
            setMessage('Expense deleted')
            if (editing && editing._id === expense._id) setEditing(null)
            await loadAll()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className="container">
            <header>
                <h1>💰 Expense Tracker</h1>
                <p className="muted">React · API Gateway · AWS Lambda · MongoDB Atlas</p>
            </header>

            {error && <div className="alert error">{error}</div>}
            {message && <div className="alert success">{message}</div>}

            <SummaryBox summary={summary} />
            <ExpenseForm editing={editing} onSave={handleSave} onCancel={() => setEditing(null)} />
            <ExpenseList
                expenses={expenses}
                filter={filter}
                onFilterChange={changeFilter}
                onEdit={setEditing}
                onDelete={handleDelete}
                loading={loading}
            />
        </div>
    )
}

export default App