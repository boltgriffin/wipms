import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Shared listing furniture for every management page: PageHeader, FilterBar, ActiveFilters,
 * DataTable, EmptyState, LoadingState, plus the useTableState hook and a CSV export helper.
 *
 * The rule these enforce: a page shows a search box and one Filter button. Everything else lives
 * behind the panel, which slides in from the right on a desktop and up from the bottom on a phone.
 */

export const inputCls = 'w-full rounded border border-forest-100 bg-white px-3 py-2 text-sm text-forest-900 disabled:bg-gray-100';
export const btnPrimary = 'rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-forest-900 hover:bg-amber-600 disabled:opacity-60';
export const btnGhost = 'rounded border border-forest-800 px-4 py-2 text-sm font-semibold disabled:opacity-60';
const btnQuiet = 'rounded border border-forest-100 bg-white px-3 py-2 text-sm font-semibold hover:bg-forest-100/50 disabled:opacity-50';

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-forest-700">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Filter panel ---------- */
function FilterPanel({ filters, draft, setDraft, onApply, onReset, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    ref.current?.querySelector('select, input')?.focus();
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Filters"
        className="relative flex max-h-[85vh] w-full flex-col rounded-t-xl bg-white shadow-xl sm:max-h-none sm:w-96 sm:rounded-none sm:rounded-l-xl">
        <div className="flex items-center justify-between border-b border-forest-100 p-4">
          <h2 className="text-lg font-bold">Filters</h2>
          <button onClick={onClose} aria-label="Close filters" className="text-2xl leading-none">&times;</button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {filters.map((f) => (
            <label key={f.key} className="block text-sm font-medium">
              {f.label}
              {f.type === 'date'
                ? <input type="date" value={draft[f.key] ?? ''} onChange={set(f.key)} className={`mt-1 ${inputCls}`} />
                : f.type === 'month'
                  ? <input type="month" value={draft[f.key] ?? ''} onChange={set(f.key)} className={`mt-1 ${inputCls}`} />
                  : <select value={draft[f.key] ?? ''} onChange={set(f.key)} className={`mt-1 ${inputCls}`}>
                      <option value="">{f.anyLabel || `All ${f.label.toLowerCase()}`}</option>
                      {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>}
              {f.hint && <span className="mt-1 block text-xs font-normal text-forest-700">{f.hint}</span>}
            </label>))}
          {!filters.length && <p className="text-sm text-forest-700">This page has no extra filters.</p>}
        </div>
        <div className="flex gap-3 border-t border-forest-100 p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={onReset} className={`flex-1 ${btnGhost}`}>Reset filters</button>
          <button onClick={() => { onApply(draft); onClose(); }} className={`flex-1 ${btnPrimary}`}>Apply filters</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Active filter chips ---------- */
export function ActiveFilters({ filters, values, onChange, onClear }) {
  const active = filters
    .map((f) => {
      const v = values[f.key];
      if (v === '' || v === undefined || v === null) return null;
      const opt = (f.options || []).find((o) => String(o.value) === String(v));
      return { key: f.key, label: f.chipLabel ? f.chipLabel(opt ? opt.label : v) : `${f.label}: ${opt ? opt.label : v}` };
    })
    .filter(Boolean);
  if (!active.length) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-forest-700">Showing results for:</span>
      {active.map((a) => (
        <span key={a.key} className="inline-flex items-center gap-1 rounded-full bg-forest-100 px-3 py-1">
          {a.label}
          <button onClick={() => onChange({ ...values, [a.key]: '' })} aria-label={`Remove ${a.label}`} className="font-bold leading-none hover:text-red-700">&times;</button>
        </span>))}
      <button onClick={onClear} className="font-semibold text-amber-600 underline">Clear all</button>
    </div>
  );
}

/* ---------- Filter bar ---------- */
export function FilterBar({ searchPlaceholder = 'Search...', search, onSearch, filters = [], values = {}, onApply, onReset, onExport, exportLabel = 'Export', actions, children }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  useEffect(() => { if (open) setDraft(values); }, [open]); // eslint-disable-line
  const count = filters.filter((f) => values[f.key] !== '' && values[f.key] !== undefined && values[f.key] !== null).length;
  const dirty = count > 0 || !!search;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input type="search" aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={search} onChange={(e) => onSearch(e.target.value)}
          className={`${inputCls} w-full min-w-0 sm:w-72`} />
        {!!filters.length && (
          <button onClick={() => setOpen(true)} aria-expanded={open} className={btnQuiet}>
            Filter{count > 0 && <span className="ml-2 rounded-full bg-amber-500 px-1.5 text-xs font-bold text-forest-900">{count}</span>}
            <span aria-hidden="true" className="ml-1">▾</span>
          </button>)}
        <button onClick={onReset} disabled={!dirty} className={btnQuiet}>Reset</button>
        {onExport && <button onClick={onExport} className={btnQuiet}>{exportLabel}</button>}
        {children}
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <ActiveFilters filters={filters} values={values} onChange={onApply} onClear={onReset} />
      {open && <FilterPanel filters={filters} draft={draft} setDraft={setDraft} onApply={onApply} onReset={() => { onReset(); setOpen(false); }} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ---------- States ---------- */
export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="grid place-items-center gap-3 p-10 text-sm text-forest-700" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-forest-100 border-t-amber-500" aria-hidden="true" />
      {label}
    </div>
  );
}
export function EmptyState({ title, body, action }) {
  return (
    <div className="grid place-items-center gap-2 p-10 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-md text-sm text-forest-700">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ---------- Table state ---------- */
/** Keeps search, filters, page and sort together, debounces the search and resets the page when anything changes. */
export function useTableState(initialFilters = {}, initialSort = null) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFiltersRaw] = useState(initialFilters);
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [searchInput]);
  const setFilters = (next) => { setFiltersRaw(next); setPage(1); };
  const reset = () => { setSearchInput(''); setSearch(''); setFiltersRaw(initialFilters); setPage(1); };
  const onSort = (key) => { setSort((s) => (s && s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })); setPage(1); };
  const params = useMemo(() => ({ ...filters, search, page, sort: sort?.key || '', dir: sort?.dir || '' }), [filters, search, page, sort]);
  return { searchInput, setSearchInput, search, filters, setFilters, sort, onSort, page, setPage, reset, params };
}

