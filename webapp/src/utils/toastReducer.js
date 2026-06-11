// Reducer pur de la pile de toasts. kind: 'ok' | 'err'.
let nextId = 0;

export const addToast = (message, kind = 'ok') => ({ type: 'add', message, kind });
export const startLeaving = (id) => ({ type: 'leaving', id });
export const removeToast = (id) => ({ type: 'remove', id });

export const toastReducer = (state, action) => {
  switch (action.type) {
    case 'add':
      nextId += 1;
      return [...state, { id: nextId, message: action.message, kind: action.kind, leaving: false }];
    case 'leaving':
      return state.map((t) => (t.id === action.id ? { ...t, leaving: true } : t));
    case 'remove':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
};
