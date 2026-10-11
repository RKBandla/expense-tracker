// All calls to the backend live in this one file.
// The URL comes from VITE_API_URL, which Vite puts into the code at build time.
const API_URL = import.meta.env.VITE_API_URL

export const CATEGORIES = ['Food', 'Travel', 'Bills', 'Shopping', 'Other']

async function request(path, options = {}) {
    let response
    try {
        response = await fetch(API_URL + path, {
            ...options,
            headers: { 'Content-Type': 'application/json' },
        })
    } catch {
        throw new Error('Cannot reach the server')
    }

    if (response.status === 204) return null // DELETE has no body

    const data = await response.json().catch(() => null)
    if (!response.ok) {
        throw new Error((data && (data.error || data.message)) || 'Request failed (' + response.status + ')')
    }
    return data
}

export function getExpenses(category) {
    return request('/expenses' + (category ? '?category=' + encodeURIComponent(category) : ''))
}

export function getSummary() {
    return request('/expenses/summary')
}

export function createExpense(expense) {
    return request('/expenses', { method: 'POST', body: JSON.stringify(expense) })
}

export function updateExpense(id, expense) {
    return request('/expenses/' + id, { method: 'PUT', body: JSON.stringify(expense) })
}

export function deleteExpense(id) {
    return request('/expenses/' + id, { method: 'DELETE' })
}