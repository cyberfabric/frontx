import React from 'react';
import {
  Button,
  IconButton,
  ButtonVariant,
  ButtonSize,
  IconButtonSize,
  ButtonGroup,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
} from '@hai3/uikit';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { StarIcon } from '../uikit/icons/StarIcon';
import {
  PlusIcon,
  MinusIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AudioLinesIcon,
  CalendarIcon,
  SmileIcon,
  CalculatorIcon,
  UserIcon,
  CreditCardIcon,
  SettingsIcon,
  ItalicIcon,
  BookmarkIcon,
  UnderlineIcon,
  BoldIcon,
  HeartIcon,
} from 'lucide-react';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";

/**
 * Action Elements Component
 * Contains Button demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const ActionElements: React.FC = () => {
  const { t } = useTranslation();
  const [voiceEnabled, setVoiceEnabled] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  // Keyboard shortcut for command palette
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      {/* Button Element Block */}
      <div data-element-id="element-button" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('button_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-4 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* First row: 6 Default sized buttons with variants */}
          <div className="flex flex-wrap items-center justify-between w-full gap-2 min-w-0">
            <Button variant={ButtonVariant.Default} className="shrink-0">
              <TextLoader skeletonClassName="h-6 w-16" inheritColor>
                {tk('button_default')}
              </TextLoader>
            </Button>
            <Button variant={ButtonVariant.Destructive} className="shrink-0">
              <TextLoader skeletonClassName="h-6 w-20" inheritColor>
                {tk('button_destructive')}
              </TextLoader>
            </Button>
            <Button variant={ButtonVariant.Outline} className="shrink-0">
              <TextLoader skeletonClassName="h-6 w-16" inheritColor>
                {tk('button_outline')}
              </TextLoader>
            </Button>
            <Button variant={ButtonVariant.Secondary} className="shrink-0">
              <TextLoader skeletonClassName="h-6 w-20" inheritColor>
                {tk('button_secondary')}
              </TextLoader>
            </Button>
            <Button variant={ButtonVariant.Ghost} className="shrink-0">
              <TextLoader skeletonClassName="h-6 w-16" inheritColor>
                {tk('button_ghost')}
              </TextLoader>
            </Button>
            <Button variant={ButtonVariant.Link} className="shrink-0">
              <TextLoader skeletonClassName="h-6 w-12" inheritColor>
                {tk('button_link')}
              </TextLoader>
            </Button>
          </div>

          {/* Second row: 6 buttons grouped by size (Small, Default, Large) */}
          <div className="flex flex-wrap items-center justify-between w-full gap-2 min-w-0">
            {/* Small group */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                <TextLoader skeletonClassName="h-5 w-24" inheritColor>
                  {tk('button_small_outlined')}
                </TextLoader>
              </Button>
              <IconButton
                variant={ButtonVariant.Outline}
                size={IconButtonSize.Small}
                aria-label="Small icon button"
              >
                <StarIcon className="w-4 h-4" />
              </IconButton>
            </div>

            {/* Default group */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant={ButtonVariant.Outline} size={ButtonSize.Default}>
                <TextLoader skeletonClassName="h-6 w-28" inheritColor>
                  {tk('button_default_outlined')}
                </TextLoader>
              </Button>
              <IconButton
                variant={ButtonVariant.Outline}
                size={IconButtonSize.Default}
                aria-label="Default icon button"
              >
                <StarIcon />
              </IconButton>
            </div>

            {/* Large group */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant={ButtonVariant.Outline} size={ButtonSize.Lg}>
                <TextLoader skeletonClassName="h-6 w-32" inheritColor>
                  {tk('button_large_outlined')}
                </TextLoader>
              </Button>
              <IconButton
                variant={ButtonVariant.Outline}
                size={IconButtonSize.Large}
                aria-label="Large icon button"
              >
                <StarIcon />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Button Group Element Block */}
      <div data-element-id="element-button-group" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('button_group_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Size Example */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-24">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('button_group_size_label')}
              </span>
            </TextLoader>
            <div className="flex flex-col items-start gap-4">
              <ButtonGroup>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                  <TextLoader skeletonClassName="h-4 w-10" inheritColor>
                    {tk('button_group_small')}
                  </TextLoader>
                </Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                  <TextLoader skeletonClassName="h-4 w-12" inheritColor>
                    {tk('button_default')}
                  </TextLoader>
                </Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                  <TextLoader skeletonClassName="h-4 w-10" inheritColor>
                    {tk('button_group_group')}
                  </TextLoader>
                </Button>
                <IconButton variant={ButtonVariant.Outline} size={IconButtonSize.Small} aria-label="Add">
                  <PlusIcon />
                </IconButton>
              </ButtonGroup>
              <ButtonGroup>
                <Button variant={ButtonVariant.Outline}>
                  <TextLoader skeletonClassName="h-5 w-14" inheritColor>
                    {tk('button_group_default')}
                  </TextLoader>
                </Button>
                <Button variant={ButtonVariant.Outline}>
                  <TextLoader skeletonClassName="h-5 w-12" inheritColor>
                    {tk('button_default')}
                  </TextLoader>
                </Button>
                <Button variant={ButtonVariant.Outline}>
                  <TextLoader skeletonClassName="h-5 w-10" inheritColor>
                    {tk('button_group_group')}
                  </TextLoader>
                </Button>
                <IconButton variant={ButtonVariant.Outline} size={IconButtonSize.Default} aria-label="Add">
                  <PlusIcon />
                </IconButton>
              </ButtonGroup>
              <ButtonGroup>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Lg}>
                  <TextLoader skeletonClassName="h-6 w-12" inheritColor>
                    {tk('button_group_large')}
                  </TextLoader>
                </Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Lg}>
                  <TextLoader skeletonClassName="h-6 w-12" inheritColor>
                    {tk('button_default')}
                  </TextLoader>
                </Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Lg}>
                  <TextLoader skeletonClassName="h-6 w-10" inheritColor>
                    {tk('button_group_group')}
                  </TextLoader>
                </Button>
                <IconButton variant={ButtonVariant.Outline} size={IconButtonSize.Large} aria-label="Add">
                  <PlusIcon />
                </IconButton>
              </ButtonGroup>
            </div>
          </div>

          {/* Nested Example */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-24">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('button_group_nested_label')}
              </span>
            </TextLoader>
            <ButtonGroup>
              <ButtonGroup>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>1</Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>2</Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>3</Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>4</Button>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>5</Button>
              </ButtonGroup>
              <ButtonGroup>
                <IconButton variant={ButtonVariant.Outline} size={IconButtonSize.Small} aria-label="Previous">
                  <ArrowLeftIcon />
                </IconButton>
                <IconButton variant={ButtonVariant.Outline} size={IconButtonSize.Small} aria-label="Next">
                  <ArrowRightIcon />
                </IconButton>
              </ButtonGroup>
            </ButtonGroup>
          </div>

          {/* Orientation Example */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-24">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('button_group_orientation_label')}
              </span>
            </TextLoader>
            <ButtonGroup orientation="vertical" aria-label="Media controls" className="h-fit">
              <IconButton variant={ButtonVariant.Outline} size={IconButtonSize.Default} aria-label="Increase">
                <PlusIcon />
              </IconButton>
              <IconButton variant={ButtonVariant.Outline} size={IconButtonSize.Default} aria-label="Decrease">
                <MinusIcon />
              </IconButton>
            </ButtonGroup>
          </div>

          {/* With Input Group Example */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-32">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('button_group_input_label')}
              </span>
            </TextLoader>
            <ButtonGroup className="[--radius:9999rem]">
              <ButtonGroup>
                <IconButton variant={ButtonVariant.Outline} size={IconButtonSize.Default} aria-label="Add">
                  <PlusIcon />
                </IconButton>
              </ButtonGroup>
              <ButtonGroup>
                <InputGroup>
                  <InputGroupInput
                    placeholder={voiceEnabled ? tk('button_group_voice_placeholder') : tk('button_group_message_placeholder')}
                    disabled={voiceEnabled}
                  />
                  <InputGroupAddon align="inline-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InputGroupButton
                          onClick={() => setVoiceEnabled(!voiceEnabled)}
                          size="icon-xs"
                          data-active={voiceEnabled}
                          className="data-[active=true]:bg-orange-100 data-[active=true]:text-orange-700 dark:data-[active=true]:bg-orange-800 dark:data-[active=true]:text-orange-100"
                          aria-pressed={voiceEnabled}
                          aria-label={tk('button_group_voice_mode')}
                        >
                          <AudioLinesIcon />
                        </InputGroupButton>
                      </TooltipTrigger>
                      <TooltipContent>{tk('button_group_voice_mode')}</TooltipContent>
                    </Tooltip>
                  </InputGroupAddon>
                </InputGroup>
              </ButtonGroup>
            </ButtonGroup>
          </div>
        </div>
      </div>

      {/* Command Element Block */}
      <div data-element-id="element-command" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-28">
          <h2 className="text-2xl font-semibold">
            {tk('command_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-4 p-6 border border-border rounded-lg bg-background overflow-hidden">
          <p className="text-muted-foreground text-sm">
            {tk('command_press')}{' '}
            <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
              <span className="text-xs">⌘</span>J
            </kbd>
          </p>
          <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
            <CommandInput placeholder={tk('command_placeholder')} />
            <CommandList>
              <CommandEmpty>{tk('command_no_results')}</CommandEmpty>
              <CommandGroup heading={tk('command_suggestions')}>
                <CommandItem>
                  <CalendarIcon />
                  <span>{tk('command_calendar')}</span>
                </CommandItem>
                <CommandItem>
                  <SmileIcon />
                  <span>{tk('command_search_emoji')}</span>
                </CommandItem>
                <CommandItem>
                  <CalculatorIcon />
                  <span>{tk('command_calculator')}</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading={tk('command_settings')}>
                <CommandItem>
                  <UserIcon />
                  <span>{tk('command_profile')}</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <CreditCardIcon />
                  <span>{tk('command_billing')}</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <SettingsIcon />
                  <span>{tk('command_settings_item')}</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </div>
      </div>

      {/* Toggle Element Block */}
      <div data-element-id="element-toggle" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-20">
          <h2 className="text-2xl font-semibold">
            {tk('toggle_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-4 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Default Toggle */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-24">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('toggle_default_label')}
              </span>
            </TextLoader>
            <div className="flex items-center gap-2">
              <Toggle aria-label="Toggle italic"  size="sm">
                <ItalicIcon />
              </Toggle>
              <Toggle aria-label="Toggle italic">
                <ItalicIcon />
              </Toggle>
              <Toggle aria-label="Toggle italic" size="lg">
                <ItalicIcon />
              </Toggle>
            </div>
          </div>

          {/* With Text Toggle */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-24">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('toggle_with_text_label')}
              </span>
            </TextLoader>
            <div className="flex items-center gap-2">
              <Toggle aria-label="Toggle italic" size="sm">
                <ItalicIcon />
                <TextLoader skeletonClassName="h-4 w-10" inheritColor>
                  {tk('toggle_italic')}
                </TextLoader>
              </Toggle>
              <Toggle aria-label="Toggle italic">
                <ItalicIcon />
                <TextLoader skeletonClassName="h-4 w-10" inheritColor>
                  {tk('toggle_italic')}
                </TextLoader>
              </Toggle>
              <Toggle aria-label="Toggle italic" size="lg">
                <ItalicIcon />
                <TextLoader skeletonClassName="h-4 w-10" inheritColor>
                  {tk('toggle_italic')}
                </TextLoader>
              </Toggle>
            </div>
          </div>

          {/* Outline Toggle */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-28">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('toggle_outline_label')}
              </span>
            </TextLoader>
            <div className="flex items-center gap-2">
              <Toggle
                aria-label="Toggle bookmark"
                size="sm"
                variant="outline"
                className="[&_svg]:data-[state=on]:fill-current"
              >
                <BookmarkIcon />
                <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                  {tk('toggle_bookmark')}
                </TextLoader>
              </Toggle>
              <Toggle
                aria-label="Toggle bookmark"
                variant="outline"
                className="[&_svg]:data-[state=on]:fill-current"
              >
                <BookmarkIcon />
                <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                  {tk('toggle_bookmark')}
                </TextLoader>
              </Toggle>
              <Toggle
                aria-label="Toggle bookmark"
                size="lg"
                variant="outline"
                className="[&_svg]:data-[state=on]:fill-current"
              >
                <BookmarkIcon />
                <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                  {tk('toggle_bookmark')}
                </TextLoader>
              </Toggle>
            </div>
          </div>

          {/* Disabled Toggle */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-20">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('toggle_disabled_label')}
              </span>
            </TextLoader>
            <div className="flex items-center gap-2">
              <Toggle aria-label="Toggle underline" variant="outline" size="sm" disabled>
                <UnderlineIcon />
              </Toggle>
              <Toggle aria-label="Toggle underline" variant="outline" disabled>
                <UnderlineIcon />
              </Toggle>
              <Toggle aria-label="Toggle underline" variant="outline" size="lg" disabled>
                <UnderlineIcon />
              </Toggle>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Group Element Block */}
      <div data-element-id="element-toggle-group" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('toggle_group_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-4 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Single Selection */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-24">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('toggle_group_single_label')}
              </span>
            </TextLoader>
            <div className="flex items-center gap-2">
              <ToggleGroup type="single">
                <ToggleGroupItem value="bold" aria-label="Toggle bold">
                  <BoldIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value="italic" aria-label="Toggle italic">
                  <ItalicIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value="underline" aria-label="Toggle underline">
                  <UnderlineIcon />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Outline Variant */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-28">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('toggle_group_outline_label')}
              </span>
            </TextLoader>
            <div className="flex items-center gap-2">
              <ToggleGroup type="multiple" variant="outline">
                <ToggleGroupItem value="bold" aria-label="Toggle bold">
                  <BoldIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value="italic" aria-label="Toggle italic">
                  <ItalicIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value="underline" aria-label="Toggle underline">
                  <UnderlineIcon />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* With Spacing */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-24">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('toggle_group_spacing_label')}
              </span>
            </TextLoader>
            <div className="flex items-center gap-2">
              <ToggleGroup type="multiple" variant="outline" spacing={1} size="sm">
                <ToggleGroupItem
                  value="star"
                  aria-label="Toggle star"
                  className="[&_svg]:data-[state=on]:fill-current"
                >
                  <StarIcon />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="heart"
                  aria-label="Toggle heart"
                  className="[&_svg]:data-[state=on]:fill-current"
                >
                  <HeartIcon />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="bookmark"
                  aria-label="Toggle bookmark"
                  className="[&_svg]:data-[state=on]:fill-current"
                >
                  <BookmarkIcon />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Disabled */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-5 w-20">
              <span className="text-sm text-muted-foreground font-medium">
                {tk('toggle_group_disabled_label')}
              </span>
            </TextLoader>
            <div className="flex items-center gap-2">
              <ToggleGroup type="multiple" variant="outline" disabled>
                <ToggleGroupItem value="bold" aria-label="Toggle bold">
                  <BoldIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value="italic" aria-label="Toggle italic">
                  <ItalicIcon />
                </ToggleGroupItem>
                <ToggleGroupItem value="underline" aria-label="Toggle underline">
                  <UnderlineIcon />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

ActionElements.displayName = 'ActionElements';
