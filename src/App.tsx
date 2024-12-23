import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { InputSelect } from "./components/InputSelect"
import { Instructions } from "./components/Instructions"
import { Transactions } from "./components/Transactions"
import { useEmployees } from "./hooks/useEmployees"
import { usePaginatedTransactions } from "./hooks/usePaginatedTransactions"
import { useTransactionsByEmployee } from "./hooks/useTransactionsByEmployee"
import { EMPTY_EMPLOYEE } from "./utils/constants"
import { Employee, Transaction } from "./utils/types"

export function App() {
  const { data: employees, ...employeeUtils } = useEmployees()
  const { data: paginatedTransactions, ...paginatedTransactionsUtils } = usePaginatedTransactions()
  const { data: transactionsByEmployee, ...transactionsByEmployeeUtils } = useTransactionsByEmployee()
  const [isLoading, setIsLoading] = useState(false)
  const [approvedStates, setApprovedStates] = useState<Record<string, boolean>>({})
  const [allPaginatedTransactions, setAllPaginatedTransactions] = useState<Transaction[]>([])

  const transactions = useMemo(() => {
    const combinedTransactions = transactionsByEmployee ?? allPaginatedTransactions
    return combinedTransactions.map((transaction) => ({
      ...transaction,
      approved: approvedStates[transaction.id] ?? transaction.approved,
    }))
  }, [allPaginatedTransactions, transactionsByEmployee, approvedStates])

  const loadAllTransactions = useCallback(async () => {
    setIsLoading(true)
    transactionsByEmployeeUtils.invalidateData()
    setAllPaginatedTransactions([])

    await paginatedTransactionsUtils.fetchAll()
    await employeeUtils.fetchAll()

    setIsLoading(false)
  }, [employeeUtils, paginatedTransactionsUtils, transactionsByEmployeeUtils])

  const loadTransactionsByEmployee = useCallback(
    async (employeeId: string) => {
      paginatedTransactionsUtils.invalidateData()
      setApprovedStates((prevStates) => ({ ...prevStates }))
      setAllPaginatedTransactions([])

      if (employeeId === EMPTY_EMPLOYEE.id) {
        await loadAllTransactions()
      } else {
        await transactionsByEmployeeUtils.fetchById(employeeId)
      }
    },
    [paginatedTransactionsUtils, transactionsByEmployeeUtils, loadAllTransactions]
  )

  const toggleApproval = useCallback((transactionId: string) => {
    setApprovedStates((prevState) => ({
      ...prevState,
      [transactionId]: !prevState[transactionId],
    }))
  }, [])

  const handleViewMore = useCallback(async () => {
    if (paginatedTransactions?.nextPage) {
      await paginatedTransactionsUtils.fetchAll()
      if (paginatedTransactions?.data) {
        setAllPaginatedTransactions((prev) => [...prev, ...paginatedTransactions.data])
      }
    }
  }, [paginatedTransactions, paginatedTransactionsUtils])

  useEffect(() => {
    if (employees === null && !employeeUtils.loading) {
      loadAllTransactions()
    }
  }, [employeeUtils.loading, employees, loadAllTransactions])

  useEffect(() => {
    if (paginatedTransactions?.data && allPaginatedTransactions.length === 0) {
      setAllPaginatedTransactions(paginatedTransactions.data)
    }
  }, [paginatedTransactions, allPaginatedTransactions])

  return (
    <Fragment>
      <main className="MainContainer">
        <Instructions />

        <hr className="RampBreak--l" />

        <InputSelect<Employee>
          isLoading={!employees && isLoading}
          defaultValue={EMPTY_EMPLOYEE}
          items={employees === null ? [] : [EMPTY_EMPLOYEE, ...employees]}
          label="Filter by employee"
          loadingLabel="Loading employees"
          parseItem={(item) => ({
            value: item.id,
            label: `${item.firstName} ${item.lastName}`,
          })}
          onChange={async (newValue) => {
            if (newValue === null) {
              return
            }
            await loadTransactionsByEmployee(newValue.id)
          }}
        />

        <div className="RampBreak--l" />

        <div className="RampGrid">
          <Transactions transactions={transactions} onToggleApproval={toggleApproval} />

          {paginatedTransactions?.nextPage !== null && transactionsByEmployee === null && (
            <button
              className="RampButton"
              disabled={paginatedTransactionsUtils.loading}
              onClick={handleViewMore}
            >
              View More
            </button>
          )}
        </div>
      </main>
    </Fragment>
  )
}
