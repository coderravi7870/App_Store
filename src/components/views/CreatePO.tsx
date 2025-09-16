import { ChevronsRightLeft, FilePlus2, Pencil, Save, Trash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { z } from 'zod';
import { Button } from '../ui/button';
import { SidebarTrigger } from '../ui/sidebar';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import type { PoMasterSheet } from '@/types';
import { postToSheet, uploadFile } from '@/lib/fetchers';
import { useEffect, useState } from 'react';
import { useSheets } from '@/context/SheetsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    calculateGrandTotal,
    calculateSubtotal,
    calculateTotal,
    calculateTotalGst,
    cn,
    formatDate,
} from '@/lib/utils';
import { toast } from 'sonner';
import { ClipLoader as Loader } from 'react-spinners';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '../ui/textarea';
import { pdf } from '@react-pdf/renderer';
import POPdf, { type POPdfProps } from '../element/POPdf';

function generatePoNumber(poNumbers: string[], today = new Date()): string {
    // Step 1: Get financial year from today's date
    const fyStart = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear();
    const fy = `${(fyStart % 100).toString().padStart(2, '0')}-${((fyStart + 1) % 100)
        .toString()
        .padStart(2, '0')}`;

    const prefix = `JJSPL/STORES/${fy}/`;

    // Step 2: Extract numbers for curre nt financial year
    const numbersInFY = poNumbers
        .filter((po) => po.includes(`/${fy}/`))
        .map((po) => {
            const match = po.match(/\/(\d+)(?:-\d+)?$/); // gets '80' from '80-2'
            return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null);

    // Step 3: Determine next number
    const next = numbersInFY.length > 0 ? Math.max(...numbersInFY) + 1 : 1;

    return `${prefix}${next}`;
}

function incrementPoRevision(poNumber: string, allPOs: PoMasterSheet[]): string {
    const parts = poNumber.split('/');
    const lastSegment = parts[parts.length - 1];

    const [mainSeq, _] = lastSegment.split('-');
    const baseKey = [...parts.slice(0, -1), mainSeq].join('/');

    let maxRevision = 0;

    for (const po of allPOs) {
        const poParts = po.poNumber.split('/');
        const poLastSegment = poParts[poParts.length - 1];
        const [poSeq, poRev] = poLastSegment.split('-');

        const poBaseKey = [...poParts.slice(0, -1), poSeq].join('/');
        if (poBaseKey === baseKey) {
            const revision = poRev ? parseInt(poRev, 10) : 0;
            if (revision > maxRevision) {
                maxRevision = revision;
            }
        }
    }

    return `${baseKey}-${maxRevision + 1}`;
}

function filterUniquePoNumbers(data: PoMasterSheet[]): PoMasterSheet[] {
    const seen = new Set<string>();
    const result: PoMasterSheet[] = [];

    for (const po of data) {
        if (!seen.has(po.poNumber)) {
            seen.add(po.poNumber);
            result.push(po);
        }
    }

    return result;
}

export default () => {
    const {
        indentSheet,
        poMasterSheet,
        updateIndentSheet,
        updatePoMasterSheet,
        masterSheet: details,
    } = useSheets();
    const [readOnly, setReadOnly] = useState(-1);
    const [mode, setMode] = useState<'create' | 'revise'>('create');
    const [isEditingDestination, setIsEditingDestination] = useState(false);
    const [destinationAddress, setDestinationAddress] = useState('');

    // Initialize destination address from details
    useEffect(() => {
        if (details?.destinationAddress) {
            setDestinationAddress(details.destinationAddress);
        }
    }, [details]);

    const schema = z.object({
        poNumber: z.string().nonempty(),
        poDate: z.coerce.date(),
        supplierName: z.string().nonempty(),
        supplierAddress: z.string().nonempty(),
        gstin: z.string().nonempty(),
        quotationNumber: z.string().nonempty(),
        quotationDate: z.coerce.date(),
        ourEnqNo: z.string(),
        enquiryDate: z.coerce.date(),
        description: z.string(),
        indents: z.array(
            z.object({
                indentNumber: z.string().nonempty(),
                gst: z.coerce.number(),
                discount: z.coerce.number().default(0).optional(),
                quantity: z.coerce.number().optional(), // Add this
                unit: z.string().optional(), // Add this
                rate: z.coerce.number().optional(), // Add this
            })
        ),
        terms: z.array(z.string().nonempty()).max(10),
        preparedBy: z.string().nonempty(),
        approvedBy: z.string().nonempty(),

        deliveryDate: z.coerce.date(),
        paymentTerms: z.enum(['Advance', 'Party PI', 'Party Advance', 'After Delivery']),
        numberOfDays: z.coerce.number().optional(),
    });

    type FormData = z.infer<typeof schema>;
    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            poNumber: generatePoNumber(poMasterSheet.map((p) => p.poNumber)),
            poDate: new Date(),
            supplierName: '',
            supplierAddress: '',
            preparedBy: '',
            approvedBy: '',
            gstin: '',
            quotationNumber: '',
            quotationDate: new Date(),
            ourEnqNo: '',
            enquiryDate: undefined,
            indents: [],
            terms: details?.defaultTerms || [],
            deliveryDate: new Date(),
            paymentTerms: undefined,
            numberOfDays: undefined,
        },
    });

    useEffect(() => {
        if (details) {
            form.setValue('terms', details.defaultTerms);
        }
    }, [details]);

    const indents = form.watch('indents');
    const vendor = form.watch('supplierName');
    const poDate = form.watch('poDate');
    const poNumber = form.watch('poNumber');

    const termsArray = useFieldArray({
        control: form.control,
        // @ts-ignore
        name: 'terms',
    });

    const itemsArray = useFieldArray({
        control: form.control,
        // @ts-ignore
        name: 'indents',
    });

    useEffect(() => {
        if (mode === 'create') {
            form.setValue(
                'poNumber',
                generatePoNumber(
                    poMasterSheet.map((p) => p.poNumber),
                    poDate
                )
            );
        }
    }, [poDate, poMasterSheet, mode]);

    useEffect(() => {
        if (mode === 'revise') {
            form.reset({
                poNumber: '',
                poDate: undefined,
                supplierName: '',
                supplierAddress: '',
                preparedBy: '',
                approvedBy: '',
                gstin: '',
                quotationNumber: '',
                quotationDate: undefined,
                ourEnqNo: '',
                enquiryDate: undefined,
                indents: [],
                terms: [],
            });
        } else {
            form.reset({
                poNumber: generatePoNumber(poMasterSheet.map((p) => p.poNumber)),
                poDate: new Date(),
                supplierName: '',
                supplierAddress: '',
                preparedBy: '',
                approvedBy: '',
                gstin: '',
                quotationNumber: '',
                quotationDate: new Date(),
                ourEnqNo: '',
                enquiryDate: undefined,
                indents: [],
                terms: details?.defaultTerms || [],
            });
        }
    }, [mode]);

    useEffect(() => {
        if (vendor && mode === 'create') {
            const items = indentSheet.filter(
                (i) => i.planned4 !== '' && i.actual4 === '' && i.approvedVendorName === vendor
            );
            form.setValue(
                'supplierAddress',
                details?.vendors.find((v) => v.vendorName === vendor)?.address || ''
            );
            form.setValue(
                'gstin',
                details?.vendors.find((v) => v.vendorName === vendor)?.gstin || ''
            );
            form.setValue(
                'indents',
                items.map((i) => ({
                    indentNumber: i.indentNumber,
                    gst: 18,
                    discount: 0,
                    quantity: i.approvedQuantity, // Add this
                    unit: i.uom, // Add this
                    rate: i.approvedRate, // Add this
                }))
            );
        }
    }, [vendor]);

    useEffect(() => {
        const po = poMasterSheet.find((p) => p.poNumber === poNumber)!;
        if (mode === 'revise' && po) {
            const vendor = details?.vendors.find((v) => v.vendorName === po.partyName);
            form.setValue('poDate', new Date(po.timestamp));
            form.setValue('supplierName', po.partyName);
            form.setValue('supplierAddress', vendor?.address || '');
            form.setValue('preparedBy', po.preparedBy);
            form.setValue('approvedBy', po.approvedBy);
            form.setValue('gstin', vendor?.gstin || '');
            form.setValue('quotationNumber', po.quotationNumber);
            form.setValue('quotationDate', new Date(po.quotationDate));
            form.setValue('description', po.description);
            form.setValue('ourEnqNo', po.enquiryNumber);
            form.setValue('enquiryDate', new Date(po.enquiryDate));
            form.setValue(
                'indents',
                poMasterSheet
                    .filter((p) => p.poNumber === po.poNumber)
                    .map((po) => ({
                        indentNumber: po.internalCode,
                        gst: po.gst,
                        discount: po.discount,
                    }))
            );
            const terms = [];
            for (let i = 0; i < 10; i++) {
                const term = po[`term${i + 1}` as keyof PoMasterSheet] as string;
                if (term !== '') {
                    terms.push(term);
                }
            }
            form.setValue('terms', terms);
        }
    }, [poNumber]);

    const handleDestinationEdit = () => {
        setIsEditingDestination(true);
    };

    const handleDestinationSave = () => {
        setIsEditingDestination(false);
        toast.success('Destination address updated');
    };

    const handleDestinationCancel = () => {
        setDestinationAddress(details?.destinationAddress || '');
        setIsEditingDestination(false);
    };

    async function onSubmit(values: FormData) {
        try {
            const poNumber =
                mode === 'create'
                    ? values.poNumber
                    : incrementPoRevision(values.poNumber, poMasterSheet);
            const grandTotal = calculateGrandTotal(
                values.indents.map((indent) => {
                    const value = indentSheet.find((i) => i.indentNumber === indent.indentNumber);
                    return {
                        quantity: indent.quantity || value?.approvedQuantity || 0, // Use form values
            rate: indent.rate || value?.approvedRate || 0,  
                        discountPercent: indent?.discount || 0,
                        gstPercent: indent.gst,
                    };
                })
            );

            // Convert logo image to base64 for PDF
            const logoResponse = await fetch('/logo.png');
            const logoBlob = await logoResponse.blob();
            const logoBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(logoBlob);
            });

            const pdfProps: POPdfProps = {
                // companyLogo: logoBase64,
                companyName: details?.companyName || '',
                companyPhone: details?.companyPhone || '',
                companyGstin: details?.companyGstin || '',
                companyPan: details?.companyPan || '',
                companyAddress: details?.companyAddress || '',
                billingAddress: details?.billingAddress || '',
                destinationAddress: destinationAddress, // Use the editable destination address
                supplierName: values.supplierName,
                supplierAddress: values.supplierAddress,
                supplierGstin: values.gstin,
                orderNumber: poNumber,
                orderDate: formatDate(values.poDate),
                quotationNumber: values.quotationNumber,
                quotationDate: formatDate(values.quotationDate),
                enqNo: values.ourEnqNo,
                enqDate: formatDate(values.enquiryDate),
                description: values.description,
                items: values.indents.map((item) => {
                    const indent = indentSheet.find((i) => i.indentNumber === item.indentNumber)!;
                    return {
                        internalCode: indent.indentNumber,
                        product: indent.productName,
                        description: indent.specifications,
                        quantity: item.quantity || 0, // Use editable quantity
                        unit: item.unit || '', // Use editable unit
                        rate: item.rate || 0, // Use editable rate

                        gst: item.gst || 0,
                        discount: item.discount || 0,
                        amount: calculateTotal(
                            item.rate || 0,
                            item.gst || 0,
                            item.discount || 0,
                            item.quantity || 0
                        ),
                    };
                }),
                total: calculateSubtotal(
                    values.indents.map((indent) => {
                        const value = indentSheet.find(
                            (i) => i.indentNumber === indent.indentNumber
                        );
                        return {
                            quantity: indent.quantity || 0, // Use editable quantity
                            rate: indent.rate || 0, // Use editable rate
                            discountPercent: indent?.discount || 0,
                        };
                    })
                ),
                gstAmount: calculateTotalGst(
                    values.indents.map((indent) => {
                        const value = indentSheet.find(
                            (i) => i.indentNumber === indent.indentNumber
                        );
                        return {
                            quantity: indent.quantity || 0, // Use editable quantity
                            rate: indent.rate || 0, // Use editable rate
                            discountPercent: indent?.discount || 0,
                            gstPercent: indent.gst,
                        };
                    })
                ),
                grandTotal: grandTotal,
                terms: values.terms,
                preparedBy: values.preparedBy,
                approvedBy: values.approvedBy,
            };

            const blob = await pdf(<POPdf {...pdfProps} />).toBlob();
            const file = new File([blob], `PO-${poNumber}.pdf`, {
                type: 'application/pdf',
            });
            const email = details?.vendors.find((v) => v.vendorName === values.supplierName)?.email;

            if (!email) {
                toast.error("Supplier's Email was not found!");
                return;
            }
            const url = await uploadFile(
                file,
                import.meta.env.VITE_PURCHASE_ORDERS_FOLDER,
                'email',
                email
            );

            

