"use client"

import { TransactionForm } from "@/components/transactionmform"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Toaster } from "sonner"

interface Account {
  id: string
  name: string
  balance: string
}

interface Transaction {
  id: string
  description: string
  created_at: string
  entries: { amount: string, type: string, account: { name: string } }[]
}

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const fetchData = async () => {
    try {
      const accRes = await fetch("http://localhost:3001/ledger/accounts")
      const txRes = await fetch("http://localhost:3001/ledger/transactions")
      
      if (accRes.ok) setAccounts(await accRes.json())
      if (txRes.ok) setTransactions(await txRes.json())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <main className="min-h-screen bg-background p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center mb-8">
           <div>
             <h1 className="text-3xl font-bold tracking-tight">LedgerOne</h1>
             <p className="text-muted-foreground">Double-entry accounting engine</p>
           </div>
        </header>

        <div className="grid gap-8 md:grid-cols-[1fr_300px]">
          <div className="space-y-8">
            <TransactionForm onSuccess={fetchData} />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map(tx => (
                    <div key={tx.id} className="flex flex-col space-y-2 border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{tx.id.slice(0, 8)}</span>
                      </div>
                      <div className="text-sm grid grid-cols-2 gap-2 pl-4 border-l-2">
                        {tx.entries.map((entry, i) => (
                           <div key={i} className="flex justify-between">
                             <span className="text-muted-foreground">{entry.account.name}</span>
                             <span className={entry.type === 'DEBIT' ? 'text-green-600' : 'text-red-600'}>
                               {entry.type === 'DEBIT' ? '+' : '-'}${entry.amount}
                             </span>
                           </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-center text-muted-foreground py-8">No transactions yet</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center p-3 border rounded-lg bg-card/50">
                      <div className="flex flex-col">
                         <span className="font-medium">{acc.name}</span>
                         <span className="text-[10px] text-muted-foreground font-mono">{acc.id}</span>
                      </div>
                      <span className="font-bold font-mono">${acc.balance}</span>
                    </div>
                  ))}
                  {accounts.length === 0 && <p className="text-sm text-muted-foreground">No accounts found</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Toaster />
    </main>
  )
}
