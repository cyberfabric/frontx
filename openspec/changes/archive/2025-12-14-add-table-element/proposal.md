# Add Table Base UI Kit Element

## Why

The UI Kit currently lacks a Table component for displaying tabular data. Table is a foundational component for:
- Displaying structured data in rows and columns
- Invoice lists, user directories, product catalogs
- Any data that benefits from tabular presentation
- Integration with future Data Table component (sorting, filtering, pagination)

## What Changes

### New Components
- `Table` - Main table container with horizontal scroll wrapper
- `TableHeader` - Table header section (`<thead>`)
- `TableBody` - Table body section (`<tbody>`)
- `TableFooter` - Table footer section (`<tfoot>`)
- `TableRow` - Table row (`<tr>`) with hover and selection states
- `TableHead` - Table header cell (`<th>`)
- `TableCell` - Table data cell (`<td>`)
- `TableCaption` - Table caption for accessibility

### Styling
All components use HAI3's CSS custom properties:
- `--muted` / `--muted-foreground` for hover and footer backgrounds
- `--border` for row borders
- Responsive horizontal scroll for overflow
- Support for checkbox alignment in cells

### Accessibility
- Semantic HTML table structure
- Caption support for screen readers
- `data-slot` attributes for styling hooks
- `data-state="selected"` for row selection styling

## Affected Specs
- `uikit-base` - New Table component requirements
