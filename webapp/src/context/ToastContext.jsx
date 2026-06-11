import { useEffect, useMemo, useReducer } from 'react';
import { toastReducer, addToast, startLeaving, removeToast } from '../utils/toastReducer.js';
import { ToastContext } from './toast-context.js';

const DISPLAY_MS = 3500;
const LEAVE_MS = 350;

// Timer one-shot attaché à la vie du composant (volontairement sans deps :
// chaque toast est monté une seule fois avec son message figé).
const useTimeout = (fn, ms) => {
  useEffect(() => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

const Toast = ({ toast: t, dispatch }) => {
  useTimeout(() => dispatch(startLeaving(t.id)), DISPLAY_MS);
  useTimeout(() => dispatch(removeToast(t.id)), DISPLAY_MS + LEAVE_MS);
  return (
    <div className={`toast${t.leaving ? ' leaving' : ''}`}>
      <span className={`toast-dot ${t.kind}`} />
      {t.message}
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const toast = useMemo(
    () => ({
      success: (message) => dispatch(addToast(message, 'ok')),
      error: (message) => dispatch(addToast(message, 'err')),
    }),
    [],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toaster">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} dispatch={dispatch} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
