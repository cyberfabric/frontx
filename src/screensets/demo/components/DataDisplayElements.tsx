import React, { useMemo } from 'react';
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  ChartContainer,
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ChartTooltip,
  ChartLegend,
  ChartTooltipContent,
  ChartLegendContent,
  ResponsiveContainer,
  Item,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  Button,
  ButtonVariant,
  ButtonSize,
  ChevronRightIcon,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  Kbd,
  KbdGroup,
  ButtonGroup,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyBlockquote,
  TypographyList,
  TypographyInlineCode,
  TypographyLarge,
  TypographySmall,
  TypographyMuted,
} from '@hai3/uikit';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { BadgeCheckIcon, SearchIcon } from 'lucide-react';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";
import { PaymentsDataTable } from '../uikit/data/PaymentsDataTable';

/**
 * Get chart colors from CSS variables (theme-aware)
 * Returns resolved RGB values for Recharts compatibility
 */
const getChartColors = (): string[] => {
  const styles = getComputedStyle(document.documentElement);
  return [
    styles.getPropertyValue('--chart-1').trim(),
    styles.getPropertyValue('--chart-2').trim(),
    styles.getPropertyValue('--chart-3').trim(),
    styles.getPropertyValue('--chart-4').trim(),
    styles.getPropertyValue('--chart-5').trim(),
  ];
};

