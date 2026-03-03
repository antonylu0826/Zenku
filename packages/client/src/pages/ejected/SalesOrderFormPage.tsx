import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEntityTranslation } from "@/hooks/useEntityTranslation";
import { useModelMeta } from "../../hooks/useSchema";
import { useEntityDetail, useEntityCreate, useEntityUpdate, useEntityList } from "../../hooks/useEntity";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
    entityId?: string;
    onNavigate: (path: string) => void;
}

interface OrderItem {
    id?: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export default function SalesOrderFormPage({ entityId, onNavigate }: Props) {
    const { t } = useTranslation();
    const { tEntityName } = useEntityTranslation();
    const meta = useModelMeta("SalesOrder");
    const { user } = useAuth();
    const isEdit = !!entityId;

    const { data: existing } = useEntityDetail("salesOrder", entityId || "", {
        include: "items"
    });

    const { data: productsData } = useEntityList("product", { pageSize: 1000 } as any);
    const products = productsData?.data || [];

    const { data: customersData } = useEntityList("customer", { pageSize: 1000 } as any);
    const customers = customersData?.data || [];

    const { data: warehousesData } = useEntityList("warehouse", { pageSize: 1000 } as any);
    const warehouses = warehousesData?.data || [];

    const createMutation = useEntityCreate("salesOrder");
    const updateMutation = useEntityUpdate("salesOrder");

    const [orderNumber, setOrderNumber] = useState<string>("");
    const [customerId, setCustomerId] = useState<string>("");
    const [warehouseId, setWarehouseId] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [items, setItems] = useState<OrderItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isEdit && existing) {
            setOrderNumber((existing as any).orderNumber || "");
            setCustomerId((existing as any).customerId || "");
            setWarehouseId((existing as any).warehouseId || "");
            setNotes((existing as any).notes || "");
            if ((existing as any).items) {
                setItems((existing as any).items.map((item: any) => ({
                    id: item.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice || (item.quantity * item.unitPrice)
                })));
            }
        } else if (!isEdit) {
            setOrderNumber(`SO-${Date.now().toString().slice(-6)}`);
        }
    }, [isEdit, existing]);

    const handleAddItem = () => {
        setItems([...items, { productId: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...items];
        const item = { ...newItems[index], [field]: value };

        if (field === "productId") {
            const product = products.find(p => p.id === value);
            if (product) {
                item.unitPrice = (product as any).price || 0;
            }
        }

        item.totalPrice = item.quantity * item.unitPrice;
        newItems[index] = item;
        setItems(newItems);
    };

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) {
            toast.error("請至少新增一個項目");
            return;
        }

        setIsSubmitting(true);
        try {
            const itemsPayload = isEdit
                ? {
                    create: items.filter(i => !i.id).map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        amount: i.totalPrice
                    })),
                    update: items.filter(i => i.id).map(i => ({
                        where: { id: i.id },
                        data: {
                            productId: i.productId,
                            quantity: i.quantity,
                            unitPrice: i.unitPrice,
                            amount: i.totalPrice
                        }
                    }))
                }
                : {
                    create: items.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        amount: i.totalPrice
                    }))
                };

            const payload = {
                orderNumber,
                customerId: customerId || null,
                warehouseId: warehouseId || null,
                notes,
                totalAmount: Math.round(totalAmount * 100) / 100,
                ownerId: user?.id,
                items: itemsPayload
            };

            if (isEdit) {
                await updateMutation.mutateAsync({ id: entityId!, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            toast.success(isEdit ? "銷貨單已更新" : "銷貨單已建立");
            onNavigate("/salesOrder");
        } catch (error: any) {
            console.error("SalesOrder save failed:", error);
            const msg = error.data?.message || error.message || "操作失敗";
            toast.error(`儲存失敗: ${msg}`, {
                description: JSON.stringify(error.data?.info || {}),
                duration: 5000
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!meta) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    {isEdit ? "編輯銷貨單" : "新銷貨單"}
                </h1>
                <Button variant="ghost" onClick={() => onNavigate("/salesOrder")}>
                    <X className="h-4 w-4 mr-2" />
                    取消
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">基本資訊</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="orderNumber">銷貨單號</Label>
                            <Input
                                id="orderNumber"
                                value={orderNumber}
                                onChange={e => setOrderNumber(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer">客戶</Label>
                            <Select key={`customer-${customerId}`} value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger id="customer">
                                    <SelectValue placeholder="選擇客戶" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={String(c.id)} value={String(c.id)}>
                                            {(c as any).name} ({(c as any).code || "無編號"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="warehouse">出庫倉庫</Label>
                            <Select key={`warehouse-${warehouseId}`} value={warehouseId} onValueChange={setWarehouseId}>
                                <SelectTrigger id="warehouse">
                                    <SelectValue placeholder="選擇倉庫" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(w => (
                                        <SelectItem key={String(w.id)} value={String(w.id)}>
                                            {(w as any).name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="notes">備註</Label>
                            <Input
                                id="notes"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="輸入備註..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg">銷售項目</CardTitle>
                        <Button type="button" size="sm" onClick={handleAddItem}>
                            <Plus className="h-4 w-4 mr-1" />
                            新增項目
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">產品</TableHead>
                                    <TableHead className="w-[15%]">單價</TableHead>
                                    <TableHead className="w-[15%]">數量</TableHead>
                                    <TableHead className="w-[20%] text-right">小計</TableHead>
                                    <TableHead className="w-[10%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Select
                                                value={item.productId}
                                                onValueChange={(val) => handleItemChange(index, "productId", val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="選擇產品" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map(p => (
                                                        <SelectItem key={String(p.id)} value={String(p.id)}>
                                                            {(p as any).name} ({(p as any).code})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={e => handleItemChange(index, "unitPrice", Number(e.target.value))}
                                                className="text-right"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={item.quantity}
                                                onChange={e => handleItemChange(index, "quantity", Number(e.target.value))}
                                                className="text-right"
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            $ {item.totalPrice.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                onClick={() => handleRemoveItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            尚未新增任何項目
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        <div className="mt-4 flex justify-end items-center gap-4">
                            <span className="text-sm text-muted-foreground font-medium">總計金額:</span>
                            <span className="text-2xl font-bold text-primary">$ {totalAmount.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => onNavigate("/salesOrder")}>
                        取消
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
                        <Save className="h-4 w-4 mr-2" />
                        儲存單據
                    </Button>
                </div>
            </form>
        </div>
    );
}
