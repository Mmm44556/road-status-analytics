import { useEffect, useRef, useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { gsap } from 'gsap';
import { markWelcomeSeen } from './welcomeSeen';
import {
  pointOnQuadraticBezier,
  routeControl,
  routeEnd,
  routeStart,
  viewBoxSize,
} from './welcomeSceneData';

export type ContentTiming = 'immediate' | 'after-narrative';

/**
 * 敘事動畫（聊天卡片 → 地圖出現、地標彈出、鏡頭跟隨路線）的完整邏輯，
 * 手機版／桌面版元件都呼叫這個 hook，只差在 contentTiming：
 * - 'immediate'：文字（slogan／bullet／CTA）自己獨立淡入，不用等敘事播完。
 * - 'after-narrative'：敘事播完後，地圖／聊天卡片整組視覺先淡出收起卸載
 *   （見 sceneComplete），接著文字才原地淡入，用在手機版直向堆疊的版面
 *   ——單純的淡出→淡入交叉淡化，文字不會長高或從下面插上來。
 *
 * 每個呼叫端各自建立自己的一組 ref／effect，不共用 DOM 節點，所以手機版
 * 元件卸載、桌面版元件掛載（或反過來）時，動畫會乾淨地重新開始，不會有
 * 「動畫還抓著已經卸載的舊節點」這種問題。
 */
export function useWelcomeSceneAnimation(contentTiming: ContentTiming) {
  const navigate = useNavigate();
  const router = useRouter();

  const contentRef = useRef<HTMLDivElement | null>(null);
  // 手機版用來把整組視覺（聊天卡片＋地圖）收起來並卸載，見下方「退場」；
  // 桌面版不會用到這個 ref，維持一直顯示。
  const visualWrapperRef = useRef<HTMLDivElement | null>(null);
  const chatCardRef = useRef<HTMLDivElement | null>(null);
  const userBubbleRef = useRef<HTMLDivElement | null>(null);
  const typingRef = useRef<HTMLDivElement | null>(null);
  const typingDotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const aiBubbleRef = useRef<HTMLDivElement | null>(null);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const landmarkRefs = useRef<(SVGGElement | null)[]>([]);
  const pingRefs = useRef<(SVGCircleElement | null)[]>([]);
  const routePathRef = useRef<SVGPathElement | null>(null);

  const sceneTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  // 手機版（after-narrative）專用：敘事＋文字進場＋視覺退場全部播完後才
  // 變 true，用來把地圖／聊天卡片從 DOM 卸載（省下持續播放中的 ping
  // 動畫與一整組不會再被看到的 SVG 節點）。桌面版不會用到這個值。
  const [sceneComplete, setSceneComplete] = useState(false);

  useEffect(() => {
    const paths = pathRefs.current.filter(
      (path): path is SVGPathElement => path !== null,
    );
    const pathLengths = paths.map((path) => path.getTotalLength());
    const landmarks = landmarkRefs.current.filter(
      (el): el is SVGGElement => el !== null,
    );
    const pings = pingRefs.current.filter(
      (el): el is SVGCircleElement => el !== null,
    );
    const typingDots = typingDotRefs.current.filter(
      (el): el is HTMLSpanElement => el !== null,
    );
    const routeLength = routePathRef.current?.getTotalLength() ?? 0;
    const contentChildren = contentRef.current
      ? Array.from(contentRef.current.children)
      : [];

    // 有動暈症等需求的使用者可能開了「減少動態效果」，地標 ping 只是裝飾，
    // 直接跳過即可，不影響頁面其他功能。
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // --- 初始狀態 -----------------------------------------------------
    // 用 gsap.set() 先明確定住起始狀態，再用 .to() 動畫到明確的終點，
    // 不要用 .from()：StrictMode 開發模式下 effect 會先跑一次又立刻清掉，
    // .from() 會把「目前樣式」讀成終點值，等第二次真正掛載時读到的就是
    // 上一輪已經被設成 opacity:0 的殘留狀態，導致整段動畫從 0 動到 0、永遠不會顯示。
    const setInitialState = () => {
      gsap.set(contentChildren, { autoAlpha: 0, y: 16 });
      // 手機版文字要等敘事播完、地圖淡出後才出現。文字區塊本身（標題／
      // bullet／CTA）若照一般排版一直佔著位置，敘事播放期間動畫區下方
      // 會留一大塊「看起來是空的」版位；但又不想用「高度從 0 長到自然
      // 高度」的方式補位，那樣看起來像文字從下方被撐／插上來。所以先讓
      // 它脫離排版流（position: absolute），不佔版面高度也不用擔心尺寸，
      // 等地圖淡出收起後，直接 .set() 回正常排版流（非動畫、瞬間完成），
      // 文字區塊一瞬間就在最終位置待命，再單純淡入即可（見下方
      // after-narrative 區塊）。
      if (contentTiming === 'after-narrative') {
        gsap.set(contentRef.current, {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
        });
      }
      gsap.set(chatCardRef.current, { autoAlpha: 0, y: 12 });
      gsap.set(userBubbleRef.current, { autoAlpha: 0, y: 10 });
      gsap.set(typingRef.current, { autoAlpha: 0 });
      gsap.set(aiBubbleRef.current, { autoAlpha: 0, y: 10 });
      gsap.set(mapWrapperRef.current, { autoAlpha: 0 });
      gsap.set(landmarks, {
        autoAlpha: 0,
        scale: 0.4,
        transformOrigin: '50% 50%',
      });
      gsap.set(pings, {
        autoAlpha: 0.6,
        scale: 1,
        transformOrigin: '50% 50%',
      });
      paths.forEach((path, index) => {
        gsap.set(path, {
          strokeDasharray: pathLengths[index],
          strokeDashoffset: pathLengths[index],
        });
      });
      if (routePathRef.current) {
        gsap.set(routePathRef.current, {
          strokeDasharray: routeLength,
          strokeDashoffset: routeLength,
        });
      }
      if (svgRef.current) {
        svgRef.current.setAttribute(
          'viewBox',
          `0 0 ${viewBoxSize} ${viewBoxSize}`,
        );
      }
    };
    setInitialState();

    // 'immediate'：文字不等敘事，自己獨立淡入進場（桌面版用）。
    if (contentTiming === 'immediate') {
      gsap.timeline({ delay: 0.15 }).to(contentChildren, {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
      });
    }

    const scene = gsap.timeline({ delay: 0.3 });
    sceneTimelineRef.current = scene;

    // --- 階段一：模擬聊天 ------------------------------------------
    scene
      .to(chatCardRef.current, { autoAlpha: 1, y: 0, duration: 0.45 })
      .to(
        userBubbleRef.current,
        { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        '+=0.15',
      )
      .to(typingRef.current, { autoAlpha: 1, duration: 0.25 }, '+=0.3')
      .to(typingDots, {
        y: -3,
        duration: 0.25,
        ease: 'sine.inOut',
        stagger: { each: 0.12, repeat: 1, yoyo: true },
      })
      .to(typingRef.current, { autoAlpha: 0, duration: 0.2 }, '+=0.15')
      .to(
        aiBubbleRef.current,
        { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' },
        '-=0.05',
      )
      // --- 階段二：地圖出現、地標彈出 -------------------------------
      .to(chatCardRef.current, { autoAlpha: 0, y: -10, duration: 0.4 }, '+=1.1')
      .to(mapWrapperRef.current, { autoAlpha: 1, duration: 0.3 }, '-=0.1')
      .to(paths, {
        strokeDashoffset: 0,
        duration: 1.1,
        ease: 'power2.out',
        stagger: 0.025,
      })
      .to(paths, { fillOpacity: 0.4, duration: 0.5, stagger: 0.015 }, '-=0.5')
      .to(
        landmarks,
        {
          autoAlpha: 1,
          scale: 1,
          duration: 0.35,
          stagger: 0.15,
          ease: 'back.out(2)',
        },
        '-=0.2',
      );

    // 地標的持續 ping 動畫：像雷達一樣一圈一圈淡出擴散，暗示「這裡是活的定位點」，
    // 跟敘事動畫不同，這個是常駐效果，地標一出現就開始、不會停。兩個地標稍微錯開
    // 時間點（delay 不同），才不會兩個圈同步跳動看起來太機械。
    const pingTweens = prefersReducedMotion
      ? []
      : pings.map((ping, index) =>
          gsap.to(ping, {
            scale: 2.6,
            autoAlpha: 0,
            duration: 1.6,
            ease: 'sine.out',
            repeat: -1,
            delay: index * 0.5,
            paused: true,
          }),
        );
    scene.add(() => pingTweens.forEach((tween) => tween.play()));

    // --- 階段三：鏡頭跟隨路線 ----------------------------------------
    // 用一個 0→1 的進度值同時驅動「鏡頭要看哪裡、要拉多近」跟「路線畫到哪」，
    // 兩者共用同一個包絡線——起點/終點時包絡線是 0（鏡頭停在全島視角，跟前後動畫銜接），
    // 中段拉到最大，看起來就像鏡頭俯衝下去貼著路線飛、飛到終點再拉回全島視角。
    // 用 sin() 開根號讓包絡線在中段停留更久（跟隨感更強），不是短暫掃過去而已。
    if (routePathRef.current && svgRef.current) {
      const svgEl = svgRef.current;
      const routeEl = routePathRef.current;
      const maxZoomBoost = 2.2;
      const camera = { t: 0 };
      scene.to(camera, {
        t: 1,
        duration: 2.4,
        ease: 'power1.inOut',
        onUpdate: () => {
          const t = camera.t;
          const envelope = Math.pow(Math.sin(Math.PI * t), 0.55);
          const zoom = 1 + maxZoomBoost * envelope;
          const [pointX, pointY] = pointOnQuadraticBezier(
            routeStart,
            routeControl,
            routeEnd,
            t,
          );
          const centerX =
            viewBoxSize / 2 + (pointX - viewBoxSize / 2) * envelope;
          const centerY =
            viewBoxSize / 2 + (pointY - viewBoxSize / 2) * envelope;
          const halfSize = viewBoxSize / (2 * zoom);
          svgEl.setAttribute(
            'viewBox',
            `${(centerX - halfSize).toFixed(2)} ${(centerY - halfSize).toFixed(2)} ${(halfSize * 2).toFixed(2)} ${(halfSize * 2).toFixed(2)}`,
          );
          routeEl.style.strokeDashoffset = String(routeLength * (1 - t));
        },
      });
    }

    // --- 階段四（僅手機版）：地圖淡出收起 → 文字淡入 -------------------
    // 鏡頭回到全島視角、敘事結束後，先讓地圖／聊天卡片這組視覺直接淡出。
    // 外層 Stack 的高度是固定的 100%（見 MobileWelcomeScene），不是靠這個
    // 視覺區撐出來的，所以這裡卸載不會牽動任何其他版面尺寸，單純淡出
    // opacity 即可，不用額外把 height／margin 收合到 0。
    // 等地圖完全淡出後，文字區塊才用 .set() 瞬間脫離絕對定位、回到正常
    // 排版流（見上方 setInitialState），在最終位置原地淡入——單純淡出→
    // 淡入的交叉淡化，不會有「文字長高、從下面插上來」的既視感。
    if (contentTiming === 'after-narrative') {
      scene
        .to(
          visualWrapperRef.current,
          {
            autoAlpha: 0,
            duration: 0.5,
            ease: 'power2.inOut',
          },
          '+=0.4',
        )
        .call(() => {
          pingTweens.forEach((tween) => tween.kill());
          setSceneComplete(true);
        })
        .set(contentRef.current, { position: 'static' })
        .to(contentChildren, {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
          ease: 'power2.out',
        });
    }

    return () => {
      scene.kill();
      pingTweens.forEach((tween) => tween.kill());
    };
  }, [contentTiming]);

  // 地圖頁（/）程式碼是獨立的路由區塊，使用者在看完敘事動畫、決定按「開始使用」之前
  // 通常已經有好幾秒時間，先在背景把它載入，真正點下去的時候才不會卡在空白畫面等程式碼下載。
  useEffect(() => {
    const timer = setTimeout(() => {
      router.preloadRoute({ to: '/' }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [router]);

  const handleStart = () => {
    if (isLeaving) return;
    setIsLeaving(true);

    // 使用者可能在敘事動畫還沒播完時就按下開始使用，先停掉它，
    // 才不會跟接下來的退場動畫互相打架。
    sceneTimelineRef.current?.kill();

    gsap
      .timeline({
        onComplete: () => {
          markWelcomeSeen();
          navigate({ to: '/' });
        },
      })
      .to(contentRef.current, {
        autoAlpha: 0,
        y: -16,
        duration: 0.35,
        ease: 'power2.in',
      })
      .to(
        // 手機版在敘事播完後會把地圖／聊天卡片整組卸載，這兩個 ref 到時
        // 會是 null（gsap 不接受目標陣列裡混著 null，會直接拋錯），所以
        // 先過濾掉已經不在畫面上的節點。
        [chatCardRef.current, mapWrapperRef.current].filter(
          (el): el is HTMLDivElement => el !== null,
        ),
        { scale: 1.12, autoAlpha: 0, duration: 0.45, ease: 'power2.in' },
        '<',
      );
  };

  return {
    refs: {
      contentRef,
      visualWrapperRef,
      chatCardRef,
      userBubbleRef,
      typingRef,
      typingDotRefs,
      aiBubbleRef,
      mapWrapperRef,
      svgRef,
      pathRefs,
      landmarkRefs,
      pingRefs,
      routePathRef,
    },
    isLeaving,
    handleStart,
    sceneComplete,
  };
}
