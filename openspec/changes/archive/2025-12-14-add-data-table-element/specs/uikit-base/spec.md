# uikit-base Spec Delta: Data Table Component

## ADDED Requirements

### Requirement: DataTable Component

The UI Kit SHALL provide a generic DataTable component that renders tabular data with sorting, pagination, and selection support using @tanstack/react-table.

#### Scenario: Basic data table rendering
Given a DataTable component with columns and data props
When it renders
Then it displays data in a table using the existing Table components

#### Scenario: Data table with empty state
Given a DataTable with no data rows
When it renders
Then it displays a "No results" message in the table body

### Requirement: DataTable Sorting

The UI Kit SHALL provide sortable columns with visual sort direction indicators.

#### Scenario: Column sorting toggle
Given a sortable column header
When the user clicks it
Then the table sorts by that column and shows a sort direction indicator

#### Scenario: Multi-direction sorting
Given a sorted column
When the user clicks it again
Then the sort direction toggles (ascending → descending → none)

### Requirement: DataTable Pagination

The UI Kit SHALL provide a DataTablePagination component with page navigation and page size controls.

#### Scenario: Page navigation
Given a paginated data table with multiple pages
When the user clicks next/previous buttons
Then the table navigates to the corresponding page

#### Scenario: Page size selection
Given a data table with pagination
When the user selects a different page size
Then the table displays that number of rows per page

#### Scenario: Row count display
Given a paginated data table with row selection
When viewing the pagination controls
Then it displays "{selected} of {total} row(s) selected"

### Requirement: DataTable Row Selection

The UI Kit SHALL provide row selection with header checkbox for select all and individual row checkboxes.

#### Scenario: Select all rows
Given a data table with a select column
When the user clicks the header checkbox
Then all visible rows are selected

#### Scenario: Individual row selection
Given a data table with a select column
When the user clicks a row's checkbox
Then that row is selected and the header checkbox reflects partial selection state

#### Scenario: Selected row styling
Given a selected row in the data table
When it renders
Then it displays with a highlighted background (data-state="selected")

### Requirement: DataTable Column Visibility

The UI Kit SHALL provide a DataTableViewOptions component for toggling column visibility.

#### Scenario: Column visibility dropdown
Given a data table with view options
When the user opens the columns dropdown
Then they see a list of hideable columns with checkboxes

#### Scenario: Hide column
Given a visible column in the data table
When the user unchecks it in the view options
Then the column is hidden from the table

### Requirement: DataTable Column Header

The UI Kit SHALL provide a DataTableColumnHeader component with sort controls and dropdown menu.

#### Scenario: Sortable header rendering
Given a sortable column
When it renders
Then it displays the column title with sort/hide options in a dropdown

#### Scenario: Non-sortable header
Given a column with sorting disabled
When it renders
Then it displays the column title without sort controls

### Requirement: DataTable Demo Examples

The UI kit demo SHALL provide examples for the Data Table component in the Data Display category demonstrating:
- Payments table with id, status, email, and amount columns
- Select column with checkboxes for row selection
- Sortable columns (amount, status, email)
- Pagination with page size selector
- Column visibility toggle
- Email filter input

#### Scenario: Data Table section in DataDisplayElements
Given a user viewing the Data Display category in UIKitElementsScreen
When they scroll to the Data Table section
Then they should see a payments table with sorting, pagination, and selection

#### Scenario: Payments table structure
Given the payments data table demo
When viewing the table
Then it should display columns for Select, Status, Email, and Amount
And show payment data with varied statuses (pending, processing, success, failed)
And provide pagination controls below the table
