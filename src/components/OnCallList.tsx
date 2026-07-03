import React, { useState, useMemo } from 'react';
import { OnCallService, OnCallStatus, Customer } from '../types';
import { 
  PhoneCall, 
  Plus, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRightCircle, 
  Trash2, 
  Edit3, 
  X, 
  FileText, 
  Phone,
  MessageSquare,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnCallListProps {
  onCalls: OnCallService[];
  onAddOrEdit: (data: Omit<OnCallService, 'id' | 'callNo' | 'createdAt'> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  customers?: Customer[];
}

export default function OnCallList({ onCalls, onAddOrEdit, onDelete, customers = [] }: OnCallListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OnCallService | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter matching suggestions
  const suggestedCustomers = useMemo(() => {
    if (!customers || !customerName.trim()) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerName.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(customerName.toLowerCase()))
    ).slice(0, 5);
  }, [customers, customerName]);

  const [issue, setIssue] = useState('');
  const [solution, setSolution] = useState('');
  const [callDate, setCallDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [callTime, setCallTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [receiverName, setReceiverName] = useState('');
  const [status, setStatus] = useState<OnCallStatus>('pending');
  const [notes, setNotes] = useState('');

  // Form validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleOpenForm = (item?: OnCallService) => {
    if (item) {
      setEditingItem(item);
      setCustomerName(item.customerName);
      setCustomerPhone(item.customerPhone || '');
      setIssue(item.issue);
      setSolution(item.solution || '');
      setCallDate(item.callDate);
      setCallTime(item.callTime);
      setReceiverName(item.receiverName);
      setStatus(item.status);
      setNotes(item.notes || '');
    } else {
      setEditingItem(null);
      setCustomerName('');
      setCustomerPhone('');
      setIssue('');
      setSolution('');
      setCallDate(new Date().toISOString().split('T')[0]);
      const d = new Date();
      setCallTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setReceiverName('');
      setStatus('pending');
      setNotes('');
    }
    setErrors({});
    setIsOpen(true);
  };

  const handleCloseForm = () => {
    setIsOpen(false);
    setEditingItem(null);
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!customerName.trim()) newErrors.customerName = 'กรุณาระบุชื่อลูกค้า';
    if (!issue.trim()) newErrors.issue = 'กรุณาระบุรายละเอียดปัญหาที่แจ้ง';
    if (!receiverName.trim()) newErrors.receiverName = 'กรุณาระบุผู้รับสาย/ผู้ให้คำปรึกษา';
    if (!callDate) newErrors.callDate = 'กรุณาระบุวันที่';
    if (!callTime) newErrors.callTime = 'กรุณาระบุเวลา';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onAddOrEdit({
      id: editingItem?.id,
      customerName,
      customerPhone,
      issue,
      solution,
      callDate,
      callTime,
      receiverName,
      status,
      notes,
    });

    handleCloseForm();
  };

  // Filtered On-Call records
  const filteredOnCalls = useMemo(() => {
    return onCalls.filter(item => {
      const matchSearch = 
        item.customerName.toLowerCase().includes(search.toLowerCase()) ||
        item.callNo.toLowerCase().includes(search.toLowerCase()) ||
        (item.customerPhone || '').includes(search) ||
        item.issue.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [onCalls, search, statusFilter]);

  // Export to CSV / Excel
  const handleExportCSV = (recordsToExport: OnCallService[] = filteredOnCalls) => {
    if (recordsToExport.length === 0) {
      alert('ไม่มีข้อมูลรับสายตามเงื่อนไขให้ทำการส่งออก');
      return;
    }

    const headers = [
      'เลขรับเรื่อง',
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'รายละเอียดปัญหาที่แจ้ง',
      'แนวทางการแก้ไขเบื้องต้น/ผลการช่วยเหลือ',
      'วันที่รับสาย',
      'เวลารับสาย',
      'ผู้รับสาย/ผู้ให้คำปรึกษา',
      'สถานะ',
      'หมายเหตุเพิ่มเติม'
    ];

    const labelMap: Record<OnCallStatus, string> = {
      pending: 'รอดำเนินการ',
      resolved: 'แก้ไขสำเร็จ',
      forwarded: 'ส่งเรื่องต่อ Onsite'
    };

    const csvRows = [
      headers.join(','),
      ...recordsToExport.map(item => {
        const values = [
          item.callNo,
          item.customerName,
          item.customerPhone || '',
          item.issue || '',
          item.solution || '',
          item.callDate,
          item.callTime,
          item.receiverName,
          labelMap[item.status] || item.status,
          item.notes || ''
        ];

        return values.map(value => {
          const stringified = String(value).replace(/"/g, '""');
          return `"${stringified}"`;
        }).join(',');
      })
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `onsite_oncalls_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (status: OnCallStatus) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>แก้ไขสำเร็จ</span>
          </span>
        );
      case 'forwarded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]">
            <ArrowRightCircle className="w-3.5 h-3.5" />
            <span>ส่งเรื่องต่อ Onsite</span>
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
            <HelpCircle className="w-3.5 h-3.5 animate-pulse" />
            <span>รอดำเนินการ</span>
          </span>
        );
    }
  };

  return (
    <div id="oncall-section" className="space-y-6">
      
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-2xl">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ค้นหาตามชื่อ, เบอร์โทร, เลขรับเรื่อง หรือปัญหา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-hidden focus:ring-3 focus:ring-sky-950/40 transition-all"
            />
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          </div>

          {/* Status Filter */}
          <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'all' 
                  ? 'bg-slate-800 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'pending' 
                  ? 'bg-amber-500/25 text-amber-300 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              รอดำเนินการ
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'resolved' 
                  ? 'bg-emerald-500/25 text-emerald-300 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              แก้ไขสำเร็จ
            </button>
            <button
              onClick={() => setStatusFilter('forwarded')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'forwarded' 
                  ? 'bg-blue-500/25 text-blue-300 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ส่งเรื่องต่อ
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleExportCSV(filteredOnCalls)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/60 transition-all cursor-pointer shrink-0"
            title="ส่งออกรายการที่ค้นพบเป็นไฟล์ CSV"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenForm()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-950/40 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกรับสายใหม่</span>
          </button>
        </div>
      </div>

      {/* Grid view/Table */}
      {filteredOnCalls.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-slate-800 border-dashed rounded-3xl">
          <PhoneCall className="w-12 h-12 text-slate-700 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-bold text-slate-300">ไม่พบประวัติการรับสาย</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">ลองค้นหาแบบอื่นหรือคลิก "บันทึกรับสายใหม่" เพื่อสร้างข้อมูล</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold text-3xs uppercase tracking-wider">
                  <th className="px-5 py-4 w-28">เลขรับเรื่อง</th>
                  <th className="px-4 py-4 w-48">ข้อมูลลูกค้า</th>
                  <th className="px-4 py-4">รายละเอียดปัญหาที่แจ้ง</th>
                  <th className="px-4 py-4 w-44">วันที่รับสาย - เวลา</th>
                  <th className="px-4 py-4 w-40">ผู้รับสาย</th>
                  <th className="px-4 py-4 w-32 text-center">สถานะ</th>
                  <th className="px-5 py-4 text-center w-28">ตัวเลือก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {filteredOnCalls.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-all">
                    {/* Call No */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold text-sky-400">{item.callNo}</span>
                    </td>
                    
                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-100 text-xs">{item.customerName}</p>
                        {item.customerPhone && (
                          <p className="text-3xs text-slate-500 font-mono flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5" />
                            {item.customerPhone}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Issue */}
                    <td className="px-4 py-3.5">
                      <div className="max-w-md">
                        <p className="text-xs text-slate-200 line-clamp-1 font-medium">{item.issue}</p>
                        {item.solution && (
                          <p className="text-3xs text-emerald-400 line-clamp-1 mt-0.5 font-light">
                            <strong>คำแนะนำ:</strong> {item.solution}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* DateTime */}
                    <td className="px-4 py-3.5 text-xs text-slate-300">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 font-semibold text-slate-300">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {item.callDate}
                        </span>
                        <span className="flex items-center gap-1 text-3xs text-slate-500 font-mono mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {item.callTime} น.
                        </span>
                      </div>
                    </td>

                    {/* Receiver */}
                    <td className="px-4 py-3.5 text-xs text-slate-200 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        {item.receiverName}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenForm(item)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg transition-all"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-1.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 border border-rose-900/30 rounded-lg transition-all"
                          title="ลบข้อมูล"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {filteredOnCalls.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between gap-4.5 shadow-md">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="space-y-1">
                      <span className="font-mono text-3xs font-bold text-sky-400 bg-sky-950/30 px-2 py-0.5 rounded-lg border border-sky-900/40">
                        {item.callNo}
                      </span>
                      <h4 className="font-bold text-slate-100 text-xs mt-1.5">{item.customerName}</h4>
                      {item.customerPhone && (
                        <p className="text-3xs text-slate-500 font-mono flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {item.customerPhone}
                        </p>
                      )}
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>

                  <div className="space-y-2">
                    <div className="bg-slate-950/50 p-2.5 border border-slate-800/80 rounded-xl space-y-1.5">
                      <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-500" />
                        ปัญหาที่แจ้ง
                      </p>
                      <p className="text-xs text-slate-200 leading-relaxed">{item.issue}</p>
                    </div>

                    {item.solution && (
                      <div className="bg-emerald-950/20 p-2.5 border border-emerald-900/20 rounded-xl space-y-1.5">
                        <p className="text-3xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          วิธีแก้ไข/คำแนะนำ
                        </p>
                        <p className="text-xs text-emerald-300 leading-relaxed font-light">{item.solution}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-3xs text-slate-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {item.callDate}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {item.callTime} น.
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      {item.receiverName}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenForm(item)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg text-3xs font-semibold text-slate-300 hover:text-white transition-all"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/30 rounded-lg text-3xs font-semibold text-rose-400 hover:text-rose-200 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Slide-over / Modal Form */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseForm}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-5 py-4.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-950/50 border border-sky-900 text-sky-400 rounded-lg">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {editingItem ? 'แก้ไขข้อมูลประวัติการรับสาย' : 'บันทึกประวัติการรับสายใหม่'}
                    </h3>
                    <p className="text-3xs text-slate-500 mt-0.5">ระบุรายละเอียดการให้บริการทางโทรศัพท์และคำแนะนำ</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseForm}
                  className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-all"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* Customer Name */}
                <div className="space-y-1 relative">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    ชื่อลูกค้าที่ติดต่อเข้ามา <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                      placeholder="เช่น คุณสมชาย รักดี"
                      className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.customerName ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                    />
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                  {errors.customerName && <p className="text-rose-400 text-3xs font-semibold mt-1">{errors.customerName}</p>}

                  {/* Suggestions list */}
                  {showSuggestions && suggestedCustomers.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-slate-850 max-h-48 overflow-y-auto">
                      {suggestedCustomers.map((cust) => (
                        <button
                          type="button"
                          key={cust.id}
                          onMouseDown={() => {
                            setCustomerName(cust.name);
                            setCustomerPhone(cust.phone || '');
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-850/80 transition-all flex flex-col space-y-0.5 cursor-pointer text-xs"
                        >
                          <span className="font-bold text-white flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{cust.name}</span>
                          </span>
                          {(cust.company || cust.phone) && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {cust.company && `🏢 ${cust.company}`} {cust.phone && ` 📞 ${cust.phone}`}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Phone */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    เบอร์โทรศัพท์ลูกค้า
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600"
                    />
                    <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Date and Time Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div className="space-y-1">
                    <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                      วันที่รับสาย <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={callDate}
                        onChange={(e) => setCallDate(e.target.value)}
                        className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.callDate ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200`}
                      />
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="space-y-1">
                    <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                      เวลารับสาย <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={callTime}
                        onChange={(e) => setCallTime(e.target.value)}
                        className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.callTime ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200`}
                      />
                      <Clock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Issue Details */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    อาการ/ปัญหาที่แจ้งอย่างละเอียด <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                      placeholder="ระบุอาการเสีย ปัญหาทางเทคนิค หรือข้อสงสัยของลูกค้า"
                      rows={3}
                      className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.issue ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                    />
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                  {errors.issue && <p className="text-rose-400 text-3xs font-semibold mt-1">{errors.issue}</p>}
                </div>

                {/* Solution / Recommendations */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    วิธีแก้ไข / คำแนะนำเบื้องต้น
                  </label>
                  <div className="relative">
                    <textarea
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      placeholder="ระบุวิธีแก้ไขปัญหา แนะนำขั้นตอนให้ลูกค้าทดสอบแก้ไข หรือมาตรการชั่วคราว"
                      rows={3}
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600"
                    />
                    <CheckCircle2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Receiver Name */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    ชื่อผู้รับสาย / ผู้ให้คำปรึกษา <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="ระบุชื่อจริงหรือรหัสพนักงาน"
                      className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.receiverName ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                    />
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                  {errors.receiverName && <p className="text-rose-400 text-3xs font-semibold mt-1">{errors.receiverName}</p>}
                </div>

                {/* Status Radio Group */}
                <div className="space-y-1.5">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    สถานะการดำเนินการ
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Pending */}
                    <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      status === 'pending'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                    }`}>
                      <input
                        type="radio"
                        name="oncallStatus"
                        value="pending"
                        checked={status === 'pending'}
                        onChange={() => setStatus('pending')}
                        className="sr-only"
                      />
                      <HelpCircle className="w-4 h-4 mb-1" />
                      <span className="text-2xs font-bold">รอดำเนินการ</span>
                    </label>

                    {/* Resolved */}
                    <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      status === 'resolved'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                    }`}>
                      <input
                        type="radio"
                        name="oncallStatus"
                        value="resolved"
                        checked={status === 'resolved'}
                        onChange={() => setStatus('resolved')}
                        className="sr-only"
                      />
                      <CheckCircle2 className="w-4 h-4 mb-1" />
                      <span className="text-2xs font-bold">แก้ไขสำเร็จ</span>
                    </label>

                    {/* Forwarded */}
                    <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      status === 'forwarded'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                    }`}>
                      <input
                        type="radio"
                        name="oncallStatus"
                        value="forwarded"
                        checked={status === 'forwarded'}
                        onChange={() => setStatus('forwarded')}
                        className="sr-only"
                      />
                      <ArrowRightCircle className="w-4 h-4 mb-1" />
                      <span className="text-2xs font-bold">ส่งต่อช่าง Onsite</span>
                    </label>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    หมายเหตุเพิ่มเติม (ถ้ามี)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="กรอกข้อมูลบันทึกความจำเพิ่มเติม"
                    rows={2}
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600"
                  />
                </div>

              </form>

              {/* Action Buttons */}
              <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-950/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingItem ? 'บันทึกการแก้ไข' : 'บันทึกประวัติ'}</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
