import { CATEGORIES } from '../api'

function money(value) {
    return '$' + Number(value || 0).toFixed(2)
}

// summary looks like { "Food": 12.5, "Travel": 30, "total": 42.5 }
function SummaryBox({ summary }) {
    return (
        <div className="card summary">
            <h2>Summary</h2>
            <div className="summary-grid">
                {CATEGORIES.map((c) => (
                    <div key={c} className="summary-item">
                        <span className="muted">{c}</span>
                        <strong>{money(summary[c])}</strong>
                    </div>
                ))}
                <div className="summary-item total">
                    <span>Total</span>
                    <strong>{money(summary.total)}</strong>
                </div>
            </div>
        </div>
    )
}

export default SummaryBox