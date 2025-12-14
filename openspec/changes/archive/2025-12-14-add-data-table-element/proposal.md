# Add Data Table Base UI Kit Element

## Why

The UI Kit needs a powerful data table component for displaying and interacting with tabular data. While the basic Table component provides semantic HTML structure, Data Table adds:
- Column sorting (ascending/descending)
- Pagination for large datasets
- Row selection (single and multi-select with checkboxes)
- Column filtering
- Column visibility toggling
- Responsive horizontal scroll on mobile

This is essential for admin dashboards, payment histories, user lists, and any data-heavy interfaces.

## What Changes

### New Dependency
- `@tanstack/react-table` - Headless table state management library

### New Components
- `DataTable<TData, TValue>` - Generic data table component with full feature set
- `DataTablePagination` - Pagination controls with page size selector
- `DataTableColumnHeader` - Sortable column header with sort indicators
- `DataTableViewOptions` - Column visibility dropdown

### Integration
- Builds on existing `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` components
- Uses existing `Button`, `Checkbox`, `DropdownMenu`, `Select`, `Input` components
- Uses `flexRender` from @tanstack/react-table for cell rendering

### Features
1. **Sorting** - Click column headers to sort, visual indicators for sort direction
2. **Pagination** - Page navigation, rows per page selector, row count display
3. **Row Selection** - Header checkbox for select all, individual row checkboxes
4. **Column Visibility** - Dropdown to show/hide columns
5. **Filtering** - Column-based text filtering
6. **Responsive** - Horizontal scroll container for mobile

## Affected Specs
- `uikit-base` - New Data Table component requirements
