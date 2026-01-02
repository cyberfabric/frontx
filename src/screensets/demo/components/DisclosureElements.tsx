import React, { useState } from 'react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@hai3/uikit';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { ChevronDown } from 'lucide-react';
import { ExpandableButton } from '../uikit/icons/ExpandableButton';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";

/**
 * Disclosure Elements Component
 * Contains Collapsible and Accordion demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const DisclosureElements: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen1, setIsOpen1] = useState(false);
  const [isOpen2, setIsOpen2] = useState(false);
  const [isOpen3, setIsOpen3] = useState(false);

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  return (
    <>
      {/* Accordion Element Block */}
      <div data-element-id="element-accordion" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('accordion_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Basic Accordion - Single Item */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('accordion_single_label')}
              </label>
            </TextLoader>
            <Accordion type="single" collapsible className="w-full max-w-sm">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <TextLoader skeletonClassName="h-4 w-40" inheritColor>
                    {tk('accordion_single_item1_trigger')}
                  </TextLoader>
                </AccordionTrigger>
                <AccordionContent>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('accordion_single_item1_content')}
                    </p>
                  </TextLoader>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Multiple Items Accordion */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('accordion_multiple_label')}
              </label>
            </TextLoader>
            <Accordion type="single" collapsible className="w-full max-w-sm">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                    {tk('accordion_multiple_item1_trigger')}
                  </TextLoader>
                </AccordionTrigger>
                <AccordionContent>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('accordion_multiple_item1_content')}
                    </p>
                  </TextLoader>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                    {tk('accordion_multiple_item2_trigger')}
                  </TextLoader>
                </AccordionTrigger>
                <AccordionContent>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('accordion_multiple_item2_content')}
                    </p>
                  </TextLoader>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                  <TextLoader skeletonClassName="h-4 w-32" inheritColor>
                    {tk('accordion_multiple_item3_trigger')}
                  </TextLoader>
                </AccordionTrigger>
                <AccordionContent>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('accordion_multiple_item3_content')}
                    </p>
                  </TextLoader>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* FAQ Style Accordion */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-24" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('accordion_faq_label')}
              </label>
            </TextLoader>
            <Accordion type="single" collapsible className="w-full max-w-sm">
              <AccordionItem value="faq-1">
                <AccordionTrigger>
                  <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                    {tk('accordion_faq_item1_trigger')}
                  </TextLoader>
                </AccordionTrigger>
                <AccordionContent>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('accordion_faq_item1_content')}
                    </p>
                  </TextLoader>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger>
                  <TextLoader skeletonClassName="h-4 w-48" inheritColor>
                    {tk('accordion_faq_item2_trigger')}
                  </TextLoader>
                </AccordionTrigger>
                <AccordionContent>
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('accordion_faq_item2_content')}
                    </p>
                  </TextLoader>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

        </div>
      </div>

      {/* Collapsible Element Block */}
      <div data-element-id="element-collapsible" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('collapsible_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Basic Collapsible */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('collapsible_basic_label')}
              </label>
            </TextLoader>
            <Collapsible open={isOpen1} onOpenChange={setIsOpen1} className="w-full max-w-sm">
              <CollapsibleTrigger asChild>
                <ExpandableButton isExpanded={isOpen1}>
                  {tk('collapsible_basic_trigger')}
                </ExpandableButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 p-4 border border-border rounded-lg bg-muted/50">
                <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                  <p className="text-sm">
                    {tk('collapsible_basic_content')}
                  </p>
                </TextLoader>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Collapsible with Multiple Sections */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('collapsible_sections_label')}
              </label>
            </TextLoader>
            <div className="w-full max-w-sm flex flex-col gap-2">
              {/* Section 1 */}
              <Collapsible open={isOpen2} onOpenChange={setIsOpen2}>
                <CollapsibleTrigger asChild>
                  <ExpandableButton isExpanded={isOpen2}>
                    {tk('collapsible_section1_trigger')}
                  </ExpandableButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-2">
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('collapsible_section1_content')}
                    </p>
                  </TextLoader>
                </CollapsibleContent>
              </Collapsible>

              {/* Section 2 */}
              <Collapsible open={isOpen3} onOpenChange={setIsOpen3}>
                <CollapsibleTrigger asChild>
                  <ExpandableButton isExpanded={isOpen3}>
                    {tk('collapsible_section2_trigger')}
                  </ExpandableButton>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 py-2">
                  <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                    <p className="text-sm text-muted-foreground">
                      {tk('collapsible_section2_content')}
                    </p>
                  </TextLoader>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Collapsible with Custom Styling */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('collapsible_styled_label')}
              </label>
            </TextLoader>
            <Collapsible className="w-full max-w-sm border border-border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <div className="w-full flex items-center justify-between px-4 py-3 bg-accent hover:bg-accent/80 cursor-pointer transition-colors">
                  <TextLoader skeletonClassName="h-5 w-32" inheritColor>
                    <h4 className="text-sm font-semibold">
                      {tk('collapsible_styled_trigger')}
                    </h4>
                  </TextLoader>
                  <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 py-3 bg-background">
                <TextLoader skeletonClassName="h-4 w-full" inheritColor>
                  <p className="text-sm">
                    {tk('collapsible_styled_content')}
                  </p>
                </TextLoader>
              </CollapsibleContent>
            </Collapsible>
          </div>

        </div>
      </div>
    </>
  );
};

DisclosureElements.displayName = 'DisclosureElements';
