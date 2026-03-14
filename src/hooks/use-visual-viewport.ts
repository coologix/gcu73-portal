import { useEffect, useState } from 'react'

interface VisualViewportState {
  /** Visible viewport height in CSS pixels */
  height: number
  /** Visible viewport width in CSS pixels */
  width: number
  /** Offset from the top of the layout viewport */
  offsetTop: number
  /** Offset from the left of the layout viewport */
  offsetLeft: number
  /** True when the visual viewport is smaller than the layout viewport (e.g. keyboard open) */
  isKeyboardOpen: boolean
}

/**
 * Tracks the Visual Viewport API so components can react to
 * the software keyboard appearing/disappearing on mobile devices.
 *
 * Falls back to `window.innerHeight` / `window.innerWidth` when
 * `window.visualViewport` is unavailable.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => {
    const vv = window.visualViewport
    return {
      height: vv?.height ?? window.innerHeight,
      width: vv?.width ?? window.innerWidth,
      offsetTop: vv?.offsetTop ?? 0,
      offsetLeft: vv?.offsetLeft ?? 0,
      isKeyboardOpen: false,
    }
  })

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const threshold = 150 // px – typical soft-keyboard minimum height

    function handleResize() {
      if (!vv) return

      const isKeyboardOpen =
        window.innerHeight - vv.height > threshold

      setState({
        height: vv.height,
        width: vv.width,
        offsetTop: vv.offsetTop,
        offsetLeft: vv.offsetLeft,
        isKeyboardOpen,
      })
    }

    vv.addEventListener('resize', handleResize)
    vv.addEventListener('scroll', handleResize)

    return () => {
      vv.removeEventListener('resize', handleResize)
      vv.removeEventListener('scroll', handleResize)
    }
  }, [])

  return state
}
