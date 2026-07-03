/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBKttSKRFL-z_9J5HB0StnPc_KaFEHoldA",
  authDomain: "intrepid-acolyte-ngtt6.firebaseapp.com",
  projectId: "intrepid-acolyte-ngtt6",
  storageBucket: "intrepid-acolyte-ngtt6.firebasestorage.app",
  messagingSenderId: "799858151622",
  appId: "1:799858151622:web:e0043b44be544acf0887c7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
const db = getFirestore(app, "ai-studio-onsiteservicetra-df5cc187-664c-45b0-88e2-abff638e7200");

export { db };
export const jobsCollection = collection(db, 'jobs');
export const onCallCollection = collection(db, 'oncallservice');
export const claimsCollection = collection(db, 'claim');
export const customersCollection = collection(db, 'customers');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
