// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { SplitText } from "gsap/dist/SplitText";
import { translate } from "../i18n";

gsap.registerPlugin(SplitText);

const INTRO_EASE = "cubic-bezier(0.25,1,0.5,1)";
const IMAGE_ENTRY_Y_PERCENT = 500;
const TEXT_ROTATE_X_START = 90;
const TEXT_TRANSFORM_PERSPECTIVE = 1000;
const IMAGE_Z_INDEX_DURATION = 0.1;
const IMAGE_Z_INDEX_STAGGER = 0.2;
const TEXT_STAGGER = 0.08;
const STACK_SCALE_STEP = 0.15;
const STACK_Y_PERCENT_STEP = 20;
const SPREAD_Y_PERCENT_STEP = 110;
const IMAGE_FADE_STAGGER = 0.08;

const STACK_IMAGE_SOURCES = [
  { src: "/loader/joel-filipe-QwoNAhbmLLo-unsplash.jpg", alt: "Nebulosa en tonos cálidos" },
  { src: "/loader/history-in-hd-e5eDHbmHprg-unsplash.jpg", alt: "Astronauta en la superficie lunar" },
  { src: "/loader/aedrian-salazar-jnAnF8s8pHc-unsplash.jpg", alt: "Luz atmosférica en el espacio" },
  { src: "/loader/the-new-york-public-library-kvHhSroTNPY-unsplash.jpg", alt: "Astronauta trabajando en órbita" },
  { src: "/loader/nasa-CpHNKNRwXps-unsplash.jpg", alt: "Vista de la Tierra desde una nave espacial" },
  { src: "/loader/aldebaran-s-qtRF_RxCAo0-unsplash.jpg", alt: "Nebulosa colorida en el espacio" },
];

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function getVisibleSpreadStep(imageElements: HTMLDivElement[]) {
  if (imageElements.length < 2) return 0;

  const imageHeight = imageElements[0].getBoundingClientRect().height;
  if (imageHeight === 0) return SPREAD_Y_PERCENT_STEP;

  const verticalMargin = 48;
  const availableHeight = Math.max(
    0,
    window.innerHeight - imageHeight - verticalMargin * 2,
  );
  const maxSpreadStep =
    (availableHeight / (imageElements.length - 1) / imageHeight) * 100;

  return Math.min(SPREAD_Y_PERCENT_STEP, maxSpreadStep);
}

interface StackToSpreadIntroProps {
  imageSize?: number;
  duration?: number;
  fadeOutDuration?: number;
  backgroundColor?: string;
  typingAudio?: HTMLAudioElement | null;
  onComplete?: () => void;
}