/* ---------- Pagination ---------- */
export function Pagination({ page, pages, total, onPage, unit = 'result' }) {
  if (!total) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-forest-700">{total} {unit}{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-3">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded border border-forest-100 px-3 py-1 disabled:opacity-40">Previous</button>
        <span>Page {page} of {pages}</span>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded border border-forest-100 px-3 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

/* ---------- Data table ---------- */
const alignCls = { right: 'text-right', center: 'text-center' };
function SortButton({ col, sort, onSort }) {
  const on = sort && sort.key === col.key;
  return (
    <button onClick={() => onSort(col.key)} className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide hover:text-forest-900"
      aria-label={`Sort by ${col.header}`} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {col.header}<span aria-hidden="true" className={on ? 'text-amber-600' : 'opacity-30'}>{on && sort.dir === 'desc' ? '▼' : '▲'}</span>
    </button>
  );
}

/**
 * columns: [{ key, header, sortable, align, render(row), cardHide }]
 * selection: { selected, onChange, actions(ids) }  pagination: { page, pages, total, onPage }
 * A card list replaces the table under 768px, so a wide table never forces the page to scroll sideways.
 */
export function DataTable({ columns, rows, getRowId = (r) => r.id, loading, error, empty, sort, onSort, selection, pagination, rowActions, caption, unit }) {
  const ids = (rows || []).map(getRowId);
  const sel = selection?.selected || [];
  const allOn = ids.length > 0 && ids.every((id) => sel.includes(id));
  const toggleAll = () => selection.onChange(allOn ? sel.filter((id) => !ids.includes(id)) : [...new Set([...sel, ...ids])]);
  const toggleOne = (id) => selection.onChange(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const cols = columns.filter(Boolean);

  if (error) return <div role="alert" className="rounded-lg border border-forest-100 bg-red-50 p-4 text-sm text-red-700">{error.message || String(error)}</div>;

  return (
    <div>
      {selection && sel.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-forest-100/70 px-4 py-2 text-sm">
          <span className="font-semibold">{sel.length} selected</span>
          {selection.actions?.(sel)}
          <button onClick={() => selection.onChange([])} className="ml-auto font-semibold text-amber-600 underline">Clear selection</button>
        </div>)}

      <div className="overflow-hidden rounded-lg border border-forest-100 bg-white">
        {loading ? <LoadingState />
          : !rows?.length ? <EmptyState {...(empty || { title: 'Nothing to show yet' })} />
          : <>
            {/* Table for wider screens */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                {caption && <caption className="sr-only">{caption}</caption>}
                <thead className="bg-forest-100/60">
                  <tr>
                    {selection && <th className="w-10 p-3"><input type="checkbox" checked={allOn} onChange={toggleAll} aria-label="Select all rows on this page" /></th>}
                    {cols.map((c) => (
                      <th key={c.key} scope="col" className={`p-3 text-xs text-forest-700 ${alignCls[c.align] || ''}`}>
                        {c.sortable && onSort ? <SortButton col={c} sort={sort} onSort={onSort} /> : <span className="font-semibold uppercase tracking-wide">{c.header}</span>}
                      </th>))}
                    {rowActions && <th className="p-3"><span className="sr-only">Actions</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const id = getRowId(r);
                    return (
                      <tr key={id} className={`border-t border-forest-100 ${sel.includes(id) ? 'bg-amber-50/40' : ''}`}>
                        {selection && <td className="p-3"><input type="checkbox" checked={sel.includes(id)} onChange={() => toggleOne(id)} aria-label={`Select row ${id}`} /></td>}
                        {cols.map((c) => <td key={c.key} className={`p-3 ${alignCls[c.align] || ''} ${c.nowrap ? 'whitespace-nowrap' : ''}`}>{c.render(r)}</td>)}
                        {rowActions && <td className="p-3 whitespace-nowrap text-right">{rowActions(r)}</td>}
                      </tr>);
                  })}
                </tbody>
              </table>
            </div>
            {/* Cards for phones */}
            <ul className="divide-y divide-forest-100 md:hidden">
              {rows.map((r) => {
                const id = getRowId(r);
                return (
                  <li key={id} className="p-4">
                    <div className="flex items-start gap-3">
                      {selection && <input type="checkbox" checked={sel.includes(id)} onChange={() => toggleOne(id)} aria-label={`Select row ${id}`} className="mt-1" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold">{cols[0].render(r)}</div>
                        <dl className="mt-2 grid gap-1">
                          {cols.slice(1).filter((c) => !c.cardHide).map((c) => (
                            <div key={c.key} className="flex justify-between gap-3 text-sm">
                              <dt className="text-forest-700">{c.header}</dt><dd className="min-w-0 text-right">{c.render(r)}</dd>
                            </div>))}
                        </dl>
                        {rowActions && <div className="mt-3 flex flex-wrap gap-3 text-sm">{rowActions(r)}</div>}
                      </div>
                    </div>
                  </li>);
              })}
            </ul>
          </>}
      </div>
      {pagination && <Pagination {...pagination} unit={unit} />}
    </div>
  );
}

/* ---------- CSV export ---------- */
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; // a leading = + - @ is quoted so Excel treats it as text
};
/** rows: array of objects. columns: [{ header, value(row) }]. */
export function exportCsv(fileName, columns, rows) {
  const body = [columns.map((c) => csvCell(c.header)).join(',')]
    .concat(rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(',')));
  const url = URL.createObjectURL(new Blob(['﻿' + body.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}
/** Builds the export columns straight from a DataTable column list, using an explicit value() when given. */
export const columnsToCsv = (cols) => cols.filter((c) => c && c.value).map((c) => ({ header: c.header, value: c.value }));
