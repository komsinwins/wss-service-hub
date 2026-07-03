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
  prepareStylesForPdfExport
} from '../utils';
import { 
  X, 
  Printer, 
  Download, 
  ClipboardList, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Coins 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PrintReportViewProps {
  isOpen: boolean;
  onClose: () => void;
  selectedJobs: ServiceJob[];
}

export default function PrintReportView({ isOpen, onClose, selectedJobs }: PrintReportViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (selectedJobs.length === 0) return null;

  const totalRevenue = selectedJobs.reduce((sum, job) => sum + (job.serviceFee || 0), 0);
  
  const totalHours = selectedJobs.reduce((sum, job) => {
    const { decimal } = calculateDuration(job.startDate, job.startTime, job.endDate, job.endTime);
    return sum + decimal;
  }, 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    const restoreStyles = prepareStylesForPdfExport();

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(reportRef.current, {
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

      pdf.save(`Onsite-Service-Summary-Report.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      restoreStyles();
      setIsExporting(false);
    }
  };

  const statusTextMap = {
    pending: 'รอดำเนินการ',
    in_progress: 'กำลังดำเนินการ',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
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
            className="fixed inset-0 bg-black/60 backdrop-blur-xs noprint"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] z-10 overflow-hidden noprint"
          >
            {/* Header / Actions toolbar */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-gray-800 text-base md:text-lg">รายงานสรุปงานและสรุปเวลาปฏิบัติงาน</h3>
                  <p className="text-2xs text-gray-400">สรุปงาน Onsite ทั้งหมด {selectedJobs.length} รายการ</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Print */}
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-gray-500" />
                  <span>พิมพ์รายงานสรุป</span>
                </button>

                {/* PDF */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                  <span>{isExporting ? 'กำลังบันทึก...' : 'ดาวน์โหลด PDF รายงาน'}</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 border border-transparent transition-all cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable report area */}
            <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-gray-100/30">
              
              {/* Report paper */}
              <div
                id="printable-summary-report"
                ref={reportRef}
                className="bg-white p-6 md:p-10 rounded-2xl border border-gray-200 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] text-gray-800 font-sans leading-relaxed flex flex-col justify-between"
                style={{ contentVisibility: 'auto' }}
              >
                <div>
                  {/* Report Header */}
                  <div className="text-center pb-6 mb-6 border-b-2 border-indigo-600">
                    <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">รายงานสรุปผลการปฏิบัติงาน Onsite</h1>
                    <p className="text-xs text-gray-500 mt-1">สรุปรายละเอียดปริมาณงานและจำนวนชั่วโมงการทำงานสำหรับผู้ให้บริการ</p>
                    <p className="text-3xs text-gray-400">ข้อมูล ณ วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>

                  {/* Summary Metric Stats boxes */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center space-y-1">
                      <ClipboardList className="w-5 h-5 text-indigo-500 mx-auto" />
                      <span className="text-3xs text-gray-400 uppercase tracking-wider block">ปริมาณงานทั้งหมด</span>
                      <span className="text-lg font-bold text-gray-800">{selectedJobs.length} งาน</span>
                    </div>

                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center space-y-1">
                      <Clock className="w-5 h-5 text-blue-500 mx-auto" />
                      <span className="text-3xs text-gray-400 uppercase tracking-wider block">ชั่วโมงการทำงานสะสม</span>
                      <span className="text-lg font-bold text-gray-800">{totalHours.toFixed(1)} ชม.</span>
                    </div>
                  </div>

                  {/* Report Main Table */}
                  <div className="space-y-3 mb-8">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">📋 รายการบันทึกบริการนอกสถานที่</h3>
                    
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-3xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-3 py-3 w-28">เลขที่ใบงาน</th>
                            <th className="px-3 py-3">ชื่อลูกค้า</th>
                            <th className="px-3 py-3 w-28">ประเภทงาน</th>
                            <th className="px-3 py-3 w-32">วันที่ปฏิบัติงาน</th>
                            <th className="px-3 py-3 w-20 text-center">ชั่วโมงทำงาน</th>
                            <th className="px-3 py-3 w-24">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {selectedJobs.map((job) => {
                            const { decimal } = calculateDuration(job.startDate, job.startTime, job.endDate, job.endTime);
                            
                            return (
                              <tr key={job.id} className="hover:bg-gray-50/50">
                                <td className="px-3 py-3 font-mono font-semibold text-gray-400">{job.jobNo}</td>
                                <td className="px-3 py-3">
                                  <span className="font-bold block text-gray-800">{job.customerName}</span>
                                  <span className="text-3xs text-gray-400 block truncate max-w-[200px]">{job.details}</span>
                                </td>
                                <td className="px-3 py-3 font-semibold text-gray-700">{job.jobType}</td>
                                <td className="px-3 py-3">{formatThaiDate(job.startDate)}</td>
                                <td className="px-3 py-3 text-center font-bold">{decimal.toFixed(1)}</td>
                                <td className="px-3 py-3">
                                  <span className={`px-1.5 py-0.5 text-4xs rounded-sm font-semibold uppercase ${
                                    job.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                    job.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                                    job.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'
                                  }`}>
                                    {statusTextMap[job.status] || job.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50/80 font-bold border-t border-gray-200">
                            <td colSpan={4} className="px-3 py-3 text-right text-gray-500 uppercase tracking-wider text-2xs">รวมเวลาสะสมทั้งหมด:</td>
                            <td className="px-3 py-3 text-center text-indigo-600 text-xs">{totalHours.toFixed(1)} ชม.</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Signature Board */}
                <div className="pt-10 border-t border-dashed border-gray-300 mt-auto">
                  <div className="grid grid-cols-2 gap-8 text-center text-xs">
                    
                    {/* Reporter */}
                    <div className="space-y-4">
                      <p className="text-gray-500">ลงชื่อผู้รายงานและจัดทำรายงานสรุป</p>
                      <div className="border-b border-gray-400 w-48 mx-auto h-8"></div>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800">( ...................................................... )</p>
                        <p className="text-3xs text-gray-400">ตำแหน่ง ช่างเทคนิคผู้ประสานงาน / ผู้รายงาน</p>
                        <p className="text-3xs text-gray-400">วันที่: ........ / ........ / ........</p>
                      </div>
                    </div>

                    {/* Approver */}
                    <div className="space-y-4">
                      <p className="text-gray-500">ลงชื่อผู้อนุมัติรายงานและรับรองข้อมูล</p>
                      <div className="border-b border-gray-400 w-48 mx-auto h-8"></div>
                      <div className="space-y-1">
                        <p className="font-semibold text-gray-800">( ...................................................... )</p>
                        <p className="text-3xs text-gray-400">ตำแหน่ง หัวหน้าฝ่ายปฏิบัติการ / ผู้จัดการอนุมัติ</p>
                        <p className="text-3xs text-gray-400">วันที่: ........ / ........ / ........</p>
                      </div>
                    </div>

                  </div>

                  {/* Footer credits */}
                  <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center text-3xs text-gray-400">
                    <p>เอกสารพิมพ์รายงานสรุปอัตโนมัติจากระบบ Onsite Service Tracker</p>
                    <p>หน้า 1 จาก 1</p>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal footer closing */}
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
