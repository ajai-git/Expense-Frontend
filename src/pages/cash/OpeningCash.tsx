import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Wallet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react';

import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { api } from '../../lib/api';
import { getLocations } from '../../lib/locationApi';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

interface Location {
  locationId: string;
  branchName: string;
  aliasName?: string;
  status: string;
  [key: string]: unknown;
}

type CashSession = {
  id: string;
  location_id: string;
  user_id: string;
  date: string;
  opening_balance: number;
  current_balance: number;
  closing_balance: number | null;
  total_expenses: number;
  variance: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  user_name?: string;
};

export function OpeningCash() {
  const { notify } = useApp();

  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);

  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [form, setForm] = useState({
    location_id: '',
    opening_balance: '',
    shift: 'morning',
    notes: '',
  });


  const handleOpeningCashEnter = (
    e: React.KeyboardEvent<HTMLElement>
  ) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    const fields = Array.from(
      document.querySelectorAll<HTMLElement>(
        '.opening-cash-form-field'
      )
    );

    const currentIndex = fields.indexOf(
      e.currentTarget
    );

    if (currentIndex === -1) return;

    const nextField = fields[currentIndex + 1];

    if (nextField) {
      nextField.focus();
    } else {
      document
        .getElementById('opening-cash-submit-button')
        ?.focus();
    }
  };

  const resetCashForm = () => {
    setForm({
      location_id: '',
      opening_balance: '',
      shift: 'morning',
      notes: '',
    });
  };



  // ─────────────────────────────────────────────
  // Load Locations
  // ─────────────────────────────────────────────

  const fetchLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);

      const data = await getLocations();

      console.log('OPENING CASH LOCATIONS:', data);

      const normalizedLocations: Location[] = Array.isArray(data)
        ? data.map((location: any) => ({
          locationId:
            location.locationId ??
            location.location_id ??
            location.id ??
            '',
          branchName:
            location.branchName ??
            location.branch_name ??
            location.name ??
            '',
          aliasName:
            location.aliasName ??
            location.alias_name ??
            '',
          status: location.status,
          type: location.type,
        }))
        : [];

      const activeLocations = normalizedLocations.filter(
        location =>
          location.locationId &&
          (
            !location.status ||
            location.status.toLowerCase() === 'active'
          )
      );

      setLocations(activeLocations);
    } catch (error) {
      console.error('OPENING CASH LOCATION ERROR:', error);

      notify(
        error instanceof Error
          ? error.message
          : 'Failed to load locations',
        'error'
      );

      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  }, [notify]);

  // ─────────────────────────────────────────────
  // Load Cash Sessions
  // ─────────────────────────────────────────────

  const fetchSessions = useCallback(

    async (date: string) => {
      try {
        setLoading(true);

        const data = await api.get<CashSession[]>(
          `/api/v1/cash/sessions?date_from=${date}&date_to=${date}`
        );

        setSessions(Array.isArray(data) ? data : []);
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : 'Failed to load cash sessions',
          'error'
        );

        setSessions([]);
      } finally {
        setLoading(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchSessions(selectedDate);
  }, [selectedDate, fetchSessions]);


  useEffect(() => {
    if (!modal) return;

    const timer = setTimeout(() => {
      document
        .getElementById('opening-cash-location')
        ?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [modal]);

  // ─────────────────────────────────────────────
  // Location helper
  // ─────────────────────────────────────────────

  function getLocationName(locationId: string) {
    const location = locations.find(
      l => l.locationId === locationId
    );

    if (locationsLoading) {
      return 'Loading...';
    }

    return (
      location?.branchName ||
      location?.aliasName ||
      locationId
    );
  }

  // ─────────────────────────────────────────────
  // Create Cash Session
  // ─────────────────────────────────────────────

  async function createSession() {
    if (!form.location_id) {
      notify('Location is required', 'error');
      return;
    }

    if (!form.opening_balance) {
      notify('Opening cash is required', 'error');
      return;
    }

    const amount = Number(form.opening_balance);

    if (Number.isNaN(amount) || amount < 0) {
      notify('Enter a valid opening cash amount', 'error');
      return;
    }

    const existing = sessions.find(
      session =>
        session.location_id === form.location_id
    );

    if (existing) {
      notify(
        'An open cash session already exists for this location today',
        'error'
      );
      return;
    }

    try {
      setSaving(true);

      await api.post<CashSession>(
        '/api/v1/cash/sessions',
        {
          location_id: form.location_id,
          opening_balance: amount,
          date: selectedDate,
          notes: form.notes || null,
        }
      );

      notify('Opening cash session created successfully');

      setModal(false);

      setForm({
        location_id: '',
        opening_balance: '',
        shift: 'morning',
        notes: '',
      });

      await fetchSessions(selectedDate);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Failed to create cash session',
        'error'
      );
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────

  const totalOpening = sessions.reduce(
    (sum, session) =>
      sum + (session.opening_balance || 0),
    0
  );

  const totalBalance = sessions.reduce(
    (sum, session) =>
      sum + (session.current_balance || 0),
    0
  );

  const totalExpenses = sessions.reduce(
    (sum, session) =>
      sum + (session.total_expenses || 0),
    0
  );

  return (
    <div className="page-transition">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Opening Cash
          </h1>

          <p className="page-subtitle">
            Manage daily cash sessions by location
          </p>
        </div>

        <div className="flex items-center gap-3">

          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => {
              const date = e.target.value;

              if (date > today) {
                notify('Future dates are not allowed', 'error');
                return;
              }

              setSelectedDate(date);
            }}
            className="input w-auto"
          />

          <button
            onClick={() =>
              fetchSessions(selectedDate)
            }
            className="btn-secondary"
          >
            <RefreshCw size={15} />
            Refresh
          </button>

          <button
            onClick={() => {
              resetCashForm();
              setModal(true);
            }}
            className="btn-primary"
          >
            <Plus size={15} />
            Open Cash Session
          </button>

        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Wallet
              size={20}
              className="text-blue-600"
            />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Total Opening
            </p>

            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(totalOpening)}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <AlertCircle
              size={20}
              className="text-red-500"
            />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Total Spent
            </p>

            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle
              size={20}
              className="text-emerald-600"
            />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Total Balance
            </p>

            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>

      </div>

      {/* Sessions table */}
      <div className="card overflow-hidden">

        <div className="p-4 border-b border-slate-100 flex items-center justify-between">

          <h3 className="font-semibold text-slate-800">
            Cash Sessions —{' '}
            {new Date(
              selectedDate
            ).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>

          <span className="text-sm text-slate-500">
            {sessions.length} sessions
          </span>

        </div>

        <table className="w-full">

          <thead>
            <tr className="border-b border-slate-100">

              <th className="table-header">
                Location
              </th>

              <th className="table-header">
                Opening
              </th>

              <th className="table-header">
                Expenses
              </th>

              <th className="table-header">
                Balance
              </th>

              <th className="table-header">
                Status
              </th>

            </tr>
          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td
                  colSpan={6}
                  className="text-center py-10 text-slate-400"
                >
                  Loading...
                </td>
              </tr>

            ) : sessions.length === 0 ? (

              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12"
                >

                  <Wallet
                    size={40}
                    className="mx-auto text-slate-300 mb-3"
                  />

                  <p className="text-slate-500 font-medium">
                    No cash sessions for this date
                  </p>

                  <p className="text-slate-400 text-sm mt-1">
                    Click "Open Cash Session" to get started
                  </p>

                </td>
              </tr>

            ) : (

              sessions.map(session => (

                <tr
                  key={session.id}
                  className="hover:bg-slate-50 transition-colors"
                >

                  <td className="table-cell">

                    <div className="flex items-center gap-2">

                      <Building2
                        size={15}
                        className="text-blue-500"
                      />

                      <div>
                        <span className="font-semibold text-slate-800">
                          {getLocationName(
                            session.location_id
                          )}
                        </span>

                        <p className="text-[11px] text-slate-400">
                          {session.location_id}
                        </p>
                      </div>

                    </div>

                  </td>

                  <td className="table-cell font-semibold text-slate-800">
                    {formatCurrency(
                      session.opening_balance
                    )}
                  </td>

                  <td className="table-cell text-red-600 font-medium">
                    {formatCurrency(
                      session.total_expenses || 0
                    )}
                  </td>

                  <td className="table-cell">

                    <span
                      className={`font-bold ${session.current_balance <
                        session.opening_balance * 0.2
                        ? 'text-red-600'
                        : 'text-emerald-700'
                        }`}
                    >
                      {formatCurrency(
                        session.current_balance
                      )}
                    </span>

                  </td>

                  <td className="table-cell">
                    <StatusBadge
                      status={session.status}
                    />
                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>
      </div>

      {/* Create session modal */}
      <Modal
        open={modal}
        onClose={() => {
          resetCashForm();
          setModal(false);
        }}
        title="Open Cash Session"
        size="md"
        footer={
          <>
            <button
              onClick={() => setModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              id="opening-cash-submit-button"
              onClick={createSession}
              disabled={saving}
              className="btn-primary"
            >
              {saving
                ? 'Creating...'
                : 'Submit Opening Cash'}
            </button>
          </>
        }
      >

        <div className="space-y-4">

          {/* Location */}
          <div>
            <label className="label">
              Location *
            </label>

            <select
              id="opening-cash-location"
              className="select opening-cash-form-field"
              value={form.location_id}
              disabled={locationsLoading}
              onChange={e =>
                setForm(p => ({
                  ...p,
                  location_id: e.target.value,
                }))
              }
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();

                  document
                    .getElementById('opening-cash-amount')
                    ?.focus();
                }
              }}
            >

              <option value="">
                {locationsLoading
                  ? 'Loading locations...'
                  : 'Select location'}
              </option>

              {locations.map(location => (
                <option
                  key={location.locationId}
                  value={location.locationId}
                >
                  {location.branchName}
                </option>
              ))}
            </select>
          </div>

          {/* Opening Balance */}
          <div>

            <label className="label">
              Opening Cash (₹) *
            </label>

            <input
              id="opening-cash-amount"
              type="number"
              min="0"
              className="input opening-cash-form-field"
              placeholder="0.00"
              value={form.opening_balance}
              onChange={e =>
                setForm(p => ({
                  ...p,
                  opening_balance: e.target.value,
                }))
              }
              onKeyDown={handleOpeningCashEnter}
            />

          </div>

          {/* Date */}
          {/* Date */}
          <div>
            <label className="label">
              Date
            </label>

            <input
              type="date"
              className="input bg-slate-100 cursor-not-allowed"
              value={selectedDate}
              disabled
            />
          </div>

          {/* Shift
          <div>

            <label className="label">
              Shift
            </label>

            <select
              className="select opening-cash-form-field"
              value={form.shift}
              onChange={e =>
                setForm(p => ({
                  ...p,
                  shift: e.target.value,
                }))
              }
              onKeyDown={handleOpeningCashEnter}
            >

              <option value="morning">
                Morning
              </option>

              <option value="afternoon">
                Afternoon
              </option>

              <option value="evening">
                Evening
              </option>

              <option value="night">
                Night
              </option>

            </select>

          </div> */}

          {/* Notes */}
          <div>

            <label className="label">
              Notes
            </label>

            <textarea
              className="input resize-none opening-cash-form-field"
              rows={3}
              placeholder="Enter notes..."
              value={form.notes}
              onChange={e =>
                setForm(p => ({
                  ...p,
                  notes: e.target.value,
                }))
              }
              onKeyDown={handleOpeningCashEnter}
            />

          </div>

        </div>

      </Modal>

    </div>
  );
}