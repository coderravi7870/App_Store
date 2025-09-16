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
import { Textarea } from '../ui/textarea';
import { postToSheet, uploadFile } from '@/lib/fetchers';
import type { ReceivedSheet } from '@/types';
import { Truck } from 'lucide-react';
import { Tabs, TabsContent } from '../ui/tabs';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { formatDate } from '@/lib/utils';
import { Pill } from '../ui/pill';

interface StoreInPendingData {
    liftNumber: string;
    indentNo: string;
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
    // Add missing properties that are used in columns
    poDate: string;
    poNumber: string;
    vendor: string;
    indentNumber: string;
    product: string;
    uom: string;
    quantity: number;
    poCopy: string;

    billStatus: string;
    leadTimeToLiftMaterial: number;
    discountAmount: number;
}

interface StoreInHistoryData {
    liftNumber: string;
    indentNo: string;
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
    billStatus: string;

    photoOfProduct: string;
    unitOfMeasurement: string;
    damageOrder: string;
    quantityAsPerBill: number;
    priceAsPerPo: number;
    remark: string;
    // Add missing properties for history columns
    poDate: string;
    poNumber: string;

    vendor: string;
    product: string;
    orderQuantity: number;
    receivedDate: string;

    billNumber: string;
    anyTransport: string;
    transportingAmount: number;

    timestamp: string;
    leadTimeToLiftMaterial: number;
    discountAmount: number;
    receiveStatus: string;
    receivedQuantity: number;
    warrantyStatus: string;
    warrantyEndDate: string;
    billReceived: string;
    billImage: string;
}

// Fix type names to match usage
type RecieveItemsData = StoreInPendingData;
type HistoryData = StoreInHistoryData;

