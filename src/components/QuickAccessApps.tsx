import React, { useEffect, useState } from 'react';
import { LifeBuoy, Settings2, CalendarDays, UserCheck, ExternalLink, Activity } from 'lucide-react';
import { useApi } from '../lib/api';

interface QuickLink {
  name: string;
  url: string;
  icon: string;
}

const iconMap: Record<string, React.ReactNode> = {
  'LifeBuoy': <LifeBuoy size={24} className="text-indigo-600" />,
  'Settings2': <Settings2 size={24} className="text-indigo-600" />,
  'CalendarDays': <CalendarDays size={24} className="text-indigo-600" />,
  'UserCheck': <UserCheck size={24} className="text-indigo-600" />
};

export const QuickAccessApps = () => {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const { request } = useApi();

  useEffect(() => {
    request('/api/quick-access')
      .then((data: any) => {
        if (Array.isArray(data)) {
          setLinks(data);
        }
      })
      .catch(err => console.error("Failed to load Quick Access links:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border-slate-300 shadow-sm rounded-2xl p-5 mb-6 animate-pulse flex items-center justify-center h-24">
        <Activity className="animate-spin text-slate-300" />
      </div>
    );
  }

  if (links.length === 0) return null;

  return (
    <div className="bg-white border border-slate-300 shadow-sm rounded-2xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Activity size={16} className="text-indigo-500" />
        Quick Access
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {links.map((link, idx) => (
          <a 
            key={idx}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 p-4 bg-slate-50 border border-slate-300 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-md transition-all group relative cursor-pointer active:scale-95"
          >
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-200 group-hover:scale-110 transition-transform">
              {iconMap[link.icon] || <ExternalLink size={24} className="text-indigo-600" />}
            </div>
            <span className="text-xs font-semibold text-slate-700 text-center leading-tight group-hover:text-indigo-700">
              {link.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
