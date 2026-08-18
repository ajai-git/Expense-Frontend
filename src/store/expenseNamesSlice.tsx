/**
 * Expense Names slice — feature-level store for the Expense Names page.
 *
 * Same Context + useReducer pattern as `categoriesSlice` / `AppContext`.
 * Fetches both expense names and the active category list (for the
 * filter dropdown + form select) on mount.
 */
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { ExpenseName, ExpenseCategory } from '../types';
import {
  expenseNamesApi,
  CreateExpenseNamePayload,
  UpdateExpenseNamePayload,
} from '../lib/expenseNamesApi';
import { categoriesApi } from '../lib/categoriesApi';
import { useApp } from './AppContext';
import { EMPTY_EXPENSE_NAME } from './expenseNamesSlice.constants';

interface ExpenseNamesState {
  items: ExpenseName[];
  categories: ExpenseCategory[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  search: string;
  filterCat: string;
  statusFilter: 'active' | 'inactive';
  modalOpen: boolean;
  editing: Partial<ExpenseName>;
}

type ExpenseNamesAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: { items: ExpenseName[]; categories: ExpenseCategory[] } }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_FILTER_CAT'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: 'active' | 'inactive' }
  | { type: 'OPEN_MODAL'; payload: Partial<ExpenseName> }
  | { type: 'CLOSE_MODAL' }
  | { type: 'SET_EDITING'; payload: Partial<ExpenseName> }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_END' }
  | { type: 'UPSERT_ITEM'; payload: ExpenseName };

const initialState: ExpenseNamesState = {
  items: [],
  categories: [],
  loading: true,
  saving: false,
  error: null,
  search: '',
  filterCat: '',
  statusFilter: 'active',
  modalOpen: false,
  editing: EMPTY_EXPENSE_NAME,
};

function reducer(state: ExpenseNamesState, action: ExpenseNamesAction): ExpenseNamesState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        items: action.payload.items,
        categories: action.payload.categories,
      };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SET_SEARCH':
      return { ...state, search: action.payload };
    case 'SET_FILTER_CAT':
      return { ...state, filterCat: action.payload };

    case 'SET_STATUS_FILTER':
      return {
        ...state,
        statusFilter: action.payload,
      };

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
        ? state.items.map(i => (i.id === action.payload.id ? action.payload : i))
        : [...state.items, action.payload];
      return { ...state, items };
    }
    default:
      return state;
  }
}

interface ExpenseNamesContextValue {
  state: ExpenseNamesState;
  filtered: ExpenseName[];
  setSearch: (v: string) => void;
  setFilterCat: (v: string) => void;
  setStatusFilter: (value: 'active' | 'inactive') => void;
  openEdit: (item?: ExpenseName) => void;
  closeModal: () => void;
  setEditing: (patch: Partial<ExpenseName>) => void;
  refresh: () => Promise<void>;
  save: () => Promise<boolean>;
toggleActive: (item: ExpenseName) => Promise<boolean>;

}

const ExpenseNamesContext = createContext<ExpenseNamesContextValue | null>(null);

export function ExpenseNamesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { notify } = useApp();

  const refresh = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const [items, categories] = await Promise.all([
        expenseNamesApi.list(undefined, false),
        categoriesApi.list(true),
      ]);
      dispatch({ type: 'FETCH_SUCCESS', payload: { items, categories } });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load expense names';
      dispatch({ type: 'FETCH_ERROR', payload: message });
      notify(message, 'error');
    }
  }, [notify]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSearch = (v: string) => dispatch({ type: 'SET_SEARCH', payload: v });
  const setFilterCat = (v: string) => dispatch({ type: 'SET_FILTER_CAT', payload: v });

  const setStatusFilter = (value: 'active' | 'inactive') =>
  dispatch({
    type: 'SET_STATUS_FILTER',
    payload: value,
  });

  const openEdit = (item?: ExpenseName) =>
    dispatch({ type: 'OPEN_MODAL', payload: item ?? EMPTY_EXPENSE_NAME });

  const closeModal = () => dispatch({ type: 'CLOSE_MODAL' });

  const setEditing = (patch: Partial<ExpenseName>) =>
    dispatch({ type: 'SET_EDITING', payload: patch });

  const save = useCallback(async (): Promise<boolean> => {
    const { editing } = state;
 if (!editing.name?.trim() || !editing.category_id) {
  notify('Name and Category are required', 'error');
  return false;
}

    dispatch({ type: 'SAVE_START' });
    try {
      const payload: CreateExpenseNamePayload | UpdateExpenseNamePayload = {
        category_id: editing.category_id,
      //  code: editing.code!.toUpperCase().trim(),
        name: editing.name!.trim(),
        default_amount: editing.default_amount ?? 0,
        default_remarks: editing.default_remarks,
        employee_required: editing.employee_required ?? false,
        allow_multiple_employees: editing.allow_multiple_employees ?? false,
        driver_required: editing.driver_required ?? false,
        vehicle_required: editing.vehicle_required ?? false,
        route_required: editing.route_required ?? false,
        receipt_required: editing.receipt_required ?? false,
        approval_required: editing.approval_required ?? false,
        active: editing.active ?? true,
      };

      const saved = editing.id
        ? await expenseNamesApi.update(editing.id, payload as UpdateExpenseNamePayload)
        : await expenseNamesApi.create(payload as CreateExpenseNamePayload);

      dispatch({ type: 'UPSERT_ITEM', payload: saved });
      notify(`Expense name ${editing.id ? 'updated' : 'created'}`);
      dispatch({ type: 'CLOSE_MODAL' });
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      notify(message, 'error');
      return false;
    } finally {
      dispatch({ type: 'SAVE_END' });
    }
  }, [state, notify]);

  const filtered = state.items.filter(i => {
    const matchSearch =
      i.name.toLowerCase().includes(state.search.toLowerCase()) ||
      i.code.toLowerCase().includes(state.search.toLowerCase());
    const matchCat = !state.filterCat || i.category_id === state.filterCat;
    return matchSearch && matchCat;
  });

const toggleActive = useCallback(
  async (item: ExpenseName): Promise<boolean> => {
    try {
      const updated = await expenseNamesApi.updateStatus(
        item.id,
        !item.active
      );

      dispatch({
        type: 'UPSERT_ITEM',
        payload: updated,
      });

      notify(
        `Expense name ${
          updated.active ? 'activated' : 'deactivated'
        }`
      );

      return true;
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : 'Could not update status.';

      notify(message, 'error');
      return false;
    }
  },
  [notify]
);

  const value: ExpenseNamesContextValue = {
    state,
    filtered,
    setSearch,
    setFilterCat,
    setStatusFilter,
    openEdit,
    closeModal,
    setEditing,
    refresh,
    save,
    toggleActive,
  };



  return <ExpenseNamesContext.Provider value={value}>{children}</ExpenseNamesContext.Provider>;
}

export function useExpenseNames() {
  const ctx = useContext(ExpenseNamesContext);
  if (!ctx) throw new Error('useExpenseNames must be used inside ExpenseNamesProvider');
  return ctx;
}