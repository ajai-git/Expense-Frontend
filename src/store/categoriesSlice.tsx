/**
 * Categories slice — feature-level store for the Categories page.
 *
 * Same Context + useReducer pattern as `AppContext`, kept as its own
 * Provider so it only mounts (and only fetches) where it's needed,
 * instead of living inside the global app state.
 *
 * Replaces the page-local useState + mongoDb calls with:
 *   - a typed reducer (loading/saving/error/items/search/modal/editing)
 *   - real API calls via `categoriesApi` (-> FastAPI /masters/categories)
 */
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { ExpenseCategory } from '../types';
import {
  categoriesApi,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../lib/categoriesApi';
import { useApp } from './AppContext';
import { EMPTY_CATEGORY } from './categoriesSlice.constants';

interface CategoriesState {
  items: ExpenseCategory[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  search: string;
  statusFilter: 'active' | 'inactive';
  modalOpen: boolean;
  editing: Partial<ExpenseCategory>;
}

type CategoriesAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: ExpenseCategory[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: 'active' | 'inactive' }
  | { type: 'OPEN_MODAL'; payload: Partial<ExpenseCategory> }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_EDITING'; payload: Partial<ExpenseCategory> }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_END' }
  | { type: 'UPSERT_ITEM'; payload: ExpenseCategory }
  | { type: 'REMOVE_ITEM'; payload: string };

const initialState: CategoriesState = {
  items: [],
  loading: true,
  saving: false,
  error: null,
  search: '',
  statusFilter: 'active',
  modalOpen: false,
  editing: EMPTY_CATEGORY,
};

function reducer(state: CategoriesState, action: CategoriesAction): CategoriesState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, items: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload };
    case 'OPEN_MODAL':
      return { ...state, modalOpen: true, editing: action.payload };
    case 'CLOSE_MODAL':
      return { ...state, modalOpen: false };
    case 'SET_EDITING':
      return { ...state, editing: { ...state.editing, ...action.payload } };
    case 'SAVE_START':
      return { ...state, saving: true };
    case 'SAVE_END':
      return { ...state, saving: false };
   case 'UPSERT_ITEM': {
      const exists = state.items.some(i => i.id === action.payload.id);

      const items = exists
        ? state.items.map(i =>
            i.id === action.payload.id
              ? action.payload
              : i
          )
        : [action.payload, ...state.items];

      return { ...state, items };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };
    default:
      return state;
  }
}

interface CategoriesContextValue {
  state: CategoriesState;
  filtered: ExpenseCategory[];
  setSearch: (v: string) => void;
  setStatusFilter: (v: 'active' | 'inactive') => void;
  openEdit: (item?: ExpenseCategory) => void;
  closeModal: () => void;
  setEditing: (patch: Partial<ExpenseCategory>) => void;
  refresh: () => Promise<void>;
  save: () => Promise<boolean>;
  toggleActive: (item: ExpenseCategory) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { notify } = useApp();

  const refresh = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const data = await categoriesApi.list(false);
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e) || 'Failed to load categories';
      dispatch({ type: 'FETCH_ERROR', payload: message });
      notify(message, 'error');
    }
  }, [notify]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSearch = (v: string) => dispatch({ type: 'SET_SEARCH', payload: v });

  const setStatusFilter = (v: 'active' | 'inactive') =>
  dispatch({ type: 'SET_STATUS_FILTER', payload: v });

  const openEdit = (item?: ExpenseCategory) =>
    dispatch({ type: 'OPEN_MODAL', payload: item ?? EMPTY_CATEGORY });

  const closeModal = () => dispatch({ type: 'CLOSE_MODAL' });

  const setEditing = (patch: Partial<ExpenseCategory>) =>
    dispatch({ type: 'SET_EDITING', payload: patch });

  const save = useCallback(async (): Promise<boolean> => {
    const { editing } = state;
    if (!editing.name?.trim()) {
      notify('Name are required', 'error');
      return false;
    }



    dispatch({ type: 'SAVE_START' });
    try {
      const payload: CreateCategoryPayload | UpdateCategoryPayload = {
  //      code: editing.code!.toUpperCase().trim(),
        name: editing.name!.trim(),
        description: editing.description,
        approval_required: editing.approval_required ?? false,
        receipt_required: editing.receipt_required ?? false,
        receipt_required_above_amount: editing.receipt_required_above_amount ?? 1000,
        daily_limit_amount: editing.daily_limit_amount || null,
        monthly_limit_amount: editing.monthly_limit_amount || null,
        color: editing.color ?? '#3B82F6',
        active: editing.active ?? true,
      };

      const saved = editing.id
        ? await categoriesApi.update(editing.id, payload)
        : await categoriesApi.create(payload as CreateCategoryPayload);

      dispatch({ type: 'UPSERT_ITEM', payload: saved });
      notify(`Category ${editing.id ? 'updated' : 'created'} successfully`);
      dispatch({ type: 'CLOSE_MODAL' });
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e) || 'Save failed';
      notify(message, 'error');
      return false;
    } finally {
      dispatch({ type: 'SAVE_END' });
    }
  }, [state, notify]);

  const toggleActive = useCallback(
    async (item: ExpenseCategory) => {
      try {
        const saved = await categoriesApi.update(item.id, { active: !item.active });
        dispatch({ type: 'UPSERT_ITEM', payload: saved });
        notify(`Category ${!item.active ? 'activated' : 'deactivated'}`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e) || 'Update failed';
        notify(message, 'error');
      }
    },
    [notify]
  );

  const removeCategory = useCallback(
    async (id: string) => {
      try {
        await categoriesApi.remove(id);
        dispatch({ type: 'REMOVE_ITEM', payload: id });
        notify('Category deleted successfully');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e) || 'Delete failed';
        notify(message, 'error');
      }
    },
    [notify]
  );

const filtered = state.items.filter(i => {
  const matchesSearch =
    i.name.toLowerCase().includes(state.search.toLowerCase()) ||
    i.code.toLowerCase().includes(state.search.toLowerCase());

  const matchesStatus =
    state.statusFilter === 'active'
      ? i.active
      : !i.active;

  return matchesSearch && matchesStatus;
});

  const value: CategoriesContextValue = {
    state,
    filtered,
    setSearch,
    setStatusFilter,
    openEdit,
    closeModal,
    setEditing,
    refresh,
    save,
    toggleActive,
    removeCategory,
  };

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used inside CategoriesProvider');
  return ctx;
}