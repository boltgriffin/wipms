import { useRef, useState } from 'react';
import StatCard from '../components/StatCard';
import { ErrorBanner, Field, Modal, Pagination, inputCls } from '../components/ui';
import { DataTable, PageHeader, btnGhost, btnPrimary, columnsToCsv, exportCsv } from '../components/datatable';
import { useImportLog, useImportLogs, useRosterAction, useTeacherImportMeta } from '../hooks/useRoster';
import { useMeta } from '../hooks/useManagement';

const LOG_COLUMNS = [
  { key: 'at', header: 'When', nowrap: true, value: (l) => l.at, render: (l) => new Date(l.at).toLocaleString() },
  { key: 'fileName', header: 'File', value: (l) => l.fileName, render: (l) => l.fileName },
  { key: 'by', header: 'By', value: (l) => l.by, render: (l) => l.by },
  { key: 'created', header: 'Created', align: 'right', value: (l) => l.created, render: (l) => l.created },
  { key: 'skipped', header: 'Skipped', align: 'right', value: (l) => l.skipped, render: (l) => l.skipped }
];
const STEPS = ['Choose a file', 'Map the columns', 'Check the preview', 'Import'];
const STUDENT_SAMPLE = 'LRN,FIRSTNAME,LASTNAME,SEX,GRADE,STRAND,SECTION,ADDRESS,BARANGAY,MUNICIPALITY,PROVINCE,CONTACT\n'
  + '136500010001,Mika,Reyes,F,12,ICT,Bato,Purok 3,Anahawon,Maramag,Bukidnon,09171234567\n'
  + '136500010002,Jun,Dela Cruz,M,12,EIM,Yakan,Purok 1,Base Camp,Maramag,Bukidnon,09181234567';
const TEACHER_SAMPLE = 'EMPLOYEE NO,FIRSTNAME,LASTNAME,EMAIL,MOBILE,DEPARTMENT,POSITION\n'
  + 'T-0101,Juan,Dela Cruz,juan.delacruz@deped.gov.ph,09171234567,TechPro Department,Teacher II\n'
  + 'T-0102,Maria,Santos,maria.santos@deped.gov.ph,09181234567,TechPro Department,Teacher I';

/** The two master lists differ only in their columns and their defaults, so they share one wizard. */
const KINDS = {
  student: {
    label: 'Students', noun: 'student', sample: STUDENT_SAMPLE,
    routes: { parse: '/import/parse', preview: '/import/preview', commit: '/import/commit' },
    columns: 'LRN, FIRSTNAME, LASTNAME, SEX, GRADE, STRAND, SECTION, and optionally ADDRESS, BARANGAY, MUNICIPALITY, PROVINCE, CONTACT',
    defaults: { gradeLevel: '', strand: '', section: '', teacherId: '', status: 'ACTIVE', autoCreateAccounts: true },
    accountNote: 'Each username and password is the Student ID.'
  },
  teacher: {
    label: 'Teachers', noun: 'teacher', sample: TEACHER_SAMPLE,
    routes: { parse: '/import/teachers/parse', preview: '/import/teachers/preview', commit: '/import/teachers/commit' },
    columns: 'FIRSTNAME and LASTNAME are required; EMPLOYEE NO, EMAIL, MOBILE, DEPARTMENT and POSITION are optional',
    defaults: { department: '', position: '', status: 'ACTIVE', autoCreateAccounts: true },
    accountNote: 'Each username and password is the Employee Number.'
  }
};

function Stepper({ step }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-2 text-sm">
      {STEPS.map((label, i) => (
        <li key={label} className={`flex items-center gap-2 rounded px-3 py-1.5 ${i === step ? 'bg-forest-800 text-white' : i < step ? 'bg-green-100 text-green-800' : 'border border-forest-100 bg-white text-forest-700'}`}>
          <span aria-hidden="true" className="font-bold">{i < step ? '✓' : i + 1}</span>{label}
        </li>))}
    </ol>
  );
}

