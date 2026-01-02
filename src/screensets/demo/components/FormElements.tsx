import React, { useState, useEffect } from 'react';
import {
  // Base
  Calendar,
  Checkbox,
  Input,
  Label,
  Switch,
  Textarea,
  // Select
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
  // Radio
  RadioGroup,
  RadioGroupItem,
  // Field
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  // Input Group
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  // Date Picker
  DatePicker,
  DatePickerTrigger,
  DatePickerContent,
  DatePickerInput,
  // Input OTP
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@hai3/uikit';
import { ButtonVariant } from '@hai3/uikit';
import { Copy, RefreshCw, CornerDownLeft } from 'lucide-react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";
import { ProfileForm } from "../uikit/forms/ProfileForm";

/**
 * Form Elements Component
 * Contains Input, Select and Switch demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const FormElements: React.FC = () => {
  const { t } = useTranslation();

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  const [airplaneMode, setAirplaneMode] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 5, 12),
    to: new Date(2025, 6, 15),
  });
  const [dropdownMode, setDropdownMode] = useState<React.ComponentProps<typeof Calendar>["captionLayout"]>("dropdown");
  const [dropdownDate, setDropdownDate] = useState<Date | undefined>(new Date(2025, 5, 12));

  // Date Picker state
  const [basicPickerDate, setBasicPickerDate] = useState<Date | undefined>(undefined);
  const [dobPickerDate, setDobPickerDate] = useState<Date | undefined>(undefined);
  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [inputPickerDate, setInputPickerDate] = useState<Date | undefined>(new Date(2025, 5, 1));
  const [dateTimePickerDate, setDateTimePickerDate] = useState<Date | undefined>(undefined);
  const [dateTimePickerOpen, setDateTimePickerOpen] = useState(false);

  // Get timezone on mount
  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  return (
    <>
      {/* Calendar Element Block */}
      <div data-element-id="element-calendar" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-28">
          <h2 className="text-2xl font-semibold">
            {tk('calendar_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-8 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Selected Date with TimeZone */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('calendar_timezone_label')}
              </label>
            </TextLoader>
            <div className="flex flex-col gap-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                timeZone={timeZone}
                className="rounded-lg border shadow-sm"
              />
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  {tk('calendar_selected')}: {format(selectedDate, "PPP")} ({timeZone})
                </p>
              )}
            </div>
          </div>

          {/* Range Calendar */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-28" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('calendar_range_label')}
              </label>
            </TextLoader>
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              className="rounded-lg border shadow-sm"
            />
          </div>

          {/* Month and Year Selector */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-36" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('calendar_month_year_label')}
              </label>
            </TextLoader>
            <div className="flex flex-col gap-4 w-fit">
              <Calendar
                mode="single"
                defaultMonth={dropdownDate}
                selected={dropdownDate}
                onSelect={setDropdownDate}
                captionLayout={dropdownMode}
                className="rounded-lg border shadow-sm"
              />
              <div className="flex flex-col gap-2">
                <Select
                  value={dropdownMode}
                  onValueChange={(value) => setDropdownMode(value as React.ComponentProps<typeof Calendar>["captionLayout"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Dropdown" />
                  </SelectTrigger>
                  <SelectContent align="center">
                    <SelectItem value="dropdown">Month and Year</SelectItem>
                    <SelectItem value="dropdown-months">Month Only</SelectItem>
                    <SelectItem value="dropdown-years">Year Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Date Picker Element Block */}
      <div data-element-id="element-date-picker" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('date_picker_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-8 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Basic Date Picker */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('date_picker_basic_label')}
              </label>
            </TextLoader>
            <DatePicker date={basicPickerDate} onDateChange={setBasicPickerDate}>
              <DatePickerTrigger placeholder={tk('date_picker_select_date')} />
              <DatePickerContent />
            </DatePicker>
          </div>

          {/* Date of Birth Picker */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('date_picker_dob_label')}
              </label>
            </TextLoader>
            <div className="flex flex-col gap-3">
              <Label htmlFor="dob-picker" className="px-1">
                {tk('date_picker_dob_field_label')}
              </Label>
              <DatePicker
                date={dobPickerDate}
                onDateChange={setDobPickerDate}
                open={dobPickerOpen}
                onOpenChange={setDobPickerOpen}
                formatDate={(date) => date.toLocaleDateString()}
              >
                <DatePickerTrigger
                  id="dob-picker"
                  icon="chevron"
                  className="w-48"
                  placeholder={tk('date_picker_select_date')}
                />
                <DatePickerContent
                  calendarProps={{ captionLayout: "dropdown" }}
                />
              </DatePicker>
            </div>
          </div>

          {/* Date Picker with Input */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('date_picker_input_label')}
              </label>
            </TextLoader>
            <div className="flex flex-col gap-3">
              <Label htmlFor="input-picker" className="px-1">
                {tk('date_picker_input_field_label')}
              </Label>
              <DatePicker
                date={inputPickerDate}
                onDateChange={setInputPickerDate}
                formatDate={(date) => format(date, "MMMM dd, yyyy")}
              >
                <DatePickerInput
                  id="input-picker"
                  placeholder={tk('date_picker_input_placeholder')}
                />
              </DatePicker>
            </div>
          </div>

          {/* Date and Time Picker */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('date_picker_datetime_label')}
              </label>
            </TextLoader>
            <div className="flex gap-4 flex-wrap">
              <div className="flex flex-col gap-3">
                <Label htmlFor="datetime-picker" className="px-1">
                  {tk('date_picker_date_label')}
                </Label>
                <DatePicker
                  date={dateTimePickerDate}
                  onDateChange={setDateTimePickerDate}
                  open={dateTimePickerOpen}
                  onOpenChange={setDateTimePickerOpen}
                  formatDate={(date) => date.toLocaleDateString()}
                >
                  <DatePickerTrigger
                    id="datetime-picker"
                    icon="chevron"
                    className="w-32"
                    placeholder={tk('date_picker_select_date')}
                  />
                  <DatePickerContent
                    calendarProps={{ captionLayout: "dropdown" }}
                  />
                </DatePicker>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="time-picker" className="px-1">
                  {tk('date_picker_time_label')}
                </Label>
                <Input
                  type="time"
                  id="time-picker"
                  step="1"
                  defaultValue="10:30:00"
                  className="bg-background w-32 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Checkbox Element Block */}
      <div data-element-id="element-checkbox" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-28">
          <h2 className="text-2xl font-semibold">
            {tk('checkbox_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Basic Checkbox */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('checkbox_basic_label')}
              </label>
            </TextLoader>
            <div className="flex items-center gap-3">
              <Checkbox id="terms" />
              <Label htmlFor="terms">{tk('checkbox_terms')}</Label>
            </div>
          </div>

          {/* Checkbox with Description */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('checkbox_with_text_label')}
              </label>
            </TextLoader>
            <div className="flex items-start gap-3">
              <Checkbox id="terms-2" defaultChecked />
              <div className="grid gap-2">
                <Label htmlFor="terms-2">{tk('checkbox_terms')}</Label>
                <p className="text-muted-foreground text-sm">
                  {tk('checkbox_terms_description')}
                </p>
              </div>
            </div>
          </div>

          {/* Disabled Checkbox */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('checkbox_disabled_label')}
              </label>
            </TextLoader>
            <div className="flex items-start gap-3">
              <Checkbox id="toggle" disabled />
              <Label htmlFor="toggle">{tk('checkbox_notifications')}</Label>
            </div>
          </div>

          {/* Card Style Checkbox */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('checkbox_card_label')}
              </label>
            </TextLoader>
            <label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-primary has-[[aria-checked=true]]:bg-primary/10 max-w-sm cursor-pointer">
              <Checkbox
                id="toggle-2"
                defaultChecked
              />
              <div className="grid gap-1.5 font-normal">
                <p className="text-sm leading-none font-medium">
                  {tk('checkbox_notifications')}
                </p>
                <p className="text-muted-foreground text-sm">
                  {tk('checkbox_notifications_description')}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Radio Group Element Block */}
      <div data-element-id="element-radio-group" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('radio_group_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Default Radio Group */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('radio_group_default_label')}
              </label>
            </TextLoader>
            <RadioGroup defaultValue="comfortable">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="default" id="rg-default" />
                <Label htmlFor="rg-default">{tk('radio_group_option_default')}</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="comfortable" id="rg-comfortable" />
                <Label htmlFor="rg-comfortable">{tk('radio_group_option_comfortable')}</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="compact" id="rg-compact" />
                <Label htmlFor="rg-compact">{tk('radio_group_option_compact')}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Disabled Radio Group */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('radio_group_disabled_label')}
              </label>
            </TextLoader>
            <RadioGroup defaultValue="default">
              <div className="flex items-center gap-3">
                <RadioGroupItem value="default" id="rg-dis-default" />
                <Label htmlFor="rg-dis-default">{tk('radio_group_option_default')}</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem value="comfortable" id="rg-dis-comfortable" disabled />
                <Label htmlFor="rg-dis-comfortable" className="text-muted-foreground">{tk('radio_group_option_comfortable')}</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Radio Group with Description */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('radio_group_with_description_label')}
              </label>
            </TextLoader>
            <RadioGroup defaultValue="default" className="gap-4">
              <label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10 max-w-sm cursor-pointer">
                <RadioGroupItem value="default" id="rg-desc-default" className="mt-0.5" />
                <div className="grid gap-1 font-normal">
                  <p className="text-sm leading-none font-medium">
                    {tk('radio_group_option_default')}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {tk('radio_group_option_default_desc')}
                  </p>
                </div>
              </label>
              <label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10 max-w-sm cursor-pointer">
                <RadioGroupItem value="comfortable" id="rg-desc-comfortable" className="mt-0.5" />
                <div className="grid gap-1 font-normal">
                  <p className="text-sm leading-none font-medium">
                    {tk('radio_group_option_comfortable')}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {tk('radio_group_option_comfortable_desc')}
                  </p>
                </div>
              </label>
              <label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/10 max-w-sm cursor-pointer">
                <RadioGroupItem value="compact" id="rg-desc-compact" className="mt-0.5" />
                <div className="grid gap-1 font-normal">
                  <p className="text-sm leading-none font-medium">
                    {tk('radio_group_option_compact')}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {tk('radio_group_option_compact_desc')}
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Input OTP Element Block */}
      <div data-element-id="element-input-otp" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-28">
          <h2 className="text-2xl font-semibold">
            {tk('input_otp_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Basic Input OTP */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_otp_basic_label')}
              </label>
            </TextLoader>
            <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS_AND_CHARS}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Input OTP with Separator */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_otp_separator_label')}
              </label>
            </TextLoader>
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {/* Controlled Input OTP */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-28" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_otp_controlled_label')}
              </label>
            </TextLoader>
            <div className="space-y-2">
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(value) => setOtpValue(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <div className="text-center text-sm">
                {otpValue === "" ? (
                  <span>{tk('input_otp_enter_code')}</span>
                ) : (
                  <span>{tk('input_otp_entered')}: {otpValue}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Label Element Block */}
      <div data-element-id="element-label" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('label_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Default Label with Input */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('label_default_label')}
              </label>
            </TextLoader>
            <div className="grid w-full max-w-sm items-center gap-2">
              <Label htmlFor="email-default">{tk('input_email_label')}</Label>
              <Input type="email" id="email-default" />
            </div>
          </div>

          {/* Label with Required Indicator */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('label_required_label')}
              </label>
            </TextLoader>
            <div className="grid w-full max-w-sm items-center gap-2">
              <Label htmlFor="name-required">
                {tk('input_name_label')} <span className="text-destructive">*</span>
              </Label>
              <Input type="text" id="name-required" required />
            </div>
          </div>
        </div>
      </div>

      {/* Field Element Block */}
      <div data-element-id="element-field" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('field_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Basic Field */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('field_basic_label')}
              </label>
            </TextLoader>
            <Field>
              <FieldLabel htmlFor="field-email">{tk('field_email_label')}</FieldLabel>
              <Input type="email" id="field-email" />
              <FieldDescription>{tk('field_email_description')}</FieldDescription>
            </Field>
          </div>

          {/* Field with Error */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('field_error_label')}
              </label>
            </TextLoader>
            <Field data-invalid="true">
              <FieldLabel htmlFor="field-error">{tk('field_password_label')}</FieldLabel>
              <Input type="password" id="field-error" />
              <FieldError>{tk('field_password_error')}</FieldError>
            </Field>
          </div>

          {/* Field Group */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('field_group_label')}
              </label>
            </TextLoader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="field-first-name">{tk('field_first_name_label')}</FieldLabel>
                <Input type="text" id="field-first-name" />
              </Field>
              <Field>
                <FieldLabel htmlFor="field-last-name">{tk('field_last_name_label')}</FieldLabel>
                <Input type="text" id="field-last-name" />
              </Field>
            </FieldGroup>
          </div>

          {/* Field Set */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('field_set_label')}
              </label>
            </TextLoader>
            <FieldSet>
              <FieldLegend>{tk('field_contact_info_legend')}</FieldLegend>
              <Field>
                <FieldLabel htmlFor="field-phone">{tk('field_phone_label')}</FieldLabel>
                <Input type="tel" id="field-phone" />
              </Field>
              <Field>
                <FieldLabel htmlFor="field-address">{tk('field_address_label')}</FieldLabel>
                <Input type="text" id="field-address" />
              </Field>
            </FieldSet>
          </div>
        </div>
      </div>

      {/* Form Element Block */}
      <div data-element-id="element-form" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('form_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Profile Form with Validation */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('form_profile_label')}
              </label>
            </TextLoader>
            <ProfileForm tk={tk} />
          </div>
        </div>
      </div>

      {/* Input Group Element Block */}
      <div data-element-id="element-input-group" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('input_group_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Input with Button Addon */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_group_button_label')}
              </label>
            </TextLoader>
            <div className="grid w-full max-w-sm gap-4">
              <InputGroup>
                <InputGroupInput placeholder={tk('input_group_url_placeholder')} readOnly />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={tk('input_group_copy_label')}
                    title={tk('input_group_copy_label')}
                    size="icon-xs"
                  >
                    <Copy className="size-3.5" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <InputGroup>
                <InputGroupInput placeholder={tk('input_group_search_placeholder')} />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton variant={ButtonVariant.Secondary}>
                    {tk('input_group_search_button')}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          {/* Input with Label Addon */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_group_label_label')}
              </label>
            </TextLoader>
            <div className="grid w-full max-w-sm gap-4">
              <InputGroup>
                <InputGroupInput id="input-group-email" placeholder={tk('input_group_username_placeholder')} />
                <InputGroupAddon align="inline-end">
                  <Label htmlFor="input-group-email">@example.com</Label>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          {/* Textarea with Addons */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_group_textarea_label')}
              </label>
            </TextLoader>
            <div className="w-full max-w-md">
              <InputGroup>
                <InputGroupTextarea
                  id="textarea-code"
                  placeholder={tk('input_group_code_placeholder')}
                  className="min-h-[200px]"
                />
                <InputGroupAddon align="block-end" className="border-t">
                  <InputGroupText>{tk('input_group_line_info')}</InputGroupText>
                  <InputGroupButton size="sm" className="ml-auto" variant={ButtonVariant.Default}>
                    {tk('input_group_run_button')} <CornerDownLeft className="size-3.5" />
                  </InputGroupButton>
                </InputGroupAddon>
                <InputGroupAddon align="block-start" className="border-b">
                  <InputGroupText className="font-mono font-medium">
                    script.js
                  </InputGroupText>
                  <InputGroupButton className="ml-auto" size="icon-xs">
                    <RefreshCw className="size-3.5" />
                  </InputGroupButton>
                  <InputGroupButton variant={ButtonVariant.Ghost} size="icon-xs">
                    <Copy className="size-3.5" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </div>
      </div>

      {/* Input Element Block */}
      <div data-element-id="element-input" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('input_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Default Input */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_default_label')}
              </label>
            </TextLoader>
            <Input type="text" placeholder={tk('input_name_placeholder')} />
          </div>

          {/* File Input */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_file_label')}
              </label>
            </TextLoader>
            <Input id="picture" type="file" />
          </div>

          {/* Disabled Input */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_disabled_label')}
              </label>
            </TextLoader>
            <Input disabled type="email" placeholder={tk('input_email_placeholder')} />
          </div>

          {/* Input with Label */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('input_with_label_label')}
              </label>
            </TextLoader>
            <div className="grid w-full items-center gap-3">
              <Label htmlFor="password-with-label">{tk('input_new_password_label')}</Label>
              <Input type="password" id="password-with-label" placeholder={tk('input_password_placeholder')} />
            </div>
          </div>
        </div>
      </div>

      {/* Select Element Block */}
      <div data-element-id="element-select" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('select_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <Select>
            <SelectTrigger className="w-[280px] max-w-full">
              <SelectValue placeholder={tk('select_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{tk('select_group_north_america')}</SelectLabel>
                <SelectItem value="est">{tk('timezone_est')}</SelectItem>
                <SelectItem value="cst">{tk('timezone_cst')}</SelectItem>
                <SelectItem value="mst">{tk('timezone_mst')}</SelectItem>
                <SelectItem value="pst">{tk('timezone_pst')}</SelectItem>
                <SelectItem value="akst">{tk('timezone_akst')}</SelectItem>
                <SelectItem value="hst">{tk('timezone_hst')}</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>{tk('select_group_europe_africa')}</SelectLabel>
                <SelectItem value="gmt">{tk('timezone_gmt')}</SelectItem>
                <SelectItem value="cet">{tk('timezone_cet')}</SelectItem>
                <SelectItem value="eet">{tk('timezone_eet')}</SelectItem>
                <SelectItem value="west">{tk('timezone_west')}</SelectItem>
                <SelectItem value="cat">{tk('timezone_cat')}</SelectItem>
                <SelectItem value="eat">{tk('timezone_eat')}</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>{tk('select_group_asia')}</SelectLabel>
                <SelectItem value="msk">{tk('timezone_msk')}</SelectItem>
                <SelectItem value="ist">{tk('timezone_ist')}</SelectItem>
                <SelectItem value="cst_china">{tk('timezone_cst_china')}</SelectItem>
                <SelectItem value="jst">{tk('timezone_jst')}</SelectItem>
                <SelectItem value="kst">{tk('timezone_kst')}</SelectItem>
                <SelectItem value="ist_indonesia">{tk('timezone_wita')}</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>{tk('select_group_australia_pacific')}</SelectLabel>
                <SelectItem value="awst">{tk('timezone_awst')}</SelectItem>
                <SelectItem value="acst">{tk('timezone_acst')}</SelectItem>
                <SelectItem value="aest">{tk('timezone_aest')}</SelectItem>
                <SelectItem value="nzst">{tk('timezone_nzst')}</SelectItem>
                <SelectItem value="fjt">{tk('timezone_fjt')}</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>{tk('select_group_south_america')}</SelectLabel>
                <SelectItem value="art">{tk('timezone_art')}</SelectItem>
                <SelectItem value="bot">{tk('timezone_bot')}</SelectItem>
                <SelectItem value="brt">{tk('timezone_brt')}</SelectItem>
                <SelectItem value="clt">{tk('timezone_clt')}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Native Select Element Block */}
      <div data-element-id="element-native-select" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('native_select_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Default Native Select */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('native_select_default_label')}
              </label>
            </TextLoader>
            <NativeSelect>
              <NativeSelectOption value="">{tk('native_select_placeholder')}</NativeSelectOption>
              <NativeSelectOption value="low">{tk('native_select_priority_low')}</NativeSelectOption>
              <NativeSelectOption value="medium">{tk('native_select_priority_medium')}</NativeSelectOption>
              <NativeSelectOption value="high">{tk('native_select_priority_high')}</NativeSelectOption>
              <NativeSelectOption value="critical">{tk('native_select_priority_critical')}</NativeSelectOption>
            </NativeSelect>
          </div>

          {/* Native Select with Option Groups */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('native_select_groups_label')}
              </label>
            </TextLoader>
            <NativeSelect>
              <NativeSelectOption value="">{tk('native_select_department_placeholder')}</NativeSelectOption>
              <NativeSelectOptGroup label={tk('native_select_group_engineering')}>
                <NativeSelectOption value="frontend">{tk('native_select_dept_frontend')}</NativeSelectOption>
                <NativeSelectOption value="backend">{tk('native_select_dept_backend')}</NativeSelectOption>
                <NativeSelectOption value="devops">{tk('native_select_dept_devops')}</NativeSelectOption>
              </NativeSelectOptGroup>
              <NativeSelectOptGroup label={tk('native_select_group_sales')}>
                <NativeSelectOption value="sales-rep">{tk('native_select_dept_sales_rep')}</NativeSelectOption>
                <NativeSelectOption value="account-manager">{tk('native_select_dept_account_manager')}</NativeSelectOption>
              </NativeSelectOptGroup>
            </NativeSelect>
          </div>

          {/* Disabled Native Select */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('native_select_disabled_label')}
              </label>
            </TextLoader>
            <NativeSelect disabled>
              <NativeSelectOption value="">{tk('native_select_role_placeholder')}</NativeSelectOption>
              <NativeSelectOption value="admin">{tk('native_select_role_admin')}</NativeSelectOption>
              <NativeSelectOption value="editor">{tk('native_select_role_editor')}</NativeSelectOption>
            </NativeSelect>
          </div>

          {/* Invalid Native Select */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('native_select_invalid_label')}
              </label>
            </TextLoader>
            <NativeSelect aria-invalid="true">
              <NativeSelectOption value="">{tk('native_select_role_placeholder')}</NativeSelectOption>
              <NativeSelectOption value="admin">{tk('native_select_role_admin')}</NativeSelectOption>
              <NativeSelectOption value="editor">{tk('native_select_role_editor')}</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* Switch Element Block */}
      <div data-element-id="element-switch" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('switch_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-2 p-6 border border-border rounded-lg bg-background">
          <div className="flex items-center justify-center gap-2">
            <TextLoader skeletonClassName="h-5 w-32" inheritColor>
              <label
                htmlFor="airplane-mode-switch"
                className="cursor-pointer select-none"
              >
                {tk('airplane_mode')}
              </label>
            </TextLoader>
            <Switch
              id="airplane-mode-switch"
              checked={airplaneMode}
              onCheckedChange={setAirplaneMode}
            />
          </div>
        </div>
      </div>

      {/* Textarea Element Block */}
      <div data-element-id="element-textarea" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('textarea_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">
          {/* Default Textarea */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('textarea_default_label')}
              </label>
            </TextLoader>
            <Textarea placeholder={tk('textarea_placeholder')} />
          </div>

          {/* Disabled Textarea */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('textarea_disabled_label')}
              </label>
            </TextLoader>
            <Textarea disabled placeholder={tk('textarea_placeholder')} />
          </div>
        </div>
      </div>
    </>
  );
};

FormElements.displayName = 'FormElements';
