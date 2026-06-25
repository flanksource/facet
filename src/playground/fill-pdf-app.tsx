import '@flanksource/clicky-ui/styles.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { JsonSchemaForm, Tabs, SplitPane, type JsonSchemaObject } from '@flanksource/clicky-ui/components';
import { SchemaViewer } from '@flanksource/clicky-ui/data';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';

// The Fill-PDF playground island. Left: a sample/upload picker plus Form (clicky-ui
// JsonSchemaForm), YAML, and Schema (clicky-ui SchemaViewer) tabs over one data
// object. Right: the filled PDF.
// Filling is server-side (POST /fill-pdf); the data object is the single source
// of truth, mirrored to/from YAML via js-yaml. State persists to localStorage.

type Sample = { id: string; name: string };

const LS_KEY = 'facet.playground.fillpdf';
type Persisted = { sampleId?: string; schemaText?: string; dataYaml?: string };

function loadPersisted(): Persisted {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}') as Persisted;
  } catch {
    return {};
  }
}
function savePersisted(p: Persisted): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p));
  } catch {
    /* localStorage unavailable — non-fatal */
  }
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function FillPdfApp(): React.JSX.Element {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sampleId, setSampleId] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [editSchema, setEditSchema] = useState(false);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [dataYaml, setDataYaml] = useState('');
  const [tab, setTab] = useState('form');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [yamlError, setYamlError] = useState('');

  const schema = useMemo<JsonSchemaObject | null>(() => {
    if (!schemaText.trim()) return null;
    try {
      return JSON.parse(schemaText) as JsonSchemaObject;
    } catch {
      return null;
    }
  }, [schemaText]);

  const loadSampleSchema = useCallback(async (id: string) => {
    const res = await fetch(`/fill-pdf/samples/${id}/schema`);
    if (res.ok) setSchemaText(JSON.stringify(await res.json(), null, 2));
  }, []);

  const loadSampleData = useCallback(async (id: string) => {
    const res = await fetch(`/fill-pdf/samples/${id}/data`);
    const obj = asObject(res.ok ? await res.json() : {});
    setData(obj);
    setDataYaml(yamlDump(obj));
  }, []);

  const selectSample = useCallback(
    async (id: string) => {
      setSampleId(id);
      setUploadFile(null);
      setError('');
      try {
        await Promise.all([loadSampleSchema(id), loadSampleData(id)]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [loadSampleSchema, loadSampleData],
  );

  // Mount: fetch samples, then restore persisted state or default to the first sample.
  useEffect(() => {
    void (async () => {
      const persisted = loadPersisted();
      let list: Sample[] = [];
      try {
        const res = await fetch('/fill-pdf/samples');
        if (res.ok) list = (await res.json()) as Sample[];
      } catch {
        /* server may be offline; leave empty */
      }
      setSamples(list);

      const id = persisted.sampleId || list[0]?.id || '';
      if (persisted.schemaText) setSchemaText(persisted.schemaText);
      if (persisted.dataYaml) {
        setDataYaml(persisted.dataYaml);
        setData(asObject(safeYamlLoad(persisted.dataYaml)));
      }
      if (id) {
        setSampleId(id);
        if (!persisted.schemaText) await loadSampleSchema(id).catch(() => {});
        if (!persisted.dataYaml) await loadSampleData(id).catch(() => {});
      }
    })();
  }, [loadSampleSchema, loadSampleData]);

  // Refresh the YAML mirror from the data object whenever the YAML tab opens.
  useEffect(() => {
    if (tab === 'yaml') {
      setDataYaml(yamlDump(data));
      setYamlError('');
    }
  }, [tab, data]);

  const onYamlChange = useCallback((text: string) => {
    setDataYaml(text);
    try {
      setData(asObject(yamlLoad(text)));
      setYamlError('');
    } catch (e) {
      setYamlError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Persist (the data object, serialized to YAML, is the canonical saved form).
  useEffect(() => {
    savePersisted({ sampleId, schemaText, dataYaml: yamlDump(data) });
  }, [sampleId, schemaText, data]);

  const doFill = useCallback(async () => {
    if (!schema) {
      setError('Schema is not valid JSON');
      return;
    }
    if (!uploadFile && !sampleId) {
      setError('Pick a sample or upload a PDF');
      return;
    }
    setStatus('Filling…');
    setError('');
    const fd = new FormData();
    fd.set('schema', schemaText);
    fd.set('data', JSON.stringify(data));
    if (uploadFile) fd.set('pdf', uploadFile);
    else fd.set('sample', sampleId);
    try {
      const res = await fetch('/fill-pdf', { method: 'POST', body: fd });
      if (!res.ok) {
        setError(await res.text());
        setStatus('');
        return;
      }
      const blob = await res.blob();
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setStatus(`Filled ${res.headers.get('X-Fill-Count') ?? '?'} field(s), skipped ${res.headers.get('X-Fill-Skipped') ?? '?'}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    }
  }, [schema, schemaText, data, uploadFile, sampleId]);

  // Debounced auto-fill on any input change.
  const fillTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (fillTimer.current) window.clearTimeout(fillTimer.current);
    fillTimer.current = window.setTimeout(() => void doFill(), 500);
    return () => {
      if (fillTimer.current) window.clearTimeout(fillTimer.current);
    };
  }, [doFill]);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadFile(file);
    if (file) setSampleId('');
  };

  const left = (
    <div style={S.leftCol}>
      <div style={S.controls}>
        <label style={S.label}>
          Sample
          <select
            style={S.select}
            value={uploadFile ? '' : sampleId}
            onChange={(e) => void selectSample(e.target.value)}
          >
            <option value="" disabled>
              {samples.length ? 'Choose a form…' : 'No samples'}
            </option>
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label style={S.label}>
          Blank PDF
          <input type="file" accept="application/pdf" onChange={onUpload} style={S.file} />
        </label>
      </div>

      <Tabs
        tabs={[
          { id: 'form', label: 'Form' },
          { id: 'yaml', label: 'YAML' },
          { id: 'schema', label: 'Schema' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div style={S.editorArea}>
        {tab === 'form' ? (
          schema ? (
            <JsonSchemaForm schema={schema} value={data} onChange={setData} size="sm" />
          ) : (
            <div style={S.hint}>Select a sample or paste a valid JSON Schema to render the form.</div>
          )
        ) : tab === 'yaml' ? (
          <>
            {yamlError && <div style={S.yamlErr}>{yamlError}</div>}
            <textarea
              spellCheck={false}
              style={S.yamlArea}
              value={dataYaml}
              onChange={(e) => onYamlChange(e.target.value)}
            />
          </>
        ) : (
          <div style={S.schemaCol}>
            <div style={S.schemaBar}>
              <button type="button" style={S.linkBtn} onClick={() => setEditSchema((v) => !v)}>
                {editSchema ? 'View' : 'Edit'}
              </button>
            </div>
            {editSchema ? (
              <textarea
                spellCheck={false}
                style={S.schemaArea}
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                placeholder="JSON Schema with x-pdf-field annotations"
              />
            ) : schema ? (
              <SchemaViewer schema={schema} />
            ) : (
              <div style={S.hint}>Select a sample or edit a valid JSON Schema to view it.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const right = (
    <div style={S.rightCol}>
      <div style={S.statusBar}>
        {error ? <span style={S.errText}>{error}</span> : <span style={S.okText}>{status}</span>}
      </div>
      {pdfUrl ? (
        <iframe title="Filled PDF" src={pdfUrl} style={S.iframe} />
      ) : (
        <div style={S.empty}>The filled PDF preview will appear here.</div>
      )}
    </div>
  );

  return (
    <div style={S.root}>
      <SplitPane left={left} right={right} defaultSplit={45} minLeft={30} minRight={30} />
    </div>
  );
}

function safeYamlLoad(text: string): unknown {
  try {
    return yamlLoad(text);
  } catch {
    return {};
  }
}

const S: Record<string, React.CSSProperties> = {
  root: { flex: 1, minWidth: 0, width: '100%', height: '100%', background: '#fff', color: '#111' },
  leftCol: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  controls: { display: 'flex', alignItems: 'flex-end', gap: 12, padding: 10, borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' },
  label: { display: 'flex', flexDirection: 'column', fontSize: 12, color: '#555', gap: 4 },
  select: { fontSize: 13, padding: '4px 6px', minWidth: 180 },
  file: { fontSize: 12 },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 12, padding: '4px 0' },
  schemaCol: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, gap: 6 },
  schemaBar: { display: 'flex', justifyContent: 'flex-end', flexShrink: 0 },
  schemaArea: { flex: 1, minHeight: 240, fontFamily: 'monospace', fontSize: 12, padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, resize: 'none', boxSizing: 'border-box' },
  editorArea: { flex: 1, minHeight: 0, overflow: 'auto', padding: 12 },
  yamlArea: { width: '100%', height: '100%', minHeight: 240, fontFamily: 'monospace', fontSize: 13, padding: 8, border: '1px solid #e5e7eb', borderRadius: 6, resize: 'none', boxSizing: 'border-box' },
  yamlErr: { color: '#dc2626', fontSize: 12, fontFamily: 'monospace', marginBottom: 6, whiteSpace: 'pre-wrap' },
  hint: { color: '#888', fontSize: 13, padding: 12 },
  rightCol: { display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5' },
  statusBar: { padding: '6px 10px', fontSize: 12, background: '#fafafa', borderBottom: '1px solid #e5e7eb', minHeight: 26 },
  okText: { color: '#16a34a' },
  errText: { color: '#dc2626', whiteSpace: 'pre-wrap', fontFamily: 'monospace' },
  iframe: { flex: 1, border: 'none', width: '100%' },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 },
};

export function mountFillPdf(selector: string): void {
  const el = document.querySelector(selector);
  if (!el) return;
  const marker = el as HTMLElement & { __facetMounted?: boolean };
  if (marker.__facetMounted) return;
  marker.__facetMounted = true;
  createRoot(el as HTMLElement).render(<FillPdfApp />);
}
