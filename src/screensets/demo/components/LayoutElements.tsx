import React from 'react';
import { AspectRatio, Button, ButtonVariant, ButtonSize, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose, ResizablePanelGroup, ResizablePanel, ResizableHandle, ScrollArea, ScrollBar, Separator, Sheet, SheetTrigger, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, Avatar, AvatarImage, AvatarFallback, Badge, Label, Input } from '@hai3/uikit';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { LinkTextInput } from '../uikit/icons/LinkTextInput';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";

/**
 * Layout Elements Component
 * Contains Card, Dialog, and Sheet demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const LayoutElements: React.FC = () => {
  const { t } = useTranslation();

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  return (
    <>
      {/* Aspect Ratio Element Block */}
      <div data-element-id="element-aspect-ratio" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('aspect_ratio_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* 16:9 Aspect Ratio */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('aspect_ratio_16_9_label')}
              </label>
            </TextLoader>
            <div className="w-full max-w-md">
              <AspectRatio ratio={16 / 9}>
                <img
                  src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
                  alt="Landscape"
                  className="h-full w-full rounded-md object-cover"
                />
              </AspectRatio>
            </div>
          </div>

          {/* 1:1 Aspect Ratio */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('aspect_ratio_1_1_label')}
              </label>
            </TextLoader>
            <div className="w-full max-w-xs">
              <AspectRatio ratio={1}>
                <img
                  src="https://images.unsplash.com/photo-1535025183041-0991a977e25b?w=600&dpr=2&q=80"
                  alt="Mountains"
                  className="h-full w-full rounded-md object-cover"
                />
              </AspectRatio>
            </div>
          </div>
        </div>
      </div>

      {/* Card Element Block */}
      <div data-element-id="element-card" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('card_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Basic Card */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('card_basic_label')}
              </label>
            </TextLoader>
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>
                  <TextLoader skeletonClassName="h-6 w-32" inheritColor>
                    {tk('card_basic_title')}
                  </TextLoader>
                </CardTitle>
                <CardDescription>
                  <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                    {tk('card_basic_description')}
                  </TextLoader>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                  <p className="text-sm">
                    {tk('card_basic_content')}
                  </p>
                </TextLoader>
              </CardContent>
            </Card>
          </div>

          {/* User Card */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('card_user_title')}
              </label>
            </TextLoader>
            <Card className="w-full max-w-sm">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <CardTitle className="text-lg">
                      <TextLoader skeletonClassName="h-5 w-24" inheritColor>
                        {tk('card_user_name')}
                      </TextLoader>
                    </CardTitle>
                    <CardDescription>
                      <TextLoader skeletonClassName="h-4 w-40" inheritColor>
                        {tk('card_user_email')}
                      </TextLoader>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      <TextLoader skeletonClassName="h-3.5 w-20" inheritColor>
                        {tk('card_user_role')}
                      </TextLoader>
                    </Badge>
                  </div>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('card_user_bio')}
                    </p>
                  </TextLoader>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant={ButtonVariant.Default} size={ButtonSize.Sm} className="flex-1">
                  <TextLoader skeletonClassName="h-5 w-16" inheritColor>
                    {tk('card_user_follow')}
                  </TextLoader>
                </Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm} className="flex-1">
                  <TextLoader skeletonClassName="h-5 w-20" inheritColor>
                    {tk('card_user_message')}
                  </TextLoader>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Login Form Card */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('card_form_title')}
              </label>
            </TextLoader>
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>
                  <TextLoader skeletonClassName="h-6 w-48" inheritColor>
                    {tk('card_form_login_title')}
                  </TextLoader>
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center justify-between">
                    <TextLoader skeletonClassName="h-4 w-56" inheritColor>
                      {tk('card_form_login_description')}
                    </TextLoader>
                    <Button variant={ButtonVariant.Link} size={ButtonSize.Sm} className="h-auto p-0">
                      <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                        {tk('card_form_signup')}
                      </TextLoader>
                    </Button>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                        <Label htmlFor="email">
                          {tk('card_form_email_label')}
                        </Label>
                      </TextLoader>
                      <Input
                        id="email"
                        type="email"
                        placeholder={tk('card_form_email_placeholder')}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center">
                        <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                          <Label htmlFor="password">
                            {tk('card_form_password_label')}
                          </Label>
                        </TextLoader>
                        <TextLoader skeletonClassName="h-4 w-32 ml-auto" inheritColor>
                          <a
                            href="#"
                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-primary"
                          >
                            {tk('card_form_forgot_password')}
                          </a>
                        </TextLoader>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        required
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button type="submit" variant={ButtonVariant.Default} className="w-full">
                  <TextLoader skeletonClassName="h-5 w-16" inheritColor>
                    {tk('card_form_login_button')}
                  </TextLoader>
                </Button>
                <Button variant={ButtonVariant.Outline} className="w-full">
                  <TextLoader skeletonClassName="h-5 w-32" inheritColor>
                    {tk('card_form_login_google')}
                  </TextLoader>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog Element Block */}
      <div data-element-id="element-dialog" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('dialog_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center gap-4 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Edit Profile Dialog */}
          <Dialog>
            <form>
              <DialogTrigger asChild>
                <Button variant={ButtonVariant.Outline}>
                  <TextLoader skeletonClassName="h-5 w-24" inheritColor>
                    {tk('dialog_open_dialog')}
                  </TextLoader>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    <TextLoader skeletonClassName="h-6 w-32" inheritColor>
                      {tk('dialog_edit_profile_title')}
                    </TextLoader>
                  </DialogTitle>
                  <DialogDescription>
                    <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                      {tk('dialog_edit_profile_description')}
                    </TextLoader>
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                      <Label htmlFor="name-1">
                        {tk('dialog_name_label')}
                      </Label>
                    </TextLoader>
                    <Input
                      id="name-1"
                      name="name"
                      type="text"
                      defaultValue={tk('dialog_name_placeholder')}
                    />
                  </div>
                  <div className="grid gap-3">
                    <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                      <Label htmlFor="username-1">
                        {tk('dialog_username_label')}
                      </Label>
                    </TextLoader>
                    <Input
                      id="username-1"
                      name="username"
                      type="text"
                      defaultValue={tk('dialog_username_placeholder')}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant={ButtonVariant.Outline}>
                      <TextLoader skeletonClassName="h-5 w-16" inheritColor>
                        {tk('dialog_cancel')}
                      </TextLoader>
                    </Button>
                  </DialogClose>
                  <Button type="submit">
                    <TextLoader skeletonClassName="h-5 w-28" inheritColor>
                      {tk('dialog_save_changes')}
                    </TextLoader>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </form>
          </Dialog>

          {/* Custom close button Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant={ButtonVariant.Outline}>
                <TextLoader skeletonClassName="h-5 w-40" inheritColor>
                  {tk('dialog_custom_close_button')}
                </TextLoader>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  <TextLoader skeletonClassName="h-6 w-24" inheritColor>
                    {tk('dialog_share_title')}
                  </TextLoader>
                </DialogTitle>
                <DialogDescription>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    {tk('dialog_share_description')}
                  </TextLoader>
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <div className="grid flex-1 gap-2">
                  <TextLoader skeletonClassName="h-4 w-12 sr-only" inheritColor>
                    <label htmlFor="link" className="sr-only">
                      {tk('dialog_link_label')}
                    </label>
                  </TextLoader>
                  <LinkTextInput
                    id="link"
                    defaultValue={tk('dialog_link_value')}
                  />
                </div>
              </div>
              <DialogFooter className="sm:justify-start">
                <DialogClose asChild>
                  <Button type="button" variant={ButtonVariant.Secondary}>
                    <TextLoader skeletonClassName="h-5 w-12" inheritColor>
                      {tk('dialog_close')}
                    </TextLoader>
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Drawer Element Block */}
      <div data-element-id="element-drawer" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('drawer_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center gap-4 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant={ButtonVariant.Outline}>
                <TextLoader skeletonClassName="h-5 w-24" inheritColor>
                  {tk('drawer_open')}
                </TextLoader>
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>
                  <TextLoader skeletonClassName="h-6 w-32" inheritColor>
                    {tk('drawer_title')}
                  </TextLoader>
                </DrawerTitle>
                <DrawerDescription>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    {tk('drawer_description')}
                  </TextLoader>
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4">
                <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                  <p className="text-sm text-muted-foreground">
                    {tk('drawer_content')}
                  </p>
                </TextLoader>
              </div>
              <DrawerFooter>
                <Button type="submit">
                  <TextLoader skeletonClassName="h-5 w-16" inheritColor>
                    {tk('drawer_submit')}
                  </TextLoader>
                </Button>
                <DrawerClose asChild>
                  <Button variant={ButtonVariant.Outline}>
                    <TextLoader skeletonClassName="h-5 w-16" inheritColor>
                      {tk('drawer_close')}
                    </TextLoader>
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Resizable Element Block */}
      <div data-element-id="element-resizable" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('resizable_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Horizontal Resizable */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('resizable_horizontal_label')}
              </label>
            </TextLoader>
            <ResizablePanelGroup
              direction="horizontal"
              className="min-h-[200px] max-w-md rounded-lg border"
            >
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center p-6">
                  <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                    <span className="font-semibold">{tk('resizable_panel_one')}</span>
                  </TextLoader>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center p-6">
                  <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                    <span className="font-semibold">{tk('resizable_panel_two')}</span>
                  </TextLoader>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* Vertical Resizable */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('resizable_vertical_label')}
              </label>
            </TextLoader>
            <ResizablePanelGroup
              direction="vertical"
              className="min-h-[300px] max-w-md rounded-lg border"
            >
              <ResizablePanel defaultSize={25}>
                <div className="flex h-full items-center justify-center p-6">
                  <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                    <span className="font-semibold">{tk('resizable_panel_one')}</span>
                  </TextLoader>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={75}>
                <div className="flex h-full items-center justify-center p-6">
                  <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                    <span className="font-semibold">{tk('resizable_panel_two')}</span>
                  </TextLoader>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* Nested Resizable (Horizontal + Vertical) */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('resizable_nested_label')}
              </label>
            </TextLoader>
            <ResizablePanelGroup
              direction="horizontal"
              className="min-h-[200px] max-w-md rounded-lg border"
            >
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center p-6">
                  <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                    <span className="font-semibold">{tk('resizable_panel_one')}</span>
                  </TextLoader>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={50}>
                <ResizablePanelGroup direction="vertical">
                  <ResizablePanel defaultSize={25}>
                    <div className="flex h-full items-center justify-center p-6">
                      <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                        <span className="font-semibold">{tk('resizable_panel_two')}</span>
                      </TextLoader>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={75}>
                    <div className="flex h-full items-center justify-center p-6">
                      <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                        <span className="font-semibold">{tk('resizable_panel_three')}</span>
                      </TextLoader>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </div>

      {/* Scroll Area Element Block */}
      <div data-element-id="element-scroll-area" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('scroll_area_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Vertical Scroll Area */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('scroll_area_vertical_label')}
              </label>
            </TextLoader>
            <ScrollArea className="h-72 w-48 rounded-md border">
              <div className="p-4">
                <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                  <h4 className="mb-4 text-sm leading-none font-medium">
                    {tk('scroll_area_tags_title')}
                  </h4>
                </TextLoader>
                {Array.from({ length: 50 }).map((_, i, a) => (
                  <React.Fragment key={i}>
                    <div className="text-sm">v1.2.0-beta.{a.length - i}</div>
                    <div className="my-2 h-px bg-border" />
                  </React.Fragment>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Horizontal Scroll Area */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('scroll_area_horizontal_label')}
              </label>
            </TextLoader>
            <ScrollArea className="w-96 rounded-md border whitespace-nowrap">
              <div className="flex w-max space-x-4 p-4">
                {[
                  { artist: 'Ornella Binni', art: 'https://images.unsplash.com/photo-1465869185982-5a1a7522cbcb?auto=format&fit=crop&w=300&q=80' },
                  { artist: 'Tom Byrom', art: 'https://images.unsplash.com/photo-1548516173-3cabfa4607e9?auto=format&fit=crop&w=300&q=80' },
                  { artist: 'Vladimir Malyavko', art: 'https://images.unsplash.com/photo-1494337480532-3725c85fd2ab?auto=format&fit=crop&w=300&q=80' },
                ].map((artwork) => (
                  <figure key={artwork.artist} className="shrink-0">
                    <div className="overflow-hidden rounded-md">
                      <img
                        src={artwork.art}
                        alt={`Photo by ${artwork.artist}`}
                        className="aspect-[3/4] h-fit w-fit object-cover"
                        width={300}
                        height={400}
                      />
                    </div>
                    <figcaption className="text-muted-foreground pt-2 text-xs whitespace-normal">
                      <TextLoader skeletonClassName="h-3 w-20" inheritColor>
                        {tk('scroll_area_photo_by')}{' '}
                        <span className="text-foreground font-semibold">
                          {artwork.artist}
                        </span>
                      </TextLoader>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Separator Element Block */}
      <div data-element-id="element-separator" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('separator_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div>
            <div className="space-y-1">
              <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                <h4 className="text-sm leading-none font-medium">
                  {tk('separator_title')}
                </h4>
              </TextLoader>
              <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                <p className="text-muted-foreground text-sm">
                  {tk('separator_description')}
                </p>
              </TextLoader>
            </div>
            <Separator className="my-4" />
            <div className="flex h-5 items-center space-x-4 text-sm">
              <TextLoader skeletonClassName="h-4 w-8" inheritColor>
                <div>{tk('separator_blog')}</div>
              </TextLoader>
              <Separator orientation="vertical" />
              <TextLoader skeletonClassName="h-4 w-8" inheritColor>
                <div>{tk('separator_docs')}</div>
              </TextLoader>
              <Separator orientation="vertical" />
              <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                <div>{tk('separator_source')}</div>
              </TextLoader>
            </div>
          </div>
        </div>
      </div>

      {/* Sheet Element Block */}
      <div data-element-id="element-sheet" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('sheet_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center gap-4 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant={ButtonVariant.Outline}>
                <TextLoader skeletonClassName="h-5 w-16" inheritColor>
                  {tk('sheet_open')}
                </TextLoader>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>
                  <TextLoader skeletonClassName="h-6 w-32" inheritColor>
                    {tk('sheet_edit_profile_title')}
                  </TextLoader>
                </SheetTitle>
                <SheetDescription>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    {tk('sheet_edit_profile_description')}
                  </TextLoader>
                </SheetDescription>
              </SheetHeader>
              <div className="grid flex-1 auto-rows-min gap-6 px-4 py-4">
                <div className="grid gap-3">
                  <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                    <Label htmlFor="sheet-demo-name">
                      {tk('sheet_name_label')}
                    </Label>
                  </TextLoader>
                  <Input
                    id="sheet-demo-name"
                    type="text"
                    defaultValue={tk('sheet_name_placeholder')}
                  />
                </div>
                <div className="grid gap-3">
                  <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                    <Label htmlFor="sheet-demo-username">
                      {tk('sheet_username_label')}
                    </Label>
                  </TextLoader>
                  <Input
                    id="sheet-demo-username"
                    type="text"
                    defaultValue={tk('sheet_username_placeholder')}
                  />
                </div>
              </div>
              <SheetFooter>
                <Button type="submit">
                  <TextLoader skeletonClassName="h-5 w-28" inheritColor>
                    {tk('sheet_save_changes')}
                  </TextLoader>
                </Button>
                <SheetClose asChild>
                  <Button variant={ButtonVariant.Outline}>
                    <TextLoader skeletonClassName="h-5 w-16" inheritColor>
                      {tk('sheet_close')}
                    </TextLoader>
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
};

LayoutElements.displayName = 'LayoutElements';
