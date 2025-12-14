/**
 * HAI3 UI-Core Components
 * Exports all UI Kit components for easy importing
 */

// Base UI Components (shadcn + HAI3 custom)
export { AspectRatio } from './base/aspect-ratio';
export { Avatar, AvatarImage, AvatarFallback } from './base/avatar';
export { Button, type ButtonProps } from './base/button';
// Re-export contract types to ensure consistency
export { ButtonVariant, ButtonSize } from '@hai3/uikit-contracts';
export { Badge, badgeVariants, type BadgeProps } from './base/badge';
export { Calendar, CalendarDayButton } from './base/calendar';
export { Checkbox } from './base/checkbox';
export { RadioGroup, RadioGroupItem } from './base/radio-group';
export { NativeSelect, NativeSelectOption, NativeSelectOptGroup } from './base/native-select';
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './base/input-otp';
export { Input } from './base/input';
export { Label } from './base/label';
export {
  Field,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldLabel,
  FieldTitle,
  FieldDescription,
  FieldContent,
  FieldSeparator,
  FieldError,
} from './base/field';
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from './base/form';
export { Textarea } from './base/textarea';
export { Switch } from './base/switch';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './base/table';
export {
  DataTable,
  DataTablePagination,
  DataTableColumnHeader,
  DataTableViewOptions,
  type DataTableProps,
  type DataTablePaginationProps,
  type DataTableColumnHeaderProps,
  type DataTableViewOptionsProps,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type Row,
  type Table as ReactTable,
  type Column,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from './base/data-table';
export { Skeleton } from './base/skeleton';
export { Spinner, type SpinnerProps } from './base/spinner';
export { Slider, SliderTrack, SliderRange, SliderThumb } from './base/slider';
export { Progress } from './base/progress';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './base/tooltip';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './base/popover';
export { HoverCard, HoverCardTrigger, HoverCardContent } from './base/hover-card';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './base/card';
export { Header, type HeaderProps } from './base/header'; // HAI3 custom base component

// shadcn navigation
export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
} from './base/navigation-menu';

// shadcn breadcrumb
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from './base/breadcrumb';

// shadcn menubar
export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from './base/menubar';

// shadcn pagination
export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from './base/pagination';

// shadcn tabs
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './base/tabs';

// shadcn sheet (sidebar)
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './base/sheet';

// shadcn dialog (popup/modal)
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './base/dialog';

// vaul drawer (mobile-friendly)
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from './base/drawer';

// react-resizable-panels (resizable layouts)
export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from './base/resizable';

// radix scroll-area (custom scrollbars)
export {
  ScrollArea,
  ScrollBar,
} from './base/scroll-area';

// radix separator (divider lines)
export { Separator } from './base/separator';

// Item components
export {
  Item,
  ItemGroup,
  ItemSeparator,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemHeader,
  ItemFooter,
} from './base/item';

// shadcn accordion
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './base/accordion';

// shadcn carousel
export type { CarouselApi } from './base/carousel';
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from './base/carousel';

// shadcn collapsible
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from './base/collapsible';

// Chart components (Recharts wrapper)
export {
  // Custom wrappers
  ChartContainer,
  ChartTooltipContent,
  ChartLegendContent,

  // Container
  ResponsiveContainer,

  // Chart Types
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  RadarChart,
  ScatterChart,
  ComposedChart,
  RadialBarChart,
  Treemap,
  Sankey,
  FunnelChart,

  // Chart Elements
  Line,
  Bar,
  Area,
  Pie,
  Radar,
  Scatter,
  RadialBar,
  Funnel,

  // Axes
  XAxis,
  YAxis,
  ZAxis,

  // Grid & Reference
  CartesianGrid,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Brush,

  // Labels
  Label as ChartLabel,
  LabelList,
  ChartTooltip,
  ChartLegend,

  // Shapes & Utilities
  Cell,
  Cross,
  Curve,
  Dot,
  Polygon,
  Rectangle,
  Sector,
  Customized,
  Text,

  // Error Bar
  ErrorBar,

  // Types
  type TooltipProps,
  type LegendProps,
} from './base/chart';

// shadcn select (native-style)
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './base/select';

// Base dropdowns
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from './base/dropdown-menu';

// Base context menu
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from './base/context-menu';

// Composite components
export { IconButton, type IconButtonProps } from './composite/buttons/IconButton';
export { DropdownButton, type DropdownButtonProps } from './composite/buttons/DropdownButton';
// Re-export contract types to ensure consistency
export { IconButtonSize } from '@hai3/uikit-contracts';

// Composite form components
export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea } from './base/input-group';
export { DatePicker, DatePickerTrigger, DatePickerContent, DatePickerInput } from './base/date-picker';

// Composite navigation (tailored from shadcn sidebar)
export {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuLabel,
  SidebarMenuIcon,
} from './composite/navigation/Sidebar';
export { SidebarHeader, type SidebarHeaderProps } from './composite/navigation/SidebarHeader';

// Composite user components
export { UserInfo, type UserInfoProps } from './composite/user/UserInfo';

// Composite chat components
export { MessageBubble, MessageType, type MessageBubbleProps } from './composite/chat/MessageBubble';
export { ChatInput, type ChatInputProps } from './composite/chat/ChatInput';
export { ThreadList, type ThreadListProps, type ChatThread } from './composite/chat/ThreadList';

// Icons (tree-shakeable - app imports and registers only what it needs)
export { MenuIcon, MENU_ICON_ID } from './icons/MenuIcon';
export { CloseIcon, CLOSE_ICON_ID } from './icons/CloseIcon';
export { CalendarIcon } from './icons/CalendarIcon';
export { ChevronDownIcon } from './icons/ChevronDownIcon';
export { ChevronLeftIcon } from './icons/ChevronLeftIcon';
export { ChevronRightIcon } from './icons/ChevronRightIcon';
export { ChevronUpIcon } from './icons/ChevronUpIcon';

// Theme system (utilities only - theme definitions in app)
export { applyTheme } from './styles/applyTheme';
export type { Theme } from '@hai3/uikit-contracts';