const rows: PoMasterSheet[] = values.indents.map((v) => {
    const indent = indentSheet.find((i) => i.indentNumber === v.indentNumber)!;

    const formatDateTime = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date
            .getFullYear()
            .toString()
            .slice(-2)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
            date.getSeconds()
        )}`;
    };

    return {
        timestamp: values.poDate.toISOString(),
        partyName: values.supplierName,
        poNumber,
        internalCode: v.indentNumber,
        product: indent.productName,
        description: values.description,
        // ✅ Use edited values from form instead of original values
        quantity: v.quantity || indent.approvedQuantity,     // Use form value first
        unit: v.unit || indent.uom,                          // Use form value first
        rate: v.rate || indent.approvedRate,                 // Use form value first
        gst: v.gst,
        discount: v.discount || 0,
        amount: calculateTotal(
            v.rate || indent.approvedRate,           // ✅ Use form value for calculation
            v.gst,
            v.discount || 0,
            v.quantity || indent.approvedQuantity    // ✅ Use form value for calculation
        ),
        totalPoAmount: grandTotal,
        pdf: url,
        preparedBy: values.preparedBy,
        approvedBy: values.approvedBy,
        quotationNumber: values.quotationNumber,
        quotationDate: formatDateTime(values.quotationDate),
        enquiryNumber: values.ourEnqNo,
        enquiryDate: formatDateTime(values.enquiryDate),
        term1: values.terms[0],
        term2: values.terms[1],
        term3: values.terms[2],
        term4: values.terms[3],
        term5: values.terms[4],
        term6: values.terms[5],
        term7: values.terms[6],
        term8: values.terms[7],
        term9: values.terms[8],
        term10: values.terms[9],
        discountPercent: v.discount || 0,
        gstPercent: v.gst,
        deliveryDate: formatDateTime(values.deliveryDate),
        paymentTerms: values.paymentTerms,
        numberOfDays: values.numberOfDays || 0,
    };
});

            await postToSheet(rows, 'insert', 'PO MASTER');
            toast.success(`Successfully ${mode}d purchase order`);
            form.reset();
            setTimeout(() => {
                updatePoMasterSheet();
                updateIndentSheet();
            }, 1000);
        } catch (e) {
            console.log(e);
            toast.error(`Failed to ${mode} purchase order`);
        }
    }

    function onError(e: any) {
        console.log(e);
        toast.error('Please fill all required fields');
    }

    return (
        <div className="grid place-items-center w-full bg-gradient-to-br from-blue-100 via-purple-50 to-blue-50 rounder-md">
            <div className="flex justify-between p-5 w-full">
                <div className="flex gap-2 items-center">
                    <FilePlus2 size={50} className="text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold text-primary">Create or Revise PO</h1>
                        <p className="text-muted-foreground text-sm">
                            Create purchase order for indends or revise previous orders
                        </p>
                    </div>
                </div>
                <SidebarTrigger />
            </div>
            <div className="sm:p-4 max-w-6xl">
                <div className="w-full">
                    <Tabs
                        defaultValue="create"
                        onValueChange={(v) => setMode(v === 'create' ? v : 'revise')}
                    >
                        <TabsList className="h-10 w-full rounded-none">
                            <TabsTrigger value="create">Create</TabsTrigger>
                            <TabsTrigger value="revise">Revise</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit, onError)}
                        className="flex flex-col items-center"
                    >
                        <div className="space-y-4 p-4 w-full bg-white shadow-md rounded-sm">
                            <div className="flex items-center justify-center gap-4 bg-blue-50 p-2 h-25 rounded">
                                <img
                                    src="/logo (1).png"
                                    alt="Company Logo"
                                    className="w-40 h-40 object-contain"
                                />
                                <div className="text-center">
                                    <h1 className="text-2xl font-bold">{details?.companyName}</h1>
                                    <div>
                                        <p className="text-sm">{details?.companyAddress}</p>
                                        <p className="text-sm">
                                            Phone No: +{details?.companyPhone}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <hr />
                            <h2 className="text-center font-bold text-lg">Purchase Order</h2>
                            <hr />

                            <div className="grid gap-5 px-4 py-2 text-foreground/80">
                                <div className="grid grid-cols-2 gap-x-5">
                                    <FormField
                                        control={form.control}
                                        name="poNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                {mode === 'create' ? (
                                                    <>
                                                        <FormLabel>PO Number</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="h-9"
                                                                readOnly
                                                                placeholder="Enter PO number"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </>
                                                ) : (
                                                    <FormControl>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                        >
                                                            <FormLabel>PO Number</FormLabel>
                                                            <FormControl>
                                                                <SelectTrigger
                                                                    size="sm"
                                                                    className="w-full"
                                                                >
                                                                    <SelectValue placeholder="Select PO" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {filterUniquePoNumbers(
                                                                    poMasterSheet
                                                                ).map((i, k) => (
                                                                    <SelectItem
                                                                        key={k}
                                                                        value={i.poNumber}
                                                                    >
                                                                        {i.poNumber}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="poDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>PO Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        type="date"
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
                                </div>

                                <div className="grid grid-cols-3 gap-x-5">
                                    <FormField
                                        control={form.control}
                                        name="supplierName"
                                        render={({ field }) => (
                                            <FormItem>
                                                {mode === 'create' ? (
                                                    <FormControl>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value}
                                                        >
                                                            <FormLabel>Supplier Name</FormLabel>
                                                            <FormControl>
                                                                <SelectTrigger
                                                                    size="sm"
                                                                    className="w-full"
                                                                >
                                                                    <SelectValue placeholder="Select supplier" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {[
                                                                    ...new Map(
                                                                        indentSheet
                                                                            .filter(
                                                                                (i) =>
                                                                                    i.approvedVendorName !==
                                                                                        '' &&
                                                                                    i.planned4 !==
                                                                                        '' &&
                                                                                    i.actual4 === ''
                                                                            )
                                                                            .map((i) => [
                                                                                i.approvedVendorName,
                                                                                i,
                                                                            ]) // Use approvedVendorName as the key
                                                                    ).values(),
                                                                ].map((i, k) => (
                                                                    <SelectItem
                                                                        key={k}
                                                                        value={i.approvedVendorName}
                                                                    >
                                                                        {i.approvedVendorName}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                ) : (
                                                    <>
                                                        <FormLabel>Supplier Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                className="h-9"
                                                                readOnly
                                                                placeholder="Enter supplier name"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </>
                                                )}
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="supplierAddress"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Supplier Address</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        readOnly={mode === 'revise'}
                                                        placeholder="Enter supplier address"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="gstin"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>GSTIN</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        readOnly={mode === 'revise'}
                                                        placeholder="Enter GSTIN"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-x-5">
                                    <FormField
                                        control={form.control}
                                        name="quotationNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quotation Number</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        placeholder="Enter Quotation number"
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="quotationDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quotation Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        type="date"
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
                                </div>
                                <div className="grid grid-cols-3 gap-x-5">
                                    <FormField
                                        control={form.control}
                                        name="ourEnqNo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Our Enq No.</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        placeholder="Enter Our Enq No."
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="enquiryDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Enquiry Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        type="date"
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
                                        name="deliveryDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Delivery Date</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-9"
                                                        type="date"
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
                                        name="paymentTerms"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Payment Terms</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger
                                                            size="sm"
                                                            className="w-full h-9"
                                                        >
                                                            <SelectValue placeholder="Select payment terms" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Advance">
                                                            Advance
                                                        </SelectItem>
                                                        <SelectItem value="Party PI">
                                                            Party PI
                                                        </SelectItem>
                                                        <SelectItem value="Party Advance">
                                                            Party Advance
                                                        </SelectItem>
                                                        <SelectItem value="After Delivery">
                                                            After Delivery
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    {form.watch('paymentTerms') === 'After Delivery' && (
                                        <FormField
                                            control={form.control}
                                            name="numberOfDays"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Number of Days</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            className="h-9"
                                                            type="number"
                                                            placeholder="Enter number of days"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </div>

                            <hr />

                            <div className="grid md:grid-cols-3 gap-3">
                                <Card className="p-0 gap-0 shadow-xs rounded-[3px]">
                                    <CardHeader className="bg-muted px-5 py-2">
                                        <CardTitle className="text-center">
                                            Our Commercial Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 text-sm">
                                        <p>
                                            <span className="font-medium">GSTIN</span>{' '}
                                            {details?.companyGstin}
                                        </p>
                                        <p>
                                            <span className="font-medium">Pan No.</span>{' '}
                                            {details?.companyPan}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="p-0 gap-0 shadow-xs rounded-[3px]">
                                    <CardHeader className="bg-muted px-5 py-2">
                                        <CardTitle className="text-center">
                                            Billing Address
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 text-sm">
                                        <p>M/S {details?.companyName}</p>
                                        <p>{details?.billingAddress}</p>
                                    </CardContent>
                                </Card>
                                <Card className="p-0 gap-0 shadow-xs rounded-[3px]">
                                    <CardHeader className="bg-muted px-5 py-2">
                                        <CardTitle className="text-center flex items-center justify-between">
                                            Destination Address
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={
                                                    isEditingDestination
                                                        ? handleDestinationSave
                                                        : handleDestinationEdit
                                                }
                                                className="h-6 w-6 p-0 hover:bg-gray-200"
                                            >
                                                {isEditingDestination ? (
                                                    <Save size={14} className="text-green-600" />
                                                ) : (
                                                    <Pencil size={14} className="text-gray-600" />
                                                )}
                                            </Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-5 text-sm">
                                        <p>M/S {details?.companyName}</p>
                                        {isEditingDestination ? (
                                            <div className="flex items-center gap-2 mt-1">
                                                <Input
                                                    value={destinationAddress}
                                                    onChange={(e) =>
                                                        setDestinationAddress(e.target.value)
                                                    }
                                                    className="h-7 text-sm"
                                                    placeholder="Enter destination address"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleDestinationSave();
                                                        } else if (e.key === 'Escape') {
                                                            handleDestinationCancel();
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleDestinationCancel}
                                                    className="h-6 w-6 p-0 hover:bg-red-100"
                                                >
                                                    <Trash size={12} className="text-red-500" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <p>{destinationAddress}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <hr />

                            <div>
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Enter message"
                                                    className="resize-y" // or "resize-y" to allow vertical resizing
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <hr />

                            <div className="mx-4 grid">
                                <div className="rounded-[3px] w-full min-w-full overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted">
                                            <TableRow>
                                                <TableHead>S/N</TableHead>
                                                <TableHead>Internal Code</TableHead>
                                                <TableHead>Product</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Qty</TableHead>
                                                <TableHead>Unit</TableHead>
                                                <TableHead>Rate</TableHead>
                                                <TableHead>GST (%)</TableHead>
                                                <TableHead>Discount (%)</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {itemsArray.fields.map((field, index) => {
                                                const value = indents[index];
                                                const indent = indentSheet.find(
                                                    (i) => i.indentNumber === value.indentNumber
                                                );
                                                return (
                                                    <TableRow key={field.id}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>
                                                            {indent?.indentNumber}
                                                        </TableCell>
                                                        <TableCell>{indent?.productName}</TableCell>
                                                        <TableCell>
                                                            {indent?.specifications || (
                                                                <span className="text-muted-foreground">
                                                                    No Description
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.quantity`}
                                                                render={({
                                                                    field: quantityField,
                                                                }) => (
                                                                    <FormItem className="flex justify-center items-center">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                className="rounded-sm h-9 max-w-15 p-0 text-center"
                                                                                {...quantityField}
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.unit`}
                                                                render={({ field: unitField }) => (
                                                                    <FormItem className="flex justify-center items-center">
                                                                        <FormControl>
                                                                            <Input
                                                                                className="rounded-sm h-9 max-w-15 p-0 text-center"
                                                                                {...unitField}
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.rate`}
                                                                render={({ field: rateField }) => (
                                                                    <FormItem className="flex justify-center items-center">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                className="rounded-sm h-9 max-w-15 p-0 text-center"
                                                                                {...rateField}
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.gst`} // Assuming productName is in your schema
                                                                render={({
                                                                    field: indentField,
                                                                }) => (
                                                                    <FormItem className="flex justify-center items-center">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                max="100"
                                                                                className="rounded-sm h-9 max-w-15 p-0 text-center"
                                                                                {...indentField}
                                                                            />
                                                                        </FormControl>{' '}
                                                                        %
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <FormField
                                                                control={form.control}
                                                                name={`indents.${index}.discount`} // Assuming productName is in your schema
                                                                render={({
                                                                    field: indentField,
                                                                }) => (
                                                                    <FormItem className="flex justify-center items-center">
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                className="rounded-sm h-9 max-w-15 p-0 text-center"
                                                                                max="100"
                                                                                {...indentField}
                                                                            />
                                                                        </FormControl>{' '}
                                                                        %
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {calculateTotal(
                                                                value.rate ||
                                                                    indent?.approvedRate ||
                                                                    0, // Use editable rate
                                                                value.gst,
                                                                value.discount || 0,
                                                                value.quantity ||
                                                                    indent?.approvedQuantity ||
                                                                    0 // Use editable quantity
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    itemsArray.remove(index);
                                                                }}
                                                            >
                                                                <Trash
                                                                    size={20}
                                                                    className="text-red-300"
                                                                />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="flex justify-end p-4">
                                    <div className="w-80 rounded-[3px] bg-muted">
                                        <p className="flex px-7 py-2 justify-between">
                                            <span>Total:</span>
                                            <span className="text-end">
                                                {calculateSubtotal(
                                                    indents.map((indent) => {
                                                        const value = indentSheet.find(
                                                            (i) =>
                                                                i.indentNumber ===
                                                                indent.indentNumber
                                                        );
                                                        return {
                                                            quantity:
                                                                indent.quantity ||
                                                                value?.approvedQuantity ||
                                                                0, // Use editable quantity
                                                            rate:
                                                                indent.rate ||
                                                                value?.approvedRate ||
                                                                0, // Use editable rate
                                                            discountPercent: indent?.discount || 0,
                                                        };
                                                    })
                                                )}
                                            </span>
                                        </p>
                                        <hr />
                                        <p className="flex px-7 py-2 justify-between">
                                            <span>GST Amount:</span>
                                            <span className="text-end">
                                                {calculateTotalGst(
                                                    indents.map((indent) => {
                                                        const value = indentSheet.find(
                                                            (i) =>
                                                                i.indentNumber ===
                                                                indent.indentNumber
                                                        );
                                                        return {
                                                            quantity: value?.approvedQuantity || 0,
                                                            rate: value?.approvedRate || 0,
                                                            discountPercent: indent?.discount || 0,
                                                            gstPercent: indent.gst,
                                                        };
                                                    })
                                                )}
                                            </span>
                                        </p>
                                        <hr />
                                        <p className="flex px-7 py-2 justify-between font-bold">
                                            <span>Grand Total:</span>
                                            <span className="text-end">
                                                {calculateGrandTotal(
                                                    indents.map((indent) => {
                                                        const value = indentSheet.find(
                                                            (i) =>
                                                                i.indentNumber ===
                                                                indent.indentNumber
                                                        );
                                                        return {
                                                            quantity: value?.approvedQuantity || 0,
                                                            rate: value?.approvedRate || 0,
                                                            discountPercent: indent?.discount || 0,
                                                            gstPercent: indent.gst,
                                                        };
                                                    })
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <hr />

                            <div>
                                <p className="text-sm px-3 font-semibold">THE ABOVE</p>
                                <div>
                                    {termsArray.fields.map((field, index) => {
                                        const write = readOnly === index;
                                        return (
                                            <div className="flex items-center" key={field.id}>
                                                <span className="px-3">{index + 1}.</span>
                                                <FormField
                                                    control={form.control}
                                                    name={`terms.${index}`}
                                                    render={({ field: termField }) => (
                                                        <FormItem className="w-full">
                                                            <FormControl>
                                                                <Input
                                                                    className={cn(
                                                                        'border-transparent rounded-xs h-6 shadow-none',
                                                                        !write
                                                                            ? ''
                                                                            : 'border-b border-b-foreground'
                                                                    )}
                                                                    readOnly={!write}
                                                                    {...termField}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (write) {
                                                            setReadOnly(-1);
                                                        } else if (readOnly === -1) {
                                                            setReadOnly(index);
                                                        } else {
                                                            toast.error(
                                                                `Please save term ${
                                                                    readOnly + 1
                                                                } before editing`
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {!write ? (
                                                        <Pencil size={20} />
                                                    ) : (
                                                        <Save size={20} />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        if (readOnly === index) setReadOnly(-1);
                                                        termsArray.remove(index);
                                                    }}
                                                >
                                                    <Trash className="text-red-300" size={20} />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="w-full flex justify-end p-3">
                                    <Button
                                        className="w-50"
                                        variant="outline"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (termsArray.fields.length < 11) {
                                                if (readOnly === -1) {
                                                    // @ts-ignore
                                                    termsArray.append('');
                                                    setReadOnly(termsArray.fields.length);
                                                } else {
                                                    toast.error(
                                                        `Please save term ${
                                                            readOnly + 1
                                                        } before creating`
                                                    );
                                                }
                                            } else {
                                                toast.error('Only 10 terms are allowed');
                                            }
                                        }}
                                    >
                                        Add Term
                                    </Button>
                                </div>
                            </div>

                            <hr />

                            <div className="text-center flex justify-between gap-5 px-7 items-center">
                                <FormField
                                    control={form.control}
                                    name="preparedBy"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col justify-center items-center w-full">
                                            <FormLabel>Prepared By</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="h-9 w-full text-center"
                                                    placeholder="Purchase Order Prepared By"
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="approvedBy"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col justify-center items-center w-full">
                                            <FormLabel>Approved By</FormLabel>
                                            <FormControl>
                                                <Input
                                                    className="h-9 w-full text-center"
                                                    placeholder="Purchase Order Approved By"
                                                    {...field}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <p className="break-words min-w-1/4">For {details?.companyName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-3 w-full max-w-6xl bg-background m-5 shadow-md rounded-md">
                            <Button type="reset" variant="outline" onClick={() => form.reset()}>
                                Reset
                            </Button>

                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && (
                                    <Loader size={20} color="white" aria-label="Loading Spinner" />
                                )}
                                Save And Send PO
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
};
