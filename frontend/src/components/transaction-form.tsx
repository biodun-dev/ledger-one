"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Check, Copy, Loader2 } from "lucide-react"
import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"

interface TransactionFormProps {
  onSuccess: () => void
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [description, setDescription] = useState("")
  const [reference, setReference] = useState("")
  const [entries, setEntries] = useState([{ accountId: "", amount: "", type: "DEBIT" }, { accountId: "", amount: "", type: "CREDIT" }])

  const exampleUuid = "550e8400-e29b-41d4-a716-446655440000"

  const handleCopy = () => {
    navigator.clipboard.writeText(exampleUuid)
    setCopied(true)
    toast.success("Example UUID copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const addEntry = () => {
    setEntries([...entries, { accountId: "", amount: "", type: "DEBIT" }])
  }

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index))
  }

  const updateEntry = (index: number, field: string, value: string) => {
    const newEntries = [...entries]
    newEntries[index] = { ...newEntries[index], [field]: value }
    setEntries(newEntries)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Generate Idempotency Key (simple client-side uuid for demo)
    const idempotencyKey = crypto.randomUUID()

    // Client-side validation: UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const invalidAccounts = entries.filter(e => !uuidRegex.test(e.accountId))
    
    if (invalidAccounts.length > 0) {
      toast.error("Invalid Account IDs", {
        description: "Please ensure all Account IDs are valid UUIDs."
      })
      setIsLoading(false)
      return
    }

    // Client-side validation: Debits must equal Credits
    const totalDebits = entries
      .filter(e => e.type === "DEBIT")
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    const totalCredits = entries
      .filter(e => e.type === "CREDIT")
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      toast.error("Unbalanced Transaction", {
        description: `Total Debits ($${totalDebits.toFixed(2)}) must equal Total Credits ($${totalCredits.toFixed(2)}).`
      })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("http://localhost:3001/ledger/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify({
          description,
          reference,
          entries: entries.map(e => ({
            ...e,
            amount: parseFloat(e.amount)
          }))
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create transaction")
      }

      const data = await response.json()
      if (data.status === 'ACCEPTED') {
        toast.message("Transaction Queued", {
          description: `Job ID: ${data.jobId}. Processing in background.`
        })
      } else {
        toast.success("Transaction recorded successfully")
      }

      setDescription("")
      setReference("")
      setEntries([{ accountId: "", amount: "", type: "DEBIT" }, { accountId: "", amount: "", type: "CREDIT" }])
      onSuccess()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-transparent border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Create Transaction</CardTitle>
        <CardDescription className="text-zinc-500 flex items-center justify-between">
          <span>Record a new double-entry transaction with ACID compliance.</span>
          <button 
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-2 group/copy text-[10px] font-mono bg-zinc-800/50 hover:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700/50 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
          >
            <span>{exampleUuid.slice(0, 13)}...</span>
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 group-hover/copy:scale-110 transition-transform" />}
          </button>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 px-0">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-400 ml-1">Description</label>
              <Input 
                className="bg-zinc-900/50 border-zinc-800 focus:ring-primary/20 transition-all h-11"
                value={description} 
                onChange={(e: { target: { value: React.SetStateAction<string> } }) => setDescription(e.target.value)} 
                required 
                placeholder="e.g. Server Payment" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-400 ml-1">Reference</label>
              <Input 
                className="bg-zinc-900/50 border-zinc-800 focus:ring-primary/20 transition-all h-11"
                value={reference} 
                onChange={(e: { target: { value: React.SetStateAction<string> } }) => setReference(e.target.value)} 
                required 
                placeholder="e.g. INV-001" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-4">
                <label className="text-sm font-semibold text-zinc-400">Ledger Entries</label>
                {(() => {
                  const d = entries.filter(e => e.type === "DEBIT").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
                  const c = entries.filter(e => e.type === "CREDIT").reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
                  const balanced = Math.abs(d - c) < 0.001
                  return (
                    <div className={`flex items-center gap-2 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      balanced ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}>
                      {balanced ? 'Balanced' : `Unbalanced: Δ$${Math.abs(d - c).toFixed(2)}`}
                    </div>
                  )
                })()}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addEntry} className="border-zinc-800 hover:bg-zinc-800 text-xs h-8">
                Add Entry
              </Button>
            </div>
            <div className="space-y-3">
              {entries.map((entry, index) => {
                const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entry.accountId)
                return (
                  <div key={index} className="flex gap-3 items-start group">
                    <Input 
                      className={`flex-1 bg-zinc-950/50 border-zinc-800 focus:ring-primary/20 transition-all h-11 ${
                        entry.accountId && !isValidUuid ? 'border-rose-500/50 ring-1 ring-rose-500/20' : ''
                      }`} 
                      placeholder="Account ID (UUID)" 
                      value={entry.accountId} 
                      onChange={(e: { target: { value: string } }) => updateEntry(index, "accountId", e.target.value)} 
                      required 
                    />
                    <Input 
                      className="w-32 bg-zinc-950/50 border-zinc-800 focus:ring-primary/20 transition-all h-11" 
                      type="number" 
                      placeholder="Amount" 
                      step="0.01" 
                      min="0"
                      value={entry.amount} 
                      onChange={(e: { target: { value: string } }) => updateEntry(index, "amount", e.target.value)} 
                      required 
                    />
                    <div className="relative">
                      <select 
                        className="h-11 w-28 rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all appearance-none text-zinc-300"
                        value={entry.type}
                        onChange={e => updateEntry(index, "type", e.target.value)}
                      >
                        <option value="DEBIT">Debit</option>
                        <option value="CREDIT">Credit</option>
                      </select>
                    </div>
                    {entries.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(index)} className="h-11 w-11 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20">
                        &times;
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
        <CardFooter className="px-0 pb-0 pt-6">
          <Button type="submit" className="w-full h-12 text-base font-bold bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5 transition-all" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
            Confirm Transaction
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
