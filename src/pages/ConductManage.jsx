import { useState } from 'react';
import ConductSubmitForm from '../components/ConductSubmitForm';
import { QueueTab, RecordsTab, ScoresTab } from '../components/ConductTabs';
import { Modal, btnPrimary } from '../components/ui';

export default function ConductManage() {
  const [tab, setTab] = useState('queue');
  const [form, setForm] = useState(false);
  const [notice, setNotice] = useState('');
  const btn = (k, label) => <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-forest-800 text-white' : 'border border-forest-100 bg-white'}`}>{label}</button>;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Merits and infractions</h1><button className={btnPrimary} onClick={() => { setNotice(''); setForm(true); }}>Submit a record</button></div>
      {notice && <p role="status" className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      <div role="tablist" className="mb-4 flex flex-wrap gap-2">{btn('queue', 'Review queue')}{btn('records', 'All records')}{btn('scores', 'Conduct scores and reports')}</div>
      {tab === 'queue' && <QueueTab />}{tab === 'records' && <RecordsTab />}{tab === 'scores' && <ScoresTab />}
      {form && <Modal title="Submit a merit or infraction" onClose={() => setForm(false)} wide><ConductSubmitForm staff onDone={(r) => { setForm(false); setNotice(r.status === 'Approved' ? 'Record saved and approved.' : 'Record submitted. Approve it from the review queue.'); }} /></Modal>}
    </>
  );
}
