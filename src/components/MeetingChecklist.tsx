import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Building2, CalendarDays, ClipboardCheck, Eye, Plus, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useApi } from '../lib/api';

const CHECKLIST_SECTIONS = [
  {
    title: 'Before Client Visit',
    items: [
      'Appointment scheduled through CRM',
      "Verify and obtain the client's location from CRM before travel",
      'Inform concerned staff via WhatsApp/Email about the visit',
      "Inform Varsha Ma'am one day before for car arrangement",
      'Reach the meeting location on time',
    ],
  },
  {
    title: 'Meeting Kit',
    items: [
      'Questionnaire Sheet',
      'Gift (as per designation)',
      '2 Pens',
      'Pad/Tablet',
      'Notepad/Sticky Pad',
      'Visiting Cards',
      'PPPL Badge',
      'Formal Attire',
    ],
  },
  {
    title: 'Client Discussion',
    items: [
      'Review customer records before meeting',
      'Present company profile/System/Sales Deck',
      "Understand client's process",
      'Discuss usage of our fuel in their process',
      'Ask for referrals',
    ],
  },
  {
    title: 'After Meeting',
    items: [
      'Click photographs',
      'Request testimonial/feedback',
      'Send thank-you email with photo attachment',
    ],
  },
];

type ChecklistState = Record<string, boolean>;

type MeetingChecklistEntry = {
  id: string;
  date: string;
  partyName: string;
  checklist: ChecklistState;
  completedItems: string[];
  completedCount: number;
  totalCount: number;
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialChecklist() {
  const initial: ChecklistState = {};
  CHECKLIST_SECTIONS.forEach(section => {
    section.items.forEach(item => {
      initial[item] = false;
    });
  });
  return initial;
}

function formatDisplayDate(value: string) {
  if (!value) return '-';
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  const parsedDate = new Date(value);
  if (!Number.isNaN(parsedDate.getTime())) {
    const day = String(parsedDate.getDate()).padStart(2, '0');
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${parsedDate.getFullYear()}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value.replace(/\//g, '-');
  return value;
}

export default function MeetingChecklist() {
  const { request } = useApi();
  const [visitDate, setVisitDate] = useState(getTodayInputValue());
  const [partyName, setPartyName] = useState('');
  const [checkedItems, setCheckedItems] = useState<ChecklistState>(() => createInitialChecklist());
  const [entries, setEntries] = useState<MeetingChecklistEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MeetingChecklistEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const allItems = useMemo(() => CHECKLIST_SECTIONS.flatMap(section => section.items), []);
  const completedCount = allItems.filter(item => checkedItems[item]).length;

  const fetchEntries = async () => {
    setIsLoadingEntries(true);
    try {
      const data = await request('/api/meeting-checklist', { silent: true });
      setEntries(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load meeting checklists');
    } finally {
      setIsLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [request]);

  const handleToggle = (item: string, value: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: value,
    }));
  };

  const handleReset = () => {
    setVisitDate(getTodayInputValue());
    setPartyName('');
    setCheckedItems(createInitialChecklist());
  };

  const handleOpenForm = () => {
    handleReset();
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!visitDate || !partyName.trim()) {
      toast.error('Date and Party Name are required');
      return;
    }

    setIsSaving(true);
    try {
      await request('/api/meeting-checklist', {
        method: 'POST',
        body: JSON.stringify({
          date: visitDate,
          partyName: partyName.trim(),
          checklist: checkedItems,
        }),
      });
      toast.success('Meeting checklist saved');
      handleReset();
      setIsFormOpen(false);
      await fetchEntries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save meeting checklist');
    } finally {
      setIsSaving(false);
    }
  };

  const renderChecklistForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="meeting-checklist-date" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Date
          </Label>
          <Input
            id="meeting-checklist-date"
            type="date"
            value={visitDate}
            onChange={event => setVisitDate(event.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="meeting-checklist-party" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Party Name
          </Label>
          <Input
            id="meeting-checklist-party"
            value={partyName}
            onChange={event => setPartyName(event.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {CHECKLIST_SECTIONS.map(section => (
          <section key={section.title} className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="font-heading text-sm font-black uppercase tracking-wider text-slate-800">
                {section.title}
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {section.items.map(item => (
                <label
                  key={item}
                  className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Checkbox
                    checked={checkedItems[item]}
                    onCheckedChange={value => handleToggle(item, Boolean(value))}
                    className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600"
                  />
                  <span className="leading-snug">{item}</span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:mx-0 md:rounded-md md:border md:shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-600">
            {completedCount}/{allItems.length} completed
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleReset} className="h-11">
              <RotateCcw size={16} />
              Reset
            </Button>
            <Button type="submit" disabled={isSaving} className="h-11 bg-indigo-600 px-6 hover:bg-indigo-700">
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Checklist'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            <ClipboardCheck size={14} />
            Meeting Checklist
          </div>
          <h1 className="font-heading text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            Client Visit Checklist
          </h1>
        </div>
        <Button onClick={handleOpenForm} className="h-11 bg-indigo-600 px-5 hover:bg-indigo-700">
          <Plus size={17} />
          New Entry
        </Button>
      </div>

      {isLoadingEntries ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
          Loading meeting checklists...
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <ClipboardCheck className="mx-auto mb-3 text-slate-300" size={36} />
          <p className="font-heading text-lg font-bold text-slate-800">No meeting checklist saved yet</p>
          <Button onClick={handleOpenForm} className="mt-5 h-11 bg-indigo-600 px-5 hover:bg-indigo-700">
            <Plus size={17} />
            New Entry
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(entry => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setSelectedEntry(entry)}
              className="group rounded-md border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <CalendarDays size={14} />
                    {formatDisplayDate(entry.date)}
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <Building2 className="mt-0.5 shrink-0 text-indigo-500" size={18} />
                    <p className="line-clamp-2 font-heading text-lg font-black leading-tight text-slate-900">
                      {entry.partyName || '-'}
                    </p>
                  </div>
                </div>
                <Eye className="shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500" size={18} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge className="border-indigo-100 bg-indigo-50 text-indigo-700">
                  {entry.completedCount}/{entry.totalCount} done
                </Badge>
                {entry.completedItems.slice(0, 2).map(item => (
                  <Badge key={item} variant="outline" className="max-w-full truncate border-slate-200 text-slate-500">
                    {item}
                  </Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto bg-slate-50 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-black text-slate-900">New Meeting Checklist</DialogTitle>
            <DialogDescription>
              Fill Date, Party Name, and mark the completed checklist points.
            </DialogDescription>
          </DialogHeader>
          {renderChecklistForm()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedEntry} onOpenChange={open => !open && setSelectedEntry(null)}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-black text-slate-900">
              {selectedEntry?.partyName || 'Meeting Checklist'}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry ? `${formatDisplayDate(selectedEntry.date)} - ${selectedEntry.completedCount}/${selectedEntry.totalCount} points done` : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              {selectedEntry.completedItems.length === 0 ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                  No checklist points were marked done.
                </div>
              ) : (
                CHECKLIST_SECTIONS.map(section => {
                  const doneItems = section.items.filter(item => selectedEntry.checklist[item]);
                  if (doneItems.length === 0) return null;

                  return (
                    <section key={section.title} className="rounded-md border border-slate-200">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <h3 className="font-heading text-xs font-black uppercase tracking-wider text-slate-700">
                          {section.title}
                        </h3>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {doneItems.map(item => (
                          <div key={item} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700">
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-500 text-white">
                              <ClipboardCheck size={13} />
                            </span>
                            {item}
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