function LogDetail({ id, onClose }) {
  const [result, setResult] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, isLoading } = useImportLog(id, { result, page, pageSize: 15 });
  return (
    <Modal title="Import details" onClose={onClose} wide>
      {isLoading && <p className="text-sm">Loading...</p>}<ErrorBanner error={error} />
      {data && <>
        <p className="text-sm text-forest-700">{data.log.fileName} - {new Date(data.log.at).toLocaleString()} - {data.log.created} created, {data.log.skipped} skipped of {data.log.total} rows{data.log.defaults ? ` (${data.log.defaults})` : ''}</p>
        <select aria-label="Result" value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }} className={`${inputCls} my-3 w-auto`}>
          <option value="">All rows</option><option value="Created">Created</option><option value="Created with warnings">Created with warnings</option><option value="Skipped">Skipped</option></select>
        <div className="overflow-x-auto rounded-lg border border-forest-100"><table className="w-full text-left text-sm">
          <thead className="bg-forest-100/60"><tr><th className="p-2.5">Row</th><th className="p-2.5">Result</th><th className="p-2.5">LRN</th><th className="p-2.5">Name</th><th className="p-2.5">Student ID</th><th className="p-2.5">Message</th></tr></thead>
          <tbody>{data.items.map((r) => (
            <tr key={r.row} className="border-t border-forest-100">
              <td className="p-2.5">{r.row}</td><td className="p-2.5">{r.result}</td><td className="p-2.5 font-mono text-xs">{r.lrn}</td>
              <td className="p-2.5">{r.name}</td><td className="p-2.5">{r.studentId || '-'}</td><td className="p-2.5 text-xs text-forest-700">{r.message || '-'}</td>
            </tr>))}
          </tbody></table></div>
        <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
      </>}
    </Modal>
  );
}

