import { useTranslation } from "react-i18next";
import { useEntityTranslation } from "@/hooks/useEntityTranslation";
import { useModelMeta } from "../../hooks/useSchema";
import { useEntityDetail, useEntityUpdate, useEntityCreate, useEntityList } from "../../hooks/useEntity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, History, ShoppingCart, FileText, AlertCircle, User, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "../../hooks/useAuth";

interface Props {
    entityId: string;
    onNavigate: (path: string) => void;
}

export default function SalesOrderDetailPage({ entityId, onNavigate }: Props) {
    const { t } = useTranslation();
    const { tEntityName } = useEntityTranslation();
    const meta = useModelMeta("SalesOrder");
    const [isCompleting, setIsCompleting] = useState(false);
    const { user } = useAuth();

    const { data: orderData, isLoading, refetch } = useEntityDetail("salesOrder", entityId, {
        include: "items,customer"
    });
    const order = orderData as any;

    const { data: warehousesData } = useEntityList("warehouse", { pageSize: 100 } as any);
    const warehouses = warehousesData?.data || [];
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");

    const updateOrder = useEntityUpdate("salesOrder");
    const createTransaction = useEntityCreate("inventoryTransaction");

    const { data: productsData } = useEntityList("product", { pageSize: 1000 } as any);
    const productsMap = Object.fromEntries((productsData?.data || []).map((p: any) => [p.id, p]));

    const handleComplete = async () => {
        if (!order || order.status === "COMPLETED") return;
        if (!selectedWarehouseId) {
            toast.error("請選擇出庫倉庫");
            return;
        }

        setIsCompleting(true);
        try {
            // 1. Update order status to COMPLETED
            await updateOrder.mutateAsync({
                id: entityId,
                data: { status: "COMPLETED" }
            });

            // 2. Create inventory transactions for each item (SALE type subtracts stock)
            for (const item of (order.items as any[])) {
                await createTransaction.mutateAsync({
                    type: "SALE",
                    quantity: -Math.abs(item.quantity), // Ensure quantity is negative for SALE
                    productId: item.productId,
                    warehouseId: selectedWarehouseId,
                    referenceId: order.id,
                    referenceType: "SalesOrder",
                    referenceOrderNumber: order.orderNumber,
                    notes: `從銷貨單完工出庫: ${order.orderNumber}`,
                    ownerId: user?.id
                });
            }

            toast.success("銷貨單已完工，庫存已扣減");
            refetch();
        } catch (error: any) {
            toast.error(error.message || "處理失敗");
        } finally {
            setIsCompleting(false);
        }
    };

    if (isLoading || !order) return <div className="p-6">載入中...</div>;

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "DRAFT": return "secondary";
            case "COMPLETED": return "default";
            case "CANCELLED": return "destructive";
            default: return "outline";
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onNavigate("/salesOrder")} className="-ml-2">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-10">建立於 {new Date(order.createdAt).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-3">
                    {order.status !== "COMPLETED" && (
                        <div className="flex items-center gap-2">
                            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="選擇出庫倉庫" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map(w => (
                                        <SelectItem key={w.id} value={w.id as string}>
                                            {(w as any).name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button onClick={handleComplete} disabled={isCompleting} className="bg-blue-600 hover:bg-blue-700">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                確認出庫
                            </Button>
                        </div>
                    )}
                    <Button variant="outline" onClick={() => onNavigate(`/salesOrder/${entityId}/edit`)} disabled={order.status === "COMPLETED"}>
                        編輯
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 font-semibold">
                                <User className="h-5 w-5 text-blue-500" />
                                客戶資訊
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {order.customer ? (
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <div className="text-muted-foreground">客戶名稱:</div>
                                    <div className="font-medium">{order.customer.name}</div>
                                    <div className="text-muted-foreground">聯絡人:</div>
                                    <div>{order.customer.contactName || "未填寫"}</div>
                                    <div className="text-muted-foreground">電話:</div>
                                    <div>{order.customer.phone || "未填寫"}</div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground italic">未指定客戶</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                                銷售明細
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>產品</TableHead>
                                        <TableHead className="text-right">單價</TableHead>
                                        <TableHead className="text-right">數量</TableHead>
                                        <TableHead className="text-right">總計</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(order.items ?? []).map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{(productsMap[item.productId] as any)?.name || item.product?.name || item.productId}</div>
                                                <div className="text-xs text-muted-foreground">{(productsMap[item.productId] as any)?.code || item.product?.code}</div>
                                            </TableCell>
                                            <TableCell className="text-right">$ {item.unitPrice.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-medium">$ {(item.quantity * item.unitPrice).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="mt-6 flex justify-end border-t pt-4">
                                <div className="text-right space-y-1">
                                    <div className="text-sm text-muted-foreground">總計金額</div>
                                    <div className="text-2xl font-bold">$ {order.totalAmount.toLocaleString()}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {order.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    備註
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{order.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                操作日誌
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                                <div className="space-y-1">
                                    <div className="text-sm font-medium">單據建立</div>
                                    <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</div>
                                </div>
                            </div>
                            {order.status === "COMPLETED" && (
                                <div className="flex gap-3">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium">確認完工並出庫</div>
                                        <div className="text-xs text-muted-foreground">{new Date(order.updatedAt).toLocaleString()}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {order.status !== "COMPLETED" && (
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-orange-700">
                                點擊「確認完工」將會鎖定單據不可編輯，並自動扣減產品庫存。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
