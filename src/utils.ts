/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ServiceJob } from './types';

// Helper to calculate duration between start and end date/time
export function calculateDuration(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): { hours: number; minutes: number; decimal: number } {
  if (!startDate || !startTime || !endDate || !endTime) {
    return { hours: 0, minutes: 0, decimal: 0 };
  }

  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { hours: 0, minutes: 0, decimal: 0 };
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, decimal: 0 };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const decimal = Math.round((totalMinutes / 60) * 100) / 100;

  return { hours, minutes, decimal };
}

// Format Thai Date
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const yearStr = (date.getFullYear() + 543).toString(); // Convert to Buddhist Era

  return `${day} ${month} ${yearStr}`;
}

// Format Thai Date with Time
export function formatThaiDateTime(dateStr: string, timeStr: string): string {
  if (!dateStr) return '';
  const dateFormatted = formatThaiDate(dateStr);
  return timeStr ? `${dateFormatted} (${timeStr} น.)` : dateFormatted;
}

// Format Currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Generate Job Number
export function generateJobNo(dateStr: string, index: number): string {
  const cleanDate = dateStr.replace(/-/g, ''); // YYYYMMDD
  const sequence = String(index).padStart(3, '0');
  return `OS-${cleanDate}-${sequence}`;
}

// Get month name in Thai for stats
export function getThaiMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'ไม่ระบุ';
  
  const months = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  
  const month = months[date.getMonth()];
  const yearStr = (date.getFullYear() + 543).toString().slice(-2); // Short BE year
  return `${month} ${yearStr}`;
}

