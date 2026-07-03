/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ServiceJob } from '../types';
import { 
  calculateDuration, 
  formatCurrency, 
  formatThaiDate, 
  formatThaiDateTime, 
  getFullThaiMonthYear,
  prepareStylesForPdfExport
} from '../utils';
import { 
  X, 
  Printer, 
  Download, 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  Wrench, 
  FileCheck2, 
  BadgeCent, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface JobSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ServiceJob | null;
}

export default function JobSheetModal({ isOpen, onClose, job }: JobSheetModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!job) return null;

  const { hours, minutes } = calculateDuration(job.startDate, job.startTime, job.endDate, job.endTime);

  const handlePrint = () => {
    // We can use native window.print() but first set a small global print trigger
    // Since print layout is defined in CSS via @media print, triggering window.print() is very clean.
    // We can copy the inner HTML to a temporary element, or let index.css handle it beautifully.
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);

    const restoreStyles = prepareStylesForPdfExport();

    try {
      // Small timeout to allow state to settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2, // Higher density for crisp text
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height limit in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`JobSheet-${job.jobNo}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      restoreStyles();
      setIsExporting(false);
    }
  };

  const statusLabel = {
    pending: { text: 'รอดำเนินการ', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    in_progress: { text: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    completed: { text: 'เสร็จสิ้นสมบูรณ์', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    cancelled: { text: 'ยกเลิก', color: 'bg-gray-100 text-gray-800 border-gray-200' }
  };

  const activeStatus = statusLabel[job.status] || statusLabel.pending;

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
            className="fixed inset-0 bg-black/70 backdrop-blur-md noprint"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-800 flex flex-col max-h-[90vh] z-10 overflow-hidden noprint"
          >
            {/* Action Bar (Top) */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-6 h-6 text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-base md:text-lg">ใบงานปฏิบัติการ (Job Sheet)</h3>
                  <p className="text-2xs text-slate-400">เลขที่ใบงาน: {job.jobNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Print button */}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-750 hover:bg-slate-700 hover:text-white rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>พิมพ์ใบงาน</span>
                </button>

                {/* PDF download button */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                  <span>{isExporting ? 'กำลังบันทึก...' : 'ดาวน์โหลด PDF'}</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 md:p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-slate-200 border border-transparent transition-all cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Wrapper */}
            <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-slate-950/40">
              
              {/* Document Container (Designed to look like real A4 sheet) */}
              <div 
                id="printable-job-sheet"
                ref={printAreaRef}
                className="bg-white p-6 md:p-10 rounded-2xl border border-gray-200 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] text-gray-800 font-sans leading-relaxed flex flex-col justify-between"
                style={{ contentVisibility: 'auto' }}
              >
                <div>
                  {/* Document Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-blue-600 pb-6 mb-6 text-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="p-2 bg-blue-600 text-white rounded-xl font-bold text-lg tracking-wider">OS</span>
                        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">ONSITE SERVICE CO., LTD</h1>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">บริษัท ออนไซต์ เซอร์วิส พาร์ตเนอร์ จำกัด</p>
                      <p className="text-3xs text-gray-400 mt-1">ที่อยู่สำนักงานใหญ่: 999 ถนนวิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900</p>
                      <p className="text-3xs text-gray-400">เบอร์โทรติดต่อ: 02-999-9999 | อีเมล: support@onsiteservice.co.th</p>
                    </div>

                    <div className="mt-4 md:mt-0 text-left md:text-right space-y-1">
                      <h2 className="text-base md:text-lg font-bold text-blue-600 uppercase tracking-wider">ใบงานบริการนอกสถานที่</h2>
                      <p className="text-xs font-semibold text-gray-700">เลขที่เอกสาร / Job No: <span className="font-mono text-gray-900 font-bold">{job.jobNo}</span></p>
                      <p className="text-xs text-gray-500">วันที่สร้างใบงาน: {formatThaiDate(job.createdAt.split('T')[0])}</p>
                      <div className="pt-1.5">
                        <span className={`px-2.5 py-1 text-3xs font-semibold rounded-full border ${activeStatus.color}`}>
                          {activeStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer and Job Grid info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Customer Info */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5">
                      <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                        <User className="w-3.5 h-3.5" /> ข้อมูลลูกค้านัดหมาย
                      </h3>
                      <div className="space-y-1.5 text-xs text-slate-800">
                        <p className="font-semibold text-gray-900">{job.customerName}</p>
                        {job.customerCompany && (
                          <p className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                            บริษัท: {job.customerCompany}
                          </p>
                        )}
                        {job.customerPhone && (
                          <p className="text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" /> {job.customerPhone}
                          </p>
                        )}
                        {job.customerAddress ? (
                          <p className="text-gray-500 flex items-start gap-1 leading-normal">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" /> 
                            <span>{job.customerAddress}</span>
                          </p>
                        ) : (
                          <p className="text-gray-400 italic">ไม่ได้ระบุที่อยู่บริการ</p>
                        )}
                      </div>
                    </div>

                    {/* Service Meta Info */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5">
                      <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                        <Wrench className="w-3.5 h-3.5" /> รายละเอียดปฏิบัติการ
                      </h3>
                      <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-800">
                        <div>
                          <span className="text-gray-400 block text-3xs">ประเภทงาน:</span>
                          <span className="font-semibold text-gray-800">{job.jobType}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-3xs">ช่างผู้ควบคุมงาน:</span>
                          <span className="font-semibold text-gray-800">{job.technicianName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-3xs">วันรับแจ้งงาน:</span>
                          <span className="font-semibold text-gray-800">{job.reportDate ? formatThaiDate(job.reportDate) : formatThaiDate(job.startDate)}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-3xs">วันที่เข้าให้บริการ:</span>
                          <span className="font-medium text-gray-800">{formatThaiDate(job.startDate)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400 block text-3xs">เวลานัดหมายรวม:</span>
                          <span className="font-semibold text-gray-800">{job.startTime} - {job.endTime} น.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Task details scope */}
                  <div className="space-y-3 mb-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📝 รายละเอียดภารกิจและสิ่งที่ได้ปฏิบัติ</span>
                    </h3>
                    <div className="p-5 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 whitespace-pre-line leading-relaxed min-h-[120px]">
                      {job.details}
                    </div>
                  </div>

                  {/* Work Timeline Details */}
                  <div className="mb-6">
                    {/* Working Hours summary */}
                    <div className="border border-gray-200 p-4 rounded-xl flex items-center justify-between bg-white text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700">ชั่วโมงทำงานรวมสะสม</h4>
                          <p className="text-3xs text-gray-400">คำนวณจากเวลาเริ่ม - สิ้นสุด</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">{hours > 0 ? `${hours} ชม.` : ''} {minutes > 0 ? `${minutes} นาที` : ''} {hours === 0 && minutes === 0 ? '0 นาที' : ''}</span>
                        <p className="text-3xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm inline-block mt-0.5 font-semibold">({(hours + minutes / 60).toFixed(2)} ชั่วโมงทศนิยม)</p>
                      </div>
                    </div>
                  </div>

                  {/* Service Action Images (Dynamic list up to 6, with description) */}
                  {((job.jobImages && job.jobImages.length > 0) || job.imageBefore || job.imageDuring || job.imageAfter) && (
                    <div className="space-y-3 mb-6">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span>📸 ภาพถ่ายประกอบการปฏิบัติงาน</span>
                      </h3>
                      
                      {job.jobImages && job.jobImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {job.jobImages.map((img, idx) => (
                            <div key={idx} className="space-y-1 text-center bg-gray-50 border border-gray-100 rounded-xl p-2 flex flex-col justify-between">
                              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white aspect-video flex items-center justify-center">
                                <img src={img.url} alt={img.description || `ภาพที่ ${idx + 1}`} className="w-full h-full object-cover" />
                              </div>
                              <span className="block text-[10px] font-semibold text-gray-600 mt-1 leading-normal">
                                {img.description || `ภาพประกอบที่ ${idx + 1}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-4">
                          {/* Before */}
                          <div className="text-center space-y-1">
                            <span className="block text-3xs font-semibold text-gray-500">ก่อนการแก้ไข (Before)</span>
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 aspect-video flex items-center justify-center">
                              {job.imageBefore ? (
                                <img src={job.imageBefore} alt="Before" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-4xs text-gray-400 italic">ไม่มีข้อมูลภาพ</span>
                              )}
                            </div>
                          </div>

                          {/* During */}
                          <div className="text-center space-y-1">
                            <span className="block text-3xs font-semibold text-gray-500">ขณะแก้ไข (During)</span>
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 aspect-video flex items-center justify-center">
                              {job.imageDuring ? (
                                <img src={job.imageDuring} alt="During" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-4xs text-gray-400 italic">ไม่มีข้อมูลภาพ</span>
                              )}
                            </div>
                          </div>

                          {/* After */}
                          <div className="text-center space-y-1">
                            <span className="block text-3xs font-semibold text-gray-500">หลังแก้ไข (After)</span>
                            <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 aspect-video flex items-center justify-center">
                              {job.imageAfter ? (
                                <img src={job.imageAfter} alt="After" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-4xs text-gray-400 italic">ไม่มีข้อมูลภาพ</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional Notes */}
                  {job.notes && (
                    <div className="mb-8 p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-2 text-slate-850">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <span className="font-semibold block">หมายเหตุเพิ่มเติม:</span>
                        <p className="mt-0.5 leading-relaxed">{job.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Signatures & Approvals (Designed beautifully for physical print signature) */}
                <div className="pt-10 border-t border-dashed border-gray-300">
                  <div className="grid grid-cols-2 gap-8 text-center text-xs">
                    
                    {/* Customer Signature block */}
                    <div className="space-y-4">
                      <p className="text-gray-500 font-medium">ลงชื่อเพื่อพึงพอใจการปฏิบัติงานและตรวจรับมอบงาน</p>
                      <div className="border-b border-gray-400 w-48 mx-auto h-8"></div>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800">( ลงชื่อลูกค้าผู้ตรวจรับ )</p>
                        <p className="text-3xs text-gray-400">วันที่: ........ / ........ / ........</p>
                      </div>
                    </div>

                    {/* Technician Signature block */}
                    <div className="space-y-4">
                      <p className="text-gray-500 font-medium">ลงชื่อรับรองความถูกต้องของการบันทึกปฏิบัติงาน</p>
                      <div className="border-b border-gray-400 w-48 mx-auto h-8"></div>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800">{job.technicianName}</p>
                        <p className="text-3xs text-gray-400">วันที่: ........ / ........ / ........ (ช่างผู้ให้บริการ)</p>
                      </div>
                    </div>

                  </div>
                  
                  {/* Footer metadata for printing reference */}
                  <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-3xs text-gray-400">
                    <p>เอกสารพิมพ์อัตโนมัติจากระบบ Onsite Service Tracker</p>
                    <p>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