/**
 * Data Display Elements Component
 * Contains Avatar, Badge, and Chart demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const DataDisplayElements: React.FC = () => {
  const { t } = useTranslation();

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  // Get theme-aware chart colors
  const chartColors = useMemo(() => getChartColors(), []);

  // Sample data for charts
  const lineChartData = [
    { name: 'Jan', users: 400, revenue: 2400 },
    { name: 'Feb', users: 300, revenue: 1398 },
    { name: 'Mar', users: 600, revenue: 9800 },
    { name: 'Apr', users: 800, revenue: 3908 },
    { name: 'May', users: 500, revenue: 4800 },
    { name: 'Jun', users: 700, revenue: 3800 },
  ];

  const barChartData = [
    { name: 'Mon', value: 20 },
    { name: 'Tue', value: 35 },
    { name: 'Wed', value: 50 },
    { name: 'Thu', value: 30 },
    { name: 'Fri', value: 45 },
  ];

  const areaChartData = [
    { name: 'Page A', value: 4000 },
    { name: 'Page B', value: 3000 },
    { name: 'Page C', value: 2000 },
    { name: 'Page D', value: 2780 },
    { name: 'Page E', value: 1890 },
    { name: 'Page F', value: 2390 },
  ];

  const pieChartData = [
    { name: 'Desktop', value: 45 },
    { name: 'Mobile', value: 30 },
    { name: 'Tablet', value: 25 },
  ];

  return (
    <>
      {/* Avatar Element Block */}
      <div data-element-id="element-avatar" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('avatar_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex flex-row flex-wrap items-center gap-12">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar className="rounded-lg">
              <AvatarImage
                src="https://github.com/evilrabbit.png"
                alt="@evilrabbit"
              />
              <AvatarFallback>ER</AvatarFallback>
            </Avatar>
            <div className="*:data-[slot=avatar]:ring-background flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale">
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarImage
                  src="https://github.com/maxleiter.png"
                  alt="@maxleiter"
                />
                <AvatarFallback>LR</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarImage
                  src="https://github.com/evilrabbit.png"
                  alt="@evilrabbit"
                />
                <AvatarFallback>ER</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Badge Element Block */}
      <div data-element-id="element-badge" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('badge_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex w-full flex-wrap gap-2 justify-center">
              <Badge>
                <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                  {tk('badge_default')}
                </TextLoader>
              </Badge>
              <Badge variant="secondary">
                <TextLoader skeletonClassName="h-3.5 w-14" inheritColor>
                  {tk('badge_secondary')}
                </TextLoader>
              </Badge>
              <Badge variant="destructive">
                <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                  {tk('badge_destructive')}
                </TextLoader>
              </Badge>
              <Badge variant="outline">
                <TextLoader skeletonClassName="h-3.5 w-14" inheritColor>
                  {tk('badge_outline')}
                </TextLoader>
              </Badge>
            </div>
            <div className="flex w-full flex-wrap gap-2 justify-center">
              <Badge
                variant="secondary"
                className="bg-blue-500 text-white dark:bg-blue-600"
              >
                <BadgeCheckIcon className="w-3 h-3" />
                <TextLoader skeletonClassName="h-3.5 w-10" inheritColor>
                  {tk('badge_verified')}
                </TextLoader>
              </Badge>
              <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                8
              </Badge>
              <Badge
                className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums bg-green-500 text-white"
              >
                99
              </Badge>
              <Badge
                className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                variant="destructive"
              >
                99
              </Badge>
              <Badge
                className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                variant="outline"
              >
                20+
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Element Block */}
      <div data-element-id="element-chart" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('chart_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Line Chart */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-20" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('chart_line_label')}
              </label>
            </TextLoader>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="users" stroke={chartColors[0]} strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke={chartColors[1]} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Bar Chart */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-20" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('chart_bar_label')}
              </label>
            </TextLoader>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill={chartColors[0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Area Chart */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-20" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('chart_area_label')}
              </label>
            </TextLoader>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={areaChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="value" stroke={chartColors[0]} fill={chartColors[0]} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Pie Chart */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-20" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('chart_pie_label')}
              </label>
            </TextLoader>
            <ChartContainer>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill={chartColors[0]}
                    dataKey="value"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

        </div>
      </div>

      {/* Item Element Block */}
      <div data-element-id="element-item" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('item_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Outline Item Example */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-48" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('item_outline_label')}
              </label>
            </TextLoader>
            <Item variant="outline">
              <ItemContent>
                <ItemTitle>
                  <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                    {tk('item_basic_title')}
                  </TextLoader>
                </ItemTitle>
                <ItemDescription>
                  <TextLoader skeletonClassName="h-4 w-64" inheritColor>
                    {tk('item_basic_description')}
                  </TextLoader>
                </ItemDescription>
              </ItemContent>
              <ItemActions>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                  <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                    {tk('item_action')}
                  </TextLoader>
                </Button>
              </ItemActions>
            </Item>
          </div>

          {/* Muted Item Example */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-48" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('item_muted_label')}
              </label>
            </TextLoader>
            <Item variant="muted" size="sm" asChild>
              <a href="#">
                <ItemMedia>
                  <BadgeCheckIcon className="size-5" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>
                    <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                      {tk('item_verified_title')}
                    </TextLoader>
                  </ItemTitle>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4" />
                </ItemActions>
              </a>
            </Item>
          </div>

          {/* Item Group with Header Example */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-64" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('item_group_header_label')}
              </label>
            </TextLoader>
            <ItemGroup className="grid grid-cols-3 gap-4">
              <Item variant="outline">
                <ItemHeader>
                  <img
                    src="https://images.unsplash.com/photo-1650804068570-7fb2e3dbf888?q=80&w=640&auto=format&fit=crop"
                    alt={tk('item_model_1_name')}
                    className="aspect-square w-full rounded-sm object-cover"
                  />
                </ItemHeader>
                <ItemContent>
                  <ItemTitle>
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('item_model_1_name')}
                    </TextLoader>
                  </ItemTitle>
                  <ItemDescription>
                    <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                      {tk('item_model_1_description')}
                    </TextLoader>
                  </ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="outline">
                <ItemHeader>
                  <img
                    src="https://images.unsplash.com/photo-1610280777472-54133d004c8c?q=80&w=640&auto=format&fit=crop"
                    alt={tk('item_model_2_name')}
                    className="aspect-square w-full rounded-sm object-cover"
                  />
                </ItemHeader>
                <ItemContent>
                  <ItemTitle>
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('item_model_2_name')}
                    </TextLoader>
                  </ItemTitle>
                  <ItemDescription>
                    <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                      {tk('item_model_2_description')}
                    </TextLoader>
                  </ItemDescription>
                </ItemContent>
              </Item>
              <Item variant="outline">
                <ItemHeader>
                  <img
                    src="https://images.unsplash.com/photo-1602146057681-08560aee8cde?q=80&w=640&auto=format&fit=crop"
                    alt={tk('item_model_3_name')}
                    className="aspect-square w-full rounded-sm object-cover"
                  />
                </ItemHeader>
                <ItemContent>
                  <ItemTitle>
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('item_model_3_name')}
                    </TextLoader>
                  </ItemTitle>
                  <ItemDescription>
                    <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                      {tk('item_model_3_description')}
                    </TextLoader>
                  </ItemDescription>
                </ItemContent>
              </Item>
            </ItemGroup>
          </div>
        </div>
      </div>

      {/* Kbd Element Block */}
      <div data-element-id="element-kbd" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('kbd_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Basic Kbd */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('kbd_basic_label')}
              </label>
            </TextLoader>
            <div className="flex flex-wrap items-center gap-2">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              <Kbd>Esc</Kbd>
              <Kbd>⏎</Kbd>
              <Kbd>Ctrl</Kbd>
              <Kbd>Shift</Kbd>
            </div>
          </div>

          {/* KbdGroup */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('kbd_group_label')}
              </label>
            </TextLoader>
            <p className="text-muted-foreground text-sm">
              <TextLoader skeletonClassName="h-4 w-64" inheritColor>
                {tk('kbd_group_text')}{' '}
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>B</Kbd>
                </KbdGroup>{' '}
                {tk('kbd_group_or')}{' '}
                <KbdGroup>
                  <Kbd>Ctrl</Kbd>
                  <Kbd>K</Kbd>
                </KbdGroup>
              </TextLoader>
            </p>
          </div>

          {/* Kbd in Buttons */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('kbd_button_label')}
              </label>
            </TextLoader>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm} className="pr-2">
                <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                  {tk('kbd_accept')}
                </TextLoader>
                <Kbd>⏎</Kbd>
              </Button>
              <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm} className="pr-2">
                <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                  {tk('kbd_cancel')}
                </TextLoader>
                <Kbd>Esc</Kbd>
              </Button>
            </div>
          </div>

          {/* Kbd in Tooltips */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('kbd_tooltip_label')}
              </label>
            </TextLoader>
            <div className="flex flex-wrap gap-4">
              <ButtonGroup>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size={ButtonSize.Sm} variant={ButtonVariant.Outline}>
                      <TextLoader skeletonClassName="h-4 w-8" inheritColor>
                        {tk('kbd_save')}
                      </TextLoader>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                        {tk('kbd_save_changes')}
                      </TextLoader>
                      <Kbd>S</Kbd>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size={ButtonSize.Sm} variant={ButtonVariant.Outline}>
                      <TextLoader skeletonClassName="h-4 w-8" inheritColor>
                        {tk('kbd_print')}
                      </TextLoader>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                        {tk('kbd_print_document')}
                      </TextLoader>
                      <KbdGroup>
                        <Kbd>Ctrl</Kbd>
                        <Kbd>P</Kbd>
                      </KbdGroup>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </ButtonGroup>
            </div>
          </div>

          {/* Kbd in Input Group */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('kbd_input_label')}
              </label>
            </TextLoader>
            <div className="flex w-full max-w-xs flex-col gap-6">
              <InputGroup>
                <InputGroupInput placeholder={tk('kbd_search_placeholder')} />
                <InputGroupAddon>
                  <SearchIcon className="size-4" />
                </InputGroupAddon>
                <InputGroupAddon align="inline-end">
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Table Element Block */}
      <div data-element-id="element-table" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('table_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <Table>
            <TableCaption>
              <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                {tk('table_caption')}
              </TextLoader>
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <TextLoader skeletonClassName="h-4 w-14" inheritColor>
                    {tk('table_invoice_header')}
                  </TextLoader>
                </TableHead>
                <TableHead>
                  <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                    {tk('table_status_header')}
                  </TextLoader>
                </TableHead>
                <TableHead>
                  <TextLoader skeletonClassName="h-4 w-14" inheritColor>
                    {tk('table_method_header')}
                  </TextLoader>
                </TableHead>
                <TableHead className="text-right">
                  <TextLoader skeletonClassName="h-4 w-14" inheritColor>
                    {tk('table_amount_header')}
                  </TextLoader>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">INV001</TableCell>
                <TableCell>{tk('table_status_paid')}</TableCell>
                <TableCell>{tk('table_method_credit')}</TableCell>
                <TableCell className="text-right">$250.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">INV002</TableCell>
                <TableCell>{tk('table_status_pending')}</TableCell>
                <TableCell>{tk('table_method_paypal')}</TableCell>
                <TableCell className="text-right">$150.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">INV003</TableCell>
                <TableCell>{tk('table_status_unpaid')}</TableCell>
                <TableCell>{tk('table_method_bank')}</TableCell>
                <TableCell className="text-right">$350.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">INV004</TableCell>
                <TableCell>{tk('table_status_paid')}</TableCell>
                <TableCell>{tk('table_method_credit')}</TableCell>
                <TableCell className="text-right">$450.00</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">INV005</TableCell>
                <TableCell>{tk('table_status_paid')}</TableCell>
                <TableCell>{tk('table_method_paypal')}</TableCell>
                <TableCell className="text-right">$550.00</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>
                  <TextLoader skeletonClassName="h-4 w-10" inheritColor>
                    {tk('table_total')}
                  </TextLoader>
                </TableCell>
                <TableCell className="text-right">$1,750.00</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>


      {/* Data Table Element Block */}
      <div data-element-id="element-data-table" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('data_table_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <PaymentsDataTable tk={tk} />
        </div>
      </div>

      {/* Typography Element Block */}
      <div data-element-id="element-typography" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('typography_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Headings */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('typography_headings_label')}
              </label>
            </TextLoader>
            <div className="flex flex-col gap-4">
              <TypographyH1>
                <TextLoader skeletonClassName="h-10 w-64" inheritColor>
                  {tk('typography_h1_text')}
                </TextLoader>
              </TypographyH1>
              <TypographyH2>
                <TextLoader skeletonClassName="h-8 w-48" inheritColor>
                  {tk('typography_h2_text')}
                </TextLoader>
              </TypographyH2>
              <TypographyH3>
                <TextLoader skeletonClassName="h-7 w-40" inheritColor>
                  {tk('typography_h3_text')}
                </TextLoader>
              </TypographyH3>
              <TypographyH4>
                <TextLoader skeletonClassName="h-6 w-36" inheritColor>
                  {tk('typography_h4_text')}
                </TextLoader>
              </TypographyH4>
            </div>
          </div>

          {/* Body Text */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('typography_body_label')}
              </label>
            </TextLoader>
            <div className="flex flex-col gap-4">
              <TypographyP>
                <TextLoader skeletonClassName="h-5 w-full" inheritColor>
                  {tk('typography_p_text')}
                </TextLoader>
              </TypographyP>
              <TypographyLarge>
                <TextLoader skeletonClassName="h-6 w-48" inheritColor>
                  {tk('typography_large_text')}
                </TextLoader>
              </TypographyLarge>
              <TypographySmall>
                <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                  {tk('typography_small_text')}
                </TextLoader>
              </TypographySmall>
              <TypographyMuted>
                <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                  {tk('typography_muted_text')}
                </TextLoader>
              </TypographyMuted>
            </div>
          </div>

          {/* Blockquote */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('typography_blockquote_label')}
              </label>
            </TextLoader>
            <TypographyBlockquote>
              <TextLoader skeletonClassName="h-5 w-full" inheritColor>
                {tk('typography_blockquote_text')}
              </TextLoader>
            </TypographyBlockquote>
          </div>

          {/* List */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('typography_list_label')}
              </label>
            </TextLoader>
            <TypographyList>
              <li>
                <TextLoader skeletonClassName="h-5 w-48" inheritColor>
                  {tk('typography_list_item_1')}
                </TextLoader>
              </li>
              <li>
                <TextLoader skeletonClassName="h-5 w-52" inheritColor>
                  {tk('typography_list_item_2')}
                </TextLoader>
              </li>
              <li>
                <TextLoader skeletonClassName="h-5 w-56" inheritColor>
                  {tk('typography_list_item_3')}
                </TextLoader>
              </li>
            </TypographyList>
          </div>

          {/* Inline Code */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('typography_code_label')}
              </label>
            </TextLoader>
            <TypographyP>
              <TextLoader skeletonClassName="h-5 w-64" inheritColor>
                {tk('typography_code_text')}{' '}
                <TypographyInlineCode>npm install @hai3/uikit</TypographyInlineCode>
              </TextLoader>
            </TypographyP>
          </div>
        </div>
      </div>

    </>
  );
};

DataDisplayElements.displayName = 'DataDisplayElements';
