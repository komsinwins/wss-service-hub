/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ServiceJob, JobStatus } from '../types';
import { 
  calculateDuration, 
  formatCurrency, 
  formatThaiDate, 
  formatThaiDateTime,
  getStoredJobTypes
} from '../utils';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  FileText, 
  Plus, 
  Trash, 
  Calendar,
  X,
  Printer,
  ChevronDown,
  Clock,
  Briefcase,
  AlertCircle,
  Download
} from 'lucide-react';

interface JobListProps {
  jobs: ServiceJob[];
  onAddJobClick: () => void;
  onEdit: (job: ServiceJob) => void;
  onDelete: (id: string) => void;
  onViewJobSheet: (job: ServiceJob) => void;
  onPrintSummary: (selectedJobs: ServiceJob[]) => void;
}

const STATUSES = ['ทั้งหมด', 'pending', 'in_progress', 'completed', 'cancelled'];

export default function JobList({ 
  jobs, 
  onAddJobClick, 
  onEdit, 
  onDelete, 
  onViewJobSheet, 
  onPrintSummary 
}: JobListProps) {
  const dynamicJobTypes = useMemo(() => {
    return ['ทั้งหมด', ...getStoredJobTypes()];
  }, [jobs]);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState('ทั้งหมด');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');

  // Row Selection State
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // 1. Filter jobs based on states
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Search term check
      const matchesSearch = 
        job.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.technicianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.jobNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.details.toLowerCase().includes(searchTerm.toLowerCase());

      // Job Type check
      const matchesType = selectedType === 'ทั้งหมด' || job.jobType === selectedType;

      // Status check
      const matchesStatus = selectedStatus === 'ทั้งหมด' || job.status === selectedStatus;

      // Date range check
      let matchesDate = true;
      if (startDateFrom) {
        matchesDate = matchesDate && job.startDate >= startDateFrom;
      }
      if (startDateTo) {
        matchesDate = matchesDate && job.startDate <= startDateTo;
      }

      return matchesSearch && matchesType && matchesStatus && matchesDate;
    });
  }, [jobs, searchTerm, selectedType, selectedStatus, startDateFrom, startDateTo]);

  // Reset all filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedType('ทั้งหมด');
    setSelectedStatus('ทั้งหมด');
    setStartDateFrom('');
    setStartDateTo('');
  };

  // Row Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedJobIds(filteredJobs.map(job => job.id));
    } else {
      setSelectedJobIds([]);
    }
  };

  const handleSelectRow = (jobId: string) => {
    setSelectedJobIds(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId) 
        : [...prev, jobId]
    );
  };

  const isAllSelected = filteredJobs.length > 0 && selectedJobIds.length === filteredJobs.length;

  const selectedJobs = useMemo(() => {
    return jobs.filter(job => selectedJobIds.includes(job.id));
  }, [jobs, selectedJobIds]);

  // Export selected or filtered jobs to CSV (UTF-8 BOM supported for Thai characters in Excel)
  const handleExportCSV = (jobsToExport: ServiceJob[] = filteredJobs) => {
    if (jobsToExport.length === 0) {
      alert('ไม่มีข้อมูลงานตามเงื่อนไขให้ทำการส่งออก');
      return;
    }

    // CSV headers (Thai captions mapped to corresponding fields)
    const headers = [
      'เลขที่ใบงาน',
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'ที่อยู่สำหรับปฏิบัติงาน',
      'ประเภทงาน',
      'วันที่เริ่ม',
      'เวลาเริ่ม',
      'วันที่สิ้นสุด',
      'เวลาสิ้นสุด',
      'ชั่วโมงทำงาน',
      'รายละเอียดภารกิจ/ปัญหา',
      'ช่างผู้ให้บริการ',
      'สถานะ',
      'หมายเหตุเพิ่มเติม'
    ];

    const labelMap: Record<JobStatus, string> = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังทำ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    };

    // Construct CSV rows
    const csvRows = [
      headers.join(','), // Header row
      ...jobsToExport.map(job => {
        const { decimal } = calculateDuration(job.startDate, job.startTime, job.endDate, job.endTime);
        const values = [
          job.jobNo,
          job.customerName,
          job.customerPhone || '',
          job.customerAddress || '',
          job.jobType,
          job.startDate,
          job.startTime,
          job.endDate,
          job.endTime,
          decimal,
          job.details || '',
          job.technicianName,
          labelMap[job.status] || job.status,
          job.notes || ''
        ];

        // Escape double quotes and enclose fields in quotes to handle commas/newlines safely
        return values.map(value => {
          const stringified = String(value).replace(/"/g, '""');
          return `"${stringified}"`;
        }).join(',');
      })
    ];

    // UTF-8 BOM to ensure Thai characters render perfectly in Excel
    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `onsite_jobs_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Status Badge
  const renderStatusBadge = (status: JobStatus) => {
    const badgeStyles = {
      pending: 'bg-amber-950/30 text-amber-400 border-amber-800/40',
      in_progress: 'bg-sky-950/30 text-sky-400 border-sky-800/40',
      completed: 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40',
      cancelled: 'bg-slate-800/40 text-slate-400 border-slate-700/50'
    };

    const labelMap = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังทำ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyles[status] || badgeStyles.pending}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'completed' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' :
          status === 'in_progress' ? 'bg-sky-500 shadow-[0_0_6px_rgba(56,189,248,0.5)]' :
          status === 'pending' ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]' : 'bg-slate-500'
        }`}></span>
        {labelMap[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search, Date, Filters Control Board */}
      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-4">
        
        {/* Main Search Row */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาด้วย ชื่อลูกค้า, ช่างนัดหมาย, รายละเอียดงาน, หรือเลขที่ใบงาน..."
              className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-3 focus:ring-sky-950/40 focus:outline-hidden transition-all bg-slate-950 text-slate-200 placeholder-slate-500"
            />
            <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleExportCSV(filteredJobs)}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-900 text-slate-300 hover:text-white text-sm font-semibold rounded-xl border border-slate-700/60 transition-all cursor-pointer shrink-0"
              title="ส่งออกรายการที่ค้นพบเป็นไฟล์ CSV"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>ส่งออก CSV</span>
            </button>
            <button
              onClick={onAddJobClick}
              className="w-full md:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-sky-950/50 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกงานใหม่</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Dropdown: Job Type */}
          <div className="space-y-1">
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">ประเภทงาน</label>
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full text-xs pl-3 pr-8 py-2 rounded-lg border border-slate-800 focus:border-sky-500 focus:outline-hidden bg-slate-950 text-slate-200 cursor-pointer appearance-none"
              >
                {dynamicJobTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Dropdown: Status */}
          <div className="space-y-1">
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">สถานะงาน</label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs pl-3 pr-8 py-2 rounded-lg border border-slate-800 focus:border-sky-500 focus:outline-hidden bg-slate-950 text-slate-200 cursor-pointer appearance-none"
              >
                {STATUSES.map(st => {
                  const labelMap = {
                    'ทั้งหมด': 'ทั้งหมด',
                    pending: 'รอดำเนินการ',
                    in_progress: 'กำลังทำ',
                    completed: 'เสร็จสิ้น',
                    cancelled: 'ยกเลิก'
                  };
                  return <option key={st} value={st}>{labelMap[st] || st}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Date Picker: From */}
          <div className="space-y-1">
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">เริ่มต้นตั้งแต่วันที่</label>
            <div className="relative">
              <input
                type="date"
                value={startDateFrom}
                onChange={(e) => setStartDateFrom(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-800 focus:border-sky-500 focus:outline-hidden bg-slate-950 text-slate-200"
              />
            </div>
          </div>

          {/* Date Picker: To */}
          <div className="space-y-1">
            <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider">สิ้นสุดวันที่</label>
            <div className="relative">
              <input
                type="date"
                value={startDateTo}
                onChange={(e) => setStartDateTo(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-800 focus:border-sky-500 focus:outline-hidden bg-slate-950 text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Clear Filters Indicator */}
        {(searchTerm || selectedType !== 'ทั้งหมด' || selectedStatus !== 'ทั้งหมด' || startDateFrom || startDateTo) && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <p className="text-xs text-slate-400">ค้นพบ <span className="font-semibold text-sky-400">{filteredJobs.length}</span> รายการ จากตัวกรองปัจจุบัน</p>
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-rose-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Selected Records Summary Toolbar (If rows selected) */}
      {selectedJobIds.length > 0 && (
        <div className="bg-sky-600/95 text-white px-5 py-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-sky-950/50 border border-sky-500 transition-all">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-white" />
            <div className="text-left">
              <span className="font-bold text-sm">เลือกงานบริการ Onsite แล้ว {selectedJobIds.length} งาน</span>
              <p className="text-3xs text-sky-100 mt-0.5 font-medium">
                รวมชั่วโมงทำงาน: {
                  selectedJobs.reduce((sum, j) => sum + calculateDuration(j.startDate, j.startTime, j.endDate, j.endTime).decimal, 0).toFixed(1)
                } ชม.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setSelectedJobIds([])}
              className="px-3.5 py-1.5 text-xs font-semibold text-sky-100 hover:text-white hover:bg-sky-700/50 rounded-lg transition-all cursor-pointer"
            >
              ยกเลิกการเลือก
            </button>
            <button
              type="button"
              onClick={() => handleExportCSV(selectedJobs)}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl border border-sky-500 transition-all cursor-pointer"
              title="ส่งออกเฉพาะรายการที่เลือกเป็นไฟล์ CSV"
            >
              <Download className="w-4 h-4 text-white" />
              <span>ส่งออก CSV ({selectedJobIds.length})</span>
            </button>
            <button
              onClick={() => onPrintSummary(selectedJobs)}
              className="flex items-center gap-1.5 px-4 py-2 bg-white text-sky-600 hover:bg-sky-50 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-600" />
              <span>ออกใบสรุปงานและชั่วโมงทำงาน ({selectedJobIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Jobs Data Table / Card Grid */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-800 overflow-hidden">
        
        {/* Table representation for Desktop screen */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-2xs font-semibold text-slate-400 uppercase tracking-widest">
                <th className="px-5 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded-sm text-sky-500 border-slate-700 bg-slate-950 focus:ring-sky-950 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-4 w-32">เลขที่ใบงาน</th>
                <th className="px-4 py-4 w-52">ชื่อลูกค้า</th>
                <th className="px-4 py-4 w-32">ประเภทงาน</th>
                <th className="px-4 py-4 w-44">วันที่เริ่มต้น - เวลาสิ้นสุด</th>
                <th className="px-4 py-4 w-28 text-center">เวลาทำงาน</th>
                <th className="px-4 py-4 w-32">สถานะ</th>
                <th className="px-5 py-4 text-center w-36">ตัวเลือก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => {
                  const isSelected = selectedJobIds.includes(job.id);
                  const { hours, minutes } = calculateDuration(job.startDate, job.startTime, job.endDate, job.endTime);

                  return (
                    <tr 
                      key={job.id} 
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isSelected ? 'bg-sky-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-5 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(job.id)}
                          className="w-4 h-4 rounded-sm text-sky-500 border-slate-700 bg-slate-950 focus:ring-sky-950 cursor-pointer"
                        />
                      </td>

                      {/* Job ID / No */}
                      <td className="px-4 py-3.5 font-mono text-slate-400 font-semibold">
                        {job.jobNo}
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block truncate max-w-[190px]">{job.customerName}</span>
                          {job.customerCompany && <span className="text-3xs text-sky-400 block truncate max-w-[190px]">{job.customerCompany}</span>}
                          {job.customerPhone && <span className="text-3xs text-slate-500 block font-mono">{job.customerPhone}</span>}
                        </div>
                      </td>

                      {/* Job Type */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-sky-400 bg-sky-950/30 px-2.5 py-1 rounded border border-sky-850/50">{job.jobType}</span>
                      </td>

                      {/* Schedule Start - End */}
                      <td className="px-4 py-3.5 space-y-0.5">
                        <span className="block font-medium text-slate-200">{formatThaiDate(job.startDate)}</span>
                        <span className="block text-3xs text-slate-500">{job.startTime} น. - {job.endTime} น.</span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block">{hours > 0 ? `${hours} ชม.` : ''} {minutes > 0 ? `${minutes} น.` : ''} {hours === 0 && minutes === 0 ? '-' : ''}</span>
                          <span className="text-3xs text-sky-400 block font-medium">({(hours + minutes/60).toFixed(1)} ชม.)</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {renderStatusBadge(job.status)}
                      </td>

                      {/* Action buttons */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View job sheet */}
                          <button
                            onClick={() => onViewJobSheet(job)}
                            title="ออกใบงานปฏิบัติการ"
                            className="p-1.5 text-sky-400 hover:bg-sky-950/40 rounded-lg border border-transparent hover:border-sky-800/30 transition-all cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => onEdit(job)}
                            title="แก้ไขรายละเอียดงาน"
                            className="p-1.5 text-amber-400 hover:bg-amber-950/40 rounded-lg border border-transparent hover:border-amber-800/30 transition-all cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => onDelete(job.id)}
                            title="ลบรายละเอียดงาน"
                            className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-800/30 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto opacity-30" />
                    <p className="text-sm font-medium">ไม่พบบันทึกงาน Onsite ตามเงื่อนไขปัจจุบัน</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card representation for Mobile/Tablet screen */}
        <div className="block lg:hidden divide-y divide-slate-850">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => {
              const isSelected = selectedJobIds.includes(job.id);
              const { hours, minutes } = calculateDuration(job.startDate, job.startTime, job.endDate, job.endTime);

              return (
                <div 
                  key={job.id} 
                  className={`p-4 space-y-3 relative transition-colors ${
                    isSelected ? 'bg-sky-950/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(job.id)}
                        className="w-4.5 h-4.5 rounded-sm text-sky-500 border-slate-700 bg-slate-950 focus:ring-sky-950 cursor-pointer"
                      />
                      <span className="font-mono text-3xs font-semibold text-slate-500">{job.jobNo}</span>
                    </div>
                    {renderStatusBadge(job.status)}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm leading-snug">{job.customerName}</h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span className="font-semibold text-sky-400">{job.jobType}</span>
                      <span>•</span>
                      <span>วันที่: {formatThaiDate(job.startDate)}</span>
                    </p>
                    <p className="text-2xs text-slate-500 leading-normal line-clamp-2 italic">
                      "{job.details}"
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950/50 px-3 py-2 border border-slate-800/80 rounded-xl text-3xs">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400">เวลาทำงาน:</span>
                    <span className="font-bold text-slate-200">{hours > 0 ? `${hours} ชม.` : ''} {minutes > 0 ? `${minutes} น.` : ''}</span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => onViewJobSheet(job)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-2xs font-semibold text-sky-400 bg-sky-950/40 border border-sky-850/50 rounded-lg transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>ออกใบงาน</span>
                    </button>
                    <button
                      onClick={() => onEdit(job)}
                      className="p-1.5 text-amber-400 hover:bg-amber-950/40 border border-slate-800 rounded-lg transition-all cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(job.id)}
                      className="p-1.5 text-rose-400 hover:bg-rose-950/40 border border-slate-800 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-500 space-y-2 p-4">
              <AlertCircle className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sm font-medium">ไม่พบบันทึกงาน Onsite ตามเงื่อนไขปัจจุบัน</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
