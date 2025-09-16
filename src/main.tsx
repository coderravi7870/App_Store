import '@/index.css';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from '@/context/AuthContext.tsx';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Login from './components/views/Login';
import CreateIndent from './components/views/CreateIndent';
import Dashboard from './components/views/Dashboard';
import App from './App';
import ApproveIndent from '@/components/views/ApproveIndent';
import { SheetsProvider } from './context/SheetsContext';
import VendorUpdate from './components/views/VendorUpdate';
import RateApproval from './components/views/RateApproval';
import StoreOutApproval from './components/views/StoreOutApproval';
import type { RouteAttributes } from './types';
import {
    LayoutDashboard,
    ClipboardList,
    UserCheck,
    Users,
    ClipboardCheck,
    Truck,
    PackageCheck,
    ShieldUser,
    FilePlus2,
    ListTodo,
    Package2,
    Store,
} from 'lucide-react';
import type { UserPermissions } from './types/sheets';
import Administration from './components/views/Administration';
import Loading from './components/views/Loading';
import CreatePO from './components/views/CreatePO';
import PendingIndents from './components/views/PendingIndents';
import Order from './components/views/Order';
import Inventory from './components/views/Inventory';
import POMaster from './components/views/POMaster';
import StoreIssue from './components/views/StoreIssue';
import QuantityCheckInReceiveItem from './components/views/QuantityCheckInReceiveItem';
import ReturnMaterialToParty from './components/views/ReturnMaterialToParty';
import SendDebitNote from './components/views/SendDebitNote';
import IssueData from './components/views/IssueData';
import GetLift from './components/views/GetLift';
import StoreIn from './components/views/StoreIn';
import AuditData from './components/views/AuditData';
import RectifyTheMistake from './components/views/RectifyTheMistake';
import ReauditData from './components/views/ReauditData';
import TakeEntryByTally from './components/views/TakeEntryByTally';
import ExchangeMaterials from './components/views/ExchangeMaterials';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { loggedIn, loading } = useAuth();
    if (loading) return <Loading />;
    return loggedIn ? children : <Navigate to="/login" />;
}

function GatedRoute({
    children,
    identifier,
}: {
    children: React.ReactNode;
    identifier?: keyof UserPermissions;
}) {
    const { user } = useAuth();
    // console.log("user", user);
    // console.log("identifier", identifier);
    if (!identifier) return children;
    if (!user[identifier]) {
        console.log("ram")
        return <Navigate to="/" replace />;
    }
    return children;
}

