import { useCallback, useEffect, useMemo, useState } from "react"
import { useCustomFetch } from "src/hooks/useCustomFetch"
import { SetTransactionApprovalParams } from "src/utils/types"
import { TransactionPane } from "./TransactionPane"
import { SetTransactionApprovalFunction, TransactionsComponent } from "./types"

export const Transactions: TransactionsComponent = ({ transactions, onToggleApproval }) => {
  const { fetchWithoutCache, loading } = useCustomFetch()
  const [approvedStates, setApprovedStates] = useState<Record<string, boolean>>({})

  // Merge approval states with transactions
  const mergedTransactions = useMemo(() => {
    return transactions?.map((transaction) => ({
      ...transaction,
      approved: approvedStates[transaction.id] ?? transaction.approved,
    }))
  }, [transactions, approvedStates])

  const setTransactionApproval = useCallback<SetTransactionApprovalFunction>(
    async ({ transactionId, newValue }) => {
      await fetchWithoutCache<void, SetTransactionApprovalParams>("setTransactionApproval", {
        transactionId,
        value: newValue,
      })
      setApprovedStates((prev) => ({
        ...prev,
        [transactionId]: newValue,
      }))
    },
    [fetchWithoutCache]
  )

  useEffect(() => {
    // Sync approvedStates with new transactions to avoid missing toggled states
    if (transactions) {
      const transactionIds = transactions.map((transaction) => transaction.id)
      setApprovedStates((prev) => {
        const newState = { ...prev }
        transactionIds.forEach((id) => {
          if (!(id in newState)) {
            newState[id] = transactions.find((t) => t.id === id)?.approved || false
          }
        })
        return newState
      })
    }
  }, [transactions])

  if (transactions === null) {
    return <div className="RampLoading--container">Loading...</div>
  }

  return (
    <div data-testid="transaction-container">
      {mergedTransactions?.map((transaction) => (
        <TransactionPane
          key={transaction.id}
          transaction={transaction}
          loading={loading}
          setTransactionApproval={setTransactionApproval}
        />
      )) || <div>No transactions available.</div>}
    </div>
  )
}
