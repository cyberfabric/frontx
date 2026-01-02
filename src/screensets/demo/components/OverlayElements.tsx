import React from 'react';
import {
  Button,
  IconButton,
  ButtonVariant,
  ButtonSize,
  IconButtonSize,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Popover,
  PopoverTrigger,
  PopoverContent,
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuRadioGroup,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input
} from '@hai3/uikit';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { CalendarDays } from 'lucide-react';
import { StarIcon } from '../uikit/icons/StarIcon';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";

/**
 * Overlay Elements Component
 * Contains ContextMenu, DropdownMenu, HoverCard, Popover, and Tooltip demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const OverlayElements: React.FC = () => {
  const { t } = useTranslation();
  const [showStatusBar, setShowStatusBar] = React.useState(true);
  const [showActivityBar, setShowActivityBar] = React.useState(false);
  const [showPanel, setShowPanel] = React.useState(false);
  const [position, setPosition] = React.useState("bottom");
  const [notifications, setNotifications] = React.useState(true);
  const [autoUpdate, setAutoUpdate] = React.useState(false);
  const [theme, setTheme] = React.useState("light");

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  return (
    <>
      {/* Context Menu Element Block */}
      <div data-element-id="element-context-menu" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-40">
          <h2 className="text-2xl font-semibold">
            {tk('contextmenu_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Basic Context Menu */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('contextmenu_basic_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed text-sm cursor-context-menu">
                    <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                      {tk('contextmenu_trigger')}
                    </TextLoader>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem>
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('contextmenu_back')}
                    </TextLoader>
                    <ContextMenuShortcut>⌘[</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem disabled>
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('contextmenu_forward')}
                    </TextLoader>
                    <ContextMenuShortcut>⌘]</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('contextmenu_reload')}
                    </TextLoader>
                    <ContextMenuShortcut>⌘R</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem>
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('contextmenu_more_tools')}
                    </TextLoader>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          </div>

          {/* Context Menu with Checkboxes and Radio */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-48" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('contextmenu_advanced_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed text-sm cursor-context-menu">
                    <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                      {tk('contextmenu_advanced_trigger')}
                    </TextLoader>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                  <ContextMenuItem>
                    <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                      {tk('contextmenu_cut')}
                    </TextLoader>
                    <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                      {tk('contextmenu_copy')}
                    </TextLoader>
                    <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('contextmenu_paste')}
                    </TextLoader>
                    <ContextMenuShortcut>⌘V</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuCheckboxItem
                    checked={showStatusBar}
                    onCheckedChange={setShowStatusBar}
                  >
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('contextmenu_show_status_bar')}
                    </TextLoader>
                  </ContextMenuCheckboxItem>
                  <ContextMenuCheckboxItem
                    checked={showActivityBar}
                    onCheckedChange={setShowActivityBar}
                  >
                    <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                      {tk('contextmenu_show_activity_bar')}
                    </TextLoader>
                  </ContextMenuCheckboxItem>
                  <ContextMenuCheckboxItem
                    checked={showPanel}
                    onCheckedChange={setShowPanel}
                  >
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('contextmenu_show_panel')}
                    </TextLoader>
                  </ContextMenuCheckboxItem>
                  <ContextMenuSeparator />
                  <ContextMenuLabel>
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('contextmenu_position')}
                    </TextLoader>
                  </ContextMenuLabel>
                  <ContextMenuRadioGroup value={position} onValueChange={setPosition}>
                    <ContextMenuRadioItem value="top">
                      <TextLoader skeletonClassName="h-4 w-8" inheritColor>
                        {tk('contextmenu_top')}
                      </TextLoader>
                    </ContextMenuRadioItem>
                    <ContextMenuRadioItem value="bottom">
                      <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                        {tk('contextmenu_bottom')}
                      </TextLoader>
                    </ContextMenuRadioItem>
                    <ContextMenuRadioItem value="right">
                      <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                        {tk('contextmenu_right')}
                      </TextLoader>
                    </ContextMenuRadioItem>
                  </ContextMenuRadioGroup>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          </div>

          {/* Context Menu with Submenu */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('contextmenu_submenu_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed text-sm cursor-context-menu">
                    <TextLoader skeletonClassName="h-4 w-40" inheritColor>
                      {tk('contextmenu_submenu_trigger')}
                    </TextLoader>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem>
                    <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                      {tk('contextmenu_open')}
                    </TextLoader>
                  </ContextMenuItem>
                  <ContextMenuItem>
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('contextmenu_download')}
                    </TextLoader>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                        {tk('contextmenu_share')}
                      </TextLoader>
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-48">
                      <ContextMenuItem>
                        <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                          {tk('contextmenu_email')}
                        </TextLoader>
                      </ContextMenuItem>
                      <ContextMenuItem>
                        <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                          {tk('contextmenu_messages')}
                        </TextLoader>
                      </ContextMenuItem>
                      <ContextMenuItem>
                        <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                          {tk('contextmenu_notes')}
                        </TextLoader>
                      </ContextMenuItem>
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator />
                  <ContextMenuItem variant="destructive">
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('contextmenu_delete')}
                    </TextLoader>
                    <ContextMenuShortcut>⌘⌫</ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          </div>

        </div>
      </div>

      {/* Dropdown Menu Element Block */}
      <div data-element-id="element-dropdown-menu" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-40">
          <h2 className="text-2xl font-semibold">
            {tk('dropdownmenu_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Basic Dropdown Menu */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('dropdownmenu_basic_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={ButtonVariant.Outline}>
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('dropdownmenu_trigger')}
                    </TextLoader>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem>
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('dropdownmenu_profile')}
                    </TextLoader>
                    <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('dropdownmenu_billing')}
                    </TextLoader>
                    <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('dropdownmenu_settings')}
                    </TextLoader>
                    <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('dropdownmenu_logout')}
                    </TextLoader>
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Dropdown Menu with Checkboxes and Radio */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-48" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('dropdownmenu_advanced_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={ButtonVariant.Outline}>
                    <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                      {tk('dropdownmenu_preferences')}
                    </TextLoader>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('dropdownmenu_appearance')}
                    </TextLoader>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={notifications}
                    onCheckedChange={setNotifications}
                  >
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('dropdownmenu_notifications')}
                    </TextLoader>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={autoUpdate}
                    onCheckedChange={setAutoUpdate}
                  >
                    <TextLoader skeletonClassName="h-4 w-28" inheritColor>
                      {tk('dropdownmenu_auto_update')}
                    </TextLoader>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('dropdownmenu_theme')}
                    </TextLoader>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                    <DropdownMenuRadioItem value="light">
                      <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                        {tk('dropdownmenu_light')}
                      </TextLoader>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                        {tk('dropdownmenu_dark')}
                      </TextLoader>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">
                      <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                        {tk('dropdownmenu_system')}
                      </TextLoader>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Dropdown Menu with Submenu */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('dropdownmenu_submenu_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={ButtonVariant.Outline}>
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('dropdownmenu_actions')}
                    </TextLoader>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                        {tk('dropdownmenu_new_file')}
                      </TextLoader>
                      <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                        {tk('dropdownmenu_new_folder')}
                      </TextLoader>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                        {tk('dropdownmenu_export')}
                      </TextLoader>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem>
                        <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                          {tk('dropdownmenu_pdf')}
                        </TextLoader>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                          {tk('dropdownmenu_csv')}
                        </TextLoader>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                          {tk('dropdownmenu_json')}
                        </TextLoader>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('dropdownmenu_disabled')}
                    </TextLoader>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

        </div>
      </div>

      {/* Hover Card Element Block */}
      <div data-element-id="element-hover-card" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('hovercard_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Basic Hover Card */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('hovercard_basic_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <span className="text-sm text-primary underline cursor-pointer">
                    <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                      {tk('hovercard_hover_trigger')}
                    </TextLoader>
                  </span>
                </HoverCardTrigger>
                <HoverCardContent>
                  <div className="space-y-2">
                    <TextLoader skeletonClassName="h-5 w-32" inheritColor>
                      <h4 className="text-sm font-semibold">
                        {tk('hovercard_custom_title')}
                      </h4>
                    </TextLoader>
                    <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                      <p className="text-sm text-muted-foreground">
                        {tk('hovercard_custom_content')}
                      </p>
                    </TextLoader>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>

          {/* Hover Card with Custom Content */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('hovercard_custom_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <HoverCard>
                <HoverCardTrigger asChild>
                  <Button variant={ButtonVariant.Link}>
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('hovercard_username')}
                    </TextLoader>
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="flex justify-between space-x-4">
                    <Avatar>
                      <AvatarImage src="https://github.com/vercel.png" />
                      <AvatarFallback>VC</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <TextLoader skeletonClassName="h-5 w-24" inheritColor>
                        <h4 className="text-sm font-semibold">
                          {tk('hovercard_name')}
                        </h4>
                      </TextLoader>
                      <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                        <p className="text-sm text-muted-foreground">
                          {tk('hovercard_description')}
                        </p>
                      </TextLoader>
                      <div className="flex items-center pt-2">
                        <CalendarDays className="mr-2 h-4 w-4 opacity-70" />
                        <TextLoader skeletonClassName="h-3.5 w-32" inheritColor>
                          <span className="text-xs text-muted-foreground">
                            {tk('hovercard_joined')}
                          </span>
                        </TextLoader>
                      </div>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>

        </div>
      </div>

      {/* Popover Element Block */}
      <div data-element-id="element-popover" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('popover_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Basic Popover */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('popover_basic_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={ButtonVariant.Outline}>
                    <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                      {tk('popover_open_button')}
                    </TextLoader>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <TextLoader skeletonClassName="h-5 w-32" inheritColor>
                        <h4 className="font-medium leading-none">
                          {tk('popover_basic_title')}
                        </h4>
                      </TextLoader>
                      <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                        <p className="text-sm text-muted-foreground">
                          {tk('popover_basic_description')}
                        </p>
                      </TextLoader>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Popover with Form */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('popover_form_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={ButtonVariant.Default}>
                    <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                      {tk('popover_dimensions_button')}
                    </TextLoader>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <TextLoader skeletonClassName="h-5 w-24" inheritColor>
                        <h4 className="font-medium leading-none">
                          {tk('popover_dimensions_title')}
                        </h4>
                      </TextLoader>
                      <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                        <p className="text-sm text-muted-foreground">
                          {tk('popover_dimensions_description')}
                        </p>
                      </TextLoader>
                    </div>
                    <div className="grid gap-2">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                          <label htmlFor="width" className="text-sm">
                            {tk('popover_width_label')}
                          </label>
                        </TextLoader>
                        <Input
                          id="width"
                          defaultValue="100%"
                          className="col-span-2 h-8"
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                          <label htmlFor="height" className="text-sm">
                            {tk('popover_height_label')}
                          </label>
                        </TextLoader>
                        <Input
                          id="height"
                          defaultValue="25px"
                          className="col-span-2 h-8"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Popover with Different Positioning */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('popover_positions_label')}
              </label>
            </TextLoader>
            <div className="flex justify-center gap-4 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                    <TextLoader skeletonClassName="h-3.5 w-12" inheritColor>
                      {tk('popover_top')}
                    </TextLoader>
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top">
                  <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                    <p className="text-sm">
                      {tk('popover_top_content')}
                    </p>
                  </TextLoader>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                    <TextLoader skeletonClassName="h-3.5 w-16" inheritColor>
                      {tk('popover_right')}
                    </TextLoader>
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="right">
                  <TextLoader skeletonClassName="h-4 w-36" inheritColor>
                    <p className="text-sm">
                      {tk('popover_right_content')}
                    </p>
                  </TextLoader>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                    <TextLoader skeletonClassName="h-3.5 w-16" inheritColor>
                      {tk('popover_bottom')}
                    </TextLoader>
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom">
                  <TextLoader skeletonClassName="h-4 w-40" inheritColor>
                    <p className="text-sm">
                      {tk('popover_bottom_content')}
                    </p>
                  </TextLoader>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                    <TextLoader skeletonClassName="h-3.5 w-12" inheritColor>
                      {tk('popover_left')}
                    </TextLoader>
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="left">
                  <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                    <p className="text-sm">
                      {tk('popover_left_content')}
                    </p>
                  </TextLoader>
                </PopoverContent>
              </Popover>
            </div>
          </div>

        </div>
      </div>

      {/* Tooltip Element Block */}
      <div data-element-id="element-tooltip" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('tooltip_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={ButtonVariant.Outline}>
                  <TextLoader skeletonClassName="h-6 w-16" inheritColor>
                    {tk('tooltip_hover_me')}
                  </TextLoader>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-primary text-primary-foreground">
                <TextLoader skeletonClassName="h-3.5 w-28" inheritColor>
                  <p>{tk('tooltip_text')}</p>
                </TextLoader>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  variant={ButtonVariant.Outline}
                  size={IconButtonSize.Default}
                  aria-label="Info button"
                >
                  <StarIcon />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent className="bg-green-500 text-white">
                <TextLoader skeletonClassName="h-3.5 w-36" inheritColor>
                  <p>{tk('tooltip_icon_text')}</p>
                </TextLoader>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground underline cursor-help">
                  <TextLoader skeletonClassName="h-3.5 w-32" inheritColor>
                    {tk('tooltip_hover_info')}
                  </TextLoader>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-destructive text-destructive-foreground">
                <TextLoader skeletonClassName="h-3.5 w-24" inheritColor>
                  <p>{tk('tooltip_top_text')}</p>
                </TextLoader>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-muted-foreground underline cursor-help">
                  <TextLoader skeletonClassName="h-3.5 w-24" inheritColor>
                    {tk('tooltip_different_side')}
                  </TextLoader>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-muted text-muted-foreground">
                <TextLoader skeletonClassName="h-3.5 w-44" inheritColor>
                  <p>{tk('tooltip_right_text')}</p>
                </TextLoader>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
};

OverlayElements.displayName = 'OverlayElements';
