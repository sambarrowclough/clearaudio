"use client";

import * as ScrollArea from "@radix-ui/react-scroll-area";

export function ScrollWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea.Root
      type="always"
      style={{
        height: "100vh",
        width: "100%",
      }}
    >
      <ScrollArea.Viewport
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <div className="mac-desktop">
          {children}
        </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        style={{
          display: "flex",
          userSelect: "none",
          touchAction: "none",
          padding: "2px",
          background: "var(--mac-white)",
          border: "1px solid var(--mac-black)",
          width: "16px",
        }}
      >
        <ScrollArea.Thumb
          style={{
            flex: 1,
            background: "var(--mac-white)",
            border: "1px solid var(--mac-black)",
            position: "relative",
            boxShadow:
              "inset -1px -1px 0 var(--mac-black), inset 1px 1px 0 var(--mac-white)",
          }}
        />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}


