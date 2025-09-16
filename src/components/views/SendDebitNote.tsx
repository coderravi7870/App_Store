import { useSheets } from '@/context/SheetsContext';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import DataTable from '../element/DataTable';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { PuffLoader as Loader } from 'react-spinners';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { postToSheet, uploadFile } from '@/lib/fetchers';
import { Truck } from 'lucide-react';
import { Tabs, TabsContent } from '../ui/tabs';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { Pill } from '../ui/pill';

interface StoreInPendingData {
    liftNumber: string;
    indentNumber: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
}

interface StoreInHistoryData {
    liftNumber: string;
    indentNumber: string;
    billNo: string;
    vendorName: string;
    productName: string;
    qty: number;
    typeOfBill: string;
    billAmount: number;
    paymentType: string;
    advanceAmountIfAny: number;
    photoOfBill: string;
    transportationInclude: string;
    status: string;
    reason: string;
    billNumber: string;
    statusPurchaser: string;
    debitNoteCopy: string; // Add this
    billCopy: string; // Add this
    returnCopy: string; // Add this
}

export default () => {
    const { storeInSheet, updateAll } = useSheets();
    const { user } = useAuth();

    const [pendingData, setPendingData] = useState<StoreInPendingData[]>([]);
    const [historyData, setHistoryData] = useState<StoreInHistoryData[]>([]);
    const [selectedItem, setSelectedItem] = useState<StoreInPendingData | null>(null);
    const [openDialog, setOpenDialog] = useState(false);

    useEffect(() => {
        setPendingData(
            storeInSheet
                .filter((i) => i.planned9 !== '' && i.actual9 === '')
                .map((i) => ({
                    liftNumber: i.liftNumber || '',
                    indentNumber: i.indentNo || '',
                    billNo: i.billNo || '',
                    vendorName: i.vendorName || '',
                    productName: i.productName || '',
                    qty: i.qty || 0,
                    typeOfBill: i.typeOfBill || '',
                    billAmount: i.billAmount || 0,
                    paymentType: i.paymentType || '',
                    advanceAmountIfAny: i.advanceAmountIfAny || 0,
                    photoOfBill: i.photoOfBill || '',
                    transportationInclude: i.transportationInclude || '',
                    transporterName: i.transporterName || '',
                    amount: i.amount || 0,
                }))
        );
    }, [storeInSheet]);

    useEffect(() => {
        setHistoryData(
            storeInSheet
                .filter((i) => i.planned9 !== '' && i.actual9 !== '')
                .map((i) => ({
                    liftNumber: i.liftNumber || '',
                    indentNumber: i.indentNo || '',
                    billNo: i.billNo || '',
                    vendorName: i.vendorName || '',
                    productName: i.productName || '',
                    qty: i.qty || 0,
                    typeOfBill: i.typeOfBill || '',
                    billAmount: i.billAmount || 0,
                    paymentType: i.paymentType || '',
                    advanceAmountIfAny: i.advanceAmountIfAny || 0,
                    photoOfBill: i.photoOfBill || '',
                    transportationInclude: i.transportationInclude || '',
                    status: i.status || '',
                    reason: i.reason || '',
                    billNumber: i.billNo || '',
                    statusPurchaser: i.statusPurchaser || '',
                    debitNoteCopy: i.debitNoteCopy || '', // Add this
                    billCopy: i.billCopy || '', // Add this
                    returnCopy: i.returnCopy || '', // Add this
                }))
        );
    }, [storeInSheet]);

    const pendingColumns: ColumnDef<StoreInPendingData>[] = [
        ...(user.receiveItemView
            ? [
                  {
                      header: 'Action',
                      cell: ({ row }: { row: Row<StoreInPendingData> }) => {
                          const item = row.original;

                          return (
                              <DialogTrigger asChild>
                                  <Button
                                      variant="outline"
                                      onClick={() => {
                                          setSelectedItem(item);
                                      }}
                                  >
                                      Process
                                  </Button>
                              </DialogTrigger>
                          );
                      },
                  },
              ]
            : []),
        { accessorKey: 'liftNumber', header: 'Lift Number' },
        { accessorKey: 'indentNumber', header: 'Indent No.' },
        { accessorKey: 'billNo', header: 'Bill No.' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'productName', header: 'Product Name' },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'typeOfBill', header: 'Type Of Bill' },
        { accessorKey: 'billAmount', header: 'Bill Amount' },
        { accessorKey: 'paymentType', header: 'Payment Type' },
        { accessorKey: 'advanceAmountIfAny', header: 'Advance Amount If Any' },
        {
            accessorKey: 'photoOfBill',
            header: 'Photo Of Bill',
            cell: ({ row }) => {
                const photo = row.original.photoOfBill;
                return photo ? (
                    <a href={photo} target="_blank" rel="noopener noreferrer">
                        Bill
                    </a>
                ) : (
                    <></>
                );
            },
        },
        { accessorKey: 'transportationInclude', header: 'Transportation Include' },
        { accessorKey: 'transporterName', header: 'Transporter Name' },
        { accessorKey: 'amount', header: 'Amount' },
    ];

    const historyColumns: ColumnDef<StoreInHistoryData>[] = [
        { accessorKey: 'liftNumber', header: 'Lift Number' },
        { accessorKey: 'indentNumber', header: 'Indent No.' },
        { accessorKey: 'billNo', header: 'Bill No.' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'productName', header: 'Product Name' },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'typeOfBill', header: 'Type Of Bill' },
        { accessorKey: 'billAmount', header: 'Bill Amount' },
        { accessorKey: 'paymentType', header: 'Payment Type' },
        { accessorKey: 'advanceAmountIfAny', header: 'Advance Amount If Any' },
        {
            accessorKey: 'photoOfBill',
            header: 'Photo Of Bill',
            cell: ({ row }) => {
                const photo = row.original.photoOfBill;
                return photo ? (
                    <a href={photo} target="_blank" rel="noopener noreferrer">
                        Bill
                    </a>
                ) : (
                    <></>
                );
            },
        },
        { accessorKey: 'transportationInclude', header: 'Transportation Include' },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status;
                const variant = status === 'Return' ? 'secondary' : 'reject';
                return <Pill variant={variant}>{status}</Pill>;
            },
        },
        { accessorKey: 'reason', header: 'Reason' },
        { accessorKey: 'billNumber', header: 'Bill Number' },
        {
            accessorKey: 'statusPurchaser',
            header: 'Status Purchaser',
            cell: ({ row }) => {
                const status = row.original.statusPurchaser;
                const variant = status === 'Return to Party' ? 'secondary' : 'reject';
                return <Pill variant={variant}>{status}</Pill>;
            },
        },

        {
            accessorKey: 'debitNoteCopy',
            header: 'Debit Note Copy',
            cell: ({ row }) => {
                const file = row.original.debitNoteCopy;
                return file ? (
                    <a href={file} target="_blank" rel="noopener noreferrer">
                        View
                    </a>
                ) : (
                    <></>
                );
            },
        },
        {
            accessorKey: 'billCopy',
            header: 'Bill Copy',
            cell: ({ row }) => {
                const file = row.original.billCopy;
                return file ? (
                    <a href={file} target="_blank" rel="noopener noreferrer">
                        View
                    </a>
                ) : (
                    <></>
                );
            },
        },
        {
            accessorKey: 'returnCopy',
            header: 'Return Copy',
            cell: ({ row }) => {
                const file = row.original.returnCopy;
                return file ? (
                    <a href={file} target="_blank" rel="noopener noreferrer">
                        View
                    </a>
                ) : (
                    <></>
                );
            },
        },
    ];

    const schema = z.object({
        debitNoteCopy: z.instanceof(File).optional(),
        billCopy: z.instanceof(File).optional(),
        returnCopy: z.instanceof(File).optional(),
    });
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            debitNoteCopy: undefined,
            billCopy: undefined,
            returnCopy: undefined,
        },
    });

    useEffect(() => {
        if (!openDialog) {
            form.reset({
                debitNoteCopy: undefined,
                billCopy: undefined,
                returnCopy: undefined,
            });
        }
    }, [openDialog, form]);

    //     useEffect(() => {
    //     console.log('storeInSheet data:', storeInSheet);
    //     console.log('storeInSheet length:', storeInSheet?.length);
    //     if (storeInSheet?.length > 0) {
    //         console.log('First item:', storeInSheet[0]);
    //         console.log('planned7 values:', storeInSheet.map(item => item.planned7));
    //         console.log('actual7 values:', storeInSheet.map(item => item.actual7));
    //     }
    // }, [storeInSheet]);

    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            const currentDateTime = new Date()
                .toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                })
                .replace(',', '');

            let debitNoteCopyUrl: string = '';

            if (values.debitNoteCopy) {
                debitNoteCopyUrl = await uploadFile(
                    values.debitNoteCopy,
                    import.meta.env.VITE_COMPARISON_SHEET_FOLDER
                );
            }

            let billCopyUrl: string = '';

            if (values.billCopy) {
                billCopyUrl = await uploadFile(
                    values.billCopy,
                    import.meta.env.VITE_COMPARISON_SHEET_FOLDER
                );
            }
            let returnCopyUrl: string = '';

            if (values.returnCopy) {
                returnCopyUrl = await uploadFile(
                    values.returnCopy,
                    import.meta.env.VITE_COMPARISON_SHEET_FOLDER
                );
            }

            // Then update the sheet
            await postToSheet(
                storeInSheet
                    .filter((s) => s.liftNumber === selectedItem?.liftNumber)
                    .map((prev) => ({
                        ...prev,
                        actual9: currentDateTime,
                        debitNoteCopy: debitNoteCopyUrl,
                        billCopy: billCopyUrl,
                        returnCopy: returnCopyUrl,
                    })),
                'update',
                'STORE IN'
            );

            toast.success(`Updated status for ${selectedItem?.indentNumber}`);
            setOpenDialog(false);
            setTimeout(() => updateAll(), 1000);
        } catch {
            toast.error('Failed to update status');
        }
    }

    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Tabs defaultValue="pending">
                    <Heading
                        heading="Store Items"
                        subtext="Process store items and manage returns"
                        tabs
                    >
                        <Truck size={50} className="text-primary" />
                    </Heading>

                    <TabsContent value="pending">
                        <DataTable
                            data={pendingData}
                            columns={pendingColumns}
                            searchFields={[
                                'liftNumber',
                                'indentNumber',
                                'productName',
                                'vendorName',
                            ]}
                            dataLoading={false}
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={[
                                'liftNumber',
                                'indentNumber',
                                'productName',
                                'vendorName',
                                'status',
                            ]}
                            dataLoading={false}
                        />
                    </TabsContent>
                </Tabs>

                {selectedItem && (
                    <DialogContent className="sm:max-w-2xl">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="space-y-5"
                            >
                                <DialogHeader className="space-y-1">
                                    <DialogTitle>Process Store Item</DialogTitle>
                                    <DialogDescription>
                                        Process item from lift number{' '}
                                        <span className="font-medium">
                                            {selectedItem.liftNumber}
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="bg-muted p-4 rounded-md grid gap-3">
                                    <h3 className="text-lg font-bold">Item Details</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <p className="font-medium text-nowrap">Indent Number</p>
                                            <p className="text-sm font-light">
                                                {selectedItem.indentNumber}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-nowrap">Lift Number</p>
                                            <p className="text-sm font-light">
                                                {selectedItem.liftNumber}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Product Name</p>
                                            <p className="text-sm font-light">
                                                {selectedItem.productName}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Vendor Name</p>
                                            <p className="text-sm font-light">
                                                {selectedItem.vendorName}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Quantity</p>
                                            <p className="text-sm font-light">{selectedItem.qty}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Bill Amount</p>
                                            <p className="text-sm font-light">
                                                {selectedItem.billAmount}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Payment Type</p>
                                            <p className="text-sm font-light">
                                                {selectedItem.paymentType}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <FormField
                                        control={form.control}
                                        name="debitNoteCopy"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Debit Note Copy</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        onChange={(e) =>
                                                            field.onChange(e.target.files?.[0])
                                                        }
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="billCopy"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bill Copy</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        onChange={(e) =>
                                                            field.onChange(e.target.files?.[0])
                                                        }
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="returnCopy"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Return Copy</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        onChange={(e) =>
                                                            field.onChange(e.target.files?.[0])
                                                        }
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Close</Button>
                                    </DialogClose>

                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && (
                                            <Loader
                                                size={20}
                                                color="white"
                                                aria-label="Loading Spinner"
                                            />
                                        )}
                                        Update Status
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
};
