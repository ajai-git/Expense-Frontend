import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';

import { ExpenseTemplate } from '../types';

import {
  templatesApi,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from '../lib/templatesApi';

import { useApp } from './AppContext';

import {
  EMPTY_TEMPLATE_FORM,
  TemplateForm,
} from './Templatesslice.constants';


// ============================================================
// State
// ============================================================


export interface TemplateEmployeeAllocationPayload {
  employee_id: string;
  amount: number;
}

export interface TemplateRowPayload {
  expense_name_id: string;
  category_id: string;
  default_amount: number;
  employee_required: boolean;
  employee_allocations: TemplateEmployeeAllocationPayload[];
  remarks: string;
  sequence: number;
}


interface TemplatesState {
  items: ExpenseTemplate[];
  loading: boolean;
  saving: boolean;
  error: string | null;

  previewTemplate: ExpenseTemplate | null;

  addModalOpen: boolean;

  form: TemplateForm;
}


// ============================================================
// Actions
// ============================================================

type TemplatesAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: ExpenseTemplate[] }
  | { type: 'FETCH_ERROR'; payload: string }

  | { type: 'OPEN_PREVIEW'; payload: ExpenseTemplate }
  | { type: 'CLOSE_PREVIEW' }

  | { type: 'OPEN_ADD_MODAL' }
  | { type: 'CLOSE_ADD_MODAL' }

  | { type: 'SET_FORM'; payload: Partial<TemplateForm> }

  | { type: 'SAVE_START' }
  | { type: 'SAVE_END' }

  | { type: 'UPSERT_ITEM'; payload: ExpenseTemplate };


// ============================================================
// Initial State
// ============================================================

const initialState: TemplatesState = {
  items: [],

  loading: true,

  saving: false,

  error: null,

  previewTemplate: null,

  addModalOpen: false,

  form: EMPTY_TEMPLATE_FORM,
};


// ============================================================
// Reducer
// ============================================================

function reducer(
  state: TemplatesState,
  action: TemplatesAction
): TemplatesState {

  switch (action.type) {

    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };


    case 'FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        items: action.payload,
      };


    case 'FETCH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };


    case 'OPEN_PREVIEW':
      return {
        ...state,
        previewTemplate: action.payload,
      };


    case 'CLOSE_PREVIEW':
      return {
        ...state,
        previewTemplate: null,
      };


    case 'OPEN_ADD_MODAL':
      return {
        ...state,
        addModalOpen: true,
        form: EMPTY_TEMPLATE_FORM,
      };


    case 'CLOSE_ADD_MODAL':
      return {
        ...state,
        addModalOpen: false,
      };


    case 'SET_FORM':
      return {
        ...state,
        form: {
          ...state.form,
          ...action.payload,
        },
      };


    case 'SAVE_START':
      return {
        ...state,
        saving: true,
      };


    case 'SAVE_END':
      return {
        ...state,
        saving: false,
      };


    case 'UPSERT_ITEM': {
      const exists = state.items.some(
        item => item.id === action.payload.id
      );

      const items = exists
        ? state.items.map(item =>
          item.id === action.payload.id
            ? action.payload
            : item
        )
        : [...state.items, action.payload];

      return {
        ...state,
        items,
      };
    }


    default:
      return state;
  }
}


// ============================================================
// Context
// ============================================================

interface TemplatesContextValue {
  state: TemplatesState;

  openPreview: (template: ExpenseTemplate) => void;

  closePreview: () => void;

  openAddModal: () => void;

  closeAddModal: () => void;

  setForm: (patch: Partial<TemplateForm>) => void;

  refresh: () => Promise<void>;

  save: (rows: TemplateRowPayload[]) => Promise<boolean>;

  toggleActive: (template: ExpenseTemplate) => Promise<void>;
}


const TemplatesContext =
  createContext<TemplatesContextValue | null>(null);


// ============================================================
// Provider
// ============================================================

