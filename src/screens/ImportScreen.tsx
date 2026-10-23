import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Empty, Screen } from '../components/Screen';
import { AI_PROMPT, EXAMPLE } from '../import/aiPrompt';
import { applyImport, loadExisting } from '../import/apply';
import { parseImport } from '../import/parse';
import { type ImportPlan, isEmptyPlan, planImport } from '../import/plan';
import { navigate } from '../lib/router';

const back = { label: 'More', path: '/more' };

const SINGULAR: Record<string, string> = {
  Hobbies: 'hobby', Activities: 'activity', Projects: 'project', 'Next steps': 'next step',
  'Important tasks': 'important task', Routines: 'routine', Goals: 'goal', 'Books & shows': 'book or show',
};

/** The rows of the "Will add" summary, leaving out anything with nothing to add. */
function summaryRows(plan: ImportPlan) {
  return [
    ['Hobbies', plan.hobbies.length, plan.hobbies.map((h) => h.name).join(', ')],
    ['Activities', plan.activities.length],
    ['Projects', plan.projects.length],
    ['Next steps', plan.steps.length],
    ['Important tasks', plan.tasks.length],
    ['Routines', plan.routines.length],
    ['Goals', plan.goals.length],
    ['Books & shows', plan.media.length],
  ].filter(([, count]) => count) as [string, number, string?][];
}

export function ImportScreen() {
  const [text, setText] = useState('');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [added, setAdded] = useState<ImportPlan | null>(null);
  const [copied, setCopied] = useState(false);

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(AI_PROMPT);
    setCopied(true);
  };
  const preview = async () => setPlan(planImport(parseImport(text), await loadExisting()));
  const add = async () => {
    await applyImport(plan!);
    setAdded(plan);
    setPlan(null);
    setText('');
  };

  // --- 3. Done ---
  if (added) {
    return (
      <Screen title="All added" back={back}>
        <Empty icon={<Check size={28} />} title="Kindling has your list">
          {summaryRows(added).map(([label, count]) => `${count} ${count === 1 ? SINGULAR[label] : label.toLowerCase()}`).join(' · ')}
        </Empty>
        <div className="stack" style={{ marginTop: 16 }}>
          <button className="button" onClick={() => navigate('/hobbies')}>See your hobbies</button>
          <button className="button secondary" onClick={() => setAdded(null)}>Paste in more</button>
        </div>
      </Screen>
    );
  }

  // --- 2. Preview ---
  if (plan) {
    const rows = summaryRows(plan);
    return (
      <Screen title="Preview" back={back}>
        {isEmptyPlan(plan) ? (
          <Empty icon={<Check size={28} />} title="Nothing new to add">
            Everything in this list is already in Kindling.
          </Empty>
        ) : (
          <>
            <h2 className="section-header">Will add</h2>
            <div className="list">
              {rows.map(([label, count, detail]) => (
                <div className="list-row" key={label}>
                  <span className="label">
                    {label}
                    {detail && <span className="row-subtitle">{detail}</span>}
                  </span>
                  <span className="detail">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {plan.alreadyThere > 0 && (
          <p className="note">{plan.alreadyThere} {plan.alreadyThere === 1 ? 'line matches' : 'lines match'} things already in Kindling, so {plan.alreadyThere === 1 ? "it's" : "they're"} skipped.</p>
        )}
        {plan.problems.length > 0 && (
          <>
            <h2 className="section-header">Worth a look</h2>
            <div className="card">
              <ul className="plain-list">
                {plan.problems.map((problem, i) => <li key={i}>{problem}</li>)}
              </ul>
            </div>
          </>
        )}
        <div className="stack" style={{ marginTop: 20 }}>
          {!isEmptyPlan(plan) && <button className="button" onClick={add}>Add to Kindling</button>}
          <button className="button secondary" onClick={() => setPlan(null)}>Edit the text</button>
        </div>
      </Screen>
    );
  }

  // --- 1. Paste ---
  return (
    <Screen title="Paste in" back={back}>
      <div className="card">
        <p style={{ margin: 0 }}>
          Brainstorm with your AI tool using Kindling's prompt. It will ask about your hobbies, then give you a list to
          paste in here.
        </p>
        <button className="button secondary" style={{ marginTop: 12 }} onClick={copyPrompt}>
          {copied ? <><Check size={18} /> Prompt copied</> : <><Copy size={18} /> Copy prompt for your AI</>}
        </button>
      </div>

      <h2 className="section-header">Your list</h2>
      <textarea
        className="paste"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'# Photography\n- Golden hour walk | medium\n…'}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button className="button" style={{ marginTop: 12 }} disabled={!text.trim()} onClick={preview}>
        Preview
      </button>
      <p className="note">Nothing is added until you've seen the preview. Things already in Kindling are skipped.</p>

      <details className="format">
        <summary>How the format works</summary>
        <pre>{EXAMPLE}</pre>
        <p className="note" style={{ margin: '8px 0 0' }}>
          <b>#</b> starts a hobby, with an optional status like [want to pursue] or [paused]. <b>-</b> lines are
          activities, with energy (low, medium, high), "plan ahead" and "goal: Name" after a <b>|</b>.
          <b> ## Project:</b> starts a project whose lines are next steps. <b># Tasks</b>, <b># Routines</b>,
          <b> # Goals</b>, <b># Books</b> and <b># Shows</b> are their own lists.
        </p>
      </details>
    </Screen>
  );
}