const routes: RouteAttributes[] = [
    {
        path: '',
        name: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        element: <Dashboard />,
        notifications: () => 0,
    },
    {
        path: 'store-issue',
        // gateKey: 'storeIssue',
        name: 'Store Issue',
        icon: <ClipboardList size={20} />,
        element: <StoreIssue />,
        notifications: () => 0,
    },

    {
        path: 'Issue-data',
        // gateKey: 'indentApprovalView',
        name: 'Issue Data',
        icon: <ClipboardCheck size={20} />,
        element: <IssueData />,
        // notifications: (sheets) =>
        //     sheets.filter(
        //         (sheet) =>
        //             sheet.planned1 !== '' &&
        //             sheet.vendorType === '' &&
        //             sheet.indentType === 'Purchase'
        //     ).length,

         notifications: () => 0,
    },

    {
        path: 'inventory',
        name: 'Inventory',
        icon: <Store size={20} />,
        element: <Inventory />,
        notifications: () => 0,
    },
    
    {
        path: 'create-indent',
        gateKey: 'createIndent',
        name: 'Create Indent',
        icon: <ClipboardList size={20} />,
        element: <CreateIndent />,
        notifications: () => 0,
    },
    {
        path: 'approve-indent',
        gateKey: 'indentApprovalView',
        name: 'Approve Indent',
        icon: <ClipboardCheck size={20} />,
        element: <ApproveIndent />,
        notifications: (sheets) =>
            sheets.filter(
                (sheet) =>
                    sheet.planned1 !== '' &&
                    sheet.vendorType === '' &&
                    sheet.indentType === 'Purchase'
            ).length,
    },
    {
        path: 'vendor-rate-update',
        gateKey: 'updateVendorView',
        name: 'Vendor Rate Update',
        icon: <UserCheck size={20} />,
        element: <VendorUpdate />,
        notifications: (sheets) =>
            sheets.filter((sheet) => sheet.planned2 !== '' && sheet.actual2 === '').length,
    },
    {
        path: 'three-party-approval',
        gateKey: 'threePartyApprovalView',
        name: 'Three Party Approval',
        icon: <Users size={20} />,
        element: <RateApproval />,
        notifications: (sheets) =>
            sheets.filter(
                (sheet) =>
                    sheet.planned3 !== '' &&
                    sheet.actual3 === '' &&
                    sheet.vendorType === 'Three Party'
            ).length,
    },
    {
        path: 'pending-pos',
        gateKey: 'pendingIndentsView',
        name: 'Pending POs',
        icon: <ListTodo size={20} />,
        element: <PendingIndents />,
        notifications: (sheets) =>
            sheets.filter((sheet) => sheet.planned4 !== '' && sheet.actual4 === '').length,
    },
    {
        path: 'create-po',
        gateKey: 'createPo',
        name: 'Create PO',
        icon: <FilePlus2 size={20} />,
        element: <CreatePO />,
        notifications: () => 0,
    },
    
    {
        path: 'po-history',
        gateKey: 'ordersView',
        name: 'PO History',
        icon: <Package2 size={20} />,
        element: <Order />,
        notifications: () => 0,
    },
    {
        path: 'get-lift',
        gateKey: 'ordersView',
        name: 'Get Lift',
        icon: <Package2 size={20} />,
        element: <GetLift />,
        notifications: () => 0,
    },
    {
        path: 'store-in',
        gateKey: 'receiveItemView',
        name: 'Store In',
        icon: <Truck size={20} />,
        element: <StoreIn />,
        notifications: (sheets) =>
            sheets.filter((sheet) => sheet.planned5 !== '' && sheet.actual5 === '').length,
    },


    {
        path: 'Quality-Check-In-Received-Item',
        // gateKey: 'poMaster',
        name: 'Quality Check In Received Item',
        icon: <Users size={20} />,
        element: <QuantityCheckInReceiveItem />,
        notifications: () => 0,
    },

    {
        path: 'Exchange-Materials',
        // gateKey: 'poMaster',
        name: 'Exchange Materials',
        icon: <Users size={20} />,
        element: <ExchangeMaterials />,
        notifications: () => 0,
    },

    {
        path: 'Return-Material-To-Party',
        // gateKey: 'poMaster',
        name: 'Return Material To Party',
        icon: <Users size={20} />,
        element: <ReturnMaterialToParty />,
        notifications: () => 0,
    },

    {
        path: 'Send-Debit-Note',
        // gateKey: 'poMaster',
        name: 'Send Debit Note',
        icon: <Users size={20} />,
        element: <SendDebitNote />,
        notifications: () => 0,
    },
    {
        path: 'audit-data',
        // gateKey: 'poMaster',
        name: 'Audit Data',
        icon: <Users size={20} />,
        element: <AuditData />,
        notifications: () => 0,
    },
    {
        path: 'rectify-the-mistake',
        // gateKey: 'poMaster',
        name: 'Rectify the mistake',
        icon: <Users size={20} />,
        element: <RectifyTheMistake />,
        notifications: () => 0,
    },
    {
        path: 'reaudit-data',
        // gateKey: 'poMaster',
        name: 'Reaudit Data',
        icon: <Users size={20} />,
        element: <ReauditData />,
        notifications: () => 0,
    },
    {
        path: 'take-entry-by-tally',
        // gateKey: 'poMaster',
        name: 'Take Entry By Tally',
        icon: <Users size={20} />,
        element: <TakeEntryByTally />,
        notifications: () => 0,
    },

    // {
    //     path: 'store-out-approval',
    //     gateKey: 'storeOutApprovalView',
    //     name: 'Store Out Approval',
    //     icon: <PackageCheck size={20} />,
    //     element: <StoreOutApproval />,
    //     notifications: (sheets) =>
    //         sheets.filter(
    //             (sheet) =>
    //                 sheet.planned6 !== '' &&
    //                 sheet.actual6 === '' &&
    //                 sheet.indentType === 'Store Out'
    //         ).length,
    // },
    {
        path: 'administration',
        gateKey: 'administrate',
        name: 'Adminstration',
        icon: <ShieldUser size={20} />,
        element: <Administration />,
        notifications: () => 0,
    },
];

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute>
                                <SheetsProvider>
                                    <App routes={routes} />
                                </SheetsProvider>
                            </ProtectedRoute>
                        }
                    >
                        {routes.map(({ path, element, gateKey }) => {
                            // console.log("path", path);
                            return <Route
                                key={path} // Added key prop here
                                path={path}
                                element={<GatedRoute identifier={gateKey}>{element}</GatedRoute>}
                            />
                        })}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    </StrictMode>
);