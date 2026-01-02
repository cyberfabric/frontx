import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  ButtonVariant,
  ButtonSize,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  Progress,
  Skeleton,
  Spinner,
  useToast,
} from '@hai3/uikit';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { AlertCircleIcon, BellIcon, CheckCircle2Icon, CloudIcon, PopcornIcon, RefreshCcwIcon } from 'lucide-react';
import { LoaderIcon } from '../uikit/icons/LoaderIcon';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";

/**
 * Feedback Elements Component
 * Contains Alert, Alert Dialog, Empty, Progress, Spinner, Skeleton, and Sonner demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const FeedbackElements: React.FC = () => {
  const { t } = useTranslation();
  const { toast, success, info, warning, error, promise } = useToast();

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  const [progressValue, setProgressValue] = useState(33);

  return (
    <>
      {/* Alert Element Block */}
      <div data-element-id="element-alert" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('alert_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="grid w-full max-w-xl items-start gap-4">
            {/* Success Alert with icon, title, and description */}
            <Alert>
              <CheckCircle2Icon />
              <AlertTitle>
                <TextLoader skeletonClassName="h-4 w-64" inheritColor>
                  {tk('alert_success_title')}
                </TextLoader>
              </AlertTitle>
              <AlertDescription>
                <TextLoader skeletonClassName="h-4 w-80">
                  {tk('alert_success_description')}
                </TextLoader>
              </AlertDescription>
            </Alert>

            {/* Info Alert with icon and title only */}
            <Alert>
              <PopcornIcon />
              <AlertTitle>
                <TextLoader skeletonClassName="h-4 w-72" inheritColor>
                  {tk('alert_info_title')}
                </TextLoader>
              </AlertTitle>
            </Alert>

            {/* Destructive Alert with icon, title, description, and list */}
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>
                <TextLoader skeletonClassName="h-4 w-56" inheritColor>
                  {tk('alert_error_title')}
                </TextLoader>
              </AlertTitle>
              <AlertDescription>
                <TextLoader skeletonClassName="h-4 w-72" inheritColor>
                  <p>{tk('alert_error_description')}</p>
                </TextLoader>
                <ul className="list-inside list-disc text-sm">
                  <li>
                    <TextLoader skeletonClassName="h-3.5 w-32 inline-block" inheritColor>
                      {tk('alert_error_check_card')}
                    </TextLoader>
                  </li>
                  <li>
                    <TextLoader skeletonClassName="h-3.5 w-36 inline-block" inheritColor>
                      {tk('alert_error_ensure_funds')}
                    </TextLoader>
                  </li>
                  <li>
                    <TextLoader skeletonClassName="h-3.5 w-32 inline-block" inheritColor>
                      {tk('alert_error_verify_address')}
                    </TextLoader>
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Alert Dialog Element Block */}
      <div data-element-id="element-alert-dialog" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('alert_dialog_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Basic Alert Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant={ButtonVariant.Outline}>
                  <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                    {tk('alert_dialog_show')}
                  </TextLoader>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <TextLoader skeletonClassName="h-5 w-48" inheritColor>
                      {tk('alert_dialog_title')}
                    </TextLoader>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <TextLoader skeletonClassName="h-4 w-72">
                      {tk('alert_dialog_description')}
                    </TextLoader>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    <TextLoader skeletonClassName="h-4 w-14" inheritColor>
                      {tk('alert_dialog_cancel')}
                    </TextLoader>
                  </AlertDialogCancel>
                  <AlertDialogAction>
                    <TextLoader skeletonClassName="h-4 w-16" inheritColor>
                      {tk('alert_dialog_continue')}
                    </TextLoader>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Destructive Alert Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant={ButtonVariant.Destructive}>
                  <TextLoader skeletonClassName="h-4 w-28" inheritColor>
                    {tk('alert_dialog_delete_trigger')}
                  </TextLoader>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <TextLoader skeletonClassName="h-5 w-48" inheritColor>
                      {tk('alert_dialog_delete_title')}
                    </TextLoader>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <TextLoader skeletonClassName="h-4 w-80">
                      {tk('alert_dialog_delete_description')}
                    </TextLoader>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    <TextLoader skeletonClassName="h-4 w-14" inheritColor>
                      {tk('alert_dialog_cancel')}
                    </TextLoader>
                  </AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <TextLoader skeletonClassName="h-4 w-14" inheritColor>
                      {tk('alert_dialog_delete_action')}
                    </TextLoader>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Empty Element Block */}
      <div data-element-id="element-empty" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('empty_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="grid w-full gap-6 md:grid-cols-3">
            {/* Outline Empty State */}
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CloudIcon />
                </EmptyMedia>
                <EmptyTitle>
                  <TextLoader skeletonClassName="h-5 w-40" inheritColor>
                    {tk('empty_outline_title')}
                  </TextLoader>
                </EmptyTitle>
                <EmptyDescription>
                  <TextLoader skeletonClassName="h-4 w-56">
                    {tk('empty_outline_description')}
                  </TextLoader>
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                  <TextLoader skeletonClassName="h-4 w-20" inheritColor>
                    {tk('empty_outline_action')}
                  </TextLoader>
                </Button>
              </EmptyContent>
            </Empty>

            {/* Muted Background Empty State */}
            <Empty className="from-muted/50 to-background h-full bg-gradient-to-b from-30%">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BellIcon />
                </EmptyMedia>
                <EmptyTitle>
                  <TextLoader skeletonClassName="h-5 w-36" inheritColor>
                    {tk('empty_muted_title')}
                  </TextLoader>
                </EmptyTitle>
                <EmptyDescription>
                  <TextLoader skeletonClassName="h-4 w-52">
                    {tk('empty_muted_description')}
                  </TextLoader>
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant={ButtonVariant.Outline} size={ButtonSize.Sm}>
                  <RefreshCcwIcon className="size-4" />
                  <TextLoader skeletonClassName="h-4 w-14" inheritColor>
                    {tk('empty_muted_action')}
                  </TextLoader>
                </Button>
              </EmptyContent>
            </Empty>

            {/* Avatar Empty State */}
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="default">
                  <Avatar className="size-12">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      className="grayscale"
                    />
                    <AvatarFallback>LR</AvatarFallback>
                  </Avatar>
                </EmptyMedia>
                <EmptyTitle>
                  <TextLoader skeletonClassName="h-5 w-28" inheritColor>
                    {tk('empty_avatar_title')}
                  </TextLoader>
                </EmptyTitle>
                <EmptyDescription>
                  <TextLoader skeletonClassName="h-4 w-64">
                    {tk('empty_avatar_description')}
                  </TextLoader>
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size={ButtonSize.Sm}>
                  <TextLoader skeletonClassName="h-4 w-24" inheritColor>
                    {tk('empty_avatar_action')}
                  </TextLoader>
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        </div>
      </div>

      {/* Progress Element Block */}
      <div data-element-id="element-progress" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('progress_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex flex-col gap-6 w-full max-w-md">
            <div className="flex flex-col gap-2">
              <TextLoader skeletonClassName="h-5 w-32" inheritColor>
                <label className="text-sm font-medium">
                  {tk('progress_primary_label')}
                </label>
              </TextLoader>
              <Progress value={progressValue} className="bg-primary/20" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressValue}%</span>
                <TextLoader skeletonClassName="h-3.5 w-14" inheritColor>
                  <button
                    onClick={() => setProgressValue((prev) => Math.min(100, prev + 10))}
                    className="text-primary hover:underline"
                  >
                    {tk('progress_increase')}
                  </button>
                </TextLoader>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <TextLoader skeletonClassName="h-4 w-36" inheritColor>
                <label className="text-sm font-medium">
                  {tk('progress_destructive_label')}
                </label>
              </TextLoader>
              <Progress
                value={progressValue}
                className="bg-destructive/20 [&>div]:bg-destructive"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressValue}%</span>
                <TextLoader skeletonClassName="h-3.5 w-14" inheritColor>
                  <button
                    onClick={() => setProgressValue((prev) => Math.max(0, prev - 10))}
                    className="text-destructive hover:underline"
                  >
                    {tk('progress_decrease')}
                  </button>
                </TextLoader>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spinner Element Block */}
      <div data-element-id="element-spinner" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('spinner_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex flex-wrap items-center justify-center gap-8">
            {/* Different sizes */}
            <Spinner size="size-4" className="text-primary" />
            <Spinner size="size-6" className="text-primary" />
            <Spinner size="size-8" className="text-primary" />
            <Spinner size="size-12" className="text-primary" />

            {/* Different colors */}
            <Spinner icon={LoaderIcon} size="size-6" className="text-primary" />
            <Spinner icon={LoaderIcon} size="size-6" className="text-destructive" />
            <Spinner icon={LoaderIcon} size="size-6" className="text-muted-foreground" />

            {/* Different colors */}
            <Spinner size="size-6" className="text-green-500" />
            <Spinner size="size-6" className="text-purple-500" />
            <Spinner size="size-6" className="text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Skeleton Element Block */}
      <div data-element-id="element-skeleton" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('skeleton_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Sonner Element Block */}
      <div data-element-id="element-sonner" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('sonner_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex flex-wrap gap-2">
            <TextLoader skeletonClassName="h-9 w-20" inheritColor>
              <Button
                variant={ButtonVariant.Outline}
                onClick={() =>
                  toast(tk('sonner_default_message'), {
                    description: tk('sonner_default_description'),
                    action: {
                      label: tk('sonner_action_undo'),
                      onClick: () => console.log('Undo'),
                    },
                  })
                }
              >
                {tk('sonner_default_label')}
              </Button>
            </TextLoader>
            <TextLoader skeletonClassName="h-9 w-20" inheritColor>
              <Button
                variant={ButtonVariant.Outline}
                onClick={() => success(tk('sonner_success_message'))}
              >
                {tk('sonner_success_label')}
              </Button>
            </TextLoader>
            <TextLoader skeletonClassName="h-9 w-20" inheritColor>
              <Button
                variant={ButtonVariant.Outline}
                onClick={() => info(tk('sonner_info_message'))}
              >
                {tk('sonner_info_label')}
              </Button>
            </TextLoader>
            <TextLoader skeletonClassName="h-9 w-20" inheritColor>
              <Button
                variant={ButtonVariant.Outline}
                onClick={() => warning(tk('sonner_warning_message'))}
              >
                {tk('sonner_warning_label')}
              </Button>
            </TextLoader>
            <TextLoader skeletonClassName="h-9 w-20" inheritColor>
              <Button
                variant={ButtonVariant.Outline}
                onClick={() => error(tk('sonner_error_message'))}
              >
                {tk('sonner_error_label')}
              </Button>
            </TextLoader>
            <TextLoader skeletonClassName="h-9 w-20" inheritColor>
              <Button
                variant={ButtonVariant.Outline}
                onClick={() => {
                  promise<{ name: string }>(
                    () =>
                      new Promise((resolve) =>
                        setTimeout(() => resolve({ name: tk('sonner_promise_success') }), 2000)
                      ),
                    {
                      loading: tk('sonner_promise_loading'),
                      success: (data) => data.name,
                      error: tk('sonner_promise_error'),
                    }
                  );
                }}
              >
                {tk('sonner_promise_label')}
              </Button>
            </TextLoader>
          </div>
        </div>
      </div>
    </>
  );
};

FeedbackElements.displayName = 'FeedbackElements';