export function TemplatesProvider({
  children,
}: {
  children: ReactNode;
}) {

  const [state, dispatch] = useReducer(
    reducer,
    initialState
  );

  const { notify } = useApp();


  // ==========================================================
  // Refresh Templates
  // ==========================================================

  const refresh = useCallback(async () => {

    dispatch({
      type: 'FETCH_START',
    });

    try {

      const data = await templatesApi.list(false);

      dispatch({
        type: 'FETCH_SUCCESS',
        payload: data,
      });

    } catch (e: unknown) {

      const message =
        e instanceof Error
          ? e.message
          : 'Failed to load templates';

      dispatch({
        type: 'FETCH_ERROR',
        payload: message,
      });

      notify(message, 'error');
    }

  }, [notify]);


  // ==========================================================
  // Initial Load
  // ==========================================================

  useEffect(() => {

    refresh();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // ==========================================================
  // Modal / Preview
  // ==========================================================

  const openPreview = (
    template: ExpenseTemplate
  ) => {

    dispatch({
      type: 'OPEN_PREVIEW',
      payload: template,
    });
  };


  const closePreview = () => {

    dispatch({
      type: 'CLOSE_PREVIEW',
    });
  };


  const openAddModal = () => {

    dispatch({
      type: 'OPEN_ADD_MODAL',
    });
  };


  const closeAddModal = () => {

    dispatch({
      type: 'CLOSE_ADD_MODAL',
    });
  };


  // ==========================================================
  // Form
  // ==========================================================

  const setForm = (
    patch: Partial<TemplateForm>
  ) => {

    dispatch({
      type: 'SET_FORM',
      payload: patch,
    });
  };


  // ==========================================================
  // Create Template
  // ==========================================================

  const save = useCallback(
    async (rows: TemplateRowPayload[]): Promise<boolean> => {
      const { form } = state;

      // -----------------------------
      // Basic validation
      // -----------------------------

      if (!form.template_name.trim()) {
        notify('Template name is required', 'error');
        return false;
      }

      if (!form.location_id) {
        notify('Location is required', 'error');
        return false;
      }

      if (!rows.length) {
        notify('Please add at least one expense row', 'error');
        return false;
      }

      dispatch({
        type: 'SAVE_START',
      });

      try {
        const payload: CreateTemplatePayload = {
          template_name: form.template_name.trim(),
          location_id: form.location_id,
          rows,
          active: true,
        };

        console.log('===== TEMPLATE CREATE PAYLOAD =====');
        console.log(JSON.stringify(payload, null, 2));
        console.log('===================================');

        const created = await templatesApi.create(payload);

        console.log('===== TEMPLATE CREATE RESPONSE =====');
        console.log(created);
        console.log('====================================');

        dispatch({
          type: 'UPSERT_ITEM',
          payload: created,
        });

        notify('Template created successfully', 'success');

        dispatch({
          type: 'CLOSE_ADD_MODAL',
        });

        return true;

      } catch (e: unknown) {
        console.error('===== TEMPLATE CREATE ERROR =====');
        console.error(e);
        console.error('=================================');

        const message =
          e instanceof Error
            ? e.message
            : 'Failed to create template';

        notify(message, 'error');

        return false;

      } finally {
        dispatch({
          type: 'SAVE_END',
        });
      }
    },
    [state, notify]
  );


  // ==========================================================
  // Toggle Active
  // ==========================================================

  const toggleActive = useCallback(
    async (
      template: ExpenseTemplate
    ) => {

      try {

        const updated =
          await templatesApi.update(
            template.id,
            {
              active: !template.active,
            } as UpdateTemplatePayload
          );


        dispatch({
          type: 'UPSERT_ITEM',
          payload: updated,
        });


        notify(
          `Template ${!template.active
            ? 'activated'
            : 'deactivated'
          }`
        );

      } catch (e: unknown) {

        const message =
          e instanceof Error
            ? e.message
            : 'Update failed';


        notify(
          message,
          'error'
        );
      }
    },
    [notify]
  );


  // ==========================================================
  // Context Value
  // ==========================================================

  const value: TemplatesContextValue = {

    state,

    openPreview,

    closePreview,

    openAddModal,

    closeAddModal,

    setForm,

    refresh,

    save,

    toggleActive,
  };


  return (
    <TemplatesContext.Provider value={value}>
      {children}
    </TemplatesContext.Provider>
  );
}


// ============================================================
// Hook
// ============================================================

export function useTemplates() {

  const ctx =
    useContext(TemplatesContext);


  if (!ctx) {

    throw new Error(
      'useTemplates must be used inside TemplatesProvider'
    );
  }


  return ctx;
}