import React, { useState, useMemo } from 'react';
import { Customer, ServiceJob, OnCallService, ClaimProduct } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  History, 
  BarChart3, 
  Calendar, 
  PhoneCall, 
  Package, 
  X,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { formatThaiDate } from '../utils';

interface CustomerDatabaseProps {
  customers: Customer[];
  jobs: ServiceJob[];
  onCalls: OnCallService[];
  claims: ClaimProduct[];
  isSyncing: boolean;
}

export default function CustomerDatabase({ 
  customers, 
  jobs, 
  onCalls, 
  claims, 
  isSyncing 
}: CustomerDatabaseProps) {
  // 1. Search and Modal States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  // 2. Open Form for Add / Edit
  const handleOpenForm = (cust: Customer | null = null) => {
    if (cust) {
      setEditingCustomer(cust);
      setCustomerName(cust.name);
      setCustomerCompany(cust.company || '');
      setCustomerPhone(cust.phone || '');
      setCustomerAddress(cust.address || '');
    } else {
      setEditingCustomer(null);
      setCustomerName('');
      setCustomerCompany('');
      setCustomerPhone('');
      setCustomerAddress('');
    }
    setErrors({});
    setIsFormOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrors({ name: 'กรุณาระบุชื่อลูกค้า/ชื่อผู้ติดต่อ' });
      return;
    }

    try {
      const id = editingCustomer?.id || `cust-${Date.now()}`;
      const newCustomer: Customer = {
        id,
        name: customerName.trim(),
        company: customerCompany.trim() || undefined,
        phone: customerPhone.trim() || undefined,
        address: customerAddress.trim() || undefined,
        createdAt: editingCustomer?.createdAt || new Date().toISOString()
      };

      const ref = doc(db, 'customers', id);
      await setDoc(ref, newCustomer);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Failed to save customer:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลลูกค้า');
      handleFirestoreError(error, editingCustomer ? OperationType.UPDATE : OperationType.CREATE, `customers/${editingCustomer?.id || 'new'}`);
    }
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ที่จะลบลูกค้า "${cust.name}" ออกจากฐานข้อมูล?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'customers', cust.id));
    } catch (error) {
      console.error('Failed to delete customer:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลลูกค้า');
      handleFirestoreError(error, OperationType.DELETE, `customers/${cust.id}`);
    }
  };

  // 3. Stats and Calculations
  const customerStats = useMemo(() => {
    return customers.map(cust => {
      // Find jobs by customer name
      const custJobs = jobs.filter(j => j.customerName?.toLowerCase() === cust.name.toLowerCase());
      const custCalls = onCalls.filter(o => o.customerName?.toLowerCase() === cust.name.toLowerCase());
      const custClaims = claims.filter(c => c.customerName?.toLowerCase() === cust.name.toLowerCase());

      const totalServices = custJobs.length + custCalls.length + custClaims.length;

      return {
        ...cust,
        jobsCount: custJobs.length,
        callsCount: custCalls.length,
        claimsCount: custClaims.length,
        totalServices,
        lastActive: custJobs[0]?.startDate || custCalls[0]?.callDate || custClaims[0]?.claimDate || 'ไม่มีประวัติ'
      };
    });
  }, [customers, jobs, onCalls, claims]);

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    return customerStats.filter(c => {
      const matchSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone && c.phone.includes(searchTerm));
      return matchSearch;
    });
  }, [customerStats, searchTerm]);

  // 4. Top Customers Chart Data
  const topCustomersData = useMemo(() => {
    return [...customerStats]
      .filter(c => c.totalServices > 0)
      .sort((a, b) => b.totalServices - a.totalServices)
      .slice(0, 8)
      .map(c => ({
        name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
        'งาน Onsite': c.jobsCount,
        'รับสาย On-Call': c.callsCount,
        'เคลมสินค้า': c.claimsCount,
        'ยอดรวม': c.totalServices
      }));
  }, [customerStats]);

  // 5. Customer Specific Service Log Details
  const selectedHistory = useMemo(() => {
    if (!selectedCustomer) return { jobsList: [], callsList: [], claimsList: [] };

    const nameLower = selectedCustomer.name.toLowerCase();
    const jobsList = jobs.filter(j => j.customerName?.toLowerCase() === nameLower);
    const callsList = onCalls.filter(o => o.customerName?.toLowerCase() === nameLower);
    const claimsList = claims.filter(c => c.customerName?.toLowerCase() === nameLower);

    return { jobsList, callsList, claimsList };
  }, [selectedCustomer, jobs, onCalls, claims]);

  const [historyTab, setHistoryTab] = useState<'jobs' | 'calls' | 'claims'>('jobs');

  return (
    <div className="space-y-6" id="customer-database-tab">
      
      {/* Top Section / Header bar */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <User className="w-5.5 h-5.5 text-sky-400" />
            <span>ฐานข้อมูลลูกค้า & ประวัติการบริการ</span>
          </h2>
          <p className="text-xs text-slate-400">
            บริหารรายชื่อบริษัทและผู้ติดต่อ เชื่อมโยงประวัติงานซ่อม งานรับสายทางโทรศัพท์ และรายการเคลมทั้งหมด
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenForm(null)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-sky-950/40 hover:scale-[1.02] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มลูกค้าใหม่</span>
        </button>
      </div>

      {/* Grid of Chart and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Service Utilization Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">แผนภูมิลูกค้าที่ใช้บริการมากที่สุด (Top 8 Customers)</h3>
          </div>

          <div className="h-56 w-full">
            {topCustomersData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomersData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', color: '#f1f5f9' }} />
                  <Bar dataKey="งาน Onsite" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="รับสาย On-Call" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="เคลมสินค้า" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <User className="w-10 h-10 opacity-30" />
                <p className="text-xs">ไม่มีข้อมูลประวัติการบริการเพียงพอเพื่อแสดงแผนภูมิ</p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Key Performance / Summary Card */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm">สรุปสารสนเทศลูกค้า</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">ภาพรวมจำนวนและปริมาณงานบริการลูกค้าสะสม</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
              <span className="text-3xs text-slate-500 uppercase font-bold tracking-wider">ลูกค้าลงทะเบียน</span>
              <p className="text-2xl font-extrabold text-sky-400 mt-1">{customers.length}</p>
              <span className="text-[10px] text-slate-400">ราย</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
              <span className="text-3xs text-slate-500 uppercase font-bold tracking-wider">บริการงาน Onsite</span>
              <p className="text-2xl font-extrabold text-blue-400 mt-1">{jobs.length}</p>
              <span className="text-[10px] text-slate-400">ครั้ง</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
              <span className="text-3xs text-slate-500 uppercase font-bold tracking-wider">บริการ On-Call</span>
              <p className="text-2xl font-extrabold text-amber-500 mt-1">{onCalls.length}</p>
              <span className="text-[10px] text-slate-400">ครั้ง</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
              <span className="text-3xs text-slate-500 uppercase font-bold tracking-wider">บริการเคลมสินค้า</span>
              <p className="text-2xl font-extrabold text-pink-500 mt-1">{claims.length}</p>
              <span className="text-[10px] text-slate-400">ครั้ง</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table list & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        
        {/* Controls Bar */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/20 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาตามชื่อลูกค้า, บริษัท, หรือเบอร์โทรศัพท์..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600"
            />
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          </div>

          <div className="text-2xs text-slate-400 shrink-0">
            พบข้อมูลลูกค้าทั้งหมด <span className="font-bold text-sky-400">{filteredCustomers.length}</span> รายการ
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-3xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">ลูกค้า / ผู้ติดต่อ</th>
                <th className="px-6 py-4">ชื่อบริษัท</th>
                <th className="px-6 py-4">เบอร์โทรศัพท์</th>
                <th className="px-6 py-4">ที่อยู่สถานที่นัดหมาย</th>
                <th className="px-6 py-4 text-center">สถิติการรับบริการ (ครั้ง)</th>
                <th className="px-6 py-4 text-center">อัปเดตล่าสุด</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs text-slate-300">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-850/45 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white group-hover:text-sky-400 transition-all flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cust.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {cust.company ? (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{cust.company}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-light italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cust.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{cust.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-light italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate" title={cust.address}>
                      {cust.address ? (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{cust.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-light italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-950/40 text-blue-400 border border-blue-900/40 rounded-full text-[10px] font-bold" title="งาน Onsite">
                          OS: {cust.jobsCount}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-900/40 rounded-full text-[10px] font-bold" title="รับสาย On-Call">
                          OC: {cust.callsCount}
                        </span>
                        <span className="px-2 py-0.5 bg-pink-950/40 text-pink-400 border border-pink-900/40 rounded-full text-[10px] font-bold" title="เคลมสินค้า">
                          CL: {cust.claimsCount}
                        </span>
                        <span className="px-2.5 py-0.5 bg-slate-800 text-white rounded-full text-[10px] font-extrabold" title="รวมทั้งหมด">
                          {cust.totalServices}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-400 text-3xs">
                      {cust.lastActive !== 'ไม่มีประวัติ' ? formatThaiDate(cust.lastActive) : cust.lastActive}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-85 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setHistoryTab('jobs');
                            setIsHistoryOpen(true);
                          }}
                          className="p-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-400 hover:text-indigo-300 rounded-lg transition-all"
                          title="ดูประวัติการบริการทั้งหมด"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenForm(cust)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg transition-all"
                          title="แก้ไขรายละเอียดลูกค้า"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(cust)}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 rounded-lg transition-all"
                          title="ลบออกจากระบบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <User className="w-12 h-12 mx-auto text-slate-600 opacity-40 mb-3" />
                    <p className="text-sm">ไม่พบข้อมูลลูกค้าที่คุณค้นหา</p>
                    <p className="text-xs text-slate-600 mt-1">ลองพิมพ์ค้นหาด้วยคำอื่น หรือกดปุ่มเพิ่มลูกค้าใหม่ด้านบน</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Log Modal ("ดูประวัติการบริการได้ทุกรูปแบบ" & "แสดงประวัติการซ่อมและจำนวนการซ่อม") */}
      {isHistoryOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)}></div>
          
          <div className="relative bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-800 flex flex-col max-h-[85vh] overflow-hidden text-slate-200 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest bg-sky-950/60 px-3 py-1 rounded-full border border-sky-900/40">
                  Customer Profile & History
                </span>
                <h3 className="text-lg font-bold text-white mt-2 flex items-center gap-1.5">
                  <User className="w-5 h-5 text-sky-400" />
                  <span>{selectedCustomer.name}</span>
                  {selectedCustomer.company && <span className="text-slate-400 font-normal">({selectedCustomer.company})</span>}
                </h3>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick profile specs */}
            <div className="px-6 py-3 bg-slate-950/20 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-slate-400">เบอร์โทรศัพท์:</span>
                <span className="font-semibold">{selectedCustomer.phone || 'ไม่ระบุ'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-slate-400">ที่อยู่นัดหมาย:</span>
                <span className="font-semibold truncate" title={selectedCustomer.address}>{selectedCustomer.address || 'ไม่ระบุ'}</span>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="px-6 pt-3 bg-slate-950/10 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryTab('jobs')}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-all ${
                    historyTab === 'jobs' ? 'border-sky-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>งานบริการ Onsite ({selectedHistory.jobsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('calls')}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-all ${
                    historyTab === 'calls' ? 'border-sky-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>บริการทางโทรศัพท์ ({selectedHistory.callsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('claims')}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-semibold transition-all ${
                    historyTab === 'claims' ? 'border-sky-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>เคลมสินค้า ({selectedHistory.claimsList.length})</span>
                </button>
              </div>

              <div className="text-2xs text-slate-500 pr-2">
                รวมประวัติการซ่อมบริการทั้งหมด: <span className="font-bold text-white">{selectedHistory.jobsList.length + selectedHistory.callsList.length + selectedHistory.claimsList.length}</span> ครั้ง
              </div>
            </div>

            {/* Scrollable list contents */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
              
              {/* Jobs list tab */}
              {historyTab === 'jobs' && (
                <div className="space-y-4">
                  {selectedHistory.jobsList.length > 0 ? (
                    selectedHistory.jobsList.map(job => (
                      <div key={job.id} className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-sky-400">{job.jobNo}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md font-semibold">{job.jobType}</span>
                            <span className="text-3xs text-slate-500">{formatThaiDate(job.startDate)}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-200 line-clamp-2">{job.details}</p>
                          <div className="text-3xs text-slate-400 flex items-center gap-2">
                            <span>ผู้ดูแล: {job.technicianName}</span>
                            <span>•</span>
                            <span>ค่าบริการ: {job.serviceFee > 0 ? `${job.serviceFee} บาท` : 'ฟรี (ในประกัน)'}</span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 ${
                          job.status === 'completed' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/50' :
                          job.status === 'in_progress' ? 'bg-sky-950/80 text-sky-400 border border-sky-900/50' :
                          job.status === 'cancelled' ? 'bg-slate-900 text-slate-400' :
                          'bg-amber-950/80 text-amber-400 border border-amber-900/50'
                        }`}>
                          {job.status === 'completed' ? 'เสร็จสิ้น' :
                           job.status === 'in_progress' ? 'กำลังทำ' :
                           job.status === 'cancelled' ? 'ยกเลิก' : 'รอดำเนินการ'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-slate-500">
                      <Calendar className="w-8 h-8 opacity-30 mb-1" />
                      <p className="text-xs">ไม่มีประวัติการซ่อมบริการ Onsite</p>
                    </div>
                  )}
                </div>
              )}

              {/* Calls list tab */}
              {historyTab === 'calls' && (
                <div className="space-y-4">
                  {selectedHistory.callsList.length > 0 ? (
                    selectedHistory.callsList.map(call => (
                      <div key={call.id} className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-amber-400">{call.callNo}</span>
                            <span className="text-3xs text-slate-500">{formatThaiDate(call.callDate)} ({call.callTime} น.)</span>
                          </div>
                          <div>
                            <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">อาการที่แจ้ง:</span>
                            <p className="text-xs font-medium text-slate-200">{call.issue}</p>
                          </div>
                          {call.solution && (
                            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900 text-3xs text-slate-400">
                              <span className="font-bold text-slate-300">วิธีแก้ไข:</span> {call.solution}
                            </div>
                          )}
                          <div className="text-3xs text-slate-400">ผู้รับสาย: {call.receiverName}</div>
                        </div>

                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 ${
                          call.status === 'resolved' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/50' :
                          call.status === 'forwarded' ? 'bg-sky-950/80 text-sky-400 border border-sky-900/50' :
                          'bg-amber-950/80 text-amber-400 border border-amber-900/50'
                        }`}>
                          {call.status === 'resolved' ? 'แก้ไขสำเร็จ' :
                           call.status === 'forwarded' ? 'ส่งเรื่องต่อ Onsite' : 'รอดำเนินการ'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-slate-500">
                      <PhoneCall className="w-8 h-8 opacity-30 mb-1" />
                      <p className="text-xs">ไม่มีประวัติการรับบริการทางโทรศัพท์</p>
                    </div>
                  )}
                </div>
              )}

              {/* Claims list tab */}
              {historyTab === 'claims' && (
                <div className="space-y-4">
                  {selectedHistory.claimsList.length > 0 ? (
                    selectedHistory.claimsList.map(claim => (
                      <div key={claim.id} className="bg-slate-950/40 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-pink-400">{claim.claimNo}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md font-semibold">{claim.productBrand} • {claim.productName}</span>
                            <span className="text-3xs text-slate-500">{formatThaiDate(claim.claimDate)}</span>
                          </div>
                          <div>
                            <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">อาการชำรุด:</span>
                            <p className="text-xs font-medium text-slate-200">{claim.symptom}</p>
                          </div>
                          <div className="text-3xs text-slate-400 flex items-center gap-2">
                            <span>ช่างผู้ตรวจสอบ: {claim.technicianName}</span>
                            {claim.returnDate && (
                              <>
                                <span>•</span>
                                <span>ส่งคืนสินค้าแล้วเมื่อ: {formatThaiDate(claim.returnDate)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg shrink-0 ${
                          claim.status === 'completed' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/50' :
                          claim.status === 'repairing' ? 'bg-purple-950/80 text-purple-400 border border-purple-900/50' :
                          claim.status === 'checking' ? 'bg-amber-950/80 text-amber-400 border border-amber-900/50' :
                          claim.status === 'rejected' ? 'bg-rose-950/80 text-rose-400 border border-rose-900/50' :
                          'bg-blue-950/80 text-blue-400 border border-blue-900/50'
                        }`}>
                          {claim.status === 'completed' ? 'สำเร็จ/คืนแล้ว' :
                           claim.status === 'repairing' ? 'กำลังซ่อม' :
                           claim.status === 'checking' ? 'กำลังตรวจสอบ' :
                           claim.status === 'rejected' ? 'ปฏิเสธการเคลม' : 'รับเรื่องแล้ว'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-slate-500">
                      <Package className="w-8 h-8 opacity-30 mb-1" />
                      <p className="text-xs">ไม่มีประวัติการส่งเคลมสินค้า</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}></div>
          
          <div className="relative bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 flex flex-col overflow-hidden text-slate-200 shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>{editingCustomer ? '✍️ แก้ไขข้อมูลลูกค้า' : '➕ เพิ่มข้อมูลลูกค้าใหม่'}</span>
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              {/* Customer Name */}
              <div className="space-y-1">
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider">ชื่อลูกค้า / ผู้ติดต่อ <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ระบุชื่อผู้ติดต่อสำหรับการประสานงาน"
                    className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.name ? 'border-rose-500' : 'border-slate-800'} bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-sky-500`}
                  />
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                </div>
                {errors.name && <p className="text-rose-400 text-3xs font-semibold">{errors.name}</p>}
              </div>

              {/* Customer Company */}
              <div className="space-y-1">
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider">ชื่อบริษัทลูกค้า (ถ้ามี)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    placeholder="ระบุชื่อบริษัทลูกค้าสำหรับการออกใบงาน"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-sky-500"
                  />
                  <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                </div>
              </div>

              {/* Customer Phone */}
              <div className="space-y-1">
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider">เบอร์โทรศัพท์ติดต่อ</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-sky-500"
                  />
                  <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                </div>
              </div>

              {/* Customer Address */}
              <div className="space-y-1">
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider">ที่อยู่จัดส่ง / นัดหมาย Onsite</label>
                <div className="relative">
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="ระบุบ้านเลขที่ หมู่ ซอย ถนน จังหวัด..."
                    rows={3}
                    className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 resize-none focus:outline-hidden focus:border-sky-500"
                  />
                  <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all text-xs font-semibold shadow-lg shadow-sky-950/40 cursor-pointer"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
