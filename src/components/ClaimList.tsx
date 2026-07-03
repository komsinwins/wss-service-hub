import React, { useState, useMemo } from 'react';
import { ClaimProduct, ClaimStatus, Customer } from '../types';
import { 
  Package, 
  Plus, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  HelpCircle, 
  Trash2, 
  Edit3, 
  X, 
  FileText, 
  Phone,
  Settings,
  AlertTriangle,
  XCircle,
  Layers,
  Tag,
  Printer,
  Download,
  Camera,
  Image
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ClaimReportModal from './ClaimReportModal';
import { getStoredProductTypes, saveProductTypes } from '../utils';


interface ClaimListProps {
  claims: ClaimProduct[];
  onAddOrEdit: (data: Omit<ClaimProduct, 'id' | 'claimNo' | 'createdAt'> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  customers?: Customer[];
}

export default function ClaimList({ claims, onAddOrEdit, onDelete, customers = [] }: ClaimListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClaimProduct | null>(null);

  // Claim Report print states
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedReportClaim, setSelectedReportClaim] = useState<ClaimProduct | null>(null);

  const handleOpenReport = (item: ClaimProduct) => {
    setSelectedReportClaim(item);
    setIsReportOpen(true);
  };

  const handleCloseReport = () => {
    setIsReportOpen(false);
    setSelectedReportClaim(null);
  };

  // Product type configuration states
  const [productTypes, setProductTypes] = useState<string[]>(() => getStoredProductTypes());
  const [isManagingProductTypes, setIsManagingProductTypes] = useState(false);
  const [newProductTypeInput, setNewProductTypeInput] = useState('');

  const handleAddProductType = () => {
    const trimmed = newProductTypeInput.trim();
    if (!trimmed) return;
    if (productTypes.includes(trimmed)) return;
    
    const updated = [...productTypes, trimmed];
    setProductTypes(updated);
    saveProductTypes(updated);
    setNewProductTypeInput('');
    setProductType(trimmed); // Auto-select the newly added type
  };

  const handleRemoveProductType = (typeToRemove: string) => {
    const updated = productTypes.filter(t => t !== typeToRemove);
    setProductTypes(updated);
    saveProductTypes(updated);
    
    // If current selection is removed, select the first remaining
    if (productType === typeToRemove) {
      setProductType(updated[0] || '');
    }
  };

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

  const [productName, setProductName] = useState('');
  const [productType, setProductType] = useState(() => {
    const types = getStoredProductTypes();
    return types[0] || 'ปั๊มน้ำ';
  });
  const [productBrand, setProductBrand] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [symptom, setSymptom] = useState('');
  const [claimDate, setClaimDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnDate, setReturnDate] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('received');
  const [notes, setNotes] = useState('');
  const [claimImages, setClaimImages] = useState<{ url: string; description: string }[]>([]);

  // Claim images upload and handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      if (claimImages.length >= 3) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_WIDTH = 1024;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            let quality = 0.8;
            let dataUrl = canvas.toDataURL('image/jpeg', quality);

            while (dataUrl.length > 500000 && quality > 0.1) {
              quality -= 0.1;
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            }

            setClaimImages((prev) => {
              if (prev.length >= 3) return prev;
              const nextIdx = prev.length + 1;
              return [...prev, { url: dataUrl, description: `รูปถ่ายส่วนชำรุดแบบซูมชิ้นที่ ${nextIdx}` }];
            });
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpdateImageDescription = (index: number, desc: string) => {
    setClaimImages((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], description: desc };
      }
      return updated;
    });
  };

  const handleRemoveImage = (index: number) => {
    setClaimImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Form validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleOpenForm = (item?: ClaimProduct) => {
    if (item) {
      setEditingItem(item);
      setCustomerName(item.customerName);
      setCustomerPhone(item.customerPhone || '');
      setProductName(item.productName);
      setProductType(item.productType || productTypes[0] || 'ปั๊มน้ำ');
      setProductBrand(item.productBrand || '');
      setSerialNumber(item.serialNumber || '');
      setSymptom(item.symptom);
      setClaimDate(item.claimDate);
      setReturnDate(item.returnDate || '');
      setTechnicianName(item.technicianName);
      setStatus(item.status);
      setNotes(item.notes || '');
      setClaimImages(item.claimImages || []);
    } else {
      setEditingItem(null);
      setCustomerName('');
      setCustomerPhone('');
      setProductName('');
      setProductType(productTypes[0] || 'ปั๊มน้ำ');
      setProductBrand('');
      setSerialNumber('');
      setSymptom('');
      setClaimDate(new Date().toISOString().split('T')[0]);
      setReturnDate('');
      setTechnicianName('');
      setStatus('received');
      setNotes('');
      setClaimImages([]);
    }
    setIsManagingProductTypes(false);
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
    if (!productName.trim()) newErrors.productName = 'กรุณาระบุชื่อสินค้า';
    if (!symptom.trim()) newErrors.symptom = 'กรุณาระบุอาการเสียหรือเหตุผลการเคลม';
    if (!technicianName.trim()) newErrors.technicianName = 'กรุณาระบุช่างผู้ตรวจสอบ';
    if (!claimDate) newErrors.claimDate = 'กรุณาระบุวันที่รับเคลม';
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
      productName,
      productType,
      productBrand,
      serialNumber,
      symptom,
      claimDate,
      returnDate: returnDate || undefined,
      technicianName,
      status,
      notes,
      claimImages,
    });

    handleCloseForm();
  };

  // Filtered Claims
  const filteredClaims = useMemo(() => {
    return claims.filter(item => {
      const matchSearch = 
        item.customerName.toLowerCase().includes(search.toLowerCase()) ||
        item.claimNo.toLowerCase().includes(search.toLowerCase()) ||
        item.productName.toLowerCase().includes(search.toLowerCase()) ||
        (item.productType || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.productBrand || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.serialNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.customerPhone || '').includes(search) ||
        item.symptom.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [claims, search, statusFilter]);

  // Export claims to CSV / Excel
  const handleExportCSV = (claimsToExport: ClaimProduct[] = filteredClaims) => {
    if (claimsToExport.length === 0) {
      alert('ไม่มีข้อมูลเคลมตามเงื่อนไขให้ทำการส่งออก');
      return;
    }

    const headers = [
      'เลขรับเคลม',
      'ชื่อลูกค้า',
      'เบอร์โทรศัพท์',
      'ชื่อสินค้า/โมเดล',
      'ประเภทสินค้า',
      'ยี่ห้อสินค้า',
      'Serial Number (S/N)',
      'อาการชำรุด/อาการเสีย',
      'วันที่รับเคลม',
      'วันที่กำหนดส่งคืน/วันส่งคืนจริง',
      'ช่างผู้ตรวจสอบ/ผู้ดูแล',
      'สถานะ',
      'หมายเหตุเพิ่มเติม'
    ];

    const labelMap: Record<ClaimStatus, string> = {
      received: 'รับเรื่องแล้ว',
      checking: 'กำลังตรวจสอบ',
      repairing: 'กำลังซ่อมแซม',
      completed: 'สำเร็จ/คืนสินค้าแล้ว',
      rejected: 'ปฏิเสธการเคลม'
    };

    const csvRows = [
      headers.join(','),
      ...claimsToExport.map(item => {
        const values = [
          item.claimNo,
          item.customerName,
          item.customerPhone || '',
          item.productName,
          item.productType || '',
          item.productBrand || '',
          item.serialNumber || '',
          item.symptom,
          item.claimDate,
          item.returnDate || '',
          item.technicianName,
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
    link.setAttribute('download', `onsite_claims_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>สำเร็จ/คืนสินค้าแล้ว</span>
          </span>
        );
      case 'repairing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.1)]">
            <Settings className="w-3.5 h-3.5 animate-spin" />
            <span>กำลังซ่อมแซม</span>
          </span>
        );
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.1)]">
            <Search className="w-3.5 h-3.5 animate-pulse" />
            <span>กำลังตรวจสอบ</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]">
            <XCircle className="w-3.5 h-3.5" />
            <span>ปฏิเสธการเคลม</span>
          </span>
        );
      case 'received':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-extrabold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.1)]">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>รับเรื่องแล้ว</span>
          </span>
        );
    }
  };

  return (
    <div id="claim-section" className="space-y-6">
      
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-800 rounded-2xl">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ค้นหาตามชื่อสินค้า, S/N, ชื่อลูกค้า, เลขเคลม หรืออาการเสีย..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:border-sky-500 focus:outline-hidden focus:ring-3 focus:ring-sky-950/40 transition-all"
            />
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
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
              onClick={() => setStatusFilter('received')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'received' 
                  ? 'bg-amber-500/25 text-amber-300 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              รับเรื่อง
            </button>
            <button
              onClick={() => setStatusFilter('checking')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'checking' 
                  ? 'bg-blue-500/25 text-blue-300 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ตรวจเช็ค
            </button>
            <button
              onClick={() => setStatusFilter('repairing')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'repairing' 
                  ? 'bg-indigo-500/25 text-indigo-300 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              กำลังซ่อม
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'completed' 
                  ? 'bg-emerald-500/25 text-emerald-300 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              สำเร็จ
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'rejected' 
                  ? 'bg-rose-500/25 text-rose-300 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ปฏิเสธ
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleExportCSV(filteredClaims)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 active:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700/60 transition-all cursor-pointer shrink-0"
            title="ส่งออกรายการเคลมเป็นไฟล์ CSV"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenForm()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-950/40 hover:scale-[1.02] transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกรับเคลมใหม่</span>
          </button>
        </div>
      </div>

      {/* Grid view/Table */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-slate-800 border-dashed rounded-3xl">
          <Package className="w-12 h-12 text-slate-700 mx-auto mb-4 animate-bounce" />
          <h3 className="text-sm font-bold text-slate-300">ไม่พบประวัติการเคลมสินค้า</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">ลองค้นหาแบบอื่นหรือคลิก "บันทึกรับเคลมใหม่" เพื่อสร้างข้อมูล</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold text-3xs uppercase tracking-wider">
                  <th className="px-5 py-4 w-28">เลขรับเคลม</th>
                  <th className="px-4 py-4 w-44">ลูกค้า</th>
                  <th className="px-4 py-4 w-36">ประเภทสินค้า</th>
                  <th className="px-4 py-4 w-32">ยี่ห้อ</th>
                  <th className="px-4 py-4 w-52">สินค้า / S/N</th>
                  <th className="px-4 py-4">อาการชำรุด / อาการเสีย</th>
                  <th className="px-4 py-4 w-36">วันที่รับเคลม</th>
                  <th className="px-4 py-4 w-36">กำหนดส่งคืน</th>
                  <th className="px-4 py-4 w-36 text-center">สถานะ</th>
                  <th className="px-5 py-4 text-center w-28">ตัวเลือก</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                {filteredClaims.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-all">
                    {/* Claim No */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-bold text-indigo-400">{item.claimNo}</span>
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

                    {/* Product Type */}
                    <td className="px-4 py-3.5">
                      {item.productType ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-3xs font-extrabold rounded-lg bg-slate-950 text-indigo-300 border border-indigo-900/40">
                          <Layers className="w-3 h-3 text-indigo-400" />
                          <span>{item.productType}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>

                    {/* Product Brand */}
                    <td className="px-4 py-3.5">
                      {item.productBrand ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-3xs font-extrabold rounded-lg bg-slate-950 text-amber-300 border border-amber-900/40">
                          <Tag className="w-3 h-3 text-amber-400" />
                          <span>{item.productBrand}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">-</span>
                      )}
                    </td>

                    {/* Product & S/N */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-200 text-xs">{item.productName}</p>
                        {item.serialNumber && (
                          <p className="text-3xs text-slate-400 font-mono">
                            S/N: <span className="text-indigo-300 font-bold">{item.serialNumber}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Symptom */}
                    <td className="px-4 py-3.5">
                      <div className="max-w-xs">
                        <p className="text-xs text-slate-200 line-clamp-1 font-medium">{item.symptom}</p>
                        {item.notes && (
                          <p className="text-3xs text-slate-500 line-clamp-1 mt-0.5 font-light">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Claim Date */}
                    <td className="px-4 py-3.5 text-xs text-slate-300 font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {item.claimDate}
                      </span>
                    </td>

                    {/* Return Date */}
                    <td className="px-4 py-3.5 text-xs text-slate-300 font-medium">
                      {item.returnDate ? (
                        <span className="flex items-center gap-1 text-emerald-400/95">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          {item.returnDate}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      {renderStatusBadge(item.status)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReport(item)}
                          className="p-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-400 hover:text-indigo-200 border border-indigo-900/30 rounded-lg transition-all cursor-pointer"
                          title="ออกรายงานการเคลมสินค้า"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenForm(item)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg transition-all cursor-pointer"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="p-1.5 bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 border border-rose-900/30 rounded-lg transition-all cursor-pointer"
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
            {filteredClaims.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between gap-4.5 shadow-md">
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="space-y-1">
                      <span className="font-mono text-3xs font-bold text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-900/40">
                        {item.claimNo}
                      </span>
                      <h4 className="font-bold text-slate-100 text-xs mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span>{item.productName}</span>
                        {item.productType && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] leading-none font-extrabold rounded-md bg-slate-950 text-indigo-300 border border-indigo-900/40">
                            {item.productType}
                          </span>
                        )}
                        {item.productBrand && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] leading-none font-extrabold rounded-md bg-slate-950 text-amber-300 border border-amber-900/40">
                            {item.productBrand}
                          </span>
                        )}
                      </h4>
                      {item.serialNumber && (
                        <p className="text-3xs text-slate-400 font-mono">
                          S/N: <span className="text-indigo-300">{item.serialNumber}</span>
                        </p>
                      )}
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>

                  <div className="space-y-2">
                    <div className="bg-slate-950/50 p-2.5 border border-slate-800/80 rounded-xl space-y-1">
                      <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider">ลูกค้าผู้แจ้งเคลม</p>
                      <p className="text-xs text-slate-200 font-bold">{item.customerName}</p>
                      {item.customerPhone && (
                        <p className="text-3xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          {item.customerPhone}
                        </p>
                      )}
                    </div>

                    <div className="bg-rose-950/10 p-2.5 border border-rose-900/20 rounded-xl space-y-1.5">
                      <p className="text-3xs text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        อาการชำรุด/อาการเสีย
                      </p>
                      <p className="text-xs text-slate-200 leading-relaxed font-medium">{item.symptom}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row items-slate-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-3xs text-slate-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      รับเคลม: {item.claimDate}
                    </span>
                    {item.returnDate && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        ส่งคืน: {item.returnDate}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      ช่าง: {item.technicianName}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReport(item)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-900/30 rounded-lg text-3xs font-semibold text-indigo-400 hover:text-indigo-200 transition-all cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>รายงาน</span>
                    </button>
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
                  <div className="p-2 bg-indigo-950/50 border border-indigo-900 text-indigo-400 rounded-lg">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {editingItem ? 'แก้ไขบันทึกเคลมสินค้า' : 'สร้างรายการเคลมสินค้าใหม่'}
                    </h3>
                    <p className="text-3xs text-slate-500 mt-0.5">ระบุรายละเอียดสินค้าที่รับเคลม อาการชำรุด และสถานะ</p>
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
                
                {/* Product Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Product Name */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                      ชื่อสินค้า / โมเดล <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        placeholder="เช่น ปั๊มน้ำมิตซูบิชิ WP-155Q5"
                        className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.productName ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                      />
                      <Package className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                    {errors.productName && <p className="text-rose-400 text-3xs font-semibold mt-1">{errors.productName}</p>}
                  </div>

                  {/* Product Type */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                        ประเภทสินค้า
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsManagingProductTypes(!isManagingProductTypes)}
                        className="text-[10px] text-indigo-400 hover:underline cursor-pointer flex items-center gap-0.5 font-bold"
                      >
                        ⚙️ จัดการตัวเลือก
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                        className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200"
                      >
                        {productTypes.map((t) => (
                          <option key={t} value={t} className="bg-slate-900 text-slate-200">
                            {t}
                          </option>
                        ))}
                      </select>
                      <Layers className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Manage Product Types Inline UI */}
                  {isManagingProductTypes && (
                    <div className="sm:col-span-2 p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <h5 className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                          <span>⚙️ ตั้งค่ารายการประเภทสินค้า</span>
                        </h5>
                        <button
                          type="button"
                          onClick={() => setIsManagingProductTypes(false)}
                          className="text-slate-500 hover:text-slate-300 text-2xs cursor-pointer font-bold"
                        >
                          ปิด
                        </button>
                      </div>

                      {/* Add Product Type Form */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newProductTypeInput}
                          onChange={(e) => setNewProductTypeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddProductType();
                            }
                          }}
                          placeholder="กรอกประเภทสินค้าใหม่ (เช่น ไมโครเวฟ, โซฟา)"
                          className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-sky-500 focus:ring-sky-950/40"
                        />
                        <button
                          type="button"
                          onClick={handleAddProductType}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่ม</span>
                        </button>
                      </div>

                      {/* List of custom types */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {productTypes.map((type) => (
                          <div
                            key={type}
                            className="flex items-center justify-between px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800/60"
                          >
                            <span className="text-xs text-slate-300">{type}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveProductType(type)}
                              className="p-1 hover:bg-rose-950/40 rounded-md text-rose-500 hover:text-rose-400 cursor-pointer transition-all"
                              title="ลบตัวเลือกนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {productTypes.length === 0 && (
                          <p className="text-3xs text-slate-500 text-center py-2">ไม่มีรายการประเภทสินค้า</p>
                        )}
                      </div>
                    </div>
                  )}


                  {/* Product Brand */}
                  <div className="space-y-1">
                    <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                      ยี่ห้อสินค้า
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productBrand}
                        onChange={(e) => setProductBrand(e.target.value)}
                        placeholder="เช่น Mitsubishi, Daikin"
                        className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600"
                      />
                      <Tag className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Serial Number */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    หมายเลขซีเรียล (Serial Number / SN)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="เช่น M_SN202607-4589"
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600"
                    />
                    <Settings className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                {/* Customer Name */}
                <div className="space-y-1 relative">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    ชื่อลูกค้าเจ้าของสินค้า <span className="text-rose-500">*</span>
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

                {/* Dates Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Claim Date */}
                  <div className="space-y-1">
                    <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                      วันที่รับเคลม <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={claimDate}
                        onChange={(e) => setClaimDate(e.target.value)}
                        className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.claimDate ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200`}
                      />
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {/* Return Target Date */}
                  <div className="space-y-1">
                    <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                      กำหนดส่งคืนสินค้า
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200"
                      />
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Symptom Details */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    อาการเสียที่แจ้ง / ปัญหาที่ชำรุด <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      value={symptom}
                      onChange={(e) => setSymptom(e.target.value)}
                      placeholder="เช่น บอร์ดจ่ายไฟไหม้, มีเสียงดังตอนทำงาน, ไฟไม่เข้าชาร์จไม่ได้"
                      rows={3}
                      className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.symptom ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                    />
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                  {errors.symptom && <p className="text-rose-400 text-3xs font-semibold mt-1">{errors.symptom}</p>}
                </div>

                {/* Technician Name */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    ช่างผู้ตรวจสอบ/รับผิดชอบ <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      placeholder="ระบุชื่อช่างที่รับเครื่องเคลมตรวจเช็ค"
                      className={`w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border ${errors.technicianName ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                    />
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                  {errors.technicianName && <p className="text-rose-400 text-3xs font-semibold mt-1">{errors.technicianName}</p>}
                </div>

                {/* Status Radio Group */}
                <div className="space-y-1.5">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    สถานะการเคลมสินค้า
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {/* Received */}
                    <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      status === 'received'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                    }`}>
                      <input
                        type="radio"
                        name="claimStatus"
                        value="received"
                        checked={status === 'received'}
                        onChange={() => setStatus('received')}
                        className="sr-only"
                      />
                      <HelpCircle className="w-4 h-4 mb-1" />
                      <span className="text-2xs font-bold">รับเรื่องแล้ว</span>
                    </label>

                    {/* Checking */}
                    <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      status === 'checking'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                    }`}>
                      <input
                        type="radio"
                        name="claimStatus"
                        value="checking"
                        checked={status === 'checking'}
                        onChange={() => setStatus('checking')}
                        className="sr-only"
                      />
                      <Search className="w-4 h-4 mb-1" />
                      <span className="text-2xs font-bold">กำลังตรวจสอบ</span>
                    </label>

                    {/* Repairing */}
                    <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      status === 'repairing'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                    }`}>
                      <input
                        type="radio"
                        name="claimStatus"
                        value="repairing"
                        checked={status === 'repairing'}
                        onChange={() => setStatus('repairing')}
                        className="sr-only"
                      />
                      <Settings className="w-4 h-4 mb-1" />
                      <span className="text-2xs font-bold">กำลังซ่อมแซม</span>
                    </label>

                    {/* Completed */}
                    <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      status === 'completed'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                    }`}>
                      <input
                        type="radio"
                        name="claimStatus"
                        value="completed"
                        checked={status === 'completed'}
                        onChange={() => setStatus('completed')}
                        className="sr-only"
                      />
                      <CheckCircle2 className="w-4 h-4 mb-1" />
                      <span className="text-2xs font-bold">ส่งคืนสำเร็จ</span>
                    </label>

                    {/* Rejected */}
                    <label className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                      status === 'rejected'
                        ? 'border-rose-500 bg-rose-500/10 text-rose-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300 hover:bg-slate-900/50'
                    }`}>
                      <input
                        type="radio"
                        name="claimStatus"
                        value="rejected"
                        checked={status === 'rejected'}
                        onChange={() => setStatus('rejected')}
                        className="sr-only"
                      />
                      <XCircle className="w-4 h-4 mb-1" />
                      <span className="text-2xs font-bold">ปฏิเสธการเคลม</span>
                    </label>
                  </div>
                </div>

                {/* Claim Action Images Section (Max 3) */}
                <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <label className="block text-3xs font-bold uppercase tracking-wider text-indigo-400">
                        📸 แนบรูปถ่ายประกอบการเคลมสินค้า (สูงสุด 3 ภาพ)
                      </label>
                      <p className="text-[10px] text-slate-500">แนบรูปถ่ายพร้อมพิมพ์คำอธิบายประกอบการเคลมในใบงานรายงานเคลม</p>
                    </div>
                    {claimImages.length < 3 && (
                      <label className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 font-bold text-2xs rounded-lg border border-indigo-500/20 cursor-pointer transition-all text-center">
                        <span>เลือกรูปภาพ</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {claimImages.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 pt-1">
                      {claimImages.map((img, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 items-start md:items-center">
                          <div className="w-24 h-16 rounded-md overflow-hidden bg-slate-950 border border-slate-800 shrink-0 relative">
                            <img referrerPolicy="no-referrer" src={img.url} alt={`Claim upload ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 w-full space-y-1">
                            <input
                              type="text"
                              value={img.description}
                              onChange={(e) => handleUpdateImageDescription(idx, e.target.value)}
                              placeholder="กรอกคำอธิบายภาพถ่าย (เช่น อาการชำรุด, ชิ้นส่วนที่แตกร้าว)"
                              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 focus:outline-hidden"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1.5 hover:bg-rose-950/30 rounded-lg text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-800 rounded-lg p-5 text-center text-slate-500 text-xs">
                      ยังไม่มีรูปภาพประกอบแนบ กรุณากดปุ่มเพื่อเลือกรูปภาพ (แนบได้สูงสุด 3 ภาพ)
                    </div>
                  )}
                </div>

                {/* Additional Notes */}
                <div className="space-y-1">
                  <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
                    หมายเหตุเพิ่มเติม (ถ้ามี)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="กรอกรายละเอียดความคืบหน้า ข้อมูลติดต่อส่งศูนย์ หรืออื่นๆ"
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
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-950/40 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingItem ? 'บันทึกการแก้ไข' : 'บันทึกประวัติ'}</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ClaimReportModal
        isOpen={isReportOpen}
        onClose={handleCloseReport}
        claim={selectedReportClaim}
      />

    </div>
  );
}
