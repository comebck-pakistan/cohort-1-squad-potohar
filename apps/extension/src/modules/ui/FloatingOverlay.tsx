import React from "react"

type Props = {
  children: React.ReactNode
  onClose: () => void
}

export function FloatingOverlay({ children, onClose }: Props) {
  return (
    <div className="fixed bottom-8 right-8 z-[999999] w-[360px] max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-lg border border-slate-200 border-l-[6px] border-l-blue-500 bg-white p-5 font-sans shadow-[0_12px_35px_rgba(15,23,42,0.18)] transition-all duration-300">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          aria-label="Close"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={onClose}>
          x
        </button>
      </div>
      {children}
    </div>
  )
}
