import { Dog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { AdminTableSkeleton } from "@/components/admin/admin-table-skeleton";
import { AdminTableViewport } from "@/components/admin/admin-table-viewport";
import { PetTableRow } from "@/components/admin/pets/pet-table-row";
import type { PetProfile } from "@/lib/admin-pet-profile";

interface PetDirectoryTableProps {
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  filteredPets: PetProfile[];
  onRetry: () => unknown;
  onClearFilters: () => void;
  onOpenDetail: (pet: PetProfile) => void;
}

export function PetDirectoryTable({
  isLoading,
  isError,
  hasFilters,
  filteredPets,
  onRetry,
  onClearFilters,
  onOpenDetail,
}: PetDirectoryTableProps) {
  return (
    <Card className="overflow-hidden rounded-xl border-border-subtle bg-surface shadow-xs">
      <CardContent className="p-0">
        {isError ? (
          <AdminDataState variant="error" title="Không tải được hồ sơ thú cưng." onRetry={onRetry} />
        ) : !isLoading && filteredPets.length === 0 ? (
          <AdminDataState
            variant="empty"
            title={hasFilters ? "Không tìm thấy hồ sơ thú cưng phù hợp." : "Chưa có hồ sơ thú cưng."}
            description={hasFilters
              ? "Thử thay đổi từ khóa hoặc loài thú cưng."
              : "Hồ sơ xuất hiện khi khách đặt lịch hoặc nhân viên ghi nhận trong phiếu tiếp nhận."}
            action={hasFilters ? (
              <Button type="button" variant="link" onClick={onClearFilters} className="h-auto p-0 text-sm font-semibold text-admin-primary">
                Xóa bộ lọc
              </Button>
            ) : undefined}
            icon={<Dog aria-hidden="true" className="size-6 text-admin-muted" />}
          />
        ) : (
        <AdminTableViewport label="Danh sách hồ sơ thú cưng">
          <Table className="min-w-[920px]">
            <TableHeader className="border-b border-border-subtle bg-slate-100/80">
              <TableRow className="border-border-subtle hover:bg-transparent">
                <TableHead className="w-[120px] text-sm font-semibold text-slate-600">Mã hồ sơ</TableHead>
                <TableHead className="w-[220px] text-sm font-semibold text-slate-600">Thú cưng</TableHead>
                <TableHead className="text-sm font-semibold text-slate-600">Lưu ý hành vi</TableHead>
                <TableHead className="w-[190px] text-sm font-semibold text-slate-600">Chủ nuôi</TableHead>
                <TableHead className="w-[150px] text-sm font-semibold text-slate-600">Tiêm phòng</TableHead>
                <TableHead className="w-[130px] text-sm font-semibold text-slate-600">Số lịch</TableHead>
                <TableHead className="w-[100px] text-right text-sm font-semibold text-slate-600">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody aria-busy={isLoading}>
              {isLoading ? (
                <AdminTableSkeleton columns={7} label="hồ sơ thú cưng" />
              ) : (
                filteredPets.map((pet) => (
                  <PetTableRow key={pet.id} pet={pet} onOpenDetail={onOpenDetail} />
                ))
              )}
            </TableBody>
          </Table>
        </AdminTableViewport>
        )}
      </CardContent>
    </Card>
  );
}
