# uikit-base Spec Delta: Table Component

## ADDED Requirements

### Requirement: Table Component

The UI Kit SHALL provide a Table component that renders a semantic HTML table with horizontal scroll container.

#### Scenario: Basic table rendering
Given a Table component with TableHeader, TableBody, and rows
When it renders
Then it displays a scrollable table with proper semantic structure

#### Scenario: Table with caption
Given a Table with TableCaption
When rendered
Then the caption is displayed at the bottom of the table for accessibility

### Requirement: Table Sections

The UI Kit SHALL provide TableHeader, TableBody, and TableFooter components for semantic table structure.

#### Scenario: Table header styling
Given a TableHeader component
When rendered
Then rows within it have bottom borders

#### Scenario: Table body styling
Given a TableBody component
When rendered
Then the last row has no bottom border

#### Scenario: Table footer styling
Given a TableFooter component
When rendered
Then it has a muted background and top border

### Requirement: Table Row

The UI Kit SHALL provide a TableRow component with hover and selection state support.

#### Scenario: Row hover state
Given a TableRow component
When the user hovers over it
Then it displays a muted background color

#### Scenario: Row selection state
Given a TableRow with data-state="selected"
When rendered
Then it displays a muted background color

### Requirement: Table Cells

The UI Kit SHALL provide TableHead and TableCell components for header and data cells.

#### Scenario: Header cell styling
Given a TableHead component
When rendered
Then it has medium font weight, left alignment, and proper padding

#### Scenario: Data cell styling
Given a TableCell component
When rendered
Then it has proper padding and vertical alignment

#### Scenario: Checkbox alignment
Given a TableHead or TableCell containing a checkbox
When rendered
Then the checkbox is properly aligned with slight vertical offset

### Requirement: Table Demo Examples

The UI kit demo SHALL provide examples for the Table component in the Data Display category demonstrating:
- Invoice table with multiple columns (Invoice, Status, Method, Amount)
- TableHeader with column headings
- TableBody with multiple data rows
- TableFooter with totals row
- TableCaption describing the table content

#### Scenario: Table section in DataDisplayElements
Given a user viewing the Data Display category in UIKitElementsScreen
When they scroll to the Table section
Then they should see the heading and invoice table demo example

#### Scenario: Invoice table structure
Given the invoice table demo
When viewing the table
Then it should display columns for Invoice number, Status, Method, and Amount
And multiple invoice rows with varied data
And a footer row showing the total amount
