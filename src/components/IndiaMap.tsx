import React, { useState, useMemo } from 'react';
import IndiaMapData from '@svg-maps/india';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { MapPin, Building2, User, Phone } from 'lucide-react';
import { INDIAN_STATES_DISTRICTS } from '../lib/locationData';

// Format currency
const formatCurrency = (val: number | string) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number(val) || 0);
};

export default function IndiaMap({ leads }: { leads: any[] }) {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<{ id: string, name: string, count: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Group leads by normalized state name
  const stateLeadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const validStates = Object.keys(INDIAN_STATES_DISTRICTS).map(s => s.toLowerCase());

    leads.forEach(lead => {
      const st = lead.State || lead.state;
      if (st) {
        // Try to match with exact valid state name case-insensitively
        const matched = validStates.find(s => s === st.toLowerCase()) || st.toLowerCase();
        counts[matched] = (counts[matched] || 0) + 1;
      }
    });
    return counts;
  }, [leads]);

  // Map state name from SVG to the standardized name in our data
  const getStandardStateName = (svgName: string) => {
    const lowerName = svgName.toLowerCase();
    // Some manual mappings if SVG names differ from our standard list
    if (lowerName === 'delhi') return 'delhi';
    if (lowerName.includes('andaman')) return 'andaman and nicobar islands';
    return lowerName;
  };

  const maxLeads = Math.max(1, ...Object.values(stateLeadCounts));

  const getColor = (count: number) => {
    if (count === 0) return '#f8fafc'; // slate-50
    const ratio = count / maxLeads;
    if (ratio < 0.2) return '#c7d2fe'; // indigo-200
    if (ratio < 0.4) return '#a5b4fc'; // indigo-300
    if (ratio < 0.6) return '#818cf8'; // indigo-400
    if (ratio < 0.8) return '#6366f1'; // indigo-500
    return '#4f46e5'; // indigo-600
  };

  const selectedLeads = useMemo(() => {
    if (!selectedState) return [];
    return leads.filter(l => {
      const st = l.State || l.state;
      if (!st) return false;
      const lowerSt = st.toLowerCase();
      const stdName = getStandardStateName(selectedState);
      return lowerSt === stdName || lowerSt.includes(stdName);
    });
  }, [selectedState, leads]);

  return (
    <div className="relative w-full h-full min-h-[400px] flex items-center justify-center p-4">
      {hoveredState && (
        <div 
          className="absolute z-50 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full font-sans animate-in fade-in zoom-in-95 duration-100 flex items-center gap-2"
          style={{ left: mousePos.x, top: mousePos.y - 15 }}
        >
          <span className="font-bold">{hoveredState.name}</span>
          <Badge className="bg-indigo-500 hover:bg-indigo-500 border-none text-white text-[10px] h-5 px-1.5">{hoveredState.count} Leads</Badge>
        </div>
      )}

      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={IndiaMapData.viewBox}
        className="w-full max-h-[500px] drop-shadow-2xl filter"
        onMouseMove={(e) => {
          // Adjust mouse position relative to a stable parent if needed, but clientX/Y works fine for fixed tooltips if we use fixed pos.
          // Better to use relative pos within the container.
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
          });
        }}
        onMouseLeave={() => setHoveredState(null)}
      >
        <g stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round">
          {IndiaMapData.locations.map(location => {
            const stdName = getStandardStateName(location.name);
            const count = stateLeadCounts[stdName] || 0;
            const isHovered = hoveredState?.id === location.id;

            return (
              <path
                key={location.id}
                id={location.id}
                name={location.name}
                d={location.path}
                fill={getColor(count)}
                className="transition-all duration-300 cursor-pointer outline-none"
                style={{
                  transformOrigin: 'center',
                  transform: isHovered ? 'scale(1.01) translateY(-2px)' : 'scale(1)',
                  filter: isHovered ? 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))' : 'none',
                }}
                onMouseEnter={() => setHoveredState({ id: location.id, name: location.name, count })}
                onClick={() => {
                  if (count > 0) {
                    setSelectedState(location.name);
                  }
                }}
              />
            );
          })}
        </g>
      </svg>

      <Dialog open={!!selectedState} onOpenChange={(open) => !open && setSelectedState(null)}>
        <DialogContent className="max-w-3xl bg-white p-0 overflow-hidden rounded-2xl shadow-2xl border-none">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <MapPin className="text-indigo-600" size={20} />
              </div>
              <div>
                <DialogTitle className="text-xl font-heading font-semibold text-slate-900 tracking-tight">
                  {selectedState}
                </DialogTitle>
                <DialogDescription className="text-xs font-sans font-medium text-slate-500 mt-1">
                  Viewing all {selectedLeads.length} leads in this state
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-0">
            <ScrollArea className="max-h-[60vh]">
              <div className="divide-y divide-slate-100">
                {selectedLeads.map((lead, i) => (
                  <div key={lead.id || i} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm text-slate-900">{lead['Party Name'] || lead.company_name || 'Unknown'}</span>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-slate-50 border-slate-200 text-slate-500">{lead.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-sans text-slate-500">
                        <span className="flex items-center gap-1.5"><User size={12} className="text-slate-400" /> {lead['Person Name'] || lead.contact_person || '-'}</span>
                        <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {lead['Mobile No. '] || lead.mobile || '-'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">Assigned to: <span className="text-indigo-600 font-bold">{lead['Sales Person Name'] || lead.owner_id || 'Unassigned'}</span></p>
                    </div>
                    {lead.expected_value && (
                      <div className="text-right">
                        <p className="text-[10px] font-heading uppercase text-slate-400 font-bold tracking-widest mb-1">Value</p>
                        <p className="text-sm font-sans font-bold text-emerald-600">{formatCurrency(lead.expected_value)}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
