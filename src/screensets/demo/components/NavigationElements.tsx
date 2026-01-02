import React from 'react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Label,
  Input,
} from '@hai3/uikit';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { Slash } from 'lucide-react';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";

/**
 * Navigation Elements Component
 * Contains Breadcrumb, Menubar, and Navigation Menu demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const NavigationElements: React.FC = () => {
  const { t } = useTranslation();
  const [showBookmarksBar, setShowBookmarksBar] = React.useState(false);
  const [showFullUrls, setShowFullUrls] = React.useState(true);
  const [selectedProfile, setSelectedProfile] = React.useState("benoit");

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  return (
    <>
      {/* Breadcrumb Element Block */}
      <div data-element-id="element-breadcrumb" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('breadcrumb_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Custom Separator */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('breadcrumb_custom_separator_label')}
              </label>
            </TextLoader>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">
                    <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                      {tk('breadcrumb_home')}
                    </TextLoader>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <Slash />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('breadcrumb_components')}
                    </TextLoader>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <Slash />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('breadcrumb_breadcrumb')}
                    </TextLoader>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Dropdown Breadcrumb */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('breadcrumb_dropdown_label')}
              </label>
            </TextLoader>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">
                    <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                      {tk('breadcrumb_home')}
                    </TextLoader>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1">
                      <BreadcrumbEllipsis className="size-4" />
                      <span className="sr-only">Toggle menu</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem>
                        {tk('breadcrumb_documentation')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {tk('breadcrumb_themes')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        {tk('breadcrumb_github')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('breadcrumb_components')}
                    </TextLoader>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      {tk('breadcrumb_breadcrumb')}
                    </TextLoader>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
      </div>

      {/* Menubar Element Block */}
      <div data-element-id="element-menubar" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('menubar_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>{tk('menubar_file')}</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  {tk('menubar_new_tab')} <MenubarShortcut>⌘T</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  {tk('menubar_new_window')} <MenubarShortcut>⌘N</MenubarShortcut>
                </MenubarItem>
                <MenubarItem disabled>{tk('menubar_new_incognito')}</MenubarItem>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>{tk('menubar_share')}</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem>{tk('menubar_email')}</MenubarItem>
                    <MenubarItem>{tk('menubar_messages')}</MenubarItem>
                    <MenubarItem>{tk('menubar_notes')}</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem>
                  {tk('menubar_print')} <MenubarShortcut>⌘P</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>{tk('menubar_edit')}</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  {tk('menubar_undo')} <MenubarShortcut>⌘Z</MenubarShortcut>
                </MenubarItem>
                <MenubarItem>
                  {tk('menubar_redo')} <MenubarShortcut>⇧⌘Z</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarSub>
                  <MenubarSubTrigger>{tk('menubar_find')}</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem>{tk('menubar_search_web')}</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>{tk('menubar_find_file')}</MenubarItem>
                    <MenubarItem>{tk('menubar_find_next')}</MenubarItem>
                    <MenubarItem>{tk('menubar_find_previous')}</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem>{tk('menubar_cut')}</MenubarItem>
                <MenubarItem>{tk('menubar_copy')}</MenubarItem>
                <MenubarItem>{tk('menubar_paste')}</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>{tk('menubar_view')}</MenubarTrigger>
              <MenubarContent>
                <MenubarCheckboxItem
                  checked={showBookmarksBar}
                  onCheckedChange={setShowBookmarksBar}
                >
                  {tk('menubar_always_show_bookmarks')}
                </MenubarCheckboxItem>
                <MenubarCheckboxItem
                  checked={showFullUrls}
                  onCheckedChange={setShowFullUrls}
                >
                  {tk('menubar_always_show_full_urls')}
                </MenubarCheckboxItem>
                <MenubarSeparator />
                <MenubarItem inset>
                  {tk('menubar_reload')} <MenubarShortcut>⌘R</MenubarShortcut>
                </MenubarItem>
                <MenubarItem inset disabled>
                  {tk('menubar_force_reload')} <MenubarShortcut>⇧⌘R</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem inset>{tk('menubar_toggle_fullscreen')}</MenubarItem>
                <MenubarSeparator />
                <MenubarItem inset>{tk('menubar_hide_sidebar')}</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>{tk('menubar_profiles')}</MenubarTrigger>
              <MenubarContent>
                <MenubarRadioGroup value={selectedProfile} onValueChange={setSelectedProfile}>
                  <MenubarRadioItem value="andy">Andy</MenubarRadioItem>
                  <MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
                  <MenubarRadioItem value="luis">Luis</MenubarRadioItem>
                </MenubarRadioGroup>
                <MenubarSeparator />
                <MenubarItem inset>{tk('menubar_edit_profile')}</MenubarItem>
                <MenubarSeparator />
                <MenubarItem inset>{tk('menubar_add_profile')}</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
      </div>

      {/* Navigation Menu Element Block */}
      <div data-element-id="element-navigation-menu" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-40">
          <h2 className="text-2xl font-semibold">
            {tk('navigation_menu_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>{tk('navigation_menu_getting_started')}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <a
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                          href="#"
                        >
                          <div className="mb-2 mt-4 text-lg font-medium">
                            HAI3
                          </div>
                          <p className="text-sm leading-tight text-muted-foreground">
                            {tk('navigation_menu_hai3_desc')}
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          href="#"
                        >
                          <div className="text-sm font-medium leading-none">{tk('navigation_menu_introduction')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {tk('navigation_menu_introduction_desc')}
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          href="#"
                        >
                          <div className="text-sm font-medium leading-none">{tk('navigation_menu_installation')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {tk('navigation_menu_installation_desc')}
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          href="#"
                        >
                          <div className="text-sm font-medium leading-none">{tk('navigation_menu_typography')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {tk('navigation_menu_typography_desc')}
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger>{tk('navigation_menu_components')}</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    <li>
                      <NavigationMenuLink asChild>
                        <a
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          href="#"
                        >
                          <div className="text-sm font-medium leading-none">{tk('navigation_menu_alert_dialog')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {tk('navigation_menu_alert_dialog_desc')}
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          href="#"
                        >
                          <div className="text-sm font-medium leading-none">{tk('navigation_menu_hover_card')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {tk('navigation_menu_hover_card_desc')}
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          href="#"
                        >
                          <div className="text-sm font-medium leading-none">{tk('navigation_menu_progress')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {tk('navigation_menu_progress_desc')}
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <NavigationMenuLink asChild>
                        <a
                          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                          href="#"
                        >
                          <div className="text-sm font-medium leading-none">{tk('navigation_menu_scroll_area')}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {tk('navigation_menu_scroll_area_desc')}
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink
                  className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  href="#"
                >
                  {tk('navigation_menu_documentation')}
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>

      {/* Pagination Element Block */}
      <div data-element-id="element-pagination" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('pagination_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">1</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Tabs Element Block */}
      <div data-element-id="element-tabs" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('tabs_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <Tabs defaultValue="account">
              <TabsList>
                <TabsTrigger value="account">{tk('tabs_account')}</TabsTrigger>
                <TabsTrigger value="password">{tk('tabs_password')}</TabsTrigger>
              </TabsList>
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>{tk('tabs_account_title')}</CardTitle>
                    <CardDescription>
                      {tk('tabs_account_description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="tabs-demo-name">{tk('tabs_name')}</Label>
                      <Input id="tabs-demo-name" defaultValue="Pedro Duarte" />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="tabs-demo-username">{tk('tabs_username')}</Label>
                      <Input id="tabs-demo-username" defaultValue="@peduarte" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>{tk('tabs_save_changes')}</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle>{tk('tabs_password_title')}</CardTitle>
                    <CardDescription>
                      {tk('tabs_password_description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="grid gap-3">
                      <Label htmlFor="tabs-demo-current">{tk('tabs_current_password')}</Label>
                      <Input id="tabs-demo-current" type="password" />
                    </div>
                    <div className="grid gap-3">
                      <Label htmlFor="tabs-demo-new">{tk('tabs_new_password')}</Label>
                      <Input id="tabs-demo-new" type="password" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button>{tk('tabs_save_password')}</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};

NavigationElements.displayName = 'NavigationElements';
