import React, { useEffect, useState } from 'react';
import { Activity, ExternalLink, Users, CalendarDays, Settings2, LifeBuoy, Video, HelpCircle, FileText } from 'lucide-react';
import { useApi } from '../lib/api';

interface AppIconProps {
  name: string;
  url: string;
  icon: React.ReactNode;
}

const getIconForName = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('video')) return <Video size={24} />;
  if (lowerName.includes('help')) return <LifeBuoy size={24} />;
  if (lowerName.includes('alteration')) return <Settings2 size={24} />;
  if (lowerName.includes('leave')) return <CalendarDays size={24} />;
  if (lowerName.includes('attendance')) return <Users size={24} />;
  if (lowerName.includes('form')) return <FileText size={24} />;
  return <Activity size={24} />;
};

export const QuickAccessApps = () => {
  const [apps, setApps] = useState<AppIconProps[]>([]);
  const [loading, setLoading] = useState(true);
  const { request } = useApi();

  useEffect(() => {
    request('/api/quick-access')
      .then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          const firstRow = data[0];
          const appLinks: AppIconProps[] = [];
          
          Object.keys(firstRow).forEach(key => {
            const url = firstRow[key];
            // Filter out empty values or internal keys like __col_0
            if (url && typeof url === 'string' && url.startsWith('http') && !key.startsWith('__col')) {
              appLinks.push({
                name: key,
                url: url,
                icon: getIconForName(key)
              });
            }
          });
          
          setApps(appLinks);
        }
      })
      .catch(err => console.error("Failed to load Quick Access data:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border-slate-300 shadow-sm rounded-2xl p-5 mb-6 animate-pulse flex items-center justify-center h-32">
        <Activity className="animate-spin text-slate-300 mr-3" />
        <span className="text-slate-500 font-medium">Loading apps...</span>
      </div>
    );
  }

  if (apps.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 mb-6">
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2">
        <Activity size={16} className="text-indigo-600" />
        Other Apps & Forms
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {apps.map((app, idx) => (
          <a
            key={idx}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 hover:shadow-md transition-all duration-300 group cursor-pointer active:scale-95"
          >
            <div className="w-14 h-14 bg-white text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg transition-all duration-300 shadow-sm mb-3">
              {app.icon}
            </div>
            <span className="text-[11px] font-bold text-slate-600 text-center leading-tight group-hover:text-indigo-800 uppercase tracking-tight line-clamp-2">
              {app.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
