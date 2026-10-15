"use client"

import { useEffect, useRef } from "react"
import { firmLogo } from "@/lib/brand"

type Pose = {
  at: number
  x: number
  y: number
  angle: number
  scale: number
}

// Coordinates and paths come directly from the supplied official logo.
// Align the cap's lowest point with the midpoint of the base's flat top.
const strikePivot = { x: 132.111, y: 94.014 }

const hammerPoses: Pose[] = [
  { at: 0, x: 143, y: 480, angle: 0, scale: 1 },
  { at: 0.16, x: 143, y: 480, angle: 0, scale: 1 },
  { at: 0.3, x: 80, y: 450, angle: 0, scale: 0.88 },
  { at: 0.58, x: strikePivot.x, y: 190, angle: 85, scale: 1 },
  { at: 0.66, x: strikePivot.x, y: 190, angle: 85, scale: 1 },
  { at: 0.84, ...strikePivot, angle: 110, scale: 1 },
  { at: 0.92, ...strikePivot, angle: 105, scale: 1 },
  { at: 1, ...strikePivot, angle: 110, scale: 1 },
]

const basePoses: Pose[] = [
  { at: 0, x: 313, y: 265, angle: 0, scale: 1 },
  { at: 0.08, x: 313, y: 265, angle: 0, scale: 1 },
  { at: 0.44, x: 490, y: 450, angle: 90, scale: 0.7 },
  { at: 0.5, x: 490, y: 435, angle: 90, scale: 0.7 },
  { at: 0.56, x: 490, y: 440, angle: 90, scale: 0.7 },
  { at: 0.84, x: 490, y: 440, angle: 90, scale: 0.7 },
  { at: 0.87, x: 490, y: 443, angle: 90, scale: 0.7 },
  { at: 0.93, x: 490, y: 440, angle: 90, scale: 0.7 },
  { at: 1, x: 490, y: 440, angle: 90, scale: 0.7 },
]

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function poseAt(poses: Pose[], progress: number): Pose {
  const endIndex = poses.findIndex((pose) => pose.at >= progress)
  if (endIndex <= 0) return poses[endIndex === -1 ? poses.length - 1 : 0]
  const start = poses[endIndex - 1]
  const end = poses[endIndex]
  const t = (progress - start.at) / (end.at - start.at)
  const eased = t * t * (3 - 2 * t)
  const mix = (a: number, b: number) => a + (b - a) * eased
  return {
    at: progress,
    x: mix(start.x, end.x),
    y: mix(start.y, end.y),
    angle: mix(start.angle, end.angle),
    scale: mix(start.scale, end.scale),
  }
}

function hammerTransform(pose: Pose) {
  const radians = pose.angle * Math.PI / 180
  const sin = Math.sin(radians)
  const cos = Math.cos(radians)
  // Keep the rotating mark inside the original logo's viewport throughout.
  const corners = [
    [0, 13], [286.5, 13], [0, 114], [286.5, 114],
    [92.95, 114], [193.81, 114], [92.95, 517.35], [193.81, 517.35],
  ]
  const rotated = corners.map(([x, y]) => ({
    x: pose.scale * ((x - 143) * cos - (y - 480) * sin),
    y: pose.scale * ((x - 143) * sin + (y - 480) * cos),
  }))
  const minX = Math.min(...rotated.map((point) => point.x))
  const maxX = Math.max(...rotated.map((point) => point.x))
  const minY = Math.min(...rotated.map((point) => point.y))
  const maxY = Math.max(...rotated.map((point) => point.y))
  const x = clamp(pose.x, -minX, 1280 - maxX)
  const y = clamp(pose.y, -minY, 529.15 - maxY)
  return `translate(${x} ${y}) rotate(${pose.angle}) scale(${pose.scale}) translate(-143 -480)`
}

