import React, { useRef } from 'react';
import { Upload, Trash2, Image as ImageIcon, FileJson } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { GRAPH_SVG_ID } from '../utils/layout';

const download = (content: string, type: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled, danger, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    className={`h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
      danger ? 'text-muted hover:text-alert hover:bg-red-50' : 'text-muted hover:text-ink hover:bg-canvas'
    }`}
  >
    {children}
  </button>
);

export const Toolbar: React.FC = () => {
  const { graphData, clearGraph, exportGraph, importGraph } = useGraphStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const empty = graphData.nodes.length === 0;

  const handleExportJSON = () =>
    download(exportGraph(), 'application/json', `tracewire-graph-${Date.now()}.json`);

  const handleExportSVG = () => {
    // Export the graph itself, not the first icon <svg> on the page
    const svg = document.getElementById(GRAPH_SVG_ID);
    if (!svg) return;
    download(new XMLSerializer().serializeToString(svg), 'image/svg+xml', `tracewire-graph-${Date.now()}.svg`);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => importGraph(e.target?.result as string);
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClear = () => {
    if (empty) return;
    if (window.confirm('Clear the whole network? Export it first if you want to keep it.')) {
      clearGraph();
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
      <IconButton label="Open a saved network (.json)" onClick={() => fileInputRef.current?.click()}>
        <Upload className="w-[18px] h-[18px]" />
      </IconButton>
      <span className="hidden sm:contents">
        <IconButton label="Save network as JSON" onClick={handleExportJSON} disabled={empty}>
          <FileJson className="w-[18px] h-[18px]" />
        </IconButton>
        <IconButton label="Save picture of network (SVG)" onClick={handleExportSVG} disabled={empty}>
          <ImageIcon className="w-[18px] h-[18px]" />
        </IconButton>
        <span className="w-px h-5 bg-line mx-1.5" aria-hidden="true" />
      </span>
      <IconButton label="Clear network" onClick={handleClear} disabled={empty} danger>
        <Trash2 className="w-[18px] h-[18px]" />
      </IconButton>
    </div>
  );
};
