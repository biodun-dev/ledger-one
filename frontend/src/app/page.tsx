"use client"

import { TransactionForm } from "@/components/transaction-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatePresence, motion } from "framer-motion"
import { Activity, ArrowDownLeft, ArrowUpRight, History, Wallet } from "lucide-react"
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
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const accRes = await fetch("http://localhost:3001/ledger/accounts")
      const txRes = await fetch("http://localhost:3001/ledger/transactions")
      
      if (accRes.ok) setAccounts(await accRes.json())
      if (txRes.ok) setTransactions(await txRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[70%] h-[70%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[25%] -right-[10%] w-[70%] h-[70%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-20 space-y-12">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        >
           <div className="space-y-1">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-primary/10 rounded-xl">
                 <Wallet className="w-6 h-6 text-primary" />
               </div>
               <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                 LedgerOne
               </h1>
             </div>
             <p className="text-zinc-400 text-lg">Next-gen double-entry accounting engine</p>
           </div>

           <div className="flex items-center gap-4 bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 p-2 rounded-2xl">
             <div className="px-4 py-2 text-sm font-medium text-zinc-400 border-r border-zinc-800">
               Live Status
             </div>
             <div className="flex items-center gap-2 px-4 py-2">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               <span className="text-sm font-semibold text-emerald-500">Operational</span>
             </div>
           </div>
        </motion.header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-8 lg:grid-cols-[1fr_380px]"
        >
          <div className="space-y-8">
            <motion.div variants={itemVariants}>
              <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 shadow-2xl">
                <TransactionForm onSuccess={fetchData} />
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <Card className="bg-zinc-900/40 backdrop-blur-xl border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="border-b border-zinc-800/50 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <History className="w-5 h-5 text-zinc-400" />
                      <CardTitle className="text-xl font-semibold">Transaction Ledger</CardTitle>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest">{transactions.length} entries</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-zinc-800/30">
                    <AnimatePresence mode="popLayout">
                      {transactions.map((tx) => (
                        <motion.div 
                          key={tx.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="group px-8 py-6 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-1">
                              <p className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                                {tx.description}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString()}
                              </p>
                            </div>
                            <span className="text-[10px] font-mono bg-zinc-800 group-hover:bg-zinc-700 text-zinc-400 group-hover:text-zinc-200 px-2 py-1 rounded transition-colors uppercase">
                              TX-{tx.id.slice(0, 8)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tx.entries.map((entry, i) => (
                               <div key={i} className="flex items-center justify-between bg-zinc-950/50 border border-zinc-800/50 p-3 rounded-xl">
                                 <span className="text-sm text-zinc-400">{entry.account.name}</span>
                                 <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${
                                   entry.type === 'DEBIT' ? 'text-emerald-400' : 'text-rose-400'
                                 }`}>
                                   {entry.type === 'DEBIT' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                                   <span>{entry.type === 'DEBIT' ? '+' : '-'}${entry.amount}</span>
                                 </div>
                               </div>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {transactions.length === 0 && !loading && (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-4">
                        <Activity className="w-12 h-12 opacity-20" />
                        <p className="text-lg">No transactions found in the ledger</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="space-y-8">
            <Card className="bg-zinc-900/40 backdrop-blur-xl border-zinc-800/50 rounded-3xl shadow-2xl sticky top-8">
              <CardHeader className="border-b border-zinc-800/50 px-8 py-6">
                <CardTitle className="text-xl font-semibold flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-zinc-400" />
                  Accounts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {accounts.map(acc => (
                    <motion.div 
                      key={acc.id} 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex justify-between items-center p-4 border border-zinc-800/50 rounded-2xl bg-zinc-950/30 hover:bg-zinc-900/50 hover:border-zinc-700/50 transition-all cursor-default group"
                    >
                      <div className="flex flex-col gap-0.5">
                         <span className="font-semibold text-zinc-200 tracking-tight group-hover:text-white">{acc.name}</span>
                         <span className="text-[10px] text-zinc-500 font-mono uppercase opacity-60">ID: {acc.id.slice(0, 8)}</span>
                      </div>
                      <div className="font-bold font-mono text-lg text-primary bg-primary/5 px-3 py-1 rounded-lg">
                        ${acc.balance}
                      </div>
                    </motion.div>
                  ))}
                  {accounts.length === 0 && !loading && (
                    <p className="text-sm text-zinc-500 text-center py-4">No accounts active</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="p-8 rounded-3xl border border-primary/10 bg-primary/5 space-y-4">
              <h3 className="font-semibold text-primary">Pro Tip</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                LedgerOne ensures ACID compliance for every transaction. Debit and credit entries are strictly validated before atomic commit.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
      <Toaster theme="dark" position="top-right" />
    </main>
  )
}
