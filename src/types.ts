/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ServiceJob {
  id: string;
  jobNo: string; // e.g. OS-20260702-001
  customerName: string;
  customerCompany?: string; // ชื่อบริษัทลูกค้า
  customerPhone?: string;
  customerAddress?: string;
  jobType: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:MM
  reportDate?: string; // วันรับแจ้งงาน (YYYY-MM-DD)
  details: string;
  technicianName: string;
  status: JobStatus;
  serviceFee: number;
  notes?: string;
  imageBefore?: string; // Base64 compressed image (max 500KB)
  imageDuring?: string; // Base64 compressed image (max 500KB)
  imageAfter?: string;  // Base64 compressed image (max 500KB)
  jobImages?: JobImage[];
  createdAt: string;
}

export interface JobImage {
  url: string;
  description: string;
}

export type OnCallStatus = 'resolved' | 'pending' | 'forwarded';

export interface OnCallService {
  id: string;
  callNo: string; // e.g. OC-YYYYMMDD-001
  customerName: string;
  customerPhone?: string;
  issue: string;
  solution?: string;
  callDate: string; // YYYY-MM-DD
  callTime: string; // HH:MM
  receiverName: string;
  status: OnCallStatus;
  notes?: string;
  createdAt: string;
}

export type ClaimStatus = 'received' | 'checking' | 'repairing' | 'completed' | 'rejected';

export interface ClaimProduct {
  id: string;
  claimNo: string; // e.g. CL-YYYYMMDD-001
  customerName: string;
  customerPhone?: string;
  productName: string;
  productType?: string; // ประเภทสินค้า
  productBrand?: string; // ยี่ห้อสินค้า
  serialNumber?: string;
  symptom: string;
  claimDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  technicianName: string;
  status: ClaimStatus;
  notes?: string;
  claimImages?: JobImage[]; // ภาพเคลมสินค้าพร้อมคำบรรยายสูงสุด 3 ภาพ
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface MonthlyStats {
  month: string; // e.g., "ม.ค. 2026"
  jobCount: number;
  totalHours: number;
  revenue: number;
}

export interface JobTypeStats {
  name: string;
  value: number;
  color: string;
}
