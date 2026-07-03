/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceJob, JobStatus, Customer } from '../types';
import { X, Calendar, Clock, MapPin, Phone, User, Tag, HelpCircle, FileText, Camera, Trash2 } from 'lucide-react';
import { getStoredJobTypes, saveJobTypes } from '../utils';

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jobData: Omit<ServiceJob, 'id' | 'jobNo' | 'createdAt'> & { id?: string }) => void;
  editingJob: ServiceJob | null;
  customers?: Customer[];
}

export default function JobFormModal({ isOpen, onClose, onSubmit, editingJob, customers = [] }: JobFormModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [jobType, setJobType] = useState('ติดตั้ง');
  const [customJobType, setCustomJobType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('11:00');
  const [reportDate, setReportDate] = useState('');
  const [details, setDetails] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [status, setStatus] = useState<JobStatus>('pending');
  const [serviceFee, setServiceFee] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [imageBefore, setImageBefore] = useState('');
  const [imageDuring, setImageDuring] = useState('');
  const [imageAfter, setImageAfter] = useState('');
  const [jobImages, setJobImages] = useState<{ url: string; description: string }[]>([]);

  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter matching suggestions
  const suggestedCustomers = useMemo(() => {
    if (!customers || !customerName.trim()) return [];
    return customers.filter(c => 
      c.name.toLowerCase().includes(customerName.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(customerName.toLowerCase()))
    ).slice(0, 5);
  }, [customers, customerName]);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isManagingTypes, setIsManagingTypes] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');

  // Reset or populate fields when modal opens/changes
  useEffect(() => {
    const loadedTypes = getStoredJobTypes();
    setJobTypes(loadedTypes);

    if (editingJob) {
      setCustomerName(editingJob.customerName || '');
      setCustomerCompany(editingJob.customerCompany || '');
      setCustomerPhone(editingJob.customerPhone || '');
      setCustomerAddress(editingJob.customerAddress || '');
      
      if (loadedTypes.includes(editingJob.jobType)) {
        setJobType(editingJob.jobType);
        setCustomJobType('');
      } else {
        setJobType('อื่นๆ');
        setCustomJobType(editingJob.jobType);
      }

      setStartDate(editingJob.startDate || '');
      setStartTime(editingJob.startTime || '09:00');
      setEndDate(editingJob.endDate || '');
      setEndTime(editingJob.endTime || '11:00');
      setReportDate(editingJob.reportDate || editingJob.startDate || '');
      setDetails(editingJob.details || '');
      setTechnicianName(editingJob.technicianName || '');
      setStatus(editingJob.status || 'pending');
      setServiceFee(String(editingJob.serviceFee || 0));
      setNotes(editingJob.notes || '');
      setImageBefore(editingJob.imageBefore || '');
      setImageDuring(editingJob.imageDuring || '');
      setImageAfter(editingJob.imageAfter || '');

      // Load or migrate job images (up to 6)
      let initialImages = editingJob.jobImages || [];
      if (initialImages.length === 0) {
        if (editingJob.imageBefore) {
          initialImages = [...initialImages, { url: editingJob.imageBefore, description: 'ภาพก่อนการแก้ไข (Before)' }];
        }
        if (editingJob.imageDuring) {
          initialImages = [...initialImages, { url: editingJob.imageDuring, description: 'ภาพขณะแก้ไข (During)' }];
        }
        if (editingJob.imageAfter) {
          initialImages = [...initialImages, { url: editingJob.imageAfter, description: 'ภาพหลังแก้ไข (After)' }];
        }
      }
      setJobImages(initialImages);
    } else {
      // Set nice defaults for new job
      const today = new Date().toISOString().split('T')[0];
      setCustomerName('');
      setCustomerCompany('');
      setCustomerPhone('');
      setCustomerAddress('');
      setJobType('ติดตั้ง');
      setCustomJobType('');
      setStartDate(today);
      setStartTime('09:00');
      setEndDate(today);
      setEndTime('11:00');
      setReportDate(today);
      setDetails('');
      setTechnicianName('');
      setStatus('pending');
      setServiceFee('0');
      setNotes('');
      setImageBefore('');
      setImageDuring('');
      setImageAfter('');
      setJobImages([]);
    }
    setErrors({});
    setIsManagingTypes(false);
    setNewTypeInput('');
  }, [editingJob, isOpen]);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'กรุณาระบุชื่อลูกค้า';
    }
    if (jobType === 'อื่นๆ' && !customJobType.trim()) {
      newErrors.customJobType = 'กรุณาระบุประเภทงานที่กำหนดเอง';
    }
    if (!startDate) {
      newErrors.startDate = 'กรุณาระบุวันที่เริ่มต้น';
    }
    if (!startTime) {
      newErrors.startTime = 'กรุณาระบุเวลาเริ่มต้น';
    }
    if (!endDate) {
      newErrors.endDate = 'กรุณาระบุวันที่สิ้นสุด';
    }
    if (!endTime) {
      newErrors.endTime = 'กรุณาระบุเวลาสิ้นสุด';
    }
    if (!details.trim()) {
      newErrors.details = 'กรุณาระบุรายละเอียดงานอย่างย่อ';
    }
    if (!technicianName.trim()) {
      newErrors.technicianName = 'กรุณาระบุชื่อช่าง/ผู้ให้บริการ';
    }

    // Date/time logical check
    if (startDate && endDate) {
      const start = new Date(`${startDate}T${startTime || '00:00'}:00`);
      const end = new Date(`${endDate}T${endTime || '00:00'}:00`);
      if (end.getTime() < start.getTime()) {
        newErrors.endDate = 'วันและเวลาสิ้นสุด ต้องไม่ต่ำกว่าวันและเวลาเริ่มต้น';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalJobType = jobType === 'อื่นๆ' ? customJobType.trim() : jobType;

    // Use jobImages to populate fallbacks for backward compatibility
    const fallbackBefore = jobImages[0]?.url || imageBefore || undefined;
    const fallbackDuring = jobImages[1]?.url || imageDuring || undefined;
    const fallbackAfter = jobImages[2]?.url || imageAfter || undefined;

    onSubmit({
      id: editingJob?.id,
      customerName: customerName.trim(),
      customerCompany: customerCompany.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      jobType: finalJobType,
      startDate,
      startTime,
      endDate,
      endTime,
      reportDate: reportDate || undefined,
      details: details.trim(),
      technicianName: technicianName.trim(),
      status,
      serviceFee: parseFloat(serviceFee) || 0,
      notes: notes.trim() || undefined,
      imageBefore: fallbackBefore,
      imageDuring: fallbackDuring,
      imageAfter: fallbackAfter,
      jobImages: jobImages,
    });

    onClose();
  };

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // limit total images to 6
    const remainingSlots = 6 - jobImages.length;
    const filesToUpload = files.slice(0, remainingSlots);

    filesToUpload.forEach((file: any, index) => {
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
            
            while (dataUrl.length > 600000 && quality > 0.1) {
              quality -= 0.1;
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            
            setJobImages((prev) => {
              if (prev.length >= 6) return prev;
              
              const currentLength = prev.length;
              let defaultDesc = '';
              if (currentLength === 0) {
                defaultDesc = 'ภาพก่อนการแก้ไข (Before)';
              } else if (currentLength === 1) {
                defaultDesc = 'ภาพขณะแก้ไข (During)';
              } else if (currentLength === 2) {
                defaultDesc = 'ภาพหลังแก้ไข (After)';
              } else {
                defaultDesc = `ภาพประกอบที่ ${currentLength + 1}`;
              }
              
              return [...prev, { url: dataUrl, description: defaultDesc }];
            });
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpdateDescription = (index: number, desc: string) => {
    setJobImages((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], description: desc };
      }
      return updated;
    });
  };

  const handleRemoveImage = (index: number) => {
    setJobImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
          
          // Ensure base64 string doesn't exceed approx 500KB (approx 666,666 characters in base64)
          while (dataUrl.length > 600000 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          setter(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Helper to set current system time
  const setToCurrentTime = (target: 'start' | 'end') => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    const dateStr = now.toISOString().split('T')[0];

    if (target === 'start') {
      setStartDate(dateStr);
      setStartTime(timeStr);
    } else {
      setEndDate(dateStr);
      setEndTime(timeStr);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 flex flex-col max-h-[90vh] z-10 overflow-hidden text-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingJob ? '✍️ แก้ไขรายละเอียดงาน Onsite' : '➕ บันทึกงาน Onsite Service ใหม่'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">กรอกรายละเอียดเพื่อจัดเก็บข้อมูล และสร้างใบสรุปงาน</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-850 rounded-full text-slate-500 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 bg-slate-900/20">
              
              {/* Section 1: Customer Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <User className="w-4 h-4" /> ข้อมูลลูกค้า
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Customer Name */}
                  <div className="space-y-1 relative">
                    <label className="block text-xs font-semibold text-slate-400">ชื่อลูกค้าผู้ติดต่อ <span className="text-rose-500">*</span></label>
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
                        placeholder="ระบุชื่อผู้ติดต่อ"
                        className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border ${errors.customerName ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                      />
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                    {errors.customerName && <p className="text-rose-400 text-2xs font-semibold mt-1">{errors.customerName}</p>}

                    {/* Suggestions list */}
                    {showSuggestions && suggestedCustomers.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-50 divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                        <div className="px-3 py-1.5 bg-slate-900/60 text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                          ค้นพบจากฐานข้อมูลลูกค้า
                        </div>
                        {suggestedCustomers.map((cust) => (
                          <button
                            type="button"
                            key={cust.id}
                            onMouseDown={() => {
                              setCustomerName(cust.name);
                              setCustomerCompany(cust.company || '');
                              setCustomerPhone(cust.phone || '');
                              setCustomerAddress(cust.address || '');
                              setShowSuggestions(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-850/70 transition-all flex flex-col space-y-0.5 cursor-pointer text-xs"
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

                  {/* Customer Company */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400">ชื่อบริษัทลูกค้า (ถ้ามี)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerCompany}
                        onChange={(e) => setCustomerCompany(e.target.value)}
                        placeholder="ระบุชื่อบริษัทลูกค้า"
                        className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600"
                      />
                      <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>

                  {/* Customer Phone */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400">เบอร์โทรศัพท์ติดต่อ</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="เช่น 081-234-5678"
                        className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600"
                      />
                      <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>

                {/* Customer Address */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400">ที่อยู่นัดหมายสำหรับบริการ Onsite</label>
                  <div className="relative">
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="ระบุบ้านเลขที่ ซอย ถนน แขวง เขต จังหวัด..."
                      rows={2}
                      className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600 resize-none"
                    />
                    <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>

              <hr className="border-slate-800" />

              {/* Section 2: Job Details */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Tag className="w-4 h-4" /> รายละเอียดงานและเวลา
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Job Type Dropdown */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-400">ประเภทงาน <span className="text-rose-500">*</span></label>
                      <button
                        type="button"
                        onClick={() => setIsManagingTypes(!isManagingTypes)}
                        className="text-[10px] text-sky-400 hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        ⚙️ จัดการประเภทงาน
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        value={jobType}
                        onChange={(e) => setJobType(e.target.value)}
                        className="w-full text-sm pl-10 pr-8 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all appearance-none bg-slate-950 text-slate-200 cursor-pointer"
                      >
                        {jobTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <Tag className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400">สถานะการดำเนินงาน</label>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
                      {(['pending', 'in_progress', 'completed', 'cancelled'] as JobStatus[]).map((st) => {
                        const labelMap = {
                          pending: 'รอดำเนินการ',
                          in_progress: 'กำลังทำ',
                          completed: 'เสร็จสิ้น',
                          cancelled: 'ยกเลิก'
                        };
                        const activeColors = {
                          pending: 'bg-amber-600 text-white shadow-xs',
                          in_progress: 'bg-sky-600 text-white shadow-xs',
                          completed: 'bg-emerald-600 text-white shadow-xs',
                          cancelled: 'bg-slate-700 text-white shadow-xs'
                        };
                        const isActive = status === st;
                        return (
                          <button
                            type="button"
                            key={st}
                            onClick={() => setStatus(st)}
                            className={`py-1.5 text-3xs font-semibold rounded-lg transition-all cursor-pointer ${
                              isActive ? activeColors[st] : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {labelMap[st]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manage Types Inline UI */}
                  {isManagingTypes && (
                    <div className="md:col-span-2 p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <h5 className="text-xs font-bold text-sky-400">⚙️ จัดการรายการประเภทงาน</h5>
                        <button
                          type="button"
                          onClick={() => setIsManagingTypes(false)}
                          className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                        >
                          ปิดการจัดการ
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {jobTypes.map((type) => (
                          <div key={type} className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                            <span>{type}</span>
                            {type !== 'อื่นๆ' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = jobTypes.filter(t => t !== type);
                                  setJobTypes(updated);
                                  saveJobTypes(updated);
                                  if (jobType === type) setJobType('ติดตั้ง');
                                }}
                                className="text-rose-500 hover:text-rose-300 font-bold transition-all text-[10px] cursor-pointer ml-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="เพิ่มประเภทงานใหม่..."
                          value={newTypeInput}
                          onChange={(e) => setNewTypeInput(e.target.value)}
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 placeholder-slate-600 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = newTypeInput.trim();
                            if (val && !jobTypes.includes(val)) {
                              let updated: string[];
                              if (jobTypes.includes('อื่นๆ')) {
                                updated = [...jobTypes.filter(t => t !== 'อื่นๆ'), val, 'อื่นๆ'];
                              } else {
                                updated = [...jobTypes, val];
                              }
                              setJobTypes(updated);
                              saveJobTypes(updated);
                              setNewTypeInput('');
                            }
                          }}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                        >
                          เพิ่ม
                        </button>
                      </div>
                    </div>
                  )}

                  {/* วันรับแจ้งงาน */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-400">วันรับแจ้งงาน</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200"
                      />
                      <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Custom Job Type Input (if "อื่นๆ") */}
                {jobType === 'อื่นๆ' && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400">ระบุประเภทงานเพิ่มเติม <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={customJobType}
                      onChange={(e) => setCustomJobType(e.target.value)}
                      placeholder="เช่น ออกแบบระบบ, ล้างทำความสะอาดพิเศษ"
                      className={`w-full text-sm px-4 py-2.5 rounded-xl border ${errors.customJobType ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                    />
                    {errors.customJobType && <p className="text-rose-400 text-2xs font-semibold mt-1">{errors.customJobType}</p>}
                  </div>
                )}

                {/* Time range parameters */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-4">
                  
                  {/* Start Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sky-400" /> วันที่เริ่มต้น <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-3 focus:ring-sky-950/40 focus:outline-hidden transition-all bg-slate-950 text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-sky-400" /> เวลาเริ่มต้น <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setToCurrentTime('start')}
                          className="text-3xs text-sky-450 hover:underline hover:text-sky-300 cursor-pointer font-medium"
                        >
                          ใส่เวลาปัจจุบัน
                        </button>
                      </div>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-3 focus:ring-sky-950/40 focus:outline-hidden transition-all bg-slate-950 text-slate-200"
                      />
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" /> วันที่สิ้นสุด <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={`w-full text-sm px-3 py-2 rounded-xl border ${errors.endDate ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-300 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" /> เวลาสิ้นสุด <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setToCurrentTime('end')}
                          className="text-3xs text-sky-450 hover:underline hover:text-sky-300 cursor-pointer font-medium"
                        >
                          ใส่เวลาปัจจุบัน
                        </button>
                      </div>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-3 focus:ring-sky-950/40 focus:outline-hidden transition-all bg-slate-950 text-slate-200"
                      />
                    </div>
                  </div>
                  
                  {errors.endDate && <p className="text-rose-400 text-2xs font-semibold mt-1">{errors.endDate}</p>}
                </div>

                {/* Job description detail */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400">รายละเอียดสิ่งที่ต้องปฏิบัติงาน <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="ระบุสิ่งที่ต้องการให้ปฏิบัติงาน เช่น ล้างแอร์ อัปเกรดระบบ ดึงสายเชื่อมต่อ หรือปัญหาของลูกค้า..."
                      rows={3}
                      className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border ${errors.details ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600 resize-none`}
                    />
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                  {errors.details && <p className="text-rose-400 text-2xs font-semibold mt-1">{errors.details}</p>}
                </div>

                 {/* Technician row */}
                 <div className="space-y-1">
                   <label className="block text-xs font-semibold text-slate-400">ชื่อช่างผู้รับผิดชอบ <span className="text-rose-500">*</span></label>
                   <div className="relative">
                     <input
                       type="text"
                       value={technicianName}
                       onChange={(e) => setTechnicianName(e.target.value)}
                       placeholder="ระบุชื่อจริง นามสกุล"
                       className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border ${errors.technicianName ? 'border-rose-500 focus:ring-rose-950/50' : 'border-slate-800 focus:border-sky-500 focus:ring-sky-950/40'} focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600`}
                     />
                     <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                   </div>
                   {errors.technicianName && <p className="text-rose-400 text-2xs font-semibold mt-1">{errors.technicianName}</p>}
                 </div>

                {/* Additional Notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                  <div className="relative">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="ระบุข้อมูลเพิ่มเติม เช่น โปรโมชันแถม อุปกรณ์เพิ่มเติม เงื่อนไขพิเศษ..."
                      rows={2}
                      className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-3 transition-all bg-slate-950 text-slate-200 placeholder-slate-600 resize-none"
                    />
                    <HelpCircle className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  </div>
                </div>

                <hr className="border-slate-800 my-4" />

                {/* Section 3: Action Images */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Camera className="w-4 h-4" /> รูปภาพประกอบการปฏิบัติงาน (อัปโหลดสูงสุด 6 ภาพ)
                    </h4>
                    <span className="text-2xs font-semibold text-slate-500">
                      {jobImages.length} / 6 ภาพ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Render existing images */}
                    {jobImages.map((image, index) => (
                      <div key={index} className="space-y-2 bg-slate-950/40 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between min-h-[190px] transition-all hover:border-slate-700/60">
                        <div className="relative group w-full h-28 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                          <img src={image.url} alt={`Job image ${index + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all cursor-pointer"
                              title="ลบรูปภาพ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 text-4xs font-bold uppercase rounded-md bg-black/75 text-sky-400">
                            ภาพที่ {index + 1}
                          </span>
                        </div>
                        <div className="space-y-1 mt-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">คำอธิบายภาพ</label>
                          <input
                            type="text"
                            value={image.description}
                            onChange={(e) => handleUpdateDescription(index, e.target.value)}
                            placeholder="เช่น ล้างแอร์คอยล์ร้อน, เปลี่ยนคาปาซิเตอร์"
                            className="w-full text-3xs px-2.5 py-1.5 rounded-lg border border-slate-850 focus:border-sky-500 focus:ring-sky-950/40 focus:outline-hidden focus:ring-2 bg-slate-950 text-slate-200 placeholder-slate-600 transition-all"
                          />
                        </div>
                      </div>
                    ))}

                    {/* Add new image slot */}
                    {jobImages.length < 6 && (
                      <div className="relative group border border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl p-3 bg-slate-950/20 hover:bg-slate-950/40 flex flex-col items-center justify-center min-h-[190px] transition-all text-center">
                        <label className="flex flex-col items-center justify-center cursor-pointer text-center w-full h-full py-6">
                          <Camera className="w-9 h-9 text-slate-500 mb-2 group-hover:text-sky-450 transition-colors" />
                          <span className="text-3xs text-slate-400 font-bold block">คลิกเพื่ออัปโหลดรูปภาพ</span>
                          <span className="text-4xs text-slate-600 mt-1 block px-2 leading-normal">
                            สามารถเลือกอัปโหลดพร้อมกันได้หลายภาพ (จำกัดไม่เกิน 6 ภาพ)
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleAddImages}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800 bg-slate-950/50">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700/80 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 active:bg-sky-700 shadow-md shadow-sky-950/40 rounded-xl transition-all cursor-pointer"
              >
                {editingJob ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