export default function ImportWizard() {
  const { data: meta } = useMeta();
  const [kind, setKind] = useState('student');
  const K = KINDS[kind];
  const parse = useRosterAction(K.routes.parse);
  const preview = useRosterAction(K.routes.preview);
  const commit = useRosterAction(K.routes.commit);
  const [step, setStep] = useState(0);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [defaults, setDefaults] = useState(KINDS.student.defaults);
  const [prev, setPrev] = useState(null);
  const [done, setDone] = useState(null);
  const [logId, setLogId] = useState(null);
  const [logPage, setLogPage] = useState(1);
  const fileRef = useRef(null);
  const logs = useImportLogs({ page: logPage, pageSize: 5, kind: kind.toUpperCase() });
  const { data: timeta } = useTeacherImportMeta(kind === 'teacher');

  const readFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024) { setText(''); setFileName(''); return alert0('The file must be under 1 MB.'); }
    setFileName(f.name);
    const r = new FileReader();
    r.onload = () => setText(String(r.result));
    r.readAsText(f);
  };
  const [fileError, setFileError] = useState('');
  const alert0 = (m) => setFileError(m);

  const doParse = () => parse.mutate({ text }, { onSuccess: (d) => { setParsed(d); setMapping(d.mapping); setStep(1); } });
  const doPreview = () => preview.mutate({ text, mapping, defaults }, { onSuccess: (d) => { setPrev(d); setStep(2); } });
  const doCommit = () => commit.mutate({ text, mapping, defaults, fileName }, { onSuccess: (d) => { setDone(d); setStep(3); } });
  const restart = () => { setStep(0); setText(''); setFileName(''); setParsed(null); setPrev(null); setDone(null); setFileError(''); if (fileRef.current) fileRef.current.value = ''; };
  /** Switching list starts over: a half-mapped student file means nothing against teacher columns. */
  const switchKind = (next) => { if (next === kind) return; setKind(next); setDefaults(KINDS[next].defaults); restart(); setLogId(null); setLogPage(1); };
  const setMap = (field) => (e) => setMapping({ ...mapping, [field]: Number(e.target.value) });
  const setDef = (k) => (e) => setDefaults({ ...defaults, [k]: e.target.value });

  return (
    <>
      <PageHeader title="Import master list" subtitle="Create records in bulk from a CSV export. Nothing is written until you have seen the preview." />

      <div role="tablist" aria-label="Which master list" className="mb-5 inline-flex rounded-lg border border-forest-100 bg-white p-1">
        {Object.keys(KINDS).map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => switchKind(k)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold ${kind === k ? 'bg-forest-800 text-white' : 'text-forest-700 hover:bg-forest-100/60'}`}>
            {KINDS[k].label}
          </button>))}
      </div>

      <Stepper step={step} />

      {step === 0 && (
        <section className="rounded-lg border border-forest-100 bg-white p-5">
          <h2 className="mb-3 text-lg font-bold">Choose a CSV file</h2>
          <p className="mb-3 text-sm text-forest-700">Expected columns: {K.columns}. Common spellings are matched automatically and you can correct the mapping in the next step. Up to 500 rows at a time.</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={readFile} className="block text-sm" aria-label="CSV file" />
          {fileError && <p role="alert" className="mt-2 text-sm text-red-700">{fileError}</p>}
          <Field label="Or paste the rows" hint="Header row first"><textarea rows={6} value={text} onChange={(e) => { setText(e.target.value); setFileName(fileName || 'pasted text'); }} className={`mt-1 font-mono text-xs ${inputCls}`} placeholder={K.sample} /></Field>
          <div className="mt-3"><ErrorBanner error={parse.error} /></div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className={btnPrimary} disabled={!text.trim() || parse.isPending} onClick={doParse}>{parse.isPending ? 'Reading...' : 'Read the file'}</button>
            <button className={btnGhost} onClick={() => { setText(K.sample); setFileName(`sample-${kind}s.csv`); }}>Use a sample</button>
          </div>
        </section>)}

      {step === 1 && parsed && (
        <section className="rounded-lg border border-forest-100 bg-white p-5">
          <h2 className="mb-1 text-lg font-bold">Map the columns</h2>
          <p className="mb-4 text-sm text-forest-700">{parsed.rowCount} row(s) found in {fileName}. Check each field points at the right column.</p>
          {parsed.missing.length > 0 && <p role="alert" className="mb-4 rounded bg-amber-50 p-3 text-sm">Not matched automatically: {parsed.missing.join(', ')}. Pick a column, or set a default below for grade, strand or section.</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {parsed.fields.map((f) => (
              <Field key={f} label={f}>
                <select value={mapping[f] ?? -1} onChange={setMap(f)} className={`mt-1 ${inputCls}`}>
                  <option value={-1}>Not in the file</option>
                  {parsed.header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select></Field>))}
          </div>
          <h3 className="mb-2 mt-6 text-sm font-bold">Defaults for every imported {K.noun}</h3>
          {kind === 'student' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Grade level" hint="Used when the column is missing"><select value={defaults.gradeLevel} onChange={setDef('gradeLevel')} className={`mt-1 ${inputCls}`}><option value="">None</option>{(meta?.grades || [11, 12]).map((g) => <option key={g} value={g}>Grade {g}</option>)}</select></Field>
              <Field label="Strand"><select value={defaults.strand} onChange={setDef('strand')} className={`mt-1 ${inputCls}`}><option value="">None</option>{(meta?.strands || []).map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Section"><input value={defaults.section} onChange={setDef('section')} maxLength={30} className={`mt-1 ${inputCls}`} /></Field>
              <Field label="Assign to teacher" hint="Optional, applies to every row"><select value={defaults.teacherId} onChange={setDef('teacherId')} className={`mt-1 ${inputCls}`}><option value="">No teacher</option>{(meta?.teachers || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Department" hint="Used when the column is missing or not recognised">
                <select value={defaults.department} onChange={setDef('department')} className={`mt-1 ${inputCls}`}><option value="">First on the list</option>{(timeta?.departments || []).map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Position" hint="Used when the column is missing or not recognised">
                <select value={defaults.position} onChange={setDef('position')} className={`mt-1 ${inputCls}`}><option value="">First on the list</option>{(timeta?.positions || []).map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Status"><select value={defaults.status} onChange={setDef('status')} className={`mt-1 ${inputCls}`}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>
            </div>
          )}
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={!!defaults.autoCreateAccounts}
              onChange={(e) => setDefaults({ ...defaults, autoCreateAccounts: e.target.checked })} />
            <span>
              Create sign-in accounts for these {K.noun}s
              <span className="block text-xs text-forest-700">
                {K.accountNote} You can print the slips afterwards from Users and accounts.
              </span>
            </span>
          </label>

          <h3 className="mb-2 mt-6 text-sm font-bold">First rows of the file</h3>
          <div className="overflow-x-auto rounded border border-forest-100"><table className="w-full text-left text-xs">
            <thead className="bg-forest-100/60"><tr>{parsed.header.map((h, i) => <th key={i} className="p-2">{h || `Column ${i + 1}`}</th>)}</tr></thead>
            <tbody>{parsed.sample.map((r, i) => <tr key={i} className="border-t border-forest-100">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>)}</tbody>
          </table></div>
          <div className="mt-3"><ErrorBanner error={preview.error && !preview.error.fields ? preview.error : null} /></div>
          {preview.error?.fields?.mapping && <p role="alert" className="text-sm text-red-700">{preview.error.fields.mapping}</p>}
          {preview.error?.fields?.teacherId && <p role="alert" className="text-sm text-red-700">{preview.error.fields.teacherId}</p>}
          <div className="mt-4 flex gap-3"><button className={btnGhost} onClick={restart}>Start over</button>
            <button className={btnPrimary} disabled={preview.isPending} onClick={doPreview}>{preview.isPending ? 'Checking...' : 'Check the rows'}</button></div>
        </section>)}

      {step === 2 && prev && (
        <section>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard label="Rows in the file" value={prev.summary.total} />
            <StatCard label="Will be created" value={prev.summary.willCreate} />
            <StatCard label="Will be skipped" value={prev.summary.willSkip} />
            <StatCard label="With warnings" value={prev.summary.withWarnings} />
          </div>
          {prev.errorCounts.length > 0 && (
            <div className="mt-4 rounded-lg border border-forest-100 bg-white p-4">
              <h3 className="mb-2 text-sm font-bold">Why rows are skipped</h3>
              <ul className="list-disc pl-5 text-sm">{prev.errorCounts.map((e) => <li key={e.message}>{e.message} <strong>({e.count})</strong></li>)}</ul>
            </div>)}
          <div className="mt-4 overflow-x-auto rounded-lg border border-forest-100 bg-white"><table className="w-full text-left text-sm">
            <thead className="bg-forest-100/60"><tr><th className="p-2.5">Row</th>
              <th className="p-2.5">{kind === 'student' ? 'LRN' : 'Employee no.'}</th><th className="p-2.5">Name</th>
              <th className="p-2.5">{kind === 'student' ? 'Sex' : 'Email'}</th>
              <th className="p-2.5">{kind === 'student' ? 'Class' : 'Department and position'}</th><th className="p-2.5">Result</th></tr></thead>
            <tbody>
              {prev.rows.map((r) => (
                <tr key={r.row} className={`border-t border-forest-100 ${r.ok ? '' : 'bg-red-50/50'}`}>
                  <td className="p-2.5">{r.row}</td>
                  <td className="p-2.5 font-mono text-xs">{(kind === 'student' ? r.lrn : r.employeeNumber) || '-'}</td>
                  <td className="p-2.5">{r.name}</td>
                  <td className="p-2.5">{(kind === 'student' ? r.sex : r.email) || '-'}</td>
                  <td className="p-2.5">{kind === 'student' ? [r.grade, r.strand, r.section].filter(Boolean).join(' ') : [r.department, r.position].filter(Boolean).join(' \u00b7 ')}</td>
                  <td className="p-2.5">{r.ok ? <span className="text-xs font-semibold text-green-800">Will be created</span> : <span className="text-xs font-semibold text-red-700">Skipped</span>}
                    {(r.errors.length > 0 || r.warnings.length > 0) && <ul className="mt-1 list-disc pl-4 text-xs text-forest-700">{[...r.errors, ...r.warnings].map((x, i) => <li key={i}>{x}</li>)}</ul>}</td>
                </tr>))}
            </tbody></table></div>
          {prev.truncated && <p className="mt-2 text-xs text-forest-700">Showing the first 200 rows. Every row is still checked and imported.</p>}
          <div className="mt-3"><ErrorBanner error={commit.error} /></div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className={btnGhost} onClick={() => setStep(1)}>Back to mapping</button>
            <button className={btnPrimary} disabled={!prev.summary.willCreate || commit.isPending} onClick={doCommit}>{commit.isPending ? 'Importing...' : `Import ${prev.summary.willCreate} ${K.noun}(s)`}</button>
          </div>
          {!prev.summary.willCreate && <p className="mt-2 text-sm text-red-700">No row passed the checks, so there is nothing to import.</p>}
        </section>)}

      {step === 3 && done && (
        <section className="rounded-lg border border-forest-100 bg-white p-5">
          <h2 className="mb-2 text-lg font-bold">Import finished</h2>
          <p className="text-sm">{done.created} {K.noun}(s) created, {done.skipped} row(s) skipped.</p>
          <p className="mt-2 text-sm text-forest-700">{kind === 'student'
            ? (defaults.teacherId ? 'They were assigned to the teacher you chose.' : 'They have no teacher yet. Assign them from Teachers > Workload & assignment so they can record attendance.')
            : 'Set their class load from Teachers > Workload & assignment.'}</p>
          {done.accounts && (
            <p className="mt-2 rounded-lg bg-green-50 p-3 text-sm text-green-900">
              <span className="font-semibold">{done.accounts.created} sign-in account{done.accounts.created === 1 ? '' : 's'} created.</span>{' '}
              {K.accountNote} Print the slips from Users and accounts.
            </p>)}
          {defaults.autoCreateAccounts && !done.accounts && done.created > 0 && (
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm">
              The {K.noun}s were created but their accounts were not. Generate them from Users and accounts.
            </p>)}
          <div className="mt-4 flex flex-wrap gap-3">
            <button className={btnPrimary} onClick={restart}>Import another file</button>
            <button className={btnGhost} onClick={() => setLogId(done.importId)}>See the row-by-row log</button>
          </div>
        </section>)}

      <h2 className="mb-3 mt-10 text-lg font-bold">Recent imports</h2>
      <DataTable
        columns={LOG_COLUMNS} rows={logs.data?.items} loading={logs.isLoading} error={logs.error} caption="Recent imports"
        empty={{ title: 'No imports yet', body: 'Each import you run is recorded here with its row-by-row result.' }}
        pagination={logs.data && { page: logs.data.page, pages: logs.data.pages, total: logs.data.total, onPage: setLogPage }} unit="import"
        rowActions={(l) => <button className="font-semibold text-amber-600 underline" onClick={() => setLogId(l.id)}>Open</button>} />
      {logId && <LogDetail id={logId} onClose={() => setLogId(null)} />}
    </>
  );
}
