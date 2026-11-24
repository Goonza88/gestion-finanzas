import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/DashboardPage'
import MonthPage from './pages/MonthPage'
import CreditsPage from './pages/CreditsPage'
import RecurringPage from './pages/RecurringPage'
import useBudgetData from './hooks/useBudgetData'
import useTheme from './hooks/useTheme'
import useCurrentMonthKey from './hooks/useCurrentMonthKey'

function App() {
  const budget = useBudgetData()
  const { applyMonthlyTransactions, credits, recurringRules } = budget
  const { theme, toggleTheme } = useTheme()
  const currentMonthKey = useCurrentMonthKey()

  useEffect(() => {
    applyMonthlyTransactions(currentMonthKey)
  }, [applyMonthlyTransactions, credits, recurringRules, currentMonthKey])

  return (
    <HashRouter>
      <div className="app-root">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          onExportBackup={budget.exportBackup}
          onImportBackup={budget.importBackup}
        />
        <div className="workspace">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage
                    year={budget.year}
                    annualTotals={budget.annualTotals}
                    monthSummaries={budget.monthSummaries}
                    activeCredits={budget.activeCredits}
                    creditMonthlyCommitmentThisMonth={budget.creditMonthlyCommitmentThisMonth}
                    changeYear={budget.changeYear}
                    recurringRules={budget.recurringRules}
                    applyMonthlyTransactions={budget.applyMonthlyTransactions}
                  />
                }
              />
              <Route
                path="/mes/:monthKey"
                element={
                  <MonthPage
                    getMonthRecord={budget.getMonthRecord}
                    addTransaction={budget.addTransaction}
                    updateTransaction={budget.updateTransaction}
                    removeTransaction={budget.removeTransaction}
                    recurringRules={budget.recurringRules}
                    applyMonthlyTransactions={budget.applyMonthlyTransactions}
                  />
                }
              />
              <Route
                path="/cuotas"
                element={
                  <CreditsPage
                    activeCredits={budget.activeCredits}
                    creditMonthlyCommitmentThisMonth={budget.creditMonthlyCommitmentThisMonth}
                    addCredit={budget.addCredit}
                    removeCredit={budget.removeCredit}
                    updateCreditPayment={budget.updateCreditPayment}
                    addCreditExtraExpense={budget.addCreditExtraExpense}
                  />
                }
              />
              <Route
                path="/repeticiones"
                element={
                  <RecurringPage
                    recurringRules={budget.recurringRules}
                    addRecurringRule={budget.addRecurringRule}
                    updateRecurringRule={budget.updateRecurringRule}
                    closeRecurringRule={budget.closeRecurringRule}
                    monthlyRecords={budget.monthlyRecords}
                  />
                }
              />
              <Route path="*" element={<DashboardPage {...budget} />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  )
}

export default App