const StackToSpreadIntro = forwardRef<HTMLElement, StackToSpreadIntroProps>(
  function StackToSpreadIntro(
  {
    imageSize = 1,
    duration = 1,
    fadeOutDuration = 0.8,
    backgroundColor = "var(--color-background, #fcfcfc)",
    typingAudio: providedTypingAudio,
    onComplete,
  },
  ref
) {
  const uid = useId().replace(/:/g, "");
  const loaderWrapperId = `loader-wrapper-${uid}`;
  const imgsWrapperId = `imgs-wrapper-${uid}`;
  const rootRef = useRef<HTMLElement | null>(null);
  const imagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const text1Ref = useRef<HTMLParagraphElement | null>(null);
  const text2Ref = useRef<HTMLParagraphElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  const safeImageSize = clampNumber(imageSize, 0.5, 2.5, 1);
  const safeDuration = clampNumber(duration, 0.25, 3, 1);
  const safeFadeOutDuration = clampNumber(fadeOutDuration, 0.1, 3, 0.8);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useLayoutEffect(() => {
    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ??
      false;
    const typingAudio = providedTypingAudio === undefined
      ? new Audio("/sounds/typing.mp3")
      : providedTypingAudio;
    if (typingAudio) typingAudio.volume = 0.2;
    let hasAnimationCompleted = false;

    const playTypingAudio = () => {
      if (!typingAudio) return;
      typingAudio.currentTime = 0;
      void typingAudio.play().then(() => {
        if (hasAnimationCompleted) {
          typingAudio.pause();
          typingAudio.currentTime = 0;
        }
      }).catch((error: unknown) => {
        console.warn("No se pudo reproducir el sonido del loader.", error);
      });
    };

    const stopTypingAudio = () => {
      hasAnimationCompleted = true;
      typingAudio?.pause();
      if (typingAudio) typingAudio.currentTime = 0;
    };

    // Reduced-motion: images already in a vertical line - smooth opacity only.
    if (reduceMotion) {
      const ctx = gsap.context(() => {
        const imageElements = imagesRef.current.filter((el): el is HTMLDivElement => el !== null);
        const sideText = [text1Ref.current, text2Ref.current].filter(Boolean);
        const totalImages = imageElements.length;
        const spreadStep = getVisibleSpreadStep(imageElements);
        const totalSpread = spreadStep * (totalImages - 1);

        gsap.set(`#${imgsWrapperId}`, { yPercent: 0, opacity: 1 });
        gsap.set(imageElements, {
          opacity: 0,
          scale: 1,
          zIndex: (index: number) => index,
          yPercent: (index: number) =>
            totalImages === 1
              ? 0
              : -totalSpread / 2 + index * spreadStep,
        });
        gsap.set(sideText, { opacity: 0, rotateX: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut" },
          onStart: playTypingAudio,
          onComplete: () => {
            stopTypingAudio();
            gsap.set(rootRef.current, { display: "none" });
            onCompleteRef.current?.();
          },
        });
        tl.timeScale(1 / safeDuration);

        // Smooth opacity in (already laid out vertically).
        tl.to(imageElements, {
          opacity: 1,
          duration: 0.7,
          stagger: { each: 0.06, from: "center" },
          onStart: playTypingAudio,
          onComplete: stopTypingAudio,
        });

        tl.to(
          sideText,
          { opacity: 1, duration: 0.55 },
          "-=0.35"
        );
        tl.to(
          sideText,
          { opacity: 0, duration: 0.5 },
          "+=0.55"
        );
        tl.to(
          imageElements,
          {
            opacity: 0,
            duration: safeFadeOutDuration,
            stagger: { each: 0.04, from: "edges" },
          },
          "-=0.15"
        );
      }, rootRef);

      return () => {
        ctx.revert();
        if (!providedTypingAudio) stopTypingAudio();
      };
    }

    const ctx = gsap.context(() => {
      const imageElements = imagesRef.current.filter((el): el is HTMLDivElement => el !== null);
      const spreadStep = getVisibleSpreadStep(imageElements);

      const text1 = SplitText.create(text1Ref.current, {
        type: "words",
      });

      const text2 = SplitText.create(text2Ref.current, {
        type: "words",
      });

      const animatedTextTargets = [
        text1.words,
        text2.words,
      ];

      gsap.set(animatedTextTargets, {
        rotateX: TEXT_ROTATE_X_START,
        opacity: 0,
        transformPerspective: TEXT_TRANSFORM_PERSPECTIVE,
        transformOrigin: "50% 100%",
        willChange: "transform",
      });

      gsap.set(imageElements, {
        opacity: 0,
      });

      const tl = gsap.timeline();
      tl.eventCallback("onComplete", () => {
        stopTypingAudio();
        gsap.set(rootRef.current, { display: "none" });
        onCompleteRef.current?.();
      });
      tl.timeScale(1 / safeDuration);

      tl.fromTo(
        `#${imgsWrapperId}`,
        {
          yPercent: IMAGE_ENTRY_Y_PERCENT,
          opacity: 0,
        },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.5,
          ease: INTRO_EASE,
        }
      );

      tl.set([text1Ref.current, text2Ref.current], { opacity: 1 }, "<");

      tl.to(
        imageElements,
        {
          opacity: 1,
          duration: 0.5,
          ease: INTRO_EASE,
          stagger: { each: 0.08, from: "start" },
          onStart: playTypingAudio,
          onComplete: stopTypingAudio,
        },
        "<"
      );

      tl.to(
        animatedTextTargets,
        {
          rotateX: 0,
          opacity: 1,
          stagger: TEXT_STAGGER,
          ease: INTRO_EASE,
        },
        "<+0.5"
      );



      imageElements.forEach((imageElement, index) => {
        tl.to(
          imageElement,
          {
            zIndex: index,
            duration: IMAGE_Z_INDEX_DURATION,
            ease: INTRO_EASE,
          },
          index * IMAGE_Z_INDEX_STAGGER
        );
      });



      tl.to(
        imageElements,
        {
          scale: (index: number) => 1 + index * STACK_SCALE_STEP,
          yPercent: (index: number) => -(index * STACK_Y_PERCENT_STEP),
          duration: 1,
          stagger: {
            each: 0.01,
            from: "end",
          },
          ease: "power3.inOut",
        },
        "<"
      );


      tl.to(
        imageElements,
        {
          scale: 1,
          yPercent: (index: number, _target: unknown, elements: unknown[]) => {
            const totalImages = elements.length;

            if (totalImages === 1) return 0;

            const totalSpread = spreadStep * (totalImages - 1);

            return -totalSpread / 2 + index * spreadStep;
          },
          duration: 1,
          stagger: {
            each: 0.01,
            from: "end",
          },
          ease: "power3.inOut",
        },
        "+=0.2"
      );

      tl.to(
        `#${imgsWrapperId}`,
        {
          yPercent: 0,
          ease: INTRO_EASE,
        },
        "<"
      );

      tl.to([text1.words, text2.words], {
        opacity: 0,
        duration: 0.5,
        rotateX: TEXT_ROTATE_X_START,
        transformOrigin: "top center",
        stagger: TEXT_STAGGER,
        ease: INTRO_EASE,
      });

      tl.to(
        imageElements,
        {
          opacity: 0,
          duration: safeFadeOutDuration,
          stagger: {
            each: IMAGE_FADE_STAGGER,
            from: "end",
          },
        },
        "<+0.2"
      );

      return () => {
        text1.revert();
        text2.revert();
      };
    }, rootRef);

    return () => {
      ctx.revert();
      if (!providedTypingAudio) stopTypingAudio();
    };
  }, [imgsWrapperId, providedTypingAudio, safeDuration, safeFadeOutDuration]);

  return (
    <section
      ref={(element) => {
        rootRef.current = element;

        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }
      }}
      id={loaderWrapperId}
      className="absolute inset-0 z-10 flex h-screen w-full items-center justify-center px-[2.5vw] text-foreground max-[1025px]:px-[5vw] max-md:px-[6vw]"
      style={{ backgroundColor }}
    >
      <div className="flex w-full items-center justify-between max-[1025px]:flex-col max-[1025px]:justify-center max-[1025px]:gap-[33vh] max-md:gap-[70vw]">
        <p
          ref={text1Ref}
          className="opacity-0 max-[1025px]:text-[2.8vw] max-md:text-[5vw]"
        >
          LuckyCode Team
        </p>

        <div
          id={imgsWrapperId}
          className="relative max-[1025px]:z-99"
          style={{
            width: `clamp(4rem, ${6.5 * safeImageSize}vw, 18rem)`,
            height: `clamp(4rem, ${6.5 * safeImageSize}vw, 18rem)`,
          }}
        >
          {STACK_IMAGE_SOURCES.map(({ src, alt }, index) => (
            <div
              key={`${src}-${index}`}
              ref={(element) => {
                imagesRef.current[index] = element;
              }}
              className="absolute top-0 left-0 size-full overflow-hidden rounded-sm opacity-0"
            >
              <img
                src={src}
                width={1000}
                height={1000}
                className="h-full w-full object-cover"
                alt={translate(alt)}
              />
            </div>
          ))}
        </div>

        <p
          ref={text2Ref}
          className="opacity-0 max-[1025px]:text-[2.8vw] max-md:text-[4vw]"
        >
          {translate("presenta...")}
        </p>
      </div>

    </section>
  );
  }
);

