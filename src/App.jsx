import React from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import Header from './components/Header'
import DashboardPage from './pages/DashboardPage'
import MonthPage from './pages/MonthPage'
import CreditsPage from './pages/CreditsPage'
import useBudgetData from './hooks/useBudgetData'
import useTheme from './hooks/useTheme'

function App() {
  const budget = useBudgetData()
  const { theme, toggleTheme } = useTheme()

  return (
    <HashRouter>
      <div className="app-root">
        <Header theme={theme} onToggleTheme={toggleTheme} />
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
