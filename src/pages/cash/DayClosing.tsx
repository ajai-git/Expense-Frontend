import { useCallback, useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Building2,
  Wallet,
  X,
} from 'lucide-react';

import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
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

type Location = {
  locationId: string;
  branchName: string;
  aliasName?: string;
  status?: string;
  type?: string;
};

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
  closed_at?: string;
  closed_by?: string;
};

export function DayClosing() {
  const { notify } = useApp();

  const today = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );


  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [loading, setLoading] = useState(true);
  const [locationsLoading, setLocationsLoading] = useState(true);

  // Selected row for closing
  const [selectedSession, setSelectedSession] =
    useState<CashSession | null>(null);

  const [modal, setModal] = useState(false);

  const [physicalCash, setPhysicalCash] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─────────────────────────────────────────────
  // Location helper
  // ─────────────────────────────────────────────

  function getLocationName(locationId: string) {
    if (locationsLoading) {
      return 'Loading...';
    }

    const location = locations.find(
      location => location.locationId === locationId
    );

    return (
      location?.branchName ||
      location?.aliasName ||
      locationId
    );
  }

  // ─────────────────────────────────────────────
  // Load Locations
  // ─────────────────────────────────────────────

  const fetchLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);

      const data = await getLocations();

      const activeLocations = Array.isArray(data)
        ? data.filter(
          location =>
            !location.status ||
            location.status.toLowerCase() === 'active'
        )
        : [];

      setLocations(activeLocations);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Failed to load locations',
        'error'
      );
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

  // ─────────────────────────────────────────────
  // Initial load
  // ─────────────────────────────────────────────

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    fetchSessions(selectedDate);
  }, [selectedDate, fetchSessions]);

  // ─────────────────────────────────────────────
  // Open Closing Modal
  // ─────────────────────────────────────────────

  function openClosingModal(session: CashSession) {
    if (session.status !== 'open') {
      notify('This cash session is already closed', 'error');
      return;
    }

    setSelectedSession(session);

    setPhysicalCash('');
    setRemarks(session.notes || '');

    setModal(true);
  }

  // ─────────────────────────────────────────────
  // Close Modal
  // ─────────────────────────────────────────────

  function closeModal() {
    if (submitting) return;

    setModal(false);
    setSelectedSession(null);
    setPhysicalCash('');
    setRemarks('');
  }

  // ─────────────────────────────────────────────
  // Expected Closing
  // ─────────────────────────────────────────────

  const expectedClosing = selectedSession
    ? (selectedSession.opening_balance || 0) -
    (selectedSession.total_expenses || 0)
    : 0;

  const physical = Number(physicalCash) || 0;

  const variance =
    physical - expectedClosing;

  const hasVariance =
    physicalCash !== '' &&
    Math.abs(variance) > 0.01;

  // ─────────────────────────────────────────────
  // Submit Day Closing
  // ─────────────────────────────────────────────

  async function handleCloseDay() {
    if (!selectedSession) return;

    if (physicalCash === '') {
      notify(
        'Actual closing cash is required',
        'error'
      );
      return;
    }

    const amount = Number(physicalCash);

    if (Number.isNaN(amount) || amount < 0) {
      notify(
        'Enter a valid physical cash amount',
        'error'
      );
      return;
    }
    if (Math.abs(variance) > 0.01) {
      notify(
        'Actual closing cash must match the expected closing cash',
        'error'
      );
      return;
    }

    try {
      setSubmitting(true);

      await api.post(
        `/api/v1/cash/sessions/${selectedSession.id}/close`,
        {
          actual_cash: amount,
          notes: remarks.trim() || null,
        }
      );

      notify(
        'Day closing completed successfully'
      );

      closeModal();

      await fetchSessions(selectedDate);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Failed to close day',
        'error'
      );
    } finally {
      setSubmitting(false);
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

  const totalExpenses = sessions.reduce(
    (sum, session) =>
      sum + (session.total_expenses || 0),
    0
  );

  const totalExpectedClosing = sessions.reduce(
    (sum, session) =>
      sum +
      ((session.opening_balance || 0) -
        (session.total_expenses || 0)),
    0
  );

  const pendingCount = sessions.filter(
    session => session.status === 'open'
  ).length;

  const completedCount = sessions.filter(
    session => session.status !== 'open'
  ).length;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="page-transition">

      {/* Header */}
      <div className="page-header">

        <div>
          <h1 className="page-title">
            Day Closing
          </h1>

          <p className="page-subtitle">
            Verify physical cash and close daily cash sessions
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
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>

        </div>

      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        {/* Opening */}
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

        {/* Expenses */}
        <div className="card p-4 flex items-center gap-4">

          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <AlertTriangle
              size={20}
              className="text-red-500"
            />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Total Expenses
            </p>

            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(totalExpenses)}
            </p>
          </div>

        </div>

        {/* Expected */}
        <div className="card p-4 flex items-center gap-4">

          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <CheckCircle
              size={20}
              className="text-emerald-600"
            />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Expected Closing
            </p>

            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(
                totalExpectedClosing
              )}
            </p>
          </div>

        </div>

        {/* Sessions */}
        <div className="card p-4">

          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
            Sessions
          </p>

          <div className="flex items-center gap-4">

            <div>
              <p className="text-lg font-bold text-amber-600">
                {pendingCount}
              </p>

              <p className="text-xs text-slate-400">
                Pending
              </p>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div>
              <p className="text-lg font-bold text-emerald-600">
                {completedCount}
              </p>

              <p className="text-xs text-slate-400">
                Completed
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Table */}
      <div className="card overflow-hidden">

        <div className="p-4 border-b border-slate-100 flex items-center justify-between">

          <div>
            <h3 className="font-semibold text-slate-800">
              Cash Sessions
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              {new Date(
                selectedDate
              ).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          <span className="text-sm text-slate-500">
            {sessions.length} session
            {sessions.length !== 1
              ? 's'
              : ''}
          </span>

        </div>

        {loading ? (

          <div className="text-center py-16 text-slate-400">

            <RefreshCw
              size={28}
              className="animate-spin mx-auto mb-3"
            />

            <p>
              Loading cash sessions...
            </p>

          </div>

        ) : sessions.length === 0 ? (

          <div className="text-center py-16">

            <CalendarCheck
              size={48}
              className="mx-auto text-slate-300 mb-4"
            />

            <p className="text-slate-600 font-medium">
              No cash sessions for this date
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Open Cash must be created before Day Closing
            </p>

          </div>

        ) : (

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
                  Expected Closing
                </th>

                <th className="table-header">
                  Status
                </th>

                <th className="table-header text-right">
                  Action
                </th>

              </tr>
            </thead>

            <tbody>

              {sessions.map(session => {

                const expected =
                  (session.opening_balance || 0) -
                  (session.total_expenses || 0);

                const isOpen =
                  session.status === 'open';

                return (

                  <tr
                    key={session.id}
                    onClick={() =>
                      isOpen &&
                      openClosingModal(session)
                    }
                    className={`
                      border-b border-slate-50
                      transition-colors
                      ${isOpen
                        ? 'cursor-pointer hover:bg-blue-50/50'
                        : 'hover:bg-slate-50'
                      }
                    `}
                  >

                    {/* Location */}
                    <td className="table-cell">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Building2
                            size={15}
                            className="text-blue-600"
                          />
                        </div>

                        <div>

                          <p className="font-semibold text-slate-800">
                            {getLocationName(
                              session.location_id
                            )}
                          </p>

                          <p className="text-[11px] text-slate-400">
                            {session.location_id}
                          </p>

                        </div>

                      </div>

                    </td>

                    {/* Opening */}
                    <td className="table-cell font-semibold text-slate-800">
                      {formatCurrency(
                        session.opening_balance || 0
                      )}
                    </td>

                    {/* Expenses */}
                    <td className="table-cell font-medium text-red-600">
                      {formatCurrency(
                        session.total_expenses || 0
                      )}
                    </td>

                    {/* Expected */}
                    <td className="table-cell font-bold text-slate-800">
                      {formatCurrency(expected)}
                    </td>

                    {/* Status */}
                    <td className="table-cell">

                      <StatusBadge
                        status={session.status}
                      />

                    </td>

                    {/* Action */}
                    <td className="table-cell text-right">

                      {isOpen ? (

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openClosingModal(session);
                          }}
                          className="btn-primary text-xs px-3 py-2"
                        >
                          <CalendarCheck
                            size={14}
                          />
                          Close Day
                        </button>

                      ) : (

                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CheckCircle
                            size={14}
                          />
                          Completed
                        </span>

                      )}

                    </td>

                  </tr>

                );
              })}

            </tbody>

          </table>

        )}

      </div>

      {/* ─────────────────────────────────────────
          Day Closing Modal
      ───────────────────────────────────────── */}

      <Modal
        open={modal}
        onClose={closeModal}
        title="Day Closing"
        size="md"
        footer={
          <>
            <button
              onClick={closeModal}
              disabled={submitting}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              onClick={handleCloseDay}
              disabled={
                submitting ||
                !selectedSession ||
                physicalCash === '' ||
                hasVariance
              }
              className={`btn-primary ${hasVariance
                ? 'opacity-50 cursor-not-allowed'
                : ''
                }`}
            >
              <CalendarCheck size={15} />

              {submitting
                ? 'Closing...'
                : 'Close Day'}
            </button>
          </>
        }
      >

        {selectedSession && (

          <div className="space-y-5">

            {/* Selected Location */}
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <Building2
                    size={19}
                    className="text-blue-600"
                  />
                </div>

                <div>

                  <p className="font-semibold text-slate-800">
                    {getLocationName(
                      selectedSession.location_id
                    )}
                  </p>

                  <p className="text-xs text-slate-500">
                    {selectedSession.location_id}
                  </p>

                </div>

              </div>

              <StatusBadge
                status={selectedSession.status}
                size="md"
              />

            </div>

           {/* Date */}
            <div>
              <label className="label">
                Date
              </label>

              <input
                type="date"
                value={selectedSession.date}
                disabled
                className="input bg-slate-100 cursor-not-allowed"
              />
            </div>

            {/* Calculation */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">

              <div className="flex items-center justify-between">

                <span className="text-sm text-slate-600">
                  Opening Cash
                </span>

                <span className="font-semibold text-slate-800">
                  {formatCurrency(
                    selectedSession.opening_balance || 0
                  )}
                </span>

              </div>

              <div className="flex items-center justify-between">

                <span className="text-sm text-slate-600">
                  Total Expenses
                </span>

                <span className="font-semibold text-red-600">
                  - {formatCurrency(
                    selectedSession.total_expenses || 0
                  )}
                </span>

              </div>

              <div className="border-t border-slate-200 pt-3 flex items-center justify-between">

                <span className="text-sm font-semibold text-slate-700">
                  Expected Closing Cash
                </span>

                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(
                    expectedClosing
                  )}
                </span>

              </div>

            </div>

            {/* Physical Cash */}
            <div>

              <label className="label">
                Actual Closing Cash (₹) *
              </label>

              <input
                type="number"
                min="0"
                autoFocus
                className="input text-lg font-semibold"
                placeholder="Enter physical cash"
                value={physicalCash}
                onChange={e =>
                  setPhysicalCash(
                    e.target.value
                  )
                }
              />

            </div>

            {/* Variance */}
            {physicalCash !== '' && (

              <div
                className={`
                  p-4 rounded-xl flex items-center gap-3
                  ${hasVariance
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-emerald-50 border border-emerald-200'
                  }
                `}
              >

                {hasVariance ? (

                  <AlertTriangle
                    size={20}
                    className="text-amber-600 flex-shrink-0"
                  />

                ) : (

                  <CheckCircle
                    size={20}
                    className="text-emerald-600 flex-shrink-0"
                  />

                )}

                <div>

                  <p
                    className={`
                      text-sm font-semibold
                      ${hasVariance
                        ? 'text-amber-800'
                        : 'text-emerald-800'
                      }
                    `}
                  >
                    Variance:{' '}

                    {variance >= 0
                      ? '+'
                      : ''}

                    {formatCurrency(
                      variance
                    )}

                    {!hasVariance &&
                      ' (No Variance)'}
                  </p>

                  {hasVariance && (

                    <p className="text-xs text-amber-600 mt-0.5">

                      {variance > 0
                        ? 'Excess cash'
                        : 'Cash shortage'}

                    </p>

                  )}

                </div>

              </div>

            )}

            {/* Closing Remarks */}
            <div>

              <label className="label">
                Closing Remarks
              </label>

              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Enter closing remarks..."
                value={remarks}
                onChange={e =>
                  setRemarks(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

        )}

      </Modal>

    </div>
  );
}