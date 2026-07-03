/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ServiceJob, OnCallService, ClaimProduct, Customer } from './types';
import { INITIAL_JOBS, generateJobNo, generateOnCallNo, generateClaimNo, cleanUndefined } from './utils';
import Dashboard from './components/Dashboard';
import JobList from './components/JobList';
import OnCallList from './components/OnCallList';
import ClaimList from './components/ClaimList';
import CustomerDatabase from './components/CustomerDatabase';
import JobFormModal from './components/JobFormModal';
import JobSheetModal from './components/JobSheetModal';
import PrintReportView from './components/PrintReportView';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { 
  Wrench, 
  Database, 
  Download, 
  Upload, 
  FileText, 
  BarChart3, 
  Calendar,
  Layers,
  Heart,
  PhoneCall,
  Package,
  Users
} from 'lucide-react';

const STORAGE_KEY = 'onsite_service_jobs_v1';

export default function App() {
  // 1. Core State
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [onCalls, setOnCalls] = useState<OnCallService[]>([]);
  const [claims, setClaims] = useState<ClaimProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'oncall' | 'claim' | 'customers'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(true);

  // Modals & Active Elements States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ServiceJob | null>(null);
  
  const [isJobSheetOpen, setIsJobSheetOpen] = useState(false);
  const [viewingJob, setViewingJob] = useState<ServiceJob | null>(null);

  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [summaryJobs, setSummaryJobs] = useState<ServiceJob[]>([]);

  // 2. Load Jobs from Firebase Firestore in Real-Time
  useEffect(() => {
    setIsSyncing(true);
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedJobs: ServiceJob[] = [];
      snapshot.forEach((doc) => {
        fetchedJobs.push(doc.data() as ServiceJob);
      });
      
      if (fetchedJobs.length === 0) {
        // If Firebase is completely empty, seed with initial jobs
        try {
          const batch = writeBatch(db);
          INITIAL_JOBS.forEach((job) => {
            const docRef = doc(db, 'jobs', job.id);
            batch.set(docRef, job);
          });
          await batch.commit();
        } catch (error) {
          console.error('Failed to seed INITIAL_JOBS to Firestore:', error);
          // Fallback to local state if Firebase seed fails
          setJobs(INITIAL_JOBS);
          handleFirestoreError(error, OperationType.WRITE, 'jobs');
        }
      } else {
        setJobs(fetchedJobs);
      }
      setIsSyncing(false);
    }, (error) => {
      console.error('Firebase onSnapshot error:', error);
      setIsSyncing(false);
      // Fallback to localStorage if offline/error
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setJobs(JSON.parse(stored));
      } else {
        setJobs(INITIAL_JOBS);
      }
      handleFirestoreError(error, OperationType.GET, 'jobs');
    });

    return () => unsubscribe();
  }, []);

  // 2.2 Load On-Call Services from Firestore in Real-Time
  useEffect(() => {
    setIsSyncing(true);
    const q = query(collection(db, 'oncallservice'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: OnCallService[] = [];
      snapshot.forEach((doc) => {
        fetched.push(doc.data() as OnCallService);
      });
      setOnCalls(fetched);
      setIsSyncing(false);
    }, (error) => {
      console.error('OnCall onSnapshot error:', error);
      setIsSyncing(false);
      handleFirestoreError(error, OperationType.GET, 'oncallservice');
    });

    return () => unsubscribe();
  }, []);

  // 2.3 Load Product Claims from Firestore in Real-Time
  useEffect(() => {
    setIsSyncing(true);
    const q = query(collection(db, 'claim'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ClaimProduct[] = [];
      snapshot.forEach((doc) => {
        fetched.push(doc.data() as ClaimProduct);
      });
      setClaims(fetched);
      setIsSyncing(false);
    }, (error) => {
      console.error('Claim onSnapshot error:', error);
      setIsSyncing(false);
      handleFirestoreError(error, OperationType.GET, 'claim');
    });

    return () => unsubscribe();
  }, []);

  // 2.4 Load Customers from Firestore in Real-Time
  useEffect(() => {
    setIsSyncing(true);
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetched: Customer[] = [];
      snapshot.forEach((doc) => {
        fetched.push(doc.data() as Customer);
      });
      
      // Auto seed customers from existing jobs if database has none
      if (fetched.length === 0 && jobs.length > 0) {
        try {
          const batch = writeBatch(db);
          const uniqueNames = new Set<string>();
          jobs.forEach((job) => {
            const name = job.customerName?.trim();
            if (name && !uniqueNames.has(name.toLowerCase())) {
              uniqueNames.add(name.toLowerCase());
              const newId = `cust-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              const newCust: Customer = {
                id: newId,
                name: job.customerName,
                company: job.customerCompany || undefined,
                phone: job.customerPhone || undefined,
                address: job.customerAddress || undefined,
                createdAt: new Date().toISOString()
              };
              batch.set(doc(db, 'customers', newId), cleanUndefined(newCust));
            }
          });
          await batch.commit();
        } catch (err) {
          console.error('Failed to auto-seed customers:', err);
        }
      } else {
        setCustomers(fetched);
      }
      setIsSyncing(false);
    }, (error) => {
      console.error('Customers onSnapshot error:', error);
      setIsSyncing(false);
      handleFirestoreError(error, OperationType.GET, 'customers');
    });

    return () => unsubscribe();
  }, [jobs]);

  // Sync to local storage for local backup whenever jobs change
  useEffect(() => {
    if (jobs.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    }
  }, [jobs]);

  // 4. CRUD operations (Now fully synced to Cloud Firebase)
  const handleAddOrEditJob = async (jobData: Omit<ServiceJob, 'id' | 'jobNo' | 'createdAt'> & { id?: string }) => {
    try {
      if (jobData.id) {
        // Edit Mode
        const jobRef = doc(db, 'jobs', jobData.id);
        const existingJob = jobs.find(j => j.id === jobData.id);
        
        await setDoc(jobRef, cleanUndefined({
          ...existingJob,
          ...jobData,
        }), { merge: true });
      } else {
        // Create Mode
        const newId = `job-${Date.now()}`;
        // Calculate next job sequence number for that date
        const jobsOnDate = jobs.filter(j => j.startDate === jobData.startDate);
        const index = jobsOnDate.length + 1;
        const jobNo = generateJobNo(jobData.startDate, index);

        const newJob: ServiceJob = {
          ...jobData,
          id: newId,
          jobNo,
          createdAt: new Date().toISOString()
        };

        const jobRef = doc(db, 'jobs', newId);
        await setDoc(jobRef, cleanUndefined(newJob));
      }
      setEditingJob(null);
    } catch (error) {
      console.error('Failed to save job to Firebase:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลไปยังระบบ Cloud กรุณาลองใหม่อีกครั้ง');
      handleFirestoreError(error, jobData.id ? OperationType.UPDATE : OperationType.CREATE, jobData.id ? `jobs/${jobData.id}` : 'jobs');
    }
  };

  const handleDeleteJob = async (id: string) => {
    const jobToDelete = jobs.find(j => j.id === id);
    if (!jobToDelete) return;

    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ที่จะลบใบงานของลูกค้า "${jobToDelete.customerName}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'jobs', id));
    } catch (error) {
      console.error('Failed to delete job from Firebase:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลออกจากระบบ Cloud');
      handleFirestoreError(error, OperationType.DELETE, `jobs/${id}`);
    }
  };

  // On Call Service Actions
  const handleAddOrEditOnCall = async (onCallData: Omit<OnCallService, 'id' | 'callNo' | 'createdAt'> & { id?: string }) => {
    try {
      if (onCallData.id) {
        // Edit Mode
        const ref = doc(db, 'oncallservice', onCallData.id);
        const existing = onCalls.find(o => o.id === onCallData.id);
        await setDoc(ref, cleanUndefined({
          ...existing,
          ...onCallData,
        }), { merge: true });
      } else {
        // Create Mode
        const newId = `oncall-${Date.now()}`;
        const callsOnDate = onCalls.filter(o => o.callDate === onCallData.callDate);
        const index = callsOnDate.length + 1;
        const callNo = generateOnCallNo(onCallData.callDate, index);

        const newOnCall: OnCallService = {
          ...onCallData,
          id: newId,
          callNo,
          createdAt: new Date().toISOString()
        };

        const ref = doc(db, 'oncallservice', newId);
        await setDoc(ref, cleanUndefined(newOnCall));
      }
    } catch (error) {
      console.error('Failed to save on-call to Firebase:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลรับสายไปยังระบบ Cloud กรุณาลองใหม่อีกครั้ง');
      handleFirestoreError(error, onCallData.id ? OperationType.UPDATE : OperationType.CREATE, onCallData.id ? `oncallservice/${onCallData.id}` : 'oncallservice');
    }
  };

  const handleDeleteOnCall = async (id: string) => {
    const itemToDelete = onCalls.find(o => o.id === id);
    if (!itemToDelete) return;

    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ที่จะลบประวัติการรับสายของลูกค้า "${itemToDelete.customerName}"?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'oncallservice', id));
    } catch (error) {
      console.error('Failed to delete on-call from Firebase:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลออกจากระบบ Cloud');
      handleFirestoreError(error, OperationType.DELETE, `oncallservice/${id}`);
    }
  };

  // Claim Product Actions
  const handleAddOrEditClaim = async (claimData: Omit<ClaimProduct, 'id' | 'claimNo' | 'createdAt'> & { id?: string }) => {
    try {
      if (claimData.id) {
        // Edit Mode
        const ref = doc(db, 'claim', claimData.id);
        const existing = claims.find(c => c.id === claimData.id);
        await setDoc(ref, cleanUndefined({
          ...existing,
          ...claimData,
        }), { merge: true });
      } else {
        // Create Mode
        const newId = `claim-${Date.now()}`;
        const claimsOnDate = claims.filter(c => c.claimDate === claimData.claimDate);
        const index = claimsOnDate.length + 1;
        const claimNo = generateClaimNo(claimData.claimDate, index);

        const newClaim: ClaimProduct = {
          ...claimData,
          id: newId,
          claimNo,
          createdAt: new Date().toISOString()
        };

        const ref = doc(db, 'claim', newId);
        await setDoc(ref, cleanUndefined(newClaim));
      }
    } catch (error) {
      console.error('Failed to save claim to Firebase:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลเคลมไปยังระบบ Cloud กรุณาลองใหม่อีกครั้ง');
      handleFirestoreError(error, claimData.id ? OperationType.UPDATE : OperationType.CREATE, claimData.id ? `claim/${claimData.id}` : 'claim');
    }
  };

  const handleDeleteClaim = async (id: string) => {
    const itemToDelete = claims.find(c => c.id === id);
    if (!itemToDelete) return;

    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ที่จะลบรายการเคลมสินค้า "${itemToDelete.productName}" ของลูกค้า "${itemToDelete.customerName}"?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'claim', id));
    } catch (error) {
      console.error('Failed to delete claim from Firebase:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูลออกจากระบบ Cloud');
      handleFirestoreError(error, OperationType.DELETE, `claim/${id}`);
    }
  };

  const handleEditTrigger = (job: ServiceJob) => {
    setEditingJob(job);
    setIsFormOpen(true);
  };

  const handleViewJobSheetTrigger = (job: ServiceJob) => {
    setViewingJob(job);
    setIsJobSheetOpen(true);
  };

  const handlePrintSummaryTrigger = (selectedJobsList: ServiceJob[]) => {
    setSummaryJobs(selectedJobsList);
    setIsSummaryOpen(true);
  };

  // 5. Database Backup and Restore features (JSON files with Cloud Overwrite)
  const handleExportBackup = () => {
    try {
      const dataStr = JSON.stringify(jobs, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `OnsiteService-Backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('ไม่สามารถดาวน์โหลดไฟล์สำรองข้อมูลได้');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          // Perform structural check of first element if exists
          if (importedData.length > 0) {
            const first = importedData[0];
            if (!first.customerName || !first.jobType || !first.startDate) {
              throw new Error('โครงสร้างไฟล์ไม่ถูกต้อง');
            }
          }

          const confirmed = window.confirm(`พบข้อมูลจำนวน ${importedData.length} รายการ คุณต้องการนำเข้ามาแทนที่ข้อมูลปัจจุบันหรือไม่? (ข้อมูลปัจจุบันทั้งหมดใน Cloud จะถูกแทนที่ด้วยข้อมูลชุดนี้)`);
          if (confirmed) {
            setIsSyncing(true);
            const batch = writeBatch(db);
            
            // Delete all current jobs in Cloud
            jobs.forEach((job) => {
              batch.delete(doc(db, 'jobs', job.id));
            });
            
            // Write imported jobs to Cloud
            importedData.forEach((job) => {
              const id = job.id || `job-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              batch.set(doc(db, 'jobs', id), {
                ...job,
                id,
              });
            });
            
            await batch.commit();
            alert('นำเข้าข้อมูลสำรองไปยังระบบ Cloud เรียบร้อยแล้ว!');
          }
        } else {
          alert('รูปแบบไฟล์ข้อมูลสำรองไม่ถูกต้อง ต้องเป็นไฟล์อาร์เรย์ของบันทึกงาน');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('เกิดข้อผิดพลาด: ไฟล์ข้อมูลเสียหายหรือไม่ใช่รูปแบบบันทึกงานที่ถูกต้อง');
        handleFirestoreError(err, OperationType.WRITE, 'jobs');
      } finally {
        setIsSyncing(false);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col font-sans antialiased selection:bg-sky-950 selection:text-sky-200 pb-12">
      
      {/* Printable Area Target (Will be picked by @media print in CSS) */}
      <div id="print-layout"></div>

      {/* Main app wrapper (Hidden during native print dialog) */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 noprint">
        
        {/* Navigation / Brand Header Bar */}
        <header className="bg-slate-900/50 border border-slate-800 rounded-3xl shadow-lg backdrop-blur-md px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.5)] shrink-0">
              <Wrench className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>ONSITE SERVICE <span className="text-sky-400 font-light">HUB</span></span>
                <span className="text-3xs font-medium bg-sky-950/50 text-sky-400 px-2 py-0.5 rounded-full border border-sky-800/50">V1.0</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">ระบบบันทึกรายละเอียดงาน สรุปชั่วโมงทำงาน และออกใบงาน PDF</p>
            </div>
          </div>

          {/* Backup Database Management Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportBackup}
              title="สำรองข้อมูลเป็นไฟล์ JSON ลงคอมพิวเตอร์"
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกข้อมูล</span>
            </button>
            
            <label className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-all cursor-pointer shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              <span>นำเข้าข้อมูล</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </header>

        {/* Navigation Tabs and Quick Add Floating Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <div className="flex flex-wrap items-center gap-1 bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80">
            {/* Tab 1: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(2,132,199,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>สรุปผล & สถิติรายเดือน</span>
            </button>

            {/* Tab 2: Records Table */}
            <button
              onClick={() => setActiveTab('records')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(2,132,199,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>บันทึกงานทั้งหมด ({jobs.length})</span>
            </button>

            {/* Tab 3: On Call Service */}
            <button
              onClick={() => setActiveTab('oncall')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'oncall'
                  ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(2,132,199,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>บริการทางโทรศัพท์ ({onCalls.length})</span>
            </button>

            {/* Tab 4: Product Claim */}
            <button
              onClick={() => setActiveTab('claim')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'claim'
                  ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(2,132,199,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>เคลมสินค้า ({claims.length})</span>
            </button>

            {/* Tab 5: Customers Database */}
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(2,132,199,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>ฐานข้อมูลลูกค้า ({customers.length})</span>
            </button>
          </div>

          {/* Mini Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-2xs text-slate-500 font-medium tracking-wider uppercase">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isSyncing ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></span>
            <span>{isSyncing ? 'กำลังซิงค์ Cloud...' : 'เชื่อมต่อ Cloud สำเร็จ'}</span>
          </div>
        </div>

        {/* Content Body based on tab selection */}
        <main className="transition-all duration-300">
          {activeTab === 'dashboard' && (
            <Dashboard 
              jobs={jobs} 
              onCalls={onCalls}
              claims={claims}
              onEditJob={handleEditTrigger}
              onViewJobSheet={handleViewJobSheetTrigger}
              onTabChange={setActiveTab}
            />
          )}
          {activeTab === 'records' && (
            <JobList
              jobs={jobs}
              onAddJobClick={() => {
                setEditingJob(null);
                setIsFormOpen(true);
              }}
              onEdit={handleEditTrigger}
              onDelete={handleDeleteJob}
              onViewJobSheet={handleViewJobSheetTrigger}
              onPrintSummary={handlePrintSummaryTrigger}
            />
          )}
          {activeTab === 'oncall' && (
            <OnCallList
              onCalls={onCalls}
              onAddOrEdit={handleAddOrEditOnCall}
              onDelete={handleDeleteOnCall}
              customers={customers}
            />
          )}
          {activeTab === 'claim' && (
            <ClaimList
              claims={claims}
              onAddOrEdit={handleAddOrEditClaim}
              onDelete={handleDeleteClaim}
              customers={customers}
            />
          )}
          {activeTab === 'customers' && (
            <CustomerDatabase
              customers={customers}
              jobs={jobs}
              onCalls={onCalls}
              claims={claims}
              isSyncing={isSyncing}
            />
          )}
        </main>

        {/* App Footer */}
        <footer className="text-center pt-8 border-t border-slate-800/80 text-3xs text-slate-500 uppercase tracking-widest space-y-1.5">
          <p>Onsite Service Hub • Engineering Division</p>
          <p className="flex items-center justify-center gap-1">
            <span>Built with precision</span>
            <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500 animate-pulse" />
            <span>for optimal operations</span>
          </p>
        </footer>

      </div>

      {/* Job Form Modal (For Adding / Editing Onsite Jobs) */}
      <JobFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingJob(null);
        }}
        onSubmit={handleAddOrEditJob}
        editingJob={editingJob}
        customers={customers}
      />

      {/* Job Sheet Document Viewer Modal */}
      <JobSheetModal
        isOpen={isJobSheetOpen}
        onClose={() => {
          setIsJobSheetOpen(false);
          setViewingJob(null);
        }}
        job={viewingJob}
      />

      {/* Multiple Jobs Summary Print Modal */}
      <PrintReportView
        isOpen={isSummaryOpen}
        onClose={() => {
          setIsSummaryOpen(false);
          setSummaryJobs([]);
        }}
        selectedJobs={summaryJobs}
      />

    </div>
  );
}
