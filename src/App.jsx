import { HashRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import DashboardPage from './pages/DashboardPage'
import MonthPage from './pages/MonthPage'
import CreditsPage from './pages/CreditsPage'
import RecurringPage from './pages/RecurringPage'
import useBudgetData from './hooks/useBudgetData'
import useTheme from './hooks/useTheme'

function App() {
  const budget = useBudgetData()
  const { theme, toggleTheme } = useTheme()

  return (
    <HashRouter>
      <div className="app-root">
        <Header
          theme={theme}
          onToggleTheme={toggleTheme}
          onExportBackup={budget.exportBackup}
          onImportBackup={budget.importBackup}
        />
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
                applyRecurringTransactions={budget.applyRecurringTransactions}
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
                creditDetails={budget.creditDetails}
                applyRecurringTransactions={budget.applyRecurringTransactions}
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
                removeRecurringRule={budget.removeRecurringRule}
              />
            }
          />
          <Route path="*" element={<DashboardPage {...budget} />} />
        </Routes>
      </div>
    </HashRouter>
  )
}

export default App
