"use client";

import { useEffect } from "react";

/** Labels each .data-table cell from its header so phone CSS can stack rows as cards. */
export function TableMobileEnhance() {
  useEffect(() => {
    function labelTables(root: ParentNode = document) {
      root.querySelectorAll("table.data-table").forEach((table) => {
        const headers = Array.from(table.querySelectorAll("thead th")).map((th) =>
          (th.textContent || "").replace(/\s+/g, " ").trim()
        );
        if (!headers.length) return;
        table.querySelectorAll("tbody tr").forEach((tr) => {
          Array.from(tr.children).forEach((cell, index) => {
            if (!(cell instanceof HTMLElement)) return;
            if (cell.tagName !== "TD") return;
            const label = headers[index] || "";
            if (label) cell.setAttribute("data-label", label);
            else cell.removeAttribute("data-label");
          });
        });
      });
    }

    labelTables();
    const content = document.querySelector(".app-content");
    if (!content) return;

    const observer = new MutationObserver(() => labelTables(content));
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
