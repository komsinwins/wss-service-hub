/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { ServiceJob, OnCallService, ClaimProduct } from '../types';
import { calculateDuration } from '../utils';
import { 
  Wrench, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  BarChart3, 
  PieChart as PieIcon, 
  CalendarDays,
  AlertTriangle,
  Search,
  Eye,
  Edit,
  Clock3,
  Calendar,
  UserCheck,
  CheckCircle2,
  PhoneCall,
  Package
} from 'lucide-react';

interface DashboardProps {
  jobs: ServiceJob[];
  onCalls?: OnCallService[];
  claims?: ClaimProduct[];
  onEditJob?: (job: ServiceJob) => void;
  onViewJobSheet?: (job: ServiceJob) => void;
  onTabChange?: (tab: 'dashboard' | 'records' | 'oncall' | 'claim') => void;
}

export default function Dashboard({ 
  jobs, 
  onCalls = [], 
  claims = [], 
  onEditJob, 
  onViewJobSheet,
  onTabChange 
}: DashboardProps) {
  // --- Live Operational Overdue Checker State & Core Logic ---
  const [useSystemTime, setUseSystemTime] = useState(true);
  const [customReferenceTime, setCustomReferenceTime] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  const [systemTime, setSystemTime] = useState(new Date());

  // Update system clock every 10 seconds if in active system mode
  useEffect(() => {
    if (!useSystemTime) return;
    setSystemTime(new Date());
    const interval = setInterval(() => {
      setSystemTime(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, [useSystemTime]);

  const referenceDate = useMemo(() => {
    if (useSystemTime) {
      return systemTime;
    }
    const d = new Date(customReferenceTime);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [useSystemTime, systemTime, customReferenceTime]);

  // Categorize, evaluate and calculate outstanding items (status 'pending' or 'in_progress')
  const outstandingJobs = useMemo(() => {
    return jobs
      .filter(job => job.status === 'pending' || job.status === 'in_progress')
      .map(job => {
        const startDateTime = new Date(`${job.startDate}T${job.startTime}:00`);
        const endDateTime = new Date(`${job.endDate}T${job.endTime}:00`);
        
        const isStartValid = !isNaN(startDateTime.getTime());
        const isEndValid = !isNaN(endDateTime.getTime());
        
        let msToStart = 0;
        let msToEnd = 0;
        
        if (isStartValid) {
          msToStart = startDateTime.getTime() - referenceDate.getTime();
        }
        if (isEndValid) {
          msToEnd = endDateTime.getTime() - referenceDate.getTime();
        }
        
        let classification: 'overdue' | 'delayed_start' | 'near_deadline' | 'in_progress' | 'pending' = 'pending';
        let remainingText = '';
        let diffMs = 0;
        
        if (isEndValid && msToEnd < 0) {
          classification = 'overdue';
          diffMs = Math.abs(msToEnd);
        } else if (isStartValid && msToStart < 0 && job.status === 'pending') {
          classification = 'delayed_start';
          diffMs = Math.abs(msToStart);
        } else if (isEndValid && msToEnd >= 0 && msToEnd <= 24 * 60 * 60 * 1000) {
          classification = 'near_deadline';
          diffMs = msToEnd;
        } else if (job.status === 'in_progress') {
          classification = 'in_progress';
          diffMs = isEndValid ? msToEnd : 0;
        } else {
          classification = 'pending';
          diffMs = isStartValid ? msToStart : 0;
        }

        // Format relative times nicely
        const absDiff = Math.abs(diffMs);
        const totalMinutes = Math.floor(absDiff / 60000);
        const totalHours = Math.floor(totalMinutes / 60);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        const minutes = totalMinutes % 60;
        
        let parts: string[] = [];
        if (days > 0) parts.push(`${days} วัน`);
        if (hours > 0 || days > 0) parts.push(`${hours} ชม.`);
        parts.push(`${minutes} นาที`);
        remainingText = parts.join(' ');

        return {
          job,
          classification,
          remainingText,
          isOverdue: classification === 'overdue',
          startDateTime,
          endDateTime,
          msToStart,
          msToEnd
        };
      });
  }, [jobs, referenceDate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'delayed_start' | 'near_deadline' | 'in_progress' | 'pending'>('all');

  const outstandingMetrics = useMemo(() => {
    const total = outstandingJobs.length;
    const overdue = outstandingJobs.filter(o => o.classification === 'overdue').length;
    const delayedStart = outstandingJobs.filter(o => o.classification === 'delayed_start').length;
    const nearDeadline = outstandingJobs.filter(o => o.classification === 'near_deadline').length;
    const inProgress = outstandingJobs.filter(o => o.classification === 'in_progress').length;
    const pending = outstandingJobs.filter(o => o.classification === 'pending').length;
    
    return { total, overdue, delayedStart, nearDeadline, inProgress, pending };
  }, [outstandingJobs]);

  const filteredOutstanding = useMemo(() => {
    return outstandingJobs.filter(item => {
      // 1. Status classification check
      if (statusFilter !== 'all' && item.classification !== statusFilter) {
        return false;
      }
      
      // 2. Text Search
      if (searchQuery.trim() === '') return true;
      const q = searchQuery.toLowerCase();
      const job = item.job;
      return (
        job.jobNo.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q) ||
        job.technicianName.toLowerCase().includes(q) ||
        job.jobType.toLowerCase().includes(q) ||
        (job.customerPhone && job.customerPhone.includes(q)) ||
        (job.details && job.details.toLowerCase().includes(q))
      );
    });
  }, [outstandingJobs, statusFilter, searchQuery]);

  // 1. Calculate General Metrics
  const metrics = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const inProgress = jobs.filter(j => j.status === 'in_progress').length;
    const pending = jobs.filter(j => j.status === 'pending').length;
    
    let totalHours = 0;

    jobs.forEach(job => {
      // Only count hours for completed & in_progress jobs, or all depending on preference
      if (job.status !== 'cancelled') {
        const { decimal } = calculateDuration(job.startDate, job.startTime, job.endDate, job.endTime);
        totalHours += decimal;
      }
    });

    return {
      total,
      completed,
      inProgress,
      pending,
      totalHours: Math.round(totalHours * 10) / 10
    };
  }, [jobs]);

  // 2. Generate Monthly Data for BarChart (Chronological)
  const monthlyStats = useMemo(() => {
    const monthlyMap: { [key: string]: { monthKey: string; name: string; jobs: number; hours: number } } = {};
    
    const thMonthsShort = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    jobs.forEach(job => {
      if (job.status === 'cancelled') return;
      
      const date = new Date(job.startDate);
      if (isNaN(date.getTime())) return;

      const year = date.getFullYear();
      const monthIndex = date.getMonth();
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`; // e.g. "2026-05"
      const thaiYearShort = (year + 543).toString().slice(-2);
      const name = `${thMonthsShort[monthIndex]} ${thaiYearShort}`;

      const { decimal } = calculateDuration(job.startDate, job.startTime, job.endDate, job.endTime);

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          monthKey,
          name,
          jobs: 0,
          hours: 0
        };
      }

      monthlyMap[monthKey].jobs += 1;
      monthlyMap[monthKey].hours += decimal;
    });

    // Sort chronologically by year-month key
    return Object.values(monthlyMap)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(item => ({
        ...item,
        hours: Math.round(item.hours * 10) / 10
      }));
  }, [jobs]);

  // 3. Generate Job Type Data for PieChart
  const jobTypeStats = useMemo(() => {
    const typeMap: { [key: string]: number } = {};
    
    jobs.forEach(job => {
      if (job.status === 'cancelled') return;
      const type = job.jobType || 'อื่นๆ';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];

    return Object.entries(typeMap).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length]
    }));
  }, [jobs]);

  const customTooltipFormatter = (value: any, name: any) => {
    if (name === 'hours') return [`${value} ชม.`, 'ชั่วโมงทำงาน'];
    if (name === 'jobs') return [`${value} งาน`, 'จำนวนงาน'];
    return [value, name];
  };

  // Calculate Phone Call & Claim Metrics
  const onCallMetrics = useMemo(() => {
    const total = onCalls.length;
    const resolved = onCalls.filter(o => o.status === 'resolved').length;
    const active = total - resolved;
    return { total, resolved, active };
  }, [onCalls]);

  const claimMetrics = useMemo(() => {
    const total = claims.length;
    const completed = claims.filter(c => c.status === 'completed').length;
    const active = claims.filter(c => c.status !== 'completed' && c.status !== 'rejected').length;
    return { total, completed, active };
  }, [claims]);

  // Proportions of Claim Product Types
  const claimTypeStats = useMemo(() => {
    const typeMap: { [key: string]: number } = {};
    claims.forEach(c => {
      const type = c.productType || 'อื่นๆ';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#6b7280'];
    return Object.entries(typeMap).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length]
    }));
  }, [claims]);

  // Distribution of Claim Statuses
  const claimStatusStats = useMemo(() => {
    const statusMap: Record<string, number> = {
      received: 0,
      checking: 0,
      repairing: 0,
      completed: 0,
      rejected: 0
    };
    
    claims.forEach(c => {
      if (statusMap[c.status] !== undefined) {
        statusMap[c.status]++;
      } else {
        statusMap[c.status] = 1;
      }
    });

    const labels: Record<string, string> = {
      received: 'รับเรื่องแล้ว',
      checking: 'กำลังตรวจสอบ',
      repairing: 'กำลังซ่อมแซม',
      completed: 'เสร็จสิ้น/คืนแล้ว',
      rejected: 'ปฏิเสธการเคลม'
    };

    const COLORS: Record<string, string> = {
      received: '#3b82f6',   // blue
      checking: '#f59e0b',   // amber
      repairing: '#8b5cf6',  // purple
      completed: '#10b981',  // emerald
      rejected: '#ef4444'    // red
    };

    return Object.entries(statusMap).map(([key, value]) => ({
      key,
      name: labels[key] || key,
      value,
      color: COLORS[key] || '#6b7280'
    }));
  }, [claims]);

  // Distribution of On-Call Statuses
  const onCallStatusStats = useMemo(() => {
    const statusMap: Record<string, number> = {
      pending: 0,
      resolved: 0,
      forwarded: 0
    };

    onCalls.forEach(o => {
      if (statusMap[o.status] !== undefined) {
        statusMap[o.status]++;
      } else {
        statusMap[o.status] = 1;
      }
    });

    const labels: Record<string, string> = {
      pending: 'รอดำเนินการ',
      resolved: 'แก้ไขสำเร็จ',
      forwarded: 'ส่งเรื่องต่อ Onsite'
    };

    const COLORS: Record<string, string> = {
      pending: '#f59e0b',    // amber
      resolved: '#10b981',   // emerald
      forwarded: '#0ea5e9'   // sky
    };

    return Object.entries(statusMap).map(([key, value]) => ({
      key,
      name: labels[key] || key,
      value,
      color: COLORS[key] || '#6b7280'
    }));
  }, [onCalls]);

  return (
    <div id="dashboard-section" className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Jobs */}
        <div 
          onClick={() => onTabChange && onTabChange('records')}
          className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-inner hover:border-sky-500/50 hover:bg-slate-850/50 transition-all duration-300 cursor-pointer group"
        >
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">งาน Onsite ทั้งหมด</p>
            <h3 className="text-2xl font-extrabold text-white group-hover:text-sky-400 transition-colors">{metrics.total} งาน</h3>
            <p className="text-3xs text-slate-500 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              เสร็จ {metrics.completed} / กำลังทำ {metrics.inProgress}
            </p>
          </div>
          <div className="p-2.5 bg-slate-850 border border-slate-800 text-sky-400 rounded-xl group-hover:bg-sky-950/30 group-hover:border-sky-800/50 transition-all">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Phone Calls (On-Call) */}
        <div 
          onClick={() => onTabChange && onTabChange('oncall')}
          className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-inner hover:border-purple-500/50 hover:bg-slate-850/50 transition-all duration-300 cursor-pointer group"
        >
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">บริการทางโทรศัพท์</p>
            <h3 className="text-2xl font-extrabold text-white group-hover:text-purple-400 transition-colors">{onCallMetrics.total} รายการ</h3>
            <p className="text-3xs text-slate-500 flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${onCallMetrics.active > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              เสร็จ {onCallMetrics.resolved} / ค้าง {onCallMetrics.active}
            </p>
          </div>
          <div className="p-2.5 bg-slate-850 border border-slate-800 text-purple-400 rounded-xl group-hover:bg-purple-950/30 group-hover:border-purple-800/50 transition-all">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Product Claims */}
        <div 
          onClick={() => onTabChange && onTabChange('claim')}
          className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between shadow-inner hover:border-indigo-500/50 hover:bg-slate-850/50 transition-all duration-300 cursor-pointer group"
        >
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">เคลมสินค้า</p>
            <h3 className="text-2xl font-extrabold text-white group-hover:text-indigo-400 transition-colors">{claimMetrics.total} รายการ</h3>
            <p className="text-3xs text-slate-500 flex items-center gap-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${claimMetrics.active > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              เสร็จ {claimMetrics.completed} / ค้าง {claimMetrics.active}
            </p>
          </div>
          <div className="p-2.5 bg-slate-850 border border-slate-800 text-indigo-400 rounded-xl group-hover:bg-indigo-950/30 group-hover:border-indigo-800/50 transition-all">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ระบบตรวจเช็คสถานะและเวลาปฏิบัติงาน (Operational Alerts & Overdue Checker) */}
      <div id="overdue-checker" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-md">
        {/* Header and Reference Time Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              ระบบตรวจสอบสถานะและเวลาปฏิบัติงาน (Live Monitor)
            </h4>
            <p className="text-xs text-slate-400">
              วิเคราะห์งานที่รอดำเนินการและกำลังทำ พร้อมแจ้งเตือนงานเกินกำหนดและล่าช้าแบบเรียลไทม์
            </p>
          </div>
          
          {/* Controls for simulating reference date */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
            <label className="flex items-center gap-2 px-2.5 py-1 text-xs text-slate-300 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={useSystemTime}
                onChange={(e) => setUseSystemTime(e.target.checked)}
                className="rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
              />
              <span>ติดตามเวลาปัจจุบัน</span>
            </label>
            
            {!useSystemTime && (
              <div className="flex items-center gap-1.5">
                <span className="text-3xs text-slate-500 uppercase font-extrabold tracking-wider">จำลองเวลา:</span>
                <input
                  type="datetime-local"
                  value={customReferenceTime}
                  onChange={(e) => setCustomReferenceTime(e.target.value)}
                  className="bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1 focus:outline-none focus:border-sky-600 font-mono"
                />
              </div>
            )}
            
            <div className="text-xs text-sky-400 font-mono px-3 py-1 bg-sky-950/40 border border-sky-850/50 rounded-xl flex items-center gap-1.5 shrink-0">
              <Clock3 className="w-3.5 h-3.5" />
              <span>
                {referenceDate.toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}{' '}
                {referenceDate.toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: useSystemTime ? '2-digit' : undefined
                })} น.
              </span>
            </div>
          </div>
        </div>

        {/* Checker Summary Metrics Mini-Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Metric 1: Total Outstanding */}
          <button 
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
              statusFilter === 'all' 
                ? 'bg-slate-800 border-sky-600/60 shadow-lg shadow-sky-950/20' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">งานค้างทั้งหมด</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-white">{outstandingMetrics.total}</span>
              <span className="text-[10px] text-slate-500">งาน</span>
            </div>
          </button>

          {/* Metric 2: Overdue */}
          <button 
            type="button"
            onClick={() => setStatusFilter('overdue')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
              statusFilter === 'overdue' 
                ? 'bg-rose-950/40 border-rose-600/60 shadow-lg shadow-rose-950/20' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-rose-500/30'
            }`}
          >
            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              เกินกำหนดส่ง
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-rose-400">{outstandingMetrics.overdue}</span>
              <span className="text-[10px] text-rose-500">งาน</span>
            </div>
          </button>

          {/* Metric 3: Delayed Start */}
          <button 
            type="button"
            onClick={() => setStatusFilter('delayed_start')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
              statusFilter === 'delayed_start' 
                ? 'bg-yellow-950/30 border-yellow-600/60 shadow-lg shadow-yellow-950/20' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-yellow-500/30'
            }`}
          >
            <p className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">เลยเวลาเริ่มงาน</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-yellow-400">{outstandingMetrics.delayedStart}</span>
              <span className="text-[10px] text-yellow-500">งาน</span>
            </div>
          </button>

          {/* Metric 4: Near Deadline */}
          <button 
            type="button"
            onClick={() => setStatusFilter('near_deadline')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
              statusFilter === 'near_deadline' 
                ? 'bg-amber-950/30 border-amber-600/60 shadow-lg shadow-amber-950/20' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-amber-500/30'
            }`}
          >
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">ใกล้ครบกำหนด (24 ชม.)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-400">{outstandingMetrics.nearDeadline}</span>
              <span className="text-[10px] text-amber-500">งาน</span>
            </div>
          </button>

          {/* Metric 5: Active */}
          <button 
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
              statusFilter === 'in_progress' 
                ? 'bg-sky-950/40 border-sky-600/60 shadow-lg shadow-sky-950/20' 
                : 'bg-slate-950/40 border-slate-800/80 hover:border-sky-500/30'
            }`}
          >
            <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">กำลังทำอยู่</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-sky-400">{outstandingMetrics.inProgress}</span>
              <span className="text-[10px] text-sky-500">งาน</span>
            </div>
          </button>
        </div>

        {/* Filter Toolbar (Search & Quick Selection) */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950/30 p-3 rounded-2xl border border-slate-800/60">
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาลูกค้า, เลขที่งาน, ช่าง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 w-full focus:outline-none focus:border-sky-600 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider">ตัวกรองละเอียด:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 text-xs text-slate-300 border border-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-600 font-semibold cursor-pointer"
            >
              <option value="all">ทั้งหมดค้างส่งงาน ({outstandingMetrics.total})</option>
              <option value="overdue">🔴 เกินกำหนดส่ง ({outstandingMetrics.overdue})</option>
              <option value="delayed_start">🟡 เลยเวลาเริ่มงาน ({outstandingMetrics.delayedStart})</option>
              <option value="near_deadline">🟠 ใกล้ครบกำหนด ({outstandingMetrics.nearDeadline})</option>
              <option value="in_progress">🔵 กำลังปฏิบัติงาน ({outstandingMetrics.inProgress})</option>
              <option value="pending">⚪ รอปฏิบัติงานปกติ ({outstandingMetrics.pending})</option>
            </select>
          </div>
        </div>

        {/* Filtered Job List Result Grid */}
        <div className="space-y-3">
          {filteredOutstanding.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOutstanding.map(({ job, classification, remainingText }) => {
                // Determine style assets based on classification
                let cardStyle = {
                  border: 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700',
                  badgeBg: 'bg-slate-950 border-slate-800 text-slate-400',
                  accentColor: 'text-slate-400',
                  alertBg: 'bg-slate-950/40 text-slate-400 border-slate-800/40',
                  alertIcon: <Clock3 className="w-4 h-4 text-slate-500 shrink-0" />,
                  alertText: `รอดำเนินงาน (จะเริ่มปฏิบัติงานในอีก ${remainingText})`
                };

                if (classification === 'overdue') {
                  cardStyle = {
                    border: 'border-rose-500/30 bg-rose-950/5 hover:border-rose-500/50 hover:bg-rose-950/10',
                    badgeBg: 'bg-rose-950 border-rose-900/40 text-rose-400',
                    accentColor: 'text-rose-400',
                    alertBg: 'bg-rose-950/30 text-rose-300 border-rose-900/30 shadow-inner',
                    alertIcon: <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />,
                    alertText: `เกินกำหนดเวลาส่งงานมาแล้ว ${remainingText}!`
                  };
                } else if (classification === 'delayed_start') {
                  cardStyle = {
                    border: 'border-yellow-500/30 bg-yellow-950/5 hover:border-yellow-500/50 hover:bg-yellow-950/10',
                    badgeBg: 'bg-yellow-950 border-yellow-900/40 text-yellow-400',
                    accentColor: 'text-yellow-400',
                    alertBg: 'bg-yellow-950/30 text-yellow-300 border-yellow-900/30 shadow-inner',
                    alertIcon: <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />,
                    alertText: `เลยเวลากำหนดเริ่มงานแล้ว ${remainingText} (แต่งานยังไม่ได้เริ่มปฏิบัติ)`
                  };
                } else if (classification === 'near_deadline') {
                  cardStyle = {
                    border: 'border-amber-500/30 bg-amber-950/5 hover:border-amber-500/50 hover:bg-amber-950/10',
                    badgeBg: 'bg-amber-950 border-amber-900/40 text-amber-400',
                    accentColor: 'text-amber-400',
                    alertBg: 'bg-amber-950/30 text-amber-300 border-amber-900/30 shadow-inner',
                    alertIcon: <Clock3 className="w-4 h-4 text-amber-400 shrink-0" />,
                    alertText: `ใกล้ครบกำหนดส่งงาน (เหลือเวลาอีก ${remainingText})`
                  };
                } else if (classification === 'in_progress') {
                  cardStyle = {
                    border: 'border-sky-500/30 bg-sky-950/5 hover:border-sky-500/50 hover:bg-sky-950/10',
                    badgeBg: 'bg-sky-950 border-sky-900/40 text-sky-400',
                    accentColor: 'text-sky-400',
                    alertBg: 'bg-sky-950/30 text-sky-300 border-sky-900/30',
                    alertIcon: <Clock3 className="w-4 h-4 text-sky-400 shrink-0" />,
                    alertText: `กำลังทำ (เหลือกำหนดเวลาส่งงานอีก ${remainingText})`
                  };
                }

                return (
                  <div 
                    key={job.id} 
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 space-y-4 shadow-sm ${cardStyle.border}`}
                  >
                    {/* Top Job Details & Quick Action Panel */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-2xs font-extrabold text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          {job.jobNo}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cardStyle.badgeBg}`}>
                            {job.status === 'pending' ? 'รอดำเนินการ' : 'กำลังดำเนินการ'}
                          </span>
                        </div>
                      </div>

                      {/* Customer and Job Description */}
                      <div className="space-y-1">
                        <h5 className="font-bold text-white text-sm truncate">{job.customerName}</h5>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-slate-400 font-medium">
                          <span className="text-sky-400 font-semibold">{job.jobType}</span>
                          <span className="text-slate-600">•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {job.technicianName}
                          </span>
                        </div>
                      </div>

                      {/* Schedule Timeline Detail Row */}
                      <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-2xs space-y-1.5">
                        <div className="flex justify-between text-slate-500">
                          <span>กำหนดเริ่มปฏิบัติงาน:</span>
                          <span className="font-semibold text-slate-300 font-mono">
                            {job.startDate} ({job.startTime} น.)
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>กำหนดแล้วเสร็จส่งงาน:</span>
                          <span className="font-semibold text-slate-300 font-mono">
                            {job.endDate} ({job.endTime} น.)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status Alert Banner & Fast Actions */}
                    <div className="space-y-3">
                      {/* Alert Banner */}
                      <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-2xs ${cardStyle.alertBg}`}>
                        {cardStyle.alertIcon}
                        <span className="font-medium">{cardStyle.alertText}</span>
                      </div>

                      {/* Operational Action Callbacks */}
                      <div className="flex gap-2">
                        {onViewJobSheet && (
                          <button
                            type="button"
                            onClick={() => onViewJobSheet(job)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750 rounded-xl text-2xs font-semibold transition-all cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>ดูใบงาน</span>
                          </button>
                        )}
                        {onEditJob && (
                          <button
                            type="button"
                            onClick={() => onEditJob(job)}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-2xs font-semibold transition-all cursor-pointer shadow-[0_0_10px_rgba(2,132,199,0.2)] hover:shadow-[0_0_12px_rgba(2,132,199,0.4)]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>แก้ไข / อัปเดต</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-950/20 border border-dashed border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <CheckCircle2 className="w-9 h-9 text-emerald-500/80" />
              <h5 className="font-bold text-white text-sm">ไม่พบงานค้างที่ตรงตามตัวกรอง</h5>
              <p className="text-2xs text-slate-400 max-w-sm">
                ไม่มีงานคงค้างประเภทนี้ตามที่ระบุในเงื่อนไขการค้นหา หรือทุกงานเสร็จสมบูรณ์ร้อยเปอร์เซ็นต์แล้ว!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Monthly Job Trends */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-400" />
              <h4 className="font-bold text-white">สถิติงานรายเดือน</h4>
            </div>
            <span className="text-xs font-semibold text-sky-400 bg-sky-950/40 border border-sky-800/50 px-2.5 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> รายปี 2569
            </span>
          </div>

          <div className="h-72 w-full">
            {monthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#38bdf8" fontSize={11} tickLine={false} axisLine={false} label={{ value: 'จำนวนงาน', angle: -90, position: 'insideLeft', offset: -5, style: { fontSize: 10, fill: '#38bdf8' } }} />
                  <Tooltip formatter={customTooltipFormatter} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f1f5f9' }} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10, color: '#f1f5f9' }} />
                  <Bar dataKey="jobs" name="jobs" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={35} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <CalendarDays className="w-8 h-8 opacity-40" />
                <p className="text-sm">ไม่มีข้อมูลเพียงพอสำหรับแสดงกราฟ</p>
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart: Job Types Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-slate-400" />
            <h4 className="font-bold text-white">สัดส่วนประเภทงาน</h4>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {jobTypeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={jobTypeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {jobTypeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f1f5f9' }} formatter={(val) => [`${val} งาน`, 'จำนวน']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <PieIcon className="w-8 h-8 opacity-40" />
                <p className="text-sm">ไม่มีข้อมูลประเภทงาน</p>
              </div>
            )}
            
            {/* Legend inside absolute div to make it look clean */}
            {jobTypeStats.length > 0 && (
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-extrabold text-white">{jobs.length}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">งานทั้งหมด</span>
              </div>
            )}
          </div>

          {/* Custom legends listing */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2">
            {jobTypeStats.map((entry, index) => (
              <div key={index} className="flex items-center gap-1.5 text-slate-300 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                <span className="truncate text-slate-400">{entry.name}</span>
                <span className="font-semibold text-white ml-auto">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Area Chart: Working Hours Per Month */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h4 className="font-semibold text-white">เวลาการทำงานรวมแต่ละเดือน (ชั่วโมง)</h4>
          </div>
          <div className="h-44 w-full">
            {monthlyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#38bdf8" fontSize={11} tickLine={false} axisLine={false} label={{ value: 'ชั่วโมง', angle: -90, position: 'insideLeft', offset: -5, style: { fontSize: 10, fill: '#38bdf8' } }} />
                  <Tooltip formatter={customTooltipFormatter} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f1f5f9' }} />
                  <Area type="monotone" dataKey="hours" name="hours" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <Clock className="w-8 h-8 opacity-40" />
                <p className="text-sm">ไม่มีข้อมูลชั่วโมงทำงานเพียงพอสำหรับแสดงกราฟ</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* On-Call & Claim Analytics Section */}
      <div className="border-t border-slate-800/80 pt-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>วิเคราะห์สถิติบริการโทรศัพท์ & งานเคลมสินค้า (On-Call & Claims)</span>
            </h4>
            <p className="text-xs text-slate-400">
              เจาะลึกสัดส่วนประเภทสินค้าเคลม และภาพรวมสถานะงานบริการทางโทรศัพท์และเครื่องเคลม
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Claim Product Types Breakdown */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-400" />
              <h5 className="font-bold text-white text-sm">สัดส่วนประเภทสินค้าเคลม</h5>
            </div>

            <div className="h-52 relative flex items-center justify-center">
              {claimTypeStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={claimTypeStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {claimTypeStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f1f5f9' }} formatter={(val) => [`${val} รายการ`, 'จำนวน']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Package className="w-8 h-8 opacity-40" />
                  <p className="text-xs">ไม่มีข้อมูลประเภทสินค้าเคลม</p>
                </div>
              )}
              
              {claimTypeStats.length > 0 && (
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-white">{claims.length}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">เคลมทั้งหมด</span>
                </div>
              )}
            </div>

            {/* Custom legends listing */}
            <div className="grid grid-cols-2 gap-2 text-2xs pt-1 max-h-24 overflow-y-auto pr-1">
              {claimTypeStats.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-slate-300 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                  <span className="truncate text-slate-400">{entry.name}</span>
                  <span className="font-bold text-white ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Claim Status distribution bar chart */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h5 className="font-bold text-white text-sm">การกระจายสถานะงานเคลม</h5>
            </div>

            <div className="h-52 w-full">
              {claims.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={claimStatusStats} layout="vertical" margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} width={85} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f1f5f9' }} formatter={(val) => [`${val} รายการ`, 'จำนวน']} />
                    <Bar dataKey="value" name="จำนวน" fill="#818cf8" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {claimStatusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Package className="w-8 h-8 opacity-40" />
                  <p className="text-xs">ไม่มีข้อมูลสถานะงานเคลม</p>
                </div>
              )}
            </div>
          </div>

          {/* On Call status Pie/Donut breakdown */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-purple-400" />
              <h5 className="font-bold text-white text-sm">สัดส่วนสถานะงานรับสาย (On-Call)</h5>
            </div>

            <div className="h-52 relative flex items-center justify-center">
              {onCallStatusStats.some(s => s.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={onCallStatusStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {onCallStatusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f1f5f9' }} formatter={(val) => [`${val} รายการ`, 'จำนวน']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <PhoneCall className="w-8 h-8 opacity-40" />
                  <p className="text-xs">ไม่มีข้อมูลประวัติการรับสาย</p>
                </div>
              )}
              
              {onCallStatusStats.some(s => s.value > 0) && (
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold text-white">{onCalls.length}</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">สายโทรศัพท์</span>
                </div>
              )}
            </div>

            {/* Custom legends listing */}
            <div className="grid grid-cols-1 gap-1.5 text-2xs pt-1">
              {onCallStatusStats.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                  <span className="text-slate-400">{entry.name}</span>
                  <span className="font-bold text-white ml-auto">{entry.value} รายการ ({onCalls.length > 0 ? Math.round((entry.value / onCalls.length) * 100) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
