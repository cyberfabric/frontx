import React, { useMemo } from 'react';
import {
  Badge,
  DataTable,
  DataTableColumnHeader,
  DataTableViewOptions,
  Checkbox,
  Input,
  type ColumnDef,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@hai3/uikit';

// Payment data type for Data Table demo
export type Payment = {
  id: string
  amount: number
  status: "pending" | "processing" | "success" | "failed"
  email: string
}

// Sample payments data
export const payments: Payment[] = [
  { id: "728ed52f", amount: 100, status: "pending", email: "m@example.com" },
  { id: "489e1d42", amount: 125, status: "processing", email: "example@gmail.com" },
  { id: "a1b2c3d4", amount: 250, status: "success", email: "john@company.com" },
  { id: "e5f6g7h8", amount: 75, status: "failed", email: "jane@email.org" },
  { id: "i9j0k1l2", amount: 300, status: "success", email: "bob@test.com" },
  { id: "m3n4o5p6", amount: 450, status: "pending", email: "alice@demo.io" },
  { id: "q7r8s9t0", amount: 200, status: "processing", email: "charlie@mail.com" },
  { id: "u1v2w3x4", amount: 175, status: "success", email: "diana@work.net" },
  { id: "y5z6a7b8", amount: 325, status: "failed", email: "eve@sample.org" },
  { id: "c9d0e1f2", amount: 550, status: "success", email: "frank@business.co" },
  { id: "g3h4i5j6", amount: 90, status: "pending", email: "grace@inbox.com" },
]

// Helper function to get badge variant for payment status
function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success":
      return "default"
    case "processing":
      return "secondary"
    case "failed":
      return "destructive"
    default:
      return "outline"
  }
}

export interface PaymentsDataTableProps {
  tk: (key: string) => string
}

// Payments Data Table Demo Component
export function PaymentsDataTable({ tk }: PaymentsDataTableProps) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [sorting, setSorting] = React.useState<{ id: string; desc: boolean }[]>([])
  const [columnFilters, setColumnFilters] = React.useState<{ id: string; value: unknown }[]>([])
  const [columnVisibility, setColumnVisibility] = React.useState({})

  // Define columns with translations
  const columns: ColumnDef<Payment>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={tk('data_table_select_all')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={tk('data_table_select_row')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tk('data_table_status')} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return <Badge variant={getStatusVariant(status)} className="capitalize">{status}</Badge>
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tk('data_table_email')} />
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={tk('data_table_amount')} />
      ),
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("amount"))
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount)
        return <div className="font-medium">{formatted}</div>
      },
    },
  ], [tk])

  const table = useReactTable({
    data: payments,
    columns,
    onSortingChange: setSorting as never,
    onColumnFiltersChange: setColumnFilters as never,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility as never,
    onRowSelectionChange: setRowSelection as never,
    state: {
      sorting: sorting as never,
      columnFilters: columnFilters as never,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <DataTable
      columns={columns}
      data={payments}
      table={table}
      filterInput={
        <Input
          placeholder={tk('data_table_filter_placeholder')}
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="max-w-sm h-8"
        />
      }
      toolbar={<DataTableViewOptions table={table} />}
      noResultsMessage={tk('data_table_no_results')}
    />
  )
}