export default () => {
    const { storeInSheet, indentSheet, updateAll } = useSheets();
    const { user } = useAuth();





    const [tableData, setTableData] = useState<StoreInPendingData[]>([]);
    const [historyData, setHistoryData] = useState<StoreInHistoryData[]>([]);
    const [selectedIndent, setSelectedIndent] = useState<StoreInPendingData | null>(null);
    const [openDialog, setOpenDialog] = useState(false);

    // Add loading states
    const [indentLoading, setIndentLoading] = useState(false);
    const [receivedLoading, setReceivedLoading] = useState(false);

    useEffect(() => {
        setTableData(
            storeInSheet
                .filter((i) => i.planned6 !== '' && i.actual6 === '')
                .map((i) => ({
                    liftNumber: i.liftNumber || '',
                    indentNo: i.indentNo || '',
                    billNo: String(i.billNo) || '',
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
                    // Add missing mapped properties
                    poDate: i.poDate || '',
                    poNumber: i.poNumber || '',
                    vendor: i.vendor || '',
                    indentNumber: i.indentNumber || '',
                    product: i.product || '',
                    uom: i.uom || '',
                    quantity: i.quantity || 0,
                    poCopy: i.poCopy || '',

                    billStatus: i.billStatus || '',
                    leadTimeToLiftMaterial: i.leadTimeToLiftMaterial || 0,
                    discountAmount: i.discountAmount || 0,
                }))
        );
    }, [storeInSheet]);

    useEffect(() => {
        setHistoryData(
            storeInSheet
                .filter((i) => i.actual6 !== '')
                .map((i) => ({
                    liftNumber: i.liftNumber || '',
                    indentNo: i.indentNo || '',
                    billNo: String(i.billNo) || '',
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
                    billStatus: i.billStatus || '',
                    receivedQuantity: i.receivedQuantity || 0,
                    photoOfProduct: i.photoOfProduct || '',
                    unitOfMeasurement: i.unitOfMeasurement || '',
                    damageOrder: i.damageOrder || '',
                    quantityAsPerBill: i.quantityAsPerBill || 0,
                    priceAsPerPo: i.priceAsPerPo || 0,
                    remark: i.remark || '',
                    // Map from existing StoreInSheet properties or set defaults
                    poDate: '', // This doesn't exist in StoreInSheet
                    poNumber: '', // This doesn't exist in StoreInSheet
                    receiveStatus: i.status || '', // Map from 'status' field
                    vendor: i.vendorName || '', // Map from vendorName
                    product: i.productName || '', // Map from productName
                    orderQuantity: i.qty || 0, // Map from qty
                    receivedDate: i.timestamp || '', // Map from timestamp or set default
                    warrantyStatus: '', // This doesn't exist in StoreInSheet
                    warrantyEndDate: '', // This doesn't exist in StoreInSheet
                    billNumber: i.billNumber || '', // This exists in StoreInSheet
                    anyTransport: i.transportationInclude || '', // Map from transportationInclude
                    transportingAmount: i.amount || 0, // Map from amount or set default

                    timestamp: i.timestamp || '',
                    leadTimeToLiftMaterial: i.leadTimeToLiftMaterial || 0,
                    discountAmount: i.discountAmount || 0,
                    billReceived: i.billStatus || '',
                    billImage: i.photoOfBill || '',
                }))
        );
    }, [storeInSheet]);

   
    const columns: ColumnDef<RecieveItemsData>[] = [
        ...(user.receiveItemView
            ? [
                  {
                      header: 'Action',
                      cell: ({ row }: { row: Row<RecieveItemsData> }) => {
                          const indent = row.original;
                          return (
                              <DialogTrigger asChild>
                                  <Button
                                      variant="outline"
                                      onClick={() => {
                                          setSelectedIndent(indent);
                                      }}
                                  >
                                      Store In
                                  </Button>
                              </DialogTrigger>
                          );
                      },
                  },
              ]
            : []),
        { accessorKey: 'liftNumber', header: 'Lift Number' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'poNumber', header: 'PO Number' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'productName', header: 'Product Name' },
        { accessorKey: 'billStatus', header: 'Bill Status' },
        { accessorKey: 'billNo', header: 'Bill No.' },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'leadTimeToLiftMaterial', header: 'Lead Time To Lift Material' },
        { accessorKey: 'typeOfBill', header: 'Type Of Bill' },
        { accessorKey: 'billAmount', header: 'Bill Amount' },
        { accessorKey: 'discountAmount', header: 'Discount Amount' },
        { accessorKey: 'paymentType', header: 'Payment Type' },
        { accessorKey: 'advanceAmountIfAny', header: 'Advance Amount If Any' },
        {
            accessorKey: 'photoOfBill',
            header: 'Photo Of Bill',
            cell: ({ row }) => {
                const photo = row.original.photoOfBill;
                return photo ? (
                    <a href={photo} target="_blank">
                        View
                    </a>
                ) : null;
            },
        },
        { accessorKey: 'transportationInclude', header: 'Transportation Include' },
        { accessorKey: 'transporterName', header: 'Transporter Name' },
        { accessorKey: 'amount', header: 'Amount' },
    ];

  
    const historyColumns: ColumnDef<HistoryData>[] = [
        { accessorKey: 'timestamp', header: 'Timestamp' },
        { accessorKey: 'liftNumber', header: 'Lift Number' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'poNumber', header: 'PO Number' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'productName', header: 'Product Name' },
        { accessorKey: 'billStatus', header: 'Bill Status' },
        { accessorKey: 'billNo', header: 'Bill No.' },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'leadTimeToLiftMaterial', header: 'Lead Time To Lift Material' },
        { accessorKey: 'typeOfBill', header: 'Type Of Bill' },
        { accessorKey: 'billAmount', header: 'Bill Amount' },
        { accessorKey: 'discountAmount', header: 'Discount Amount' },
        { accessorKey: 'paymentType', header: 'Payment Type' },
        { accessorKey: 'advanceAmountIfAny', header: 'Advance Amount If Any' },
        {
            accessorKey: 'photoOfBill',
            header: 'Photo Of Bill',
            cell: ({ row }) => {
                const photo = row.original.photoOfBill;
                return photo ? (
                    <a href={photo} target="_blank">
                        View
                    </a>
                ) : null;
            },
        },
        { accessorKey: 'transportationInclude', header: 'Transportation Include' },
        { accessorKey: 'transporterName', header: 'Transporter Name' },
        { accessorKey: 'amount', header: 'Amount' },
        { accessorKey: 'receiveStatus', header: 'Receiving Status' },
        { accessorKey: 'receivedQuantity', header: 'Received Quantity' },
        {
            accessorKey: 'photoOfProduct',
            header: 'Photo Of Product',
            cell: ({ row }) => {
                const photo = row.original.photoOfProduct;
                return photo ? (
                    <a href={photo} target="_blank">
                        View
                    </a>
                ) : null;
            },
        },
        { accessorKey: 'warrantyStatus', header: 'Warranty' },
        { accessorKey: 'warrantyEndDate', header: 'End Date Warranty' },
        { accessorKey: 'billReceived', header: 'Bill Received' },
        { accessorKey: 'billNumber', header: 'Bill Number' },
        { accessorKey: 'billAmount', header: 'Bill Amount' },
        {
            accessorKey: 'billImage',
            header: 'Bill Image',
            cell: ({ row }) => {
                const photo = row.original.photoOfBill;
                return photo ? (
                    <a href={photo} target="_blank">
                        View
                    </a>
                ) : null;
            },
        },
        { accessorKey: 'damageOrder', header: 'Damage Order' },
        { accessorKey: 'quantityAsPerBill', header: 'Quantity As Per Bill' },
        { accessorKey: 'priceAsPerPo', header: 'Price As Per Po' },
        { accessorKey: 'remark', header: 'Remark' },
    ];



    const schema = z.object({
        status: z.enum(['Received', 'Not Received']),
        quantity: z.coerce.number().optional(),
        photoOfProduct: z.instanceof(File).optional(),
        warrantyStatus: z.enum(['Not Any', 'Warranty', 'Gaurantee']).optional(),
        warrantyDate: z.coerce.date().optional(),
        billReceived: z.enum(['Received', 'Not Received']).optional(),
        billNo: z.string().optional(),
        billAmount: z.coerce.number().optional(),
        photoOfBill: z.instanceof(File).optional(),
        damageOrder: z.enum(['Yes', 'No']),
        quantityAsPerBill: z.enum(['Yes', 'No']),
        priceAsPerPo: z.enum(['Yes', 'No']),
        remark: z.string().optional(),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            damageOrder: undefined,
            quantityAsPerBill: undefined,
            priceAsPerPo: undefined,
            remark: '',
            status: undefined,
            quantity: undefined,
            warrantyStatus: undefined,
            warrantyDate: undefined,
            billReceived: undefined,
            billNo: '',
            billAmount: undefined,
            photoOfBill: undefined,
            photoOfProduct: undefined,
        },
    });

    const status = form.watch('status');
    const billReceived = form.watch('billReceived');
    const warrantyStatus = form.watch('warrantyStatus');

    useEffect(() => {
        if (selectedIndent) {
            form.setValue('quantity', selectedIndent.quantity);
        } else if (!openDialog) {
            form.reset({
                damageOrder: undefined,
                quantityAsPerBill: undefined,
                priceAsPerPo: undefined,
                remark: '',
                status: undefined,
                quantity: undefined,
                warrantyStatus: undefined,
                warrantyDate: undefined,
                billReceived: undefined,
                billNo: '',
                billAmount: undefined,
                photoOfBill: undefined,
                photoOfProduct: undefined,
            });
        }
    }, [selectedIndent, openDialog]);


    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            let photoOfProductUrl = '';
            let photoOfBillUrl = '';

            if (values.photoOfProduct) {
                photoOfProductUrl = await uploadFile(
                    values.photoOfProduct,
                    import.meta.env.VITE_PRODUCT_PHOTO_FOLDER
                );
            }

            if (values.photoOfBill) {
                photoOfBillUrl = await uploadFile(
                    values.photoOfBill,
                    import.meta.env.VITE_BILL_PHOTO_FOLDER
                );
            }

            // console.log(
            //     "values.warrantyDate?.toISOString() || '',",
            //     values.warrantyDate?.toISOString()
            // );
            // console.log('photoOfBillUrl', photoOfBillUrl);

            // Update the existing record in STORE IN sheet
            await postToSheet(
                storeInSheet
                    .filter((s) => s.liftNumber === selectedIndent?.liftNumber)
                    .map((prev) => ({
                        ...prev,
                        actual6: new Date().toISOString(),
                        // Map to correct StoreInSheet field names:
                        receivingStatus: values.status, // This should map to "Receiving Status"

                        receivedQuantity: values.quantity || 0,
                        photoOfProduct: photoOfProductUrl,

                        warrenty: values.warrantyStatus || '',

                        // Fix the warranty end date field name:
                        endDateWarrenty: values.warrantyDate ? formatDate(values.warrantyDate) : '', // Not "endDate"

                        billReceived: values.billReceived || '',

                        billNumber: values.billNo || '',
                        billAmount: values.billAmount || 0,
                        billImage: photoOfBillUrl,
                        damageOrder: values.damageOrder,
                        quantityAsPerBill: values.quantityAsPerBill === 'Yes' ? 1 : 0,
                        priceAsPerPo: values.priceAsPerPo === 'Yes' ? 1 : 0,
                        remark: values.remark || '',
                    })),
                'update',
                'STORE IN'
            );

            toast.success(`Updated store record for ${selectedIndent?.liftNumber}`);
            setOpenDialog(false);
            setTimeout(() => updateAll(), 1000);
        } catch {
            toast.error('Failed to update store record');
        }
    }

    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    // console.log("selectedIndent", selectedIndent);

    return (
        <div>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <Tabs defaultValue="pending">
                    <Heading
                        heading="Receive Items"
                        subtext="Receive items from purchase orders"
                        tabs
                    >
                        <Truck size={50} className="text-primary" />
                    </Heading>

                    <TabsContent value="pending">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={['productName', 'billNo', 'indentNo']}
                            dataLoading={indentLoading}
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={['productName', 'billNo', 'indentNo', 'vendorName']}
                            dataLoading={receivedLoading}
                        />
                    </TabsContent>
                </Tabs>

                {selectedIndent && (
                    <DialogContent className="sm:max-w-3xl">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="space-y-5"
                            >
                                <DialogHeader className="space-y-1">
                                    <DialogTitle>Store In</DialogTitle>
                                    <DialogDescription>
                                        Store In from indent{' '}
                                        <span className="font-medium">
                                            {selectedIndent.indentNo}
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="bg-muted p-4 rounded-md grid gap-3">
                                    <h3 className="text-lg font-bold">Item Details</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 bg-muted rounded-md gap-3 ">
                                        <div className="space-y-1">
                                            <p className="font-medium text-nowrap">Indent Number</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.indentNo}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Item Name</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.productName}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-nowrap">
                                                Ordered Quantity
                                            </p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.quantity}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-nowrap">UOM</p>
                                            <p className="text-sm font-light">
                                                {selectedIndent.uom}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <FormLabel>Receiving Status</FormLabel>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Set status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Received">
                                                                Received
                                                            </SelectItem>
                                                            <SelectItem value="Not Received">
                                                                Not Received
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="quantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Received Quantity</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="Enter received quantity"
                                                        // max={selectedIndent.quantity}
                                                        disabled={status !== 'Received'}
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="photoOfProduct"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Photo of Product</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="file"
                                                    disabled={status !== 'Received'}
                                                    onChange={(e) =>
                                                        field.onChange(e.target.files?.[0])
                                                    }
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="warrantyStatus"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <FormLabel>Warranty</FormLabel>
                                                        <FormControl>
                                                            <SelectTrigger
                                                                className="w-full"
                                                                disabled={status !== 'Received'}
                                                            >
                                                                <SelectValue placeholder="Set warranty" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Not Any">
                                                                Not Any
                                                            </SelectItem>
                                                            <SelectItem value="Warranty">
                                                                Warranty
                                                            </SelectItem>
                                                            <SelectItem value="Gaurantee">
                                                                Gaurantee
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="warrantyDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>End of Warranty / Guarantee</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        disabled={
                                                            status !== 'Received' ||
                                                            !['Warranty', 'Gaurantee'].includes(
                                                                warrantyStatus || ''
                                                            )
                                                        }
                                                        value={
                                                            field.value
                                                                ? field.value
                                                                      .toISOString()
                                                                      .split('T')[0]
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.target.value
                                                                    ? new Date(e.target.value)
                                                                    : undefined
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="billReceived"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <FormLabel>Bill Received</FormLabel>
                                                        <FormControl>
                                                            <SelectTrigger
                                                                className="w-full"
                                                                disabled={status !== 'Received'}
                                                            >
                                                                <SelectValue placeholder="Set bill received" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Received">
                                                                Received
                                                            </SelectItem>
                                                            <SelectItem value="Not Received">
                                                                Not Received
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="billNo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bill Number</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        disabled={
                                                            status !== 'Received' ||
                                                            billReceived !== 'Received'
                                                        }
                                                        placeholder="Enter bill number"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="billAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bill Amount</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        disabled={
                                                            status !== 'Received' ||
                                                            billReceived !== 'Received'
                                                        }
                                                        placeholder="Enter bill amount"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="photoOfBill"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Photo of Bill</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="file"
                                                        disabled={
                                                            status !== 'Received' ||
                                                            billReceived !== 'Received'
                                                        }
                                                        onChange={(e) =>
                                                            field.onChange(e.target.files?.[0])
                                                        }
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="damageOrder"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Damage Order</FormLabel>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes</SelectItem>
                                                            <SelectItem value="No">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="quantityAsPerBill"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantity As Per Bill</FormLabel>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes</SelectItem>
                                                            <SelectItem value="No">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="priceAsPerPo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Price As Per PO</FormLabel>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes</SelectItem>
                                                            <SelectItem value="No">No</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="remark"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Remark</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        className="w-full"
                                                        rows={3}
                                                        placeholder="Enter remark"
                                                        {...field}
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
                                        Store In
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
