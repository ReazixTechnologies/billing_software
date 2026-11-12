// Staff: a profile for each person, and their commission on the sales they
// attended (the invoice's "Attended By" box). Logic in utils/staff.js.
import { useState, useEffect, useMemo, useRef } from 'react';
import { UserCheck, Plus, Edit3, Save, ChevronRight, ChevronDown } from 'lucide-react';
import { getAllBills, getProfile, getStaff, saveStaff } from '../store';
import { formatCurrency, belongsToProfile, businessKeyOf } from '../utils';
import { periodRange } from '../utils/cashBook';
import { staffForBusiness, staffReport, validateStaff } from '../utils/staff';
import { toast } from './Toast';
import TableExport from './TableExport';

const PERIODS = [['month', 'This month'], ['lastMonth', 'Last month'], ['fy', 'This financial year'], ['all', 'All dates'], ['custom', 'Choose dates']];
const BLANK = { id: '', name: '', phone: '', role: '', joined: '', commission: '', active: true };
const newId = () => (globalThis.crypto?.randomUUID?.() || `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
const showDate = (d) => (d ? d.split('-').reverse().join('-') : '');

export default function StaffView() {
  const [profile, setProfile] = useState(null);
  const [all, setAll] = useState([]);       // every business's staff (saved as one list)
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);   // null = closed, else the record being added or edited
  const [problem, setProblem] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState('');     // staff id whose invoices are shown
  const [period, setPeriod] = useState('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const nameRef = useRef(null);

  useEffect(() => {
    Promise.all([getStaff(), getAllBills(), getProfile().catch(() => null)])
      .then(([staff, allBills, prof]) => {
        setProfile(prof);
        setAll(staff);
        setBills((allBills || []).filter((b) => belongsToProfile(b, prof)));
      })
      .catch(() => toast('Could not load staff', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (form) nameRef.current?.focus(); }, [form?.id, !!form]); // eslint-disable-line react-hooks/exhaustive-deps

  const staff = useMemo(() => staffForBusiness(all, profile)
    .sort((a, b) => (a.active === false) - (b.active === false) || a.name.localeCompare(b.name)), [all, profile]);
  const range = period === 'custom' ? custom : periodRange(period);
  const periodLabel = period === 'custom'
    ? [custom.from && showDate(custom.from), custom.to && showDate(custom.to)].filter(Boolean).join(' to ') || 'All dates'
    : PERIODS.find(([k]) => k === period)[1];
  const report = useMemo(() => staffReport({ bills, staff, from: range.from, to: range.to }), [bills, staff, range.from, range.to]);
  const totals = report.rows.reduce((t, r) => ({ sales: t.sales + r.sales, commission: t.commission + r.commission }), { sales: 0, commission: 0 });
  const unmatchedNames = [...new Set(report.unmatched.map((u) => u.attendedBy.trim()))];

  const startAdd = (name = '') => { setForm({ ...BLANK, name }); setProblem(''); };
  const startEdit = (s) => { setForm({ ...BLANK, ...s, commission: s.commission ?? '' }); setProblem(''); };

  const handleSave = async (e) => {
    e.preventDefault();
    const record = {
      ...form,
      id: form.id || newId(),
      name: form.name.trim().replace(/\s+/g, ' '),
      phone: form.phone.trim(),
      role: form.role.trim(),
      commission: form.commission === '' ? 0 : Number(form.commission),
      business: form.business ?? businessKeyOf(profile) ?? '',
    };
    const why = validateStaff(record, all);
    if (why) { setProblem(why); return; }
    const next = form.id ? all.map((s) => (s.id === form.id ? record : s)) : [...all, record];
    setSaving(true);
    try {
      await saveStaff(next);
      setAll(next);
      setForm(null);
      toast(form.id ? 'Staff updated' : 'Staff added', 'success');
    } catch {
      toast('Could not save. Is the app running?', 'error');
    } finally {
      setSaving(false);
    }
  };

  const muted = { color: 'var(--text-muted)', fontSize: '0.8rem' };
  const field = { margin: 0, flex: '1 1 160px', minWidth: 0 };
  const right = { textAlign: 'right', whiteSpace: 'nowrap' };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const exportRows = report.rows.map((r) => [r.staff.name, r.staff.role || '', r.staff.phone || '', r.count, r.clients, r.sales, Number(r.staff.commission) || 0, r.commission]);

  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">Your staff, and their commission on the sales they attended</p>
        </div>
        {!form && <button type="button" className="btn btn-primary" onClick={() => startAdd()}><Plus size={18} /> Add staff</button>}
      </div>

      {form && (
        <form className="glass-panel p-4 mb-6" onSubmit={handleSave} aria-label="Staff profile">
          <h3 className="section-title" style={{ marginTop: 0 }}>{form.id ? `Edit ${form.name || 'staff'}` : 'New staff'}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ ...field, flex: '2 1 200px' }}>
              <label className="form-label" htmlFor="staff-name">Name *</label>
              <input id="staff-name" ref={nameRef} type="text" className="form-input" maxLength={80} placeholder="As typed in Attended By"
                value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="form-group" style={field}>
              <label className="form-label" htmlFor="staff-phone">Phone</label>
              <input id="staff-phone" type="tel" className="form-input" maxLength={20}
                value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="form-group" style={field}>
              <label className="form-label" htmlFor="staff-role">Role</label>
              <input id="staff-role" type="text" className="form-input" maxLength={60} placeholder="e.g. Salesman, Cashier"
                value={form.role} onChange={(e) => set('role', e.target.value)} />
            </div>
            <div className="form-group" style={field}>
              <label className="form-label" htmlFor="staff-joined">Joining date</label>
              <input id="staff-joined" type="date" className="form-input"
                value={form.joined} onChange={(e) => set('joined', e.target.value)} />
            </div>
            <div className="form-group" style={{ ...field, flex: '1 1 120px' }}>
              <label className="form-label" htmlFor="staff-commission">Commission %</label>
              <input id="staff-commission" type="number" min="0" max="100" step="any" className="form-input" placeholder="0"
                value={form.commission} onChange={(e) => set('commission', e.target.value)} />
            </div>
          </div>
          {form.id && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.86rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.active === false} onChange={(e) => set('active', !e.target.checked)} />
              No longer works here (kept for their old sales; not suggested on new invoices)
            </label>
          )}
          {problem && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: '0.6rem 0 0' }}>{problem}</p>}
          <p style={{ ...muted, margin: '0.6rem 0 0' }}>
            Commission is on the sale before GST. An invoice counts for this person when its <b>Attended By</b> is this name.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.9rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {form.id ? 'Update' : 'Save'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="glass-panel p-4 mb-6">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="filter-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Dates">
            {PERIODS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          {period === 'custom' && (
            <>
              <input type="date" className="form-input" style={{ width: 'auto' }} value={custom.from} aria-label="From"
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
              <input type="date" className="form-input" style={{ width: 'auto' }} value={custom.to} aria-label="To"
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </>
          )}
          <span style={muted}>Sales {formatCurrency(totals.sales)} · Commission {formatCurrency(totals.commission)}</span>
        </div>
      </div>

      {unmatchedNames.length > 0 && (
        <div className="glass-panel p-4 mb-6" style={{ fontSize: '0.85rem' }}>
          <b>{report.unmatched.length} invoice{report.unmatched.length === 1 ? '' : 's'}</b> in these dates name someone who is not on the list:{' '}
          {unmatchedNames.map((n, i) => (
            <span key={n}>{i > 0 && ', '}
              <button type="button" className="btn-link" onClick={() => startAdd(n)}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--primary)', fontWeight: 600 }}
                title={`Add ${n} as staff`}>{n}</button>
            </span>
          ))}. Click a name to add them.
        </div>
      )}

      <div className="glass-panel">
        <div className="table-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3>{periodLabel}</h3>
          <TableExport title="Staff commission" filename={`Staff-commission-${periodLabel}`}
            subtitle={[profile?.businessName, periodLabel].filter(Boolean).join(', ')}
            headers={['Name', 'Role', 'Phone', 'Invoices', 'Clients', 'Sales (before GST)', 'Commission %', 'Commission']} rows={exportRows} />
        </div>
        {loading ? null : staff.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={48} />
            <p>No staff yet. Add the people who make your sales, then type their name in <b>Attended By</b> on each invoice.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table" style={{ minWidth: '720px' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={right}>Invoices</th>
                  <th style={right}>Clients</th>
                  <th style={right}>Sales (before GST)</th>
                  <th style={right}>Commission %</th>
                  <th style={right}>Commission</th>
                  <th className="col-center">Edit</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => {
                  const s = r.staff;
                  const isOpen = open === s.id;
                  return [
                    <tr key={s.id} style={{ cursor: 'pointer', opacity: s.active === false ? 0.6 : 1 }} onClick={() => setOpen(isOpen ? '' : s.id)}>
                      <td>
                        <div className="font-medium" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {s.name}
                          {s.active === false && <span className="type-badge" style={{ marginLeft: 6 }}>Left</span>}
                        </div>
                        <div style={muted}>{[s.role, s.phone, s.joined && `Joined ${showDate(s.joined)}`].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td style={right}>{r.count}</td>
                      <td style={right}>{r.clients}</td>
                      <td style={right}>{formatCurrency(r.sales)}</td>
                      <td style={right}>{Number(s.commission) || 0}%</td>
                      <td style={{ ...right, fontWeight: 600 }}>{formatCurrency(r.commission)}</td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'center' }}>
                          <button className="icon-btn icon-btn-blue" title="Edit" aria-label={`Edit ${s.name}`}
                            onClick={(e) => { e.stopPropagation(); startEdit(s); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Edit3 size={15} /></button>
                        </div>
                      </td>
                    </tr>,
                    isOpen && (
                      <tr key={`${s.id}-invoices`}>
                        <td colSpan={7} style={{ background: 'var(--bg-secondary)', padding: '0.75rem 1rem' }}>
                          {r.invoices.length === 0 ? (
                            <span style={muted}>No invoices attended by {s.name} in these dates.</span>
                          ) : (
                            <table className="data-table" style={{ margin: 0 }}>
                              <thead>
                                <tr><th>Date</th><th>Invoice</th><th>Client</th><th style={right}>Sale (before GST)</th><th style={right}>Commission</th></tr>
                              </thead>
                              <tbody>
                                {r.invoices.map((inv) => (
                                  <tr key={inv.id}>
                                    <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{showDate(inv.date)}</td>
                                    <td>{inv.number}{inv.type === 'credit-note' && <span className="type-badge" style={{ marginLeft: 6 }}>Credit note</span>}</td>
                                    <td>{inv.client}</td>
                                    <td style={right}>{formatCurrency(inv.sale)}</td>
                                    <td style={right}>{formatCurrency(inv.commission)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', borderTop: '2px solid var(--border)' }}>
                  <td colSpan={3}>Total</td>
                  <td style={right}>{formatCurrency(totals.sales)}</td>
                  <td />
                  <td style={right}>{formatCurrency(totals.commission)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
