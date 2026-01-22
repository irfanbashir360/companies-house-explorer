import React, { useRef } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  FileJson,
} from 'lucide-react';
import { useGraphStore } from '../store/graphStore';

export const Toolbar: React.FC = () => {
  const { graphData, clearGraph, exportGraph, importGraph } = useGraphStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJSON = () => {
    const data = exportGraph();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `companies-house-graph-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportSVG = () => {
    const svg = document.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `companies-house-graph-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      importGraph(content);
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    if (graphData.nodes.length === 0) return;

    const confirmed = window.confirm(
      'Are you sure you want to clear the entire graph? This action cannot be undone.'
    );
    if (confirmed) {
      clearGraph();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Export JSON */}
      <button
        onClick={handleExportJSON}
        disabled={graphData.nodes.length === 0}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-slate-700 shadow-sm hover:shadow"
        title="Export as JSON"
      >
        <FileJson className="w-4 h-4" />
        Export JSON
      </button>

      {/* Export SVG */}
      <button
        onClick={handleExportSVG}
        disabled={graphData.nodes.length === 0}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium text-slate-700 shadow-sm hover:shadow"
        title="Export as SVG"
      >
        <ImageIcon className="w-4 h-4" />
        Export SVG
      </button>

      {/* Import */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-200 text-sm font-medium text-slate-700 shadow-sm hover:shadow"
          title="Import JSON"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
      </div>

      {/* Clear */}
      <button
        onClick={handleClear}
        disabled={graphData.nodes.length === 0}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm hover:shadow"
        title="Clear graph"
      >
        <Trash2 className="w-4 h-4" />
        Clear
      </button>
    </div>
  );
};
