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
  rowIndex: number;
  date: string;
  partyName: string;
  checklist: ChecklistState;
  completedItems: string[];
  completedCount: number;
  totalCount: number;
};

type MeetupPlan = {
  partyName: string;
  lastMeetingDate: Date | null;
  nextMeetingDate: Date;
  status: 'overdue' | 'today' | 'upcoming';
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

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseChecklistDate(value: string) {
  if (!value) return null;

  const ymdMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return startOfDay(new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3])));
  }

  const dmyMatch = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmyMatch) {
    return startOfDay(new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1])));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfDay(parsed);
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  const originalDay = copy.getDate();
  copy.setMonth(copy.getMonth() + months);

  if (copy.getDate() !== originalDay) {
    copy.setDate(0);
  }

  return startOfDay(copy);
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateFromDate(date: Date | null) {
  if (!date) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

function normalizePartyName(name: string) {
  return name.trim().toLowerCase();
}

export default function MeetingChecklist() {
  const { request } = useApi();
  const [visitDate, setVisitDate] = useState(getTodayInputValue());
  const [partyName, setPartyName] = useState('');
  const [partyNameOptions, setPartyNameOptions] = useState<string[]>([]);
  const [isPartyNameDropdownOpen, setIsPartyNameDropdownOpen] = useState(false);
  const [isLoadingPartyNames, setIsLoadingPartyNames] = useState(false);
  const [checkedItems, setCheckedItems] = useState<ChecklistState>(() => createInitialChecklist());
  const [editCheckedItems, setEditCheckedItems] = useState<ChecklistState>(() => createInitialChecklist());
  const [entries, setEntries] = useState<MeetingChecklistEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MeetingChecklistEntry | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'quarterly'>('entries');
  const [savedChecklistSearch, setSavedChecklistSearch] = useState('');
  const [meetupFilter, setMeetupFilter] = useState<'today' | 'all'>('today');
  const [meetupSearch, setMeetupSearch] = useState('');

  const allItems = useMemo(() => CHECKLIST_SECTIONS.flatMap(section => section.items), []);
  const completedCount = allItems.filter(item => checkedItems[item]).length;
  const editCompletedCount = allItems.filter(item => editCheckedItems[item]).length;
  const filteredPartyNames = useMemo(() => {
    const query = partyName.trim().toLowerCase();
    const matches = query
      ? partyNameOptions.filter(name => name.toLowerCase().includes(query))
      : partyNameOptions;

    return matches.slice(0, 20);
  }, [partyName, partyNameOptions]);
  const meetupPlans = useMemo<MeetupPlan[]>(() => {
    const today = startOfDay(new Date());
    const latestByParty = new Map<string, { partyName: string; lastMeetingDate: Date | null }>();

    partyNameOptions.forEach(name => {
      const key = normalizePartyName(name);
      if (!key) return;
      latestByParty.set(key, { partyName: name, lastMeetingDate: null });
    });

    entries.forEach(entry => {
      const key = normalizePartyName(entry.partyName);
      if (!key) return;

      const entryDate = parseChecklistDate(entry.date);
      const current = latestByParty.get(key);
      if (!current) {
        latestByParty.set(key, { partyName: entry.partyName, lastMeetingDate: entryDate });
        return;
      }

      if (entryDate && (!current.lastMeetingDate || entryDate > current.lastMeetingDate)) {
        latestByParty.set(key, { partyName: current.partyName || entry.partyName, lastMeetingDate: entryDate });
      }
    });

    return Array.from(latestByParty.values()).map(plan => {
      const nextMeetingDate = plan.lastMeetingDate ? addMonths(plan.lastMeetingDate, 3) : today;
      const diff = nextMeetingDate.getTime() - today.getTime();
      const status: MeetupPlan['status'] = diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'upcoming';

      return {
        partyName: plan.partyName,
        lastMeetingDate: plan.lastMeetingDate,
        nextMeetingDate,
        status,
      };
    }).sort((a, b) => {
      const dateDiff = a.nextMeetingDate.getTime() - b.nextMeetingDate.getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.partyName.localeCompare(b.partyName);
    });
  }, [entries, partyNameOptions]);
  const visibleMeetupPlans = useMemo(() => {
    const query = meetupSearch.trim().toLowerCase();
    const filteredByDate = meetupFilter === 'today'
      ? meetupPlans.filter(plan => plan.status === 'overdue' || plan.status === 'today')
      : meetupPlans;

    if (!query) return filteredByDate;

    return filteredByDate.filter(plan => plan.partyName.toLowerCase().includes(query));
  }, [meetupFilter, meetupPlans, meetupSearch]);
  const visibleEntries = useMemo(() => {
    const query = savedChecklistSearch.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter(entry => entry.partyName.toLowerCase().includes(query));
  }, [entries, savedChecklistSearch]);
  const dueMeetupCount = meetupPlans.filter(plan => plan.status === 'overdue' || plan.status === 'today').length;

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

  const fetchPartyNames = async () => {
    setIsLoadingPartyNames(true);
    try {
      const data = await request('/api/meeting-checklist/party-names', { silent: true });
      setPartyNameOptions(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load party names');
    } finally {
      setIsLoadingPartyNames(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchPartyNames();
  }, [request]);

  const handleToggle = (item: string, value: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: value,
    }));
  };

  const handleEditToggle = (item: string, value: boolean) => {
    setEditCheckedItems(prev => ({
      ...prev,
      [item]: value,
    }));
  };

  const handleReset = () => {
    setVisitDate(getTodayInputValue());
    setPartyName('');
    setCheckedItems(createInitialChecklist());
  };

  const handleOpenForm = (prefillPartyName = '', prefillDate = getTodayInputValue()) => {
    setVisitDate(prefillDate);
    setPartyName(prefillPartyName);
    setCheckedItems(createInitialChecklist());
    setIsFormOpen(true);
  };

  const handleOpenMeetupChecklist = (plan: MeetupPlan) => {
    handleOpenForm(plan.partyName, formatDateForInput(startOfDay(new Date())));
  };

  const handleOpenEntry = (entry: MeetingChecklistEntry) => {
    setSelectedEntry(entry);
    setEditCheckedItems({
      ...createInitialChecklist(),
      ...entry.checklist,
    });
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

  const handleUpdateEntry = async () => {
    if (!selectedEntry) return;

    setIsUpdating(true);
    try {
      await request(`/api/meeting-checklist/${selectedEntry.rowIndex}`, {
        method: 'PATCH',
        body: JSON.stringify({
          checklist: editCheckedItems,
        }),
      });
      toast.success('Meeting checklist updated');
      setSelectedEntry(null);
      await fetchEntries();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update meeting checklist');
    } finally {
      setIsUpdating(false);
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
        <div className="relative space-y-2">
          <Label htmlFor="meeting-checklist-party" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Party Name
          </Label>
          <Input
            id="meeting-checklist-party"
            value={partyName}
            onChange={event => {
              setPartyName(event.target.value);
              setIsPartyNameDropdownOpen(true);
            }}
            onFocus={() => setIsPartyNameDropdownOpen(true)}
            onBlur={() => window.setTimeout(() => setIsPartyNameDropdownOpen(false), 120)}
            autoComplete="off"
            className="h-11"
          />
          {isPartyNameDropdownOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {isLoadingPartyNames ? (
                <div className="px-3 py-2 text-sm font-medium text-slate-500">Loading party names...</div>
              ) : filteredPartyNames.length > 0 ? (
                filteredPartyNames.map(name => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                      setPartyName(name);
                      setIsPartyNameDropdownOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {name}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm font-medium text-slate-500">No matching party name. Type new name.</div>
              )}
            </div>
          )}
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
        <Button onClick={() => handleOpenForm()} className="h-11 bg-indigo-600 px-5 hover:bg-indigo-700">
          <Plus size={17} />
          New Entry
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('entries')}
            className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === 'entries'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Saved Checklists
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quarterly')}
            className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
              activeTab === 'quarterly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            3 Month Meetup
          </button>
        </div>
        <Badge className={dueMeetupCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}>
          {dueMeetupCount} due today
        </Badge>
      </div>

      {activeTab === 'entries' ? (
        isLoadingEntries ? (
          <div className="rounded-md border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
            Loading meeting checklists...
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <ClipboardCheck className="mx-auto mb-3 text-slate-300" size={36} />
            <p className="font-heading text-lg font-bold text-slate-800">No meeting checklist saved yet</p>
            <Button onClick={() => handleOpenForm()} className="mt-5 h-11 bg-indigo-600 px-5 hover:bg-indigo-700">
              <Plus size={17} />
              New Entry
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
              <Input
                value={savedChecklistSearch}
                onChange={event => setSavedChecklistSearch(event.target.value)}
                placeholder="Search party name..."
                className="h-11 sm:w-80"
              />
            </div>

            {visibleEntries.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <ClipboardCheck className="mx-auto mb-3 text-slate-300" size={36} />
                <p className="font-heading text-lg font-bold text-slate-800">No saved checklist found</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleEntries.map(entry => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleOpenEntry(entry)}
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
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-sm font-black uppercase tracking-wider text-slate-800">
                Quarterly meetup schedule
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Every party should be visited once in 3 months.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={meetupSearch}
                onChange={event => setMeetupSearch(event.target.value)}
                placeholder="Search party name..."
                className="h-11 min-w-0 sm:w-72"
              />
              <div className="grid grid-cols-2 gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setMeetupFilter('today')}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
                  meetupFilter === 'today'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Today Due
              </button>
              <button
                type="button"
                onClick={() => setMeetupFilter('all')}
                className={`rounded-md px-4 py-2 text-sm font-bold transition-colors ${
                  meetupFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Parties
              </button>
              </div>
            </div>
          </div>

          {isLoadingEntries || isLoadingPartyNames ? (
            <div className="rounded-md border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm">
              Loading meetup schedule...
            </div>
          ) : visibleMeetupPlans.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <CalendarDays className="mx-auto mb-3 text-slate-300" size={36} />
              <p className="font-heading text-lg font-bold text-slate-800">No meetup due today</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Switch to All Parties to see upcoming meetup dates.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleMeetupPlans.map(plan => (
                <div
                  key={plan.partyName}
                  className={`rounded-md border bg-white p-4 shadow-sm ${
                    plan.status === 'overdue'
                      ? 'border-rose-200 ring-2 ring-rose-100'
                      : plan.status === 'today'
                        ? 'border-amber-200 ring-2 ring-amber-100'
                        : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge
                        className={
                          plan.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700'
                            : plan.status === 'today'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-50 text-slate-600'
                        }
                      >
                        {plan.status === 'overdue' ? 'Overdue' : plan.status === 'today' ? 'Due Today' : 'Upcoming'}
                      </Badge>
                      <div className="mt-3 flex items-start gap-2">
                        <Building2 className="mt-0.5 shrink-0 text-indigo-500" size={18} />
                        <p className="line-clamp-2 font-heading text-lg font-black leading-tight text-slate-900">
                          {plan.partyName}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span>Last meetup</span>
                      <span className="text-slate-900">{formatDateFromDate(plan.lastMeetingDate)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Next meetup</span>
                      <span className="text-slate-900">{formatDateFromDate(plan.nextMeetingDate)}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleOpenMeetupChecklist(plan)}
                    className="mt-4 h-10 w-full bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus size={16} />
                    Meet Now
                  </Button>
                </div>
              ))}
            </div>
          )}
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
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto bg-slate-50">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-black text-slate-900">
              {selectedEntry?.partyName || 'Meeting Checklist'}
            </DialogTitle>
            <DialogDescription>
              {selectedEntry ? `${formatDisplayDate(selectedEntry.date)} - ${editCompletedCount}/${selectedEntry.totalCount} points done` : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {CHECKLIST_SECTIONS.map(section => (
                  <section key={section.title} className="rounded-md border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <h3 className="font-heading text-xs font-black uppercase tracking-wider text-slate-700">
                        {section.title}
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {section.items.map(item => (
                        <label
                          key={item}
                          className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <Checkbox
                            checked={editCheckedItems[item]}
                            onCheckedChange={value => handleEditToggle(item, Boolean(value))}
                            className="h-5 w-5 rounded-md border-slate-300 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                          />
                          <span className="leading-snug">{item}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>

              <div className="sticky bottom-0 -mx-6 border-t border-slate-200 bg-white/90 px-6 py-3 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold text-slate-600">
                    {editCompletedCount}/{selectedEntry.totalCount} completed
                  </div>
                  <Button onClick={handleUpdateEntry} disabled={isUpdating} className="h-11 bg-emerald-600 px-6 hover:bg-emerald-700">
                    <Save size={16} />
                    {isUpdating ? 'Saving...' : 'Save Updates'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
