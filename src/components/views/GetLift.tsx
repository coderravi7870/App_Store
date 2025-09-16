import { useSheets } from '@/context/SheetsContext';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import DataTable from '../element/DataTable';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
    DialogHeader,
    DialogFooter,
    DialogClose,
} from '../ui/dialog';
import { postToSheet, uploadFile } from '@/lib/fetchers';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { PuffLoader as Loader } from 'react-spinners';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Heading from '../element/Heading';
import { Pill } from '../ui/pill';
import { formatDate } from '@/lib/utils';

interface GetPurchaseData {
    indentNo: string;
    indenter: string;
    department: string;
    product: string;
    quantity: number;
    uom: string;
    poNumber: string;
}

interface HistoryData {
    liftNumber: string;
    indentNo: string;
    poNumber: string;
    vendorName: string;
    productName: string;
    billStatus: string;
    billNo: string;
    qty: number;
    leadTime: number;
    typeOfBill: string;
    billAmount: number;
    discountAmount: number;
    paymentType: string;
    advanceAmount: number;
    photoOfBill: string;
    transportationInclude: string;
    transporterName: string;
    amount: number;
}

export default () => {
    // Add storeInSheet to the destructuring
    const { indentSheet, indentLoading, updateIndentSheet, storeInSheet, updateStoreInSheet } =
        useSheets();

    const { user } = useAuth();

    const [selectedIndent, setSelectedIndent] = useState<GetPurchaseData | null>(null);
    const [historyData, setHistoryData] = useState<HistoryData[]>([]);
    const [tableData, setTableData] = useState<GetPurchaseData[]>([]);
    const [openDialog, setOpenDialog] = useState(false);

    // Fetching table data
    useEffect(() => {
        // Pending: planned7 is not null and actual7 is null
        setTableData(
            indentSheet
                .filter((sheet) => sheet.planned5 !== '' && sheet.actual5 == '')
                .map((sheet) => ({
                    indentNo: sheet.indentNumber,
                    indenter: sheet.indenterName,
                    department: sheet.department,
                    product: sheet.productName,
                    quantity: sheet.approvedQuantity,
                    uom: sheet.uom,
                    poNumber: sheet.poNumber,
                }))
        );
    }, [indentSheet]);

    useEffect(() => {
        setHistoryData(
            storeInSheet
                .map((sheet) => ({
                    liftNumber: sheet.liftNumber || '',
                    indentNo: sheet.indentNo || '',
                    poNumber: sheet.poNumber || '',
                    vendorName: sheet.vendorName || '',
                    productName: sheet.productName || '',
                    billStatus: sheet.billStatus || '',
                    billNo: sheet.billNo || '',
                    qty: sheet.qty || 0,
                    leadTime: sheet.leadTimeToLiftMaterial || 0,
                    typeOfBill: sheet.typeOfBill || '',
                    billAmount: sheet.billAmount || 0,
                    discountAmount: sheet.discountAmount || 0,
                    paymentType: sheet.paymentType || '',
                    advanceAmount: sheet.advanceAmountIfAny || 0,
                    photoOfBill: sheet.photoOfBill || '',
                    transportationInclude: sheet.transportationInclude || '',
                    transporterName: sheet.transporterName || '',
                    amount: sheet.amount || 0,
                }))
                .sort((a, b) => b.indentNo.localeCompare(a.indentNo))
        );
    }, [storeInSheet]);

    // Creating table columns
    const columns: ColumnDef<GetPurchaseData>[] = [
        ...(user.receiveItemAction
            ? [
                  {
                      header: 'Action',
                      cell: ({ row }: { row: Row<GetPurchaseData> }) => {
                          const indent = row.original;

                          return (
                              <div>
                                  <DialogTrigger asChild>
                                      <Button
                                          variant="outline"
                                          onClick={() => {
                                              setSelectedIndent(indent);
                                          }}
                                      >
                                          Update
                                      </Button>
                                  </DialogTrigger>
                              </div>
                          );
                      },
                  },
              ]
            : []),
        {
            accessorKey: 'indentNo',
            header: 'Indent No.',
        },
        {
            accessorKey: 'indenter',
            header: 'Indenter',
        },
        {
            accessorKey: 'department',
            header: 'Department',
        },
        {
            accessorKey: 'product',
            header: 'Product',
            cell: ({ getValue }) => (
                <div className="max-w-[150px] break-words whitespace-normal">
                    {getValue() as string}
                </div>
            ),
        },
        {
            accessorKey: 'quantity',
            header: 'Quantity',
        },
        {
            accessorKey: 'uom',
            header: 'UOM',
        },
        {
            accessorKey: 'poNumber',
            header: 'PO Number',
        },
    ];

    const historyColumns: ColumnDef<HistoryData>[] = [
        { accessorKey: 'liftNumber', header: 'Lift Number' },
        { accessorKey: 'indentNo', header: 'Indent No.' },
        { accessorKey: 'poNumber', header: 'PO Number' },
        { accessorKey: 'vendorName', header: 'Vendor Name' },
        { accessorKey: 'productName', header: 'Product Name' },
        { accessorKey: 'billStatus', header: 'Bill Status' },
        { accessorKey: 'billNo', header: 'Bill No.' },
        { accessorKey: 'qty', header: 'Qty' },
        { accessorKey: 'leadTime', header: 'Lead Time To Lift Material' },
        { accessorKey: 'typeOfBill', header: 'Type Of Bill' },
        { accessorKey: 'billAmount', header: 'Bill Amount' },
        { accessorKey: 'discountAmount', header: 'Discount Amount' },
        { accessorKey: 'paymentType', header: 'Payment Type' },
        { accessorKey: 'advanceAmount', header: 'Advance Amount If Any' },
        {
            accessorKey: 'photoOfBill',
            header: 'Photo Of Bill',
            cell: ({ row }) => {
                const photo = row.original.photoOfBill;
                return photo ? (
                    <a href={photo} target="_blank" rel="noopener noreferrer">
                        View
                    </a>
                ) : null;
            },
        },
        { accessorKey: 'transportationInclude', header: 'Transportation Include' },
        { accessorKey: 'transporterName', header: 'Transporter Name' },
        { accessorKey: 'amount', header: 'Amount' },
    ];

    // Creating form schema
    const formSchema = z.object({
        billStatus: z.string().nonempty('Bill status is required'),
        billNo: z.string().optional(),
        qty: z.coerce.number().optional(),
        leadTime: z.string().optional(),
        typeOfBill: z.string().optional(),
        billAmount: z.coerce.number().optional(),
        discountAmount: z.coerce.number().optional(),
        paymentType: z.string().optional(),
        advanceAmount: z.coerce.number().optional(),
        photoOfBill: z.instanceof(File).optional(),

        vendorName: z.string().optional(),
        transportationInclude: z.string().optional(),
        transporterName: z.string().optional(),
        amount: z.coerce.number().optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            billStatus: '',
            billNo: '',
            qty: 0,
            leadTime: '',
            typeOfBill: '',
            billAmount: 0,
            discountAmount: 0,
            paymentType: '',
            advanceAmount: 0,

            vendorName: '',
            transportationInclude: '',
            transporterName: '',
            amount: 0,
        },
    });

    const billStatus = form.watch('billStatus');
    const typeOfBill = form.watch('typeOfBill');

    // async function onSubmit(values: z.infer<typeof formSchema>) {
    //     try {
    //         let photoUrl = '';
    //         if (values.photoOfBill) {
    //             photoUrl = await uploadFile(
    //                 values.photoOfBill,
    //                 import.meta.env.VITE_BILL_PHOTO_FOLDER || 'bill-photos'
    //             );
    //         }

    //         // Only update the specific fields related to purchase/bill details
    //         // DO NOT update poNumber (column AQ), poCopy (column AP), or actual4 (column AN)
    //         await postToSheet(
    //             indentSheet
    //                 .filter((s) => s.indentNumber === selectedIndent?.indentNo)
    //                 .map((prev) => {
    //                     // Destructure to exclude the fields we don't want to update
    //                     const { actual4, poNumber, poCopy, ...safeData } = prev;

    //                     return {
    //                         ...safeData,
    //                         // Only update these specific fields:
    //                         actual7: new Date().toISOString(),              // Column BC
    //                         billStatus: values.billStatus,                  // Column BE
    //                         billNumber: values.billNo || '',               // Column BF
    //                         qty: values.qty || prev.approvedQuantity,      // Column BG
    //                         leadTimeToLiftMaterial: values.leadTime || prev.leadTimeToLiftMaterial, // Column BH
    //                         typeOfBill: values.typeOfBill || '',           // Column BI
    //                         billAmount: values.billAmount || 0,            // Column BJ
    //                         discountAmount: values.discountAmount || 0,    // Column BK
    //                         paymentType: values.paymentType || '',         // Column BL
    //                         advanceAmountIfAny: values.advanceAmount || 0, // Column BM
    //                         photoOfBill: photoUrl,                         // Column BN
    //                         // actual4, poNumber, and poCopy are explicitly excluded
    //                     };
    //                 }),
    //             'update'
    //         );
    //         toast.success(`Updated purchase details for ${selectedIndent?.indentNo}`);
    //         setOpenDialog(false);
    //         form.reset();
    //         setTimeout(() => updateIndentSheet(), 1000);
    //     } catch {
    //         toast.error('Failed to update purchase details');
    //     }
    // }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            let photoUrl = '';
            if (values.photoOfBill) {
                photoUrl = await uploadFile(
                    values.photoOfBill,
                    import.meta.env.VITE_BILL_PHOTO_FOLDER || 'bill-photos'
                );
            }

            // Create new record for storeInSheet
            const newStoreInRecord = {
                timestamp: new Date().toISOString(),
                indentNo: selectedIndent?.indentNo || '',
                poNumber: selectedIndent?.poNumber || '',
                vendorName: values.vendorName || '', // You might want to get this from somewhere
                productName: selectedIndent?.product || '',
                billStatus: values.billStatus,
                billNo: values.billNo || '',
                qty: values.qty || selectedIndent?.quantity || 0,
                leadTimeToLiftMaterial: Number(values.leadTime) || 0,
                typeOfBill: values.typeOfBill || '',
                billAmount: values.billAmount || 0,
                discountAmount: values.discountAmount || 0,
                paymentType: values.paymentType || '',
                advanceAmountIfAny: values.advanceAmount || 0,
                photoOfBill: photoUrl,
                transportationInclude: values.transportationInclude || '', // Changed from hardcoded ''
                transporterName: values.transporterName || '', // Changed from hardcoded ''
                amount: values.amount || 0, // Changed from hardcoded 0
            };

            await postToSheet([newStoreInRecord], 'insert', 'STORE IN');

            toast.success(`Created store record for ${selectedIndent?.indentNo}`);
            setOpenDialog(false);
            form.reset();
            setTimeout(() => updateStoreInSheet(), 1000);
        } catch {
            toast.error('Failed to create store record');
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
                        heading="Get Purchase"
                        subtext="Manage purchase bill details and status"
                        tabs
                    >
                        <ShoppingCart size={50} className="text-primary" />
                    </Heading>

                    <TabsContent value="pending">
                        <DataTable
                            data={tableData}
                            columns={columns}
                            searchFields={['product', 'department', 'indenter', 'poNumber']}
                            dataLoading={indentLoading}
                        />
                    </TabsContent>
                    <TabsContent value="history">
                        <DataTable
                            data={historyData}
                            columns={historyColumns}
                            searchFields={['product', 'department', 'indenter', 'poNumber']}
                            dataLoading={false}
                        />
                    </TabsContent>
                </Tabs>

                {selectedIndent && (
                    <DialogContent className="max-w-2xl">
                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit, onError)}
                                className="space-y-5"
                            >
                                <DialogHeader className="space-y-1">
                                    <DialogTitle>Update Purchase Details</DialogTitle>
                                    <DialogDescription>
                                        Update purchase details for{' '}
                                        <span className="font-medium">
                                            {selectedIndent.indentNo}
                                        </span>
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-muted py-2 px-5 rounded-md">
                                    <div className="space-y-1">
                                        <p className="font-medium">Indent Number</p>
                                        <p className="text-sm font-light">
                                            {selectedIndent.indentNo}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium">Product</p>
                                        <p className="text-sm font-light">
                                            {selectedIndent.product}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium">PO Number</p>
                                        <p className="text-sm font-light">
                                            {selectedIndent.poNumber}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <FormField
                                        control={form.control}
                                        name="billStatus"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bill Status *</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select bill status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Bill Received">
                                                            Bill Received
                                                        </SelectItem>
                                                        <SelectItem value="Bill Not Received">
                                                            Bill Not Received
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    {billStatus === 'Bill Received' && (
                                        <FormField
                                            control={form.control}
                                            name="billNo"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Bill No. *</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="Enter bill number"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {billStatus && (
                                        <>
                                            <FormField
                                                control={form.control}
                                                name="qty"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Qty</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="Enter quantity"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="leadTime"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Lead Time To Lift Material *
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter lead time"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            

                                            <FormField
                                                control={form.control}
                                                name="vendorName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Vendor Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter vendor name"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="transportationInclude"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>
                                                            Transportation Include
                                                        </FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select transportation" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Yes">
                                                                    Yes
                                                                </SelectItem>
                                                                <SelectItem value="No">
                                                                    No
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="transporterName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Transporter Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter transporter name"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="amount"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Amount</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder="Enter amount"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />



                                            <FormField
                                                control={form.control}
                                                name="typeOfBill"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Type Of Bill *</FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select type of bill" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="independent">
                                                                    Independent
                                                                </SelectItem>
                                                                <SelectItem value="common">
                                                                    Common
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />

                                            {typeOfBill === 'independent' && (
                                                <>
                                                    <FormField
                                                        control={form.control}
                                                        name="billAmount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Bill Amount *</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="Enter bill amount"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="discountAmount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Discount Amount
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="Enter discount amount"
                                                                        {...field}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="paymentType"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Payment Type</FormLabel>
                                                                <Select
                                                                    onValueChange={field.onChange}
                                                                    value={field.value}
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select payment type" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="Advance">
                                                                            Advance
                                                                        </SelectItem>
                                                                        <SelectItem value="Credit">
                                                                            Credit
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name="advanceAmount"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>
                                                                    Advance Amount If Any
                                                                </FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="Enter advance amount"
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
                                                                <FormLabel>Photo Of Bill</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) =>
                                                                            field.onChange(
                                                                                e.target.files?.[0]
                                                                            )
                                                                        }
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </>
                                            )}
                                        </>
                                    )}
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
                                        Update
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
