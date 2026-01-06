"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Plus, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

interface AccountCreateProps {
  onAccountCreated: () => void
}

export function AccountCreate({ onAccountCreated }: AccountCreateProps) {
  const [isExpanding, setIsExpanding] = useState(false)
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch("http://localhost:3001/ledger/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        toast.success(`Account "${name}" created successfully`)
        setName("")
        setIsExpanding(false)
        onAccountCreated()
      } else {
        const error = await response.json()
        toast.error(error.message || "Failed to create account")
      }
    } catch (error) {
      toast.error("Network error. Please check if the backend is running.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isExpanding ? (
          <motion.div
            key="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsExpanding(true)}
              className="w-full border-zinc-800 hover:bg-zinc-800 text-xs h-9 gap-2 rounded-xl group"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
              <span>Add New Account</span>
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onSubmit={handleSubmit}
            className="p-4 border border-zinc-700/50 rounded-2xl bg-zinc-900/50 backdrop-blur-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">New Account</span>
              <button 
                type="button" 
                onClick={() => setIsExpanding(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <Input
              autoFocus
              placeholder="e.g. Cash, Bank, Revenue"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 bg-black border-zinc-800 focus:ring-primary/20 transition-all text-sm"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !name.trim()}
              className="w-full h-9 bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all"
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create Account"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
