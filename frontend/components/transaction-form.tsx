"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import * as React from "react"
import { useState } from "react"
import { toast } from "sonner"

interface TransactionFormProps {
  onSuccess: () => void
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [description, setDescription] = useState("")
  const [reference, setReference] = useState("")
  const [entries, setEntries] = useState([{ accountId: "", amount: "", type: "DEBIT" }, { accountId: "", amount: "", type: "CREDIT" }])

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

      toast.success("Transaction recorded successfully")
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Transaction</CardTitle>
        <CardDescription>Record a new double-entry transaction.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g. Server Payment" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference</label>
              <Input value={reference} onChange={e => setReference(e.target.value)} required placeholder="e.g. INV-001" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Entries</label>
              <Button type="button" variant="outline" size="sm" onClick={addEntry}>Add Entry</Button>
            </div>
            {entries.map((entry, index) => (
              <div key={index} className="flex gap-2 items-start">
                <Input 
                  className="flex-1" 
                  placeholder="Account ID" 
                  value={entry.accountId} 
                  onChange={e => updateEntry(index, "accountId", e.target.value)} 
                  required 
                />
                <Input 
                  className="w-32" 
                  type="number" 
                  placeholder="Amount" 
                  step="0.01" 
                  min="0"
                  value={entry.amount} 
                  onChange={e => updateEntry(index, "amount", e.target.value)} 
                  required 
                />
                <select 
                  className="h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={entry.type}
                  onChange={e => updateEntry(index, "type", e.target.value)}
                >
                  <option value="DEBIT">Debit</option>
                  <option value="CREDIT">Credit</option>
                </select>
                {entries.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeEntry(index)}>
                    &times;
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Transaction
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
