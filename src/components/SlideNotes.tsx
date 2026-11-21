import React from 'react';
import Classified from './Classified';

export interface SlideNotesProps {
  /** Speaker notes. Each paragraph or list item becomes one notes paragraph; plain text is one paragraph. */
  children: React.ReactNode;
  /** Label of the HTML notes panel. */
  label?: string;
  /** Classifies the notes as `<Classified audience={audience}>`; builds must `--allow audience=…` (default `presenter`). */
  audience?: string;
}

/**
 * Speaker notes for the enclosing `<Page>`, classified `audience="presenter"`: a build
 * carries them only with `--allow audience=presenter` and fails without an audience
 * policy. When permitted, `facet pptx` writes them to the slide's native notes page and
 * `facet html` shows them as a collapsible panel pinned to the page's bottom-right
 * corner; PDF, PNG and DOCX output omit them.
 *
 * @example
 * ```tsx
 * <Page>
 *   <h1>Decisions</h1>
 *   <SlideNotes>
 *     <p>Ask for D1–D3 first.</p>
 *     <p>D4 can wait for the next review.</p>
 *   </SlideNotes>
 * </Page>
 * ```
 */
export default function SlideNotes({ children, label = 'Speaker notes', audience = 'presenter' }: SlideNotesProps) {
  // Who receives the notes is the redaction policy's call; how a permitted build shows them
  // is per format. The inline display:none keeps them off PDF and PNG pages, even without
  // facet's CSS; HTML output reveals them through `[data-facet-notes="show"]` on <html>
  // (see styles.css). Not the `hidden` attribute: Tailwind's preflight hides it with a
  // layered !important that nothing can override.
  return (
    <Classified audience={audience}>
      <details data-facet-slide-notes className="facet-slide-notes" style={{ display: 'none' }}>
        <summary className="facet-slide-notes__summary">{label}</summary>
        <div data-facet-slide-notes-body className="facet-slide-notes__body">{children}</div>
      </details>
    </Classified>
  );
}