// Get full Thai month year
export function getFullThaiMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const fullMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  return `${fullMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

// Initial Sample Data for Onsite Service App
export const INITIAL_JOBS: ServiceJob[] = [
  {
    id: 'job-1',
    jobNo: 'OS-20260515-001',
    customerName: 'บริษัท ไทยก้าวหน้า จำกัด',
    customerPhone: '02-123-4567',
    customerAddress: '123/45 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
    jobType: 'ซ่อมบำรุง',
    startDate: '2026-05-15',
    startTime: '09:00',
    endDate: '2026-05-15',
    endTime: '12:00',
    details: 'ตรวจเช็คระบบไฟฟ้า และซ่อมแซมตู้คอนโทรลมอเตอร์ที่ชำรุด เปลี่ยนอะไหล่เบรกเกอร์ 3 เฟส ปรับจูนระบบเซ็นเซอร์ป้องกันความร้อนเกิน',
    technicianName: 'ช่างสมชาย ยอดบริการ',
    status: 'completed',
    serviceFee: 3500,
    notes: 'ลูกค้าพึงพอใจมาก ระบบกลับมาใช้งานได้ปกติ',
    createdAt: '2026-05-15T09:00:00.000Z'
  },
  {
    id: 'job-2',
    jobNo: 'OS-20260520-001',
    customerName: 'คุณวารุณี รักสงบ',
    customerPhone: '081-987-6543',
    customerAddress: '88 หมู่บ้านแสนสิริ ถนนราชพฤกษ์ อำเภอเมือง นนทบุรี 11000',
    jobType: 'ติดตั้ง',
    startDate: '2026-05-20',
    startTime: '13:30',
    endDate: '2026-05-20',
    endTime: '17:00',
    details: 'ติดตั้งเครื่องกรองน้ำระบบ RO และเดินระบบท่อน้ำดีน้ำเสียใหม่ พร้อมอธิบายวิธีบำรุงรักษาและการเปลี่ยนไส้กรองให้กับลูกค้า',
    technicianName: 'ช่างวิชัย เรียนรู้',
    status: 'completed',
    serviceFee: 2500,
    notes: 'แถมฟรีไส้กรองหยาบ PP จำนวน 1 ชิ้น',
    createdAt: '2026-05-20T13:30:00.000Z'
  },
  {
    id: 'job-3',
    jobNo: 'OS-20260602-001',
    customerName: 'ร้านกาแฟ คอฟฟี่เลิฟเวอร์',
    customerPhone: '089-111-2222',
    customerAddress: '15/2 ซอยอารีย์ ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพมหานคร 10400',
    jobType: 'ตรวจเช็ค',
    startDate: '2026-06-02',
    startTime: '08:30',
    endDate: '2026-06-02',
    endTime: '11:30',
    details: 'ล้างทำความสะอาดเครื่องชงกาแฟระบบกึ่งอัตโนมัติ 2 หัวกรุ๊ป เปลี่ยนยางรองหัวกรุ๊ป และปรับตั้งค่าแรงดันน้ำและอุณหภูมิ',
    technicianName: 'ช่างสมชาย ยอดบริการ',
    status: 'completed',
    serviceFee: 1800,
    notes: 'แนะนำให้เปลี่ยนไส้กรองน้ำเข้ารอบหน้า (อีก 3 เดือน)',
    createdAt: '2026-06-02T08:30:00.000Z'
  },
  {
    id: 'job-4',
    jobNo: 'OS-20260618-001',
    customerName: 'โรงเรียนอนุบาลฝันดี',
    customerPhone: '02-888-9999',
    customerAddress: '400 ถนนประชาชื่น แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพมหานคร 10800',
    jobType: 'ติดตั้ง',
    startDate: '2026-06-18',
    startTime: '09:00',
    endDate: '2026-06-19',
    endTime: '16:00',
    details: 'ติดตั้งกล้องวงจรปิด IP Camera จำนวน 8 ตัว พร้อมเดินสายสัญญาณ LAN ร้อยท่อ PVC ติดตั้งกล่องบันทึกข้อมูล NVR เซ็ตอัปแอปพลิเคชันดูออนไลน์ผ่านมือถือสำหรับคุณครูและผู้บริหาร',
    technicianName: 'ช่างวิชัย เรียนรู้',
    status: 'completed',
    serviceFee: 15000,
    notes: 'งานติดตั้งเสร็จสมบูรณ์เรียบร้อยดีทั้ง 2 วัน เทสระบบผ่านฉลุย',
    createdAt: '2026-06-18T09:00:00.000Z'
  },
  {
    id: 'job-5',
    jobNo: 'OS-20260625-001',
    customerName: 'คอนโดมิเนียม เมโทร สเปซ',
    customerPhone: '02-777-6666',
    customerAddress: 'ห้องนิติบุคคล ชั้น 1 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900',
    jobType: 'อัปเกรดระบบ',
    startDate: '2026-06-25',
    startTime: '10:00',
    endDate: '2026-06-25',
    endTime: '15:30',
    details: 'อัปเกรดเฟิร์มแวร์ระบบประตูคีย์การ์ด เข้า-ออก อาคาร A และ B เพิ่มความเสถียรในการสแกนใบหน้าและบัตรทาบ',
    technicianName: 'ช่างสมศักดิ์ สายตรวจ',
    status: 'completed',
    serviceFee: 4500,
    createdAt: '2026-06-25T10:00:00.000Z'
  },
  {
    id: 'job-6',
    jobNo: 'OS-20260701-001',
    customerName: 'คุณกิตติศักดิ์ เจริญยนต์',
    customerPhone: '085-555-4444',
    customerAddress: '12/1 ซอยประเสริฐมนูกิจ 29 ถนนประเสริฐมนูกิจ เขตลาดพร้าว กรุงเทพมหานคร 10230',
    jobType: 'ซ่อมบำรุง',
    startDate: '2026-07-01',
    startTime: '10:00',
    endDate: '2026-07-01',
    endTime: '12:00',
    details: 'ซ่อมบำรุงเครื่องปรับอากาศบ้าน ขนาด 18,000 BTU ล้างแอร์แบบเติมน้ำยาแอร์ ตรวจวัดระดับกระแสไฟฟ้า ตรวจเช็คจุดเชื่อมต่อไฟและพัดลมระบายความร้อนตัวนอก',
    technicianName: 'ช่างสมชาย ยอดบริการ',
    status: 'completed',
    serviceFee: 1200,
    notes: 'น้ำยาแอร์ขาดไป 15 PSI ทำการเติมให้ฟรีตามแพ็คเกจบริการ',
    createdAt: '2026-07-01T10:00:00.000Z'
  },
  {
    id: 'job-7',
    jobNo: 'OS-20260702-001',
    customerName: 'คลินิกรักษาสัตว์ แฮปปี้เพ็ท',
    customerPhone: '086-444-5555',
    customerAddress: '55/9 ถนนพหลโยธิน เขตจตุจักร กรุงเทพมหานคร 10900',
    jobType: 'ตรวจเช็ค',
    startDate: '2026-07-02',
    startTime: '14:00',
    endDate: '2026-07-02',
    endTime: '16:00',
    details: 'ตรวจเช็คระบบเครือข่ายอินเทอร์เน็ตภายในคลินิก พบสัญญาณ WiFi หลุดบ่อย ทำการย้ายตำแหน่ง Access Point และเปลี่ยนช่องสัญญาณ WiFi เพื่อหลีกเลี่ยงคลื่นรบกวน',
    technicianName: 'ช่างวิชัย เรียนรู้',
    status: 'in_progress',
    serviceFee: 800,
    notes: 'กำลังดำเนินการปรับแต่งสัญญาณและทดสอบความเร็วอินเทอร์เน็ตในแต่ละห้อง',
    createdAt: '2026-07-02T14:00:00.000Z'
  }
];

// Generate On-Call Number
export function generateOnCallNo(dateStr: string, index: number): string {
  const cleanDate = dateStr.replace(/-/g, ''); // YYYYMMDD
  const sequence = String(index).padStart(3, '0');
  return `OC-${cleanDate}-${sequence}`;
}

// Generate Claim Number
export function generateClaimNo(dateStr: string, index: number): string {
  const cleanDate = dateStr.replace(/-/g, ''); // YYYYMMDD
  const sequence = String(index).padStart(3, '0');
  return `CL-${cleanDate}-${sequence}`;
}

// Remove undefined properties from an object (required for Firestore safety)
export function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj } as any;
  Object.keys(result).forEach((key) => {
    if (result[key] === undefined) {
      delete result[key];
    } else if (result[key] !== null && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = cleanUndefined(result[key]);
    }
  });
  return result as T;
}

/**
 * Temporarily converts oklch/lab/lch CSS colors in stylesheets to standard RGB colors
 * using the browser's built-in CSS parsing engine. This prevents html2canvas from 
 * throwing "Attempting to parse an unsupported color function" errors when working with Tailwind CSS v4.
 * Returns a cleanup function to restore the original styles.
 */
export function prepareStylesForPdfExport(): () => void {
  const tempStyles: HTMLStyleElement[] = [];
  const originalStylesToRestore: { el: HTMLStyleElement | HTMLLinkElement; disabled: boolean }[] = [];

  try {
    // Create a temporary element to resolve the colors natively
    const tempEl = document.createElement('div');
    tempEl.style.display = 'none';
    document.body.appendChild(tempEl);

    // Get all STYLE and LINK tags
    const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));

    for (const el of styleElements) {
      let cssText = '';

      if (el.tagName === 'STYLE') {
        cssText = el.textContent || '';
      } else if (el.tagName === 'LINK') {
        try {
          const link = el as HTMLLinkElement;
          const sheet = link.sheet;
          if (sheet) {
            const rules = Array.from(sheet.cssRules);
            cssText = rules.map(rule => rule.cssText).join('\n');
          }
        } catch (e) {
          // CORS blocks reading rules of external stylesheets - skip them
          continue;
        }
      }

      // If the style sheet contains modern color functions that html2canvas doesn't support
      if (cssText && (cssText.includes('oklch') || cssText.includes('oklab') || cssText.includes('lab') || cssText.includes('lch'))) {
        // Find and replace all oklch, oklab, lab, and lch color functions
        const cleanedCss = cssText.replace(/(oklch|oklab|lab|lch)\([^)]+\)/g, (match) => {
          try {
            tempEl.style.color = match;
            const computed = getComputedStyle(tempEl).color;
            return computed || match;
          } catch (e) {
            return match;
          }
        });

        // Append a new style element with standard RGB values
        const newStyle = document.createElement('style');
        newStyle.textContent = cleanedCss;
        document.head.appendChild(newStyle);
        tempStyles.push(newStyle);

        // Disable original stylesheet
        if (el.tagName === 'STYLE') {
          const s = el as HTMLStyleElement;
          originalStylesToRestore.push({ el: s, disabled: s.disabled });
          s.disabled = true;
        } else if (el.tagName === 'LINK') {
          const l = el as HTMLLinkElement;
          originalStylesToRestore.push({ el: l, disabled: l.disabled });
          l.disabled = true;
        }
      }
    }

    // Clean up our temporary element
    if (tempEl.parentNode) {
      tempEl.parentNode.removeChild(tempEl);
    }
  } catch (error) {
    console.error('Error preparing styles for PDF export:', error);
  }

  // Return restore function
  return () => {
    // Re-enable original stylesheets
    for (const item of originalStylesToRestore) {
      item.el.disabled = item.disabled;
    }
    // Remove temporary style tags
    for (const style of tempStyles) {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }
  };
}

/**
 * Gets the custom job types list from localStorage with Thai fallbacks.
 */
export function getStoredJobTypes(): string[] {
  try {
    const stored = localStorage.getItem('onsite_job_types');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error getting stored job types:', e);
  }
  return ['ติดตั้ง', 'ซ่อมบำรุง', 'ตรวจเช็ค', 'อัปเกรดระบบ', 'อื่นๆ'];
}

/**
 * Saves the custom job types list to localStorage.
 */
export function saveJobTypes(types: string[]): void {
  try {
    localStorage.setItem('onsite_job_types', JSON.stringify(types));
  } catch (e) {
    console.error('Error saving job types:', e);
  }
}

/**
 * Gets the custom product types list from localStorage with Thai fallbacks.
 */
export function getStoredProductTypes(): string[] {
  try {
    const stored = localStorage.getItem('onsite_product_types');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error getting stored product types:', e);
  }
  return ['ปั๊มน้ำ', 'เครื่องปรับอากาศ', 'พัดลมไอเย็น', 'กล้องวงจรปิด', 'เครื่องกรองน้ำ', 'อื่นๆ'];
}

/**
 * Saves the custom product types list to localStorage.
 */
export function saveProductTypes(types: string[]): void {
  try {
    localStorage.setItem('onsite_product_types', JSON.stringify(types));
  } catch (e) {
    console.error('Error saving product types:', e);
  }
}



