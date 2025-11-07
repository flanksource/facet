import React, { useState } from 'react';

interface TerminalOutputProps {
  command: string;
  children?: React.ReactNode;
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-white/50 hover:text-white transition-colors"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '4px 8px'
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function TerminalOutput({ command, children }: TerminalOutputProps) {
  // Extract text from children if it's a React element
  let output = '';
  if (typeof children === 'string') {
    output = children;
  } else if (React.isValidElement(children) && children.props?.children) {
    output = typeof children.props.children === 'string'
      ? children.props.children
      : '';
  }

  return (
    <div style={{
      // backgroundColor: '#2D2D2D',
      borderRadius: '6px',
      padding: '1px',
      // boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      marginTop: '1rem',
      marginBottom: '1rem'
    }}>
      {/* Window controls header */}
      <div style={{
        height: '20px',
        background: 'linear-gradient(to bottom, #4B4B4B, #3A3A3A)',
        borderTopLeftRadius: '6px',
        borderTopRightRadius: '6px',
        padding: '0 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4px'
      }}>
        {/* macOS-style window controls */}
        <div
          style={{
            boxSizing: "border-box",
            color: "rgb(137, 137, 144)",
            columnGap: "8px",
            display: "grid",
            gridAutoFlow: "column",
            gridTemplateColumns: "12px 12px 12px",
            gridTemplateRows: "12px",
            height: "28px",
            justifyContent: "flex-start",
            lineHeight: "24px",
            paddingTop: "0.5rem",
            width: "62px",
          }}>
          <div
            style={{
              backgroundColor: "rgb(236, 106, 94)",
              borderRadius: "10000px",
              height: "0.75rem",
              width: "0.75rem",
            }}
          />
          <div
            style={{
              backgroundColor: "rgb(243, 191, 79)",
              borderRadius: "10000px",
              height: "0.75rem",
              width: "0.75rem",
            }}
          />
          <div
            style={{
              backgroundColor: "rgb(97, 197, 84)",
              borderRadius: "10000px",
              height: "0.75rem",
              width: "0.75rem",
            }}
          />
        </div>

      </div>

      {/* Terminal content */}
      <div
        style={{
          backgroundColor: '#1E1E1E',
          color: 'white',
          padding: '4px',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.5',
          maxHeight: '400px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          borderBottomLeftRadius: '6px',
          borderBottomRightRadius: '6px'
        }}
      >
        {/* Command prompt */}
        <div style={{ marginBottom: output ? '8px' : '0' }}>
          <span style={{ color: '#5AF78E' }}>❯</span>{' '}
          <span className="text-nowrap" style={{ color: '#D4D4D4' }}>{children}</span>
        </div>

        {/* Output */}
        {output && (
          <div style={{ color: '#CCCCCC' }}>
            {output}
          </div>
        )}
      </div>
    </div>
  );
}
