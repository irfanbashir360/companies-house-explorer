import React from 'react';
import { createPortal } from 'react-dom';
import type { GraphNode } from '../types';
import { Building2, User, Shield, Link as LinkIcon, FileText, MapPin } from 'lucide-react';

interface NodeTooltipProps {
    node: GraphNode | null;
    x: number;
    y: number;
    visible: boolean;
}

export const NodeTooltip: React.FC<NodeTooltipProps> = ({ node, x, y, visible }) => {
    if (!node || !visible) return null;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateString;
        }
    };

    const getIcon = () => {
        const icons = {
            company: Building2,
            officer: User,
            psc: Shield,
            charge: LinkIcon,
            filing: FileText,
            establishment: MapPin,
        };
        const Icon = icons[node.type];
        return <Icon className="w-4 h-4" />;
    };


    const renderCompanyDetails = () => {
        const data = node.data;
        return (
            <>
                <div className="text-xs text-slate-500 mt-1">
                    {data.company_number && (
                        <div className="font-mono text-slate-400">{data.company_number}</div>
                    )}
                </div>
                {data.company_status && (
                    <div className="mt-2">
                        <span
                            className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${data.company_status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                        >
                            {data.company_status}
                        </span>
                    </div>
                )}
                {data.date_of_creation && (
                    <div className="text-xs text-slate-500 mt-2">
                        Incorporated: {formatDate(data.date_of_creation)}
                    </div>
                )}
                {data.type && (
                    <div className="text-xs text-slate-500 mt-1">Type: {data.type}</div>
                )}
            </>
        );
    };

    const renderOfficerDetails = () => {
        const data = node.data;
        return (
            <>
                {data.officer_role && (
                    <div className="text-xs text-slate-500 mt-1">
                        Role: <span className="font-semibold text-slate-700">{data.officer_role}</span>
                    </div>
                )}
                {data.appointed_on && (
                    <div className="text-xs text-slate-500 mt-1">
                        Appointed: {formatDate(data.appointed_on)}
                    </div>
                )}
                {data.resigned_on && (
                    <div className="text-xs text-red-600 mt-1">
                        Resigned: {formatDate(data.resigned_on)}
                    </div>
                )}
                {data.nationality && (
                    <div className="text-xs text-slate-500 mt-1">Nationality: {data.nationality}</div>
                )}
                {data.appointment_count !== undefined && (
                    <div className="text-xs text-slate-500 mt-1">
                        Appointments: {data.appointment_count}
                    </div>
                )}
            </>
        );
    };

    const renderPSCDetails = () => {
        const data = node.data;
        return (
            <>
                {data.kind && (
                    <div className="text-xs text-slate-500 mt-1">Kind: {data.kind}</div>
                )}
                {data.natures_of_control && data.natures_of_control.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                        Control: {data.natures_of_control.join(', ')}
                    </div>
                )}
                {data.notified_on && (
                    <div className="text-xs text-slate-500 mt-1">
                        Notified: {formatDate(data.notified_on)}
                    </div>
                )}
            </>
        );
    };

    const renderContent = () => {
        switch (node.type) {
            case 'company':
                return renderCompanyDetails();
            case 'officer':
                return renderOfficerDetails();
            case 'psc':
                return renderPSCDetails();
            case 'charge':
                return (
                    <div className="text-xs text-slate-500 mt-1">
                        {node.data.status && <div>Status: {node.data.status}</div>}
                    </div>
                );
            case 'filing':
                return (
                    <div className="text-xs text-slate-500 mt-1">
                        {node.data.category && <div>Category: {node.data.category}</div>}
                        {node.data.date && <div className="mt-1">Date: {formatDate(node.data.date)}</div>}
                    </div>
                );
            case 'establishment':
                return (
                    <div className="text-xs text-slate-500 mt-1">
                        {node.data.company_status && <div>Status: {node.data.company_status}</div>}
                    </div>
                );
            default:
                return null;
        }
    };

    // x and y are already in viewport coordinates from d3.pointer(event)
    const tooltipX = x + 15;
    const tooltipY = y - 10;

    const tooltipContent = (
        <div
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200/60 p-3 min-w-[200px] max-w-[280px] pointer-events-none"
            style={{
                left: `${tooltipX}px`,
                top: `${tooltipY}px`,
                transform: 'translateY(-100%)',
            }}
        >
            <div className="flex items-start gap-2.5">
                <div className="text-slate-700 mt-0.5 flex-shrink-0">{getIcon()}</div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm leading-tight break-words">
                        {node.label}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mt-0.5">
                        {node.type}
                    </div>
                    {renderContent()}
                </div>
            </div>
        </div>
    );

    return createPortal(tooltipContent, document.body);
};
