import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface ProviderModelOption {
  providerID: string;
  modelID: string;
  displayName: string;
  providerName: string;
}

interface ModelContextMenuProps {
  models: ProviderModelOption[];
  selectedProvider: string;
  selectedModel: string;
  onSelect: (providerID: string, modelID: string) => void;
  onClose: () => void;
}

export default function ModelContextMenu({
  models,
  selectedProvider,
  selectedModel,
  onSelect,
  onClose,
}: ModelContextMenuProps) {
  const [filter, setFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const providers = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of models) {
      map.set(m.providerID, m.providerName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [models]);

  const filtered = useMemo(() => {
    const lowerFilter = filter.toLowerCase();
    return models.filter((m) => {
      if (providerFilter && m.providerID !== providerFilter) return false;
      if (lowerFilter && !m.displayName.toLowerCase().includes(lowerFilter)) return false;
      return true;
    });
  }, [models, filter, providerFilter]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <div
      role="menu"
      aria-label="Model selector"
      className="absolute right-0 top-full mt-1 z-50 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2"
      onKeyDown={handleKeyDown}
    >
      <input
        ref={inputRef}
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search models..."
        className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500 mb-2 outline-none focus:border-zinc-400"
        aria-label="Search models"
      />
      {providers.length > 1 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          <button
            role="menuitem"
            onClick={() => setProviderFilter(null)}
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              providerFilter === null
                ? "bg-zinc-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All
          </button>
          {providers.map((p) => (
            <button
              key={p.id}
              role="menuitem"
              onClick={() => setProviderFilter(p.id === providerFilter ? null : p.id)}
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                providerFilter === p.id
                  ? "bg-zinc-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <div ref={listRef} className="max-h-48 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-zinc-500 text-xs py-2 text-center">No models found</p>
        )}
        {filtered.map((m) => {
          const isSelected = m.providerID === selectedProvider && m.modelID === selectedModel;
          return (
            <button
              key={`${m.providerID}/${m.modelID}`}
              role="menuitem"
              onClick={() => {
                onSelect(m.providerID, m.modelID);
                onClose();
              }}
              className={`w-full text-left px-2 py-1.5 text-sm rounded ${
                isSelected
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <span className="font-medium">{m.displayName}</span>
              <span className="text-zinc-500 text-[10px] ml-2">{m.providerName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
