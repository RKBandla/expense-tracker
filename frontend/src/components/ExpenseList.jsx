import { CATEGORIES } from '../api'

function ExpenseList({ expenses, filter, onFilterChange, onEdit, onDelete, loading }) {
    return (
        <div className="card">
            <div className="list-header">
                <h2>Expenses</h2>
                <select value={filter} onChange={(e) => onFilterChange(e.target.value)}>
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <p className="muted">Loading...</p>
            ) : expenses.length === 0 ? (
                <p className="muted">No expenses yet.</p>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                        <tr>
                            <th>Date</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th className="right">Amount</th>
                            <th></th>
                        </tr>
                        </thead>
                        <tbody>
                        {expenses.map((e) => (
                            <tr key={e._id}>
                                <td>{e.date}</td>
                                <td>{e.title}</td>
                                <td>
                                    <span className="tag">{e.category}</span>
                                </td>
                                <td className="right">${Number(e.amount).toFixed(2)}</td>
                                <td className="right nowrap">
                                    <button className="secondary small" onClick={() => onEdit(e)}>
                                        Edit
                                    </button>{' '}
                                    <button className="danger small" onClick={() => onDelete(e)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default ExpenseList