interface StackLoaderProps {
  /** Content revealed once the loader completes — behind the loader from the start, uncovered as it fades out. */
  children?: ReactNode;
  /** Called once the loader finishes and the stack has faded out. */
  onComplete?: () => void;
  imageSize?: number;
  duration?: number;
  fadeOutDuration?: number;
  backgroundColor?: string;
  typingAudio?: HTMLAudioElement | null;
}

export default function StackLoader({
  children,
  onComplete,
  imageSize = 1,
  duration = 1,
  fadeOutDuration = 0.8,
  backgroundColor = "var(--color-background, #fcfcfc)",
  typingAudio,
}: StackLoaderProps) {
  const uid = useId().replace(/:/g, "");
  const demoUiId = `demo-ui-${uid}`;
  const [introInstance, setIntroInstance] = useState(0);
  const stackToSpreadIntroRef = useRef<HTMLElement | null>(null);
  const previousRemixerPropsRef = useRef<Required<
    Omit<StackLoaderProps, "children" | "onComplete">
  > | null>(null);

  const handleLoaderComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const remixerProps: Required<
      Omit<StackLoaderProps, "children" | "onComplete">
    > = {
      imageSize,
      duration,
      fadeOutDuration,
      backgroundColor,
      typingAudio: typingAudio ?? null,
    };

    if (!previousRemixerPropsRef.current) {
      previousRemixerPropsRef.current = remixerProps;
      return;
    }

    const previousRemixerProps = previousRemixerPropsRef.current;
    const hasChanged = (
      Object.keys(remixerProps) as (keyof typeof remixerProps)[]
    ).some((key) => previousRemixerProps[key] !== remixerProps[key]);

    if (!hasChanged) return;

    previousRemixerPropsRef.current = remixerProps;
    setIntroInstance((currentInstance) => currentInstance + 1);
  }, [backgroundColor, duration, fadeOutDuration, imageSize]);

  return (
    <div
      id={demoUiId}
      className="relative h-screen w-screen overflow-hidden bg-background"
    >
      {children}

      <StackToSpreadIntro
        key={introInstance}
        ref={stackToSpreadIntroRef}
        imageSize={imageSize}
        duration={duration}
        fadeOutDuration={fadeOutDuration}
        backgroundColor={backgroundColor}
        typingAudio={typingAudio}
        onComplete={handleLoaderComplete}
      />
    </div>
  );
}
