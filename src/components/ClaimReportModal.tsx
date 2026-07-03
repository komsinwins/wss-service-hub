/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClaimProduct } from '../types';
import { 
  formatThaiDate, 
  getFullThaiMonthYear,
  prepareStylesForPdfExport
} from '../utils';
import { 
  X, 
  Printer, 
  Download, 
  User, 
  Phone, 
  Package, 
  Layers, 
  Tag, 
  Settings, 
  FileCheck2, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ClaimReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimProduct | null;
}

export default function ClaimReportModal({ isOpen, onClose, claim }: ClaimReportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!claim) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    setIsExporting(true);

    const restoreStyles = prepareStylesForPdfExport();

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2,
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

      const imgWidth = 210;
      const pageHeight = 295;
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

      pdf.save(`ClaimReport-${claim.claimNo}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      restoreStyles();
      setIsExporting(false);
    }
  };

  const statusLabel = {
    received: { text: 'รับเรื่องแล้ว', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    checking: { text: 'กำลังตรวจสอบ', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    repairing: { text: 'กำลังซ่อมแซม', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    completed: { text: 'ส่งคืนเรียบร้อย', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    rejected: { text: 'ปฏิเสธการเคลม', color: 'bg-rose-100 text-rose-800 border-rose-200' }
  };

  const activeStatus = statusLabel[claim.status] || statusLabel.received;

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
                <FileCheck2 className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-base md:text-lg">รายงานการเคลมสินค้า (Claim Report)</h3>
                  <p className="text-2xs text-slate-400">เลขที่ใบเคลม: {claim.claimNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Print button */}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-750 hover:bg-slate-700 hover:text-white rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>พิมพ์เอกสาร</span>
                </button>

                {/* PDF download button */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl transition-all cursor-pointer shadow-xs"
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
              
              {/* Document Container */}
              <div 
                id="printable-claim-report"
                ref={printAreaRef}
                className="bg-white p-6 md:p-10 rounded-2xl border border-gray-200 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] text-gray-800 font-sans leading-relaxed flex flex-col justify-between"
                style={{ contentVisibility: 'auto' }}
              >
                <div>
                  {/* Document Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-indigo-600 pb-6 mb-6 text-slate-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="p-2 bg-indigo-600 text-white rounded-xl font-bold text-lg tracking-wider">CR</span>
                        <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">ONSITE SERVICE CO., LTD</h1>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">บริษัท ออนไซต์ เซอร์วิส พาร์ตเนอร์ จำกัด</p>
                      <p className="text-3xs text-gray-400 mt-1">ที่อยู่สำนักงานใหญ่: 999 ถนนวิภาวดีรังสิต แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900</p>
                      <p className="text-3xs text-gray-400">เบอร์โทรติดต่อ: 02-999-9999 | อีเมล: support@onsiteservice.co.th</p>
                    </div>

                    <div className="mt-4 md:mt-0 text-left md:text-right space-y-1">
                      <h2 className="text-base md:text-lg font-bold text-indigo-600 uppercase tracking-wider">รายงานผลการเคลมสินค้า</h2>
                      <p className="text-xs font-semibold text-gray-700">เลขที่ใบเคลม / Claim No: <span className="font-mono text-gray-900 font-bold">{claim.claimNo}</span></p>
                      <p className="text-xs text-gray-500">วันที่สร้างรายงาน: {formatThaiDate(claim.createdAt.split('T')[0])}</p>
                      <div className="pt-1.5">
                        <span className={`px-2.5 py-1 text-3xs font-semibold rounded-full border ${activeStatus.color}`}>
                          {activeStatus.text}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer and Product Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Customer Info */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5">
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                        <User className="w-3.5 h-3.5" /> ข้อมูลลูกค้าผู้นำส่งเคลม
                      </h3>
                      <div className="space-y-1.5 text-xs text-slate-800">
                        <p className="font-semibold text-gray-900">ชื่อผู้ติดต่อ: {claim.customerName}</p>
                        {claim.customerPhone && (
                          <p className="text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" /> {claim.customerPhone}
                          </p>
                        )}
                        <p className="text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" /> <span>วันที่ลงทะเบียนเคลม: {formatThaiDate(claim.claimDate)}</span>
                        </p>
                        {claim.returnDate && (
                          <p className="text-emerald-700 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-500" /> <span>กำหนดคืนสินค้า: {formatThaiDate(claim.returnDate)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2.5">
                      <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
                        <Package className="w-3.5 h-3.5" /> รายละเอียดข้อมูลสินค้าเคลม
                      </h3>
                      <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-800">
                        <div className="col-span-2">
                          <span className="text-gray-400 block text-3xs">ชื่อสินค้า/โมเดล:</span>
                          <span className="font-bold text-gray-800">{claim.productName}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-3xs">แบรนด์/ยี่ห้อ:</span>
                          <span className="font-semibold text-gray-800">{claim.productBrand || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-3xs">ประเภทสินค้า:</span>
                          <span className="font-semibold text-gray-800">{claim.productType || '-'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-400 block text-3xs">หมายเลขซีเรียล (S/N):</span>
                          <span className="font-mono font-bold text-indigo-700">{claim.serialNumber || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosed Symptom Scope */}
                  <div className="space-y-3 mb-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📝 รายละเอียดผลทดสอบและชี้แจงอาการชำรุด</span>
                    </h3>
                    <div className="p-5 border border-gray-200 rounded-xl bg-white text-xs text-gray-700 whitespace-pre-line leading-relaxed min-h-[90px]">
                      <span className="font-bold text-indigo-700 block mb-1">อาการเสียชำรุดที่ตรวจพบ:</span>
                      {claim.symptom}
                    </div>
                  </div>

                  {/* Notes & Actions Taken */}
                  {claim.notes && (
                    <div className="space-y-3 mb-6">
                      <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/20 text-xs text-gray-700 leading-relaxed">
                        <span className="font-bold text-indigo-800 block mb-1">คำชี้แจงและหมายเหตุจากช่าง:</span>
                        {claim.notes}
                      </div>
                    </div>
                  )}

                  {/* Claim Attachment Images (Dynamic list of 3 images with descriptive details) */}
                  {claim.claimImages && claim.claimImages.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span>📸 ภาพถ่ายวัตถุพยานประกอบการรับเคลมสินค้า (สูงสุด 3 ภาพ)</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {claim.claimImages.map((img, idx) => (
                          <div key={idx} className="space-y-2 bg-gray-50 border border-gray-150 rounded-xl p-2.5 flex flex-col justify-between">
                            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white aspect-video flex items-center justify-center">
                              <img referrerPolicy="no-referrer" src={img.url} alt={img.description || `ภาพพยานชิ้นที่ ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-gray-100 min-h-[50px] flex items-center">
                              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                                <span className="font-bold text-indigo-600 mr-1">[{idx + 1}]</span>
                                {img.description || 'ไม่มีคำอธิบาย'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Document Footer (Signatures) */}
                <div className="border-t border-gray-200 pt-8 mt-6">
                  <div className="grid grid-cols-2 gap-12 text-center text-xs">
                    <div className="space-y-12">
                      <p className="text-gray-500 font-medium">เจ้าหน้าที่ผู้ทดสอบ/ช่างผู้รับผิดชอบ</p>
                      <div className="border-b border-gray-300 w-44 mx-auto" />
                      <div className="text-slate-700">
                        <p className="font-bold">{claim.technicianName}</p>
                        <p className="text-[10px] text-gray-400">วันที่: ...../...../..........</p>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <p className="text-gray-500 font-medium">ลูกค้าผู้นำส่งเครื่อง / ผู้ยอมรับเงื่อนไขเคลม</p>
                      <div className="border-b border-gray-300 w-44 mx-auto" />
                      <div className="text-slate-700">
                        <p className="font-bold">{claim.customerName}</p>
                        <p className="text-[10px] text-gray-400">วันที่: ...../...../..........</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center text-[10px] text-gray-400 mt-10 border-t border-gray-100 pt-4">
                    เอกสารนี้สร้างขึ้นโดยระบบบันทึกงาน Onsite & Product Claims Service
                  </div>
                </div>

              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
