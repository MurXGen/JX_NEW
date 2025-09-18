import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ChatResponse = ({ text }) => {
  return (
    <div className="chatResponse">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Main heading (section title + divider)
          h1: ({ node, ...props }) => (
            <div style={{ margin: "20px 0 12px" }}>
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--base-text)",
                  lineHeight: "1.4",
                }}
                {...props}
              />
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--white-10)",
                  margin: "10px 0 0",
                }}
              />
            </div>
          ),

          // Subheading (lighter, acts as label)
          h2: ({ node, ...props }) => (
            <p
              style={{
                fontSize: "15px",
                fontWeight: 500,
                margin: "12px 0 6px",
                color: "var(--white-80)",
              }}
              {...props}
            />
          ),

          // Normal text
          p: ({ node, ...props }) => (
            <p
              style={{
                fontSize: "14px",
                margin: "6px 0",
                lineHeight: "1.7",
                color: "var(--white-90)",
              }}
              {...props}
            />
          ),

          // Lists
          ul: ({ node, ...props }) => (
            <ul
              style={{
                paddingLeft: "18px",
                margin: "6px 0",
                lineHeight: "1.6",
              }}
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li
              style={{
                marginBottom: "4px",
                fontSize: "14px",
                color: "var(--white-90)",
              }}
              {...props}
            />
          ),

          // Inline + block code
          code: ({ inline, ...props }) =>
            inline ? (
              <code
                style={{
                  background: "var(--white-10)",
                  padding: "2px 5px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontFamily: "monospace",
                  color: "var(--base-text)",
                }}
                {...props}
              />
            ) : (
              <pre
                style={{
                  background: "var(--white-4)",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  overflowX: "auto",
                }}
              >
                <code {...props} />
              </pre>
            ),

          // Softer bold highlight
          strong: ({ node, ...props }) => (
            <span
              style={{
                fontWeight: 600,
                background: "var(--white-6)",
                padding: "1px 4px",
                borderRadius: "4px",
              }}
              {...props}
            />
          ),

          // Table styling
          table: ({ node, ...props }) => (
            <div style={{ overflowX: "auto", margin: "12px 0" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
                {...props}
              />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              style={{
                background: "var(--white-6)",
                textAlign: "left",
              }}
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              style={{
                padding: "8px",
                borderBottom: "2px solid var(--white-10)",
                fontWeight: 600,
                color: "var(--base-text)",
              }}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              style={{
                padding: "8px",
                borderBottom: "1px solid var(--white-10)",
                color: "var(--white-90)",
              }}
              {...props}
            />
          ),
          tr: ({ node, ...props }) => (
            <tr
              style={{
                backgroundColor: "transparent",
              }}
              {...props}
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default ChatResponse;
