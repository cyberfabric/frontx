import React, { useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  Slider,
  SliderTrack,
  SliderRange,
  SliderThumb,
  Card,
  CardContent
} from '@hai3/uikit';
import { useTranslation } from '@hai3/react';
import { TextLoader } from '@/app/components/TextLoader';
import { StarIcon } from '../uikit/icons/StarIcon';
import { DEMO_SCREENSET_ID } from "../ids";
import { UI_KIT_ELEMENTS_SCREEN_ID } from "../ids";

/**
 * Media Elements Component
 * Contains Carousel and Slider demonstrations
 * Uses parent screen (UIKitElementsScreen) translations
 */
export const MediaElements: React.FC = () => {
  const { t } = useTranslation();

  // Helper function to access parent screen's translations
  const tk = (key: string) => t(`screen.${DEMO_SCREENSET_ID}.${UI_KIT_ELEMENTS_SCREEN_ID}:${key}`);

  const [sliderValue, setSliderValue] = useState([50]);
  const [customSliderValue, setCustomSliderValue] = useState([50]);

  return (
    <>
      {/* Carousel Element Block */}
      <div data-element-id="element-carousel" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-32">
          <h2 className="text-2xl font-semibold">
            {tk('carousel_heading')}
          </h2>
        </TextLoader>
        <div className="flex flex-col gap-6 p-6 border border-border rounded-lg bg-background overflow-hidden">

          {/* Basic Carousel */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('carousel_basic_label')}
              </label>
            </TextLoader>
            <div className="w-full max-w-sm mx-auto">
              <Carousel className="w-full">
                <CarouselContent>
                  <CarouselItem>
                    <div className="p-1">
                      <Card>
                        <CardContent className="flex aspect-square items-center justify-center p-6">
                          <TextLoader skeletonClassName="h-10 w-16" inheritColor>
                            <span className="text-4xl font-semibold">1</span>
                          </TextLoader>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                  <CarouselItem>
                    <div className="p-1">
                      <Card>
                        <CardContent className="flex aspect-square items-center justify-center p-6">
                          <TextLoader skeletonClassName="h-10 w-16" inheritColor>
                            <span className="text-4xl font-semibold">2</span>
                          </TextLoader>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                  <CarouselItem>
                    <div className="p-1">
                      <Card>
                        <CardContent className="flex aspect-square items-center justify-center p-6">
                          <TextLoader skeletonClassName="h-10 w-16" inheritColor>
                            <span className="text-4xl font-semibold">3</span>
                          </TextLoader>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </div>

          {/* Multiple Items Carousel */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-40" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('carousel_multiple_label')}
              </label>
            </TextLoader>
            <div className="w-full max-w-sm mx-auto">
              <Carousel
                opts={{
                  align: "start",
                }}
                className="w-full"
              >
                <CarouselContent>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-1">
                        <Card>
                          <CardContent className="flex aspect-square items-center justify-center p-6">
                            <TextLoader skeletonClassName="h-8 w-12" inheritColor>
                              <span className="text-3xl font-semibold">{index + 1}</span>
                            </TextLoader>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </div>

          {/* Image Gallery Style Carousel */}
          <div className="flex flex-col gap-2">
            <TextLoader skeletonClassName="h-4 w-32" inheritColor>
              <label className="text-xs text-muted-foreground">
                {tk('carousel_gallery_label')}
              </label>
            </TextLoader>
            <div className="w-full max-w-sm mx-auto py-16">
              <Carousel orientation="vertical" className="w-full h-80">
                <CarouselContent className="h-80">
                  {[
                    { title: 'Image 1', color: 'bg-gradient-to-br from-blue-500 to-purple-500' },
                    { title: 'Image 2', color: 'bg-gradient-to-br from-green-500 to-teal-500' },
                    { title: 'Image 3', color: 'bg-gradient-to-br from-orange-500 to-red-500' },
                  ].map((item, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card>
                          <CardContent className="flex aspect-video items-center justify-center p-6">
                            <div className={`w-full h-full rounded-lg ${item.color} flex items-center justify-center`}>
                              <TextLoader skeletonClassName="h-6 w-24" inheritColor>
                                <span className="text-2xl font-bold text-white">{item.title}</span>
                              </TextLoader>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </div>

        </div>
      </div>

      {/* Slider Element Block */}
      <div data-element-id="element-slider" className="flex flex-col gap-4">
        <TextLoader skeletonClassName="h-8 w-24">
          <h2 className="text-2xl font-semibold">
            {tk('slider_heading')}
          </h2>
        </TextLoader>
        <div className="flex items-center justify-center p-6 border border-border rounded-lg bg-background overflow-hidden">
          <div className="flex flex-col gap-8 w-full max-w-md">
            <div className="flex flex-col gap-2">
              <TextLoader skeletonClassName="h-5 w-20" inheritColor>
                <label className="text-sm font-medium">
                  {tk('slider_volume_label')}
                </label>
              </TextLoader>
              <Slider
                value={sliderValue}
                onValueChange={setSliderValue}
                max={100}
                step={1}
                className="w-full"
              >
                <SliderTrack>
                  <SliderRange />
                </SliderTrack>
                <SliderThumb />
              </Slider>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>{sliderValue[0]}</span>
                <span>100</span>
              </div>
            </div>

            {/* Customized slider */}
            <div className="flex flex-col gap-2">
              <Slider
                value={customSliderValue}
                onValueChange={setCustomSliderValue}
                max={100}
                step={1}
                className="w-full"
              >
                <SliderTrack className="bg-destructive/20">
                  <SliderRange className="bg-destructive" />
                </SliderTrack>
                <SliderThumb className="border-muted-foreground flex items-center justify-center bg-transparent p-0">
                  <StarIcon className="w-4 h-4 fill-muted-foreground text-muted-foreground stroke-muted-foreground" />
                </SliderThumb>
              </Slider>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

MediaElements.displayName = 'MediaElements';