export default function AnimatedLogo() {
  const wordingRef = useRef<SVGGElement>(null)
  const hammerRef = useRef<SVGGElement>(null)
  const baseRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let previousTime = 0

    function targetProgress() {
      const distance = clamp(window.innerHeight * 1.8, 1200, 1600)
      return reducedMotion.matches ? 0 : clamp((window.scrollY - 12) / distance)
    }

    let displayedProgress = targetProgress()

    function renderProgress(progress: number) {
      const wordingProgress = clamp((progress - 0.02) / 0.18)
      const fade = wordingProgress * wordingProgress * (3 - 2 * wordingProgress)
      wordingRef.current?.setAttribute("opacity", String(1 - fade))
      wordingRef.current?.setAttribute("transform", `translate(${24 * fade} ${-14 * fade})`)

      hammerRef.current?.setAttribute("transform", hammerTransform(poseAt(hammerPoses, progress)))
      const base = poseAt(basePoses, progress)
      baseRef.current?.setAttribute("transform",
        `translate(${base.x} ${base.y}) rotate(${base.angle}) scale(${base.scale}) translate(-313 -265)`)
    }

    function update(time: number) {
      const target = targetProgress()
      const elapsed = previousTime ? Math.min(time - previousTime, 64) : 16
      previousTime = time
      // Let fast wheel gestures settle gradually instead of snapping poses.
      displayedProgress += (target - displayedProgress) * (1 - Math.exp(-elapsed / 600))
      if (reducedMotion.matches || Math.abs(target - displayedProgress) < 0.0005) {
        displayedProgress = target
      }
      renderProgress(displayedProgress)

      if (displayedProgress !== target) {
        frame = window.requestAnimationFrame(update)
      } else {
        frame = 0
        previousTime = 0
      }
    }

    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    renderProgress(displayedProgress)
    window.addEventListener("scroll", scheduleUpdate, { passive: true })
    window.addEventListener("resize", scheduleUpdate)
    reducedMotion.addEventListener("change", scheduleUpdate)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("scroll", scheduleUpdate)
      window.removeEventListener("resize", scheduleUpdate)
      reducedMotion.removeEventListener("change", scheduleUpdate)
    }
  }, [])

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1280 529.15"
      width="1280"
      height="529.15"
      className="header-logo h-auto w-[168px] sm:w-[208px]"
      role="img"
      aria-label={firmLogo.alt}
      fill="#daa04c"
    >
      <g ref={wordingRef} className="logo-wording" aria-hidden="true">
        <svg x="440" width="840" height="529.15" viewBox="440 0 840 529.15">
          <image
            href={firmLogo.src}
            width="1280"
            height="529.15"
          />
        </svg>
      </g>
      <g ref={baseRef} className="logo-base" aria-hidden="true">
        <path d="M236.19,205.15l71.09-39.9v199.93l-71.09-39.9c-10.6-5.95-17.16-17.16-17.16-29.32v-61.49c0-12.16,6.56-23.37,17.16-29.32Z" />
        <path d="M340.89,13.07c-18.57,0-33.62,15.05-33.62,33.62v117.67l82.27-41.14c11.39-5.69,18.58-17.34,18.58-30.07V13.07h-67.24Z" />
        <path d="M307.27,366.07v117.67c0,18.57,15.05,33.62,33.62,33.62h67.24v-80.08c0-12.73-7.19-24.38-18.58-30.07l-82.27-41.14Z" />
      </g>
      <g ref={hammerRef} className="logo-hammer" aria-hidden="true">
        <path d="M92.95,517.35h0V228.71c0-8.92,3.54-17.47,9.85-23.77l91.01-91.01h0v288.65c0,8.92-3.54,17.47-9.85,23.77l-91.01,91.01Z" />
        <path d="M232.38,13.07H54.39C23.89,13.07-2.88,38.38.25,68.71c2.59,25.09,23.65,44.78,49.31,45.21,28.79.48,49-25.36,51.44-54.06,1.85-21.76,20.16-38.9,42.39-38.9,11.41,0,22.11,4.41,30.11,12.43,7.17,7.15,11.46,16.46,12.28,26.51,2.36,28.71,22.68,54.53,51.48,54.03,25.64-.45,46.68-20.15,49.26-45.22,3.12-30.33-23.65-55.62-54.14-55.62Z" />
      </g>
    </svg>
  )
}
