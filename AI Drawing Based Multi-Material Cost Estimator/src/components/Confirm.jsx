import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/**
 * In-app confirmation dialog.
 *
 * Deliberately NOT window.confirm(): native dialogs are suppressed in embedded
 * browsers and webviews, where confirm() silently returns false — the action
 * then never runs and the button looks broken. This renders in the page, so it
 * behaves the same everywhere.
 *
 *   const confirm = useConfirm()
 *   if (await confirm({ title, message, confirmLabel, tone })) { ... }
 */
const Ctx = createContext(null)

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null)
  const btnRef = useRef(null)

  const ask = useCallback(
    (opts) => new Promise((resolve) => setReq({ tone: 'danger', confirmLabel: 'Confirm', ...opts, resolve })),
    [],
  )

  const close = useCallback((value) => {
    setReq((cur) => { cur?.resolve(value); return null })
  }, [])

  useEffect(() => {
    if (!req) return undefined
    btnRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false) }
      if (e.key === 'Enter') { e.preventDefault(); close(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [req, close])

  return (
    <Ctx.Provider value={ask}>
      {children}
      {req && (
        <div className="modal-overlay no-print" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(false) }}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <h3 id="confirm-title">{req.title}</h3>
            {req.message && <p className="modal-msg">{req.message}</p>}
            {req.detail && <p className="modal-detail">{req.detail}</p>}
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => close(false)}>{req.cancelLabel || 'Cancel'}</button>
              <button ref={btnRef} className={`btn ${req.tone === 'danger' ? 'danger-solid' : 'primary'}`} onClick={() => close(true)}>
                {req.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useConfirm() {
  const ask = useContext(Ctx)
  if (!ask) throw new Error('useConfirm must be used inside ConfirmProvider')
  return ask
}
