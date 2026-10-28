import { useLayoutEffect, useRef, useState } from 'react'

type Bounds = { x: number; y: number; width: number; height: number }

/** Measures the selected tab in its scroll container, including variable-width labels. */
export function TabIndicator({ selector }: { selector: string }): React.JSX.Element {
  const ref = useRef<HTMLSpanElement>(null)
  const [bounds, setBounds] = useState<Bounds | null>(null)
  useLayoutEffect(() => {
    const list = ref.current?.parentElement
    if (!list) return
    let frame = 0
    const measure = (): void => {
      const tab = list.querySelector<HTMLElement>(selector)
      if (!tab) {
        setBounds(null)
        return
      }
      const parent = list.getBoundingClientRect()
      const target = tab.getBoundingClientRect()
      const next = {
        x: target.left - parent.left + list.scrollLeft - list.clientLeft,
        y: target.top - parent.top + list.scrollTop - list.clientTop,
        width: target.width,
        height: target.height
      }
      setBounds((previous) =>
        previous &&
        Object.keys(next).every(
          (key) => previous[key as keyof Bounds] === next[key as keyof Bounds]
        )
          ? previous
          : next
      )
    }
    const schedule = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(list)
    const observeTabs = (): void => {
      for (const child of list.children) if (child !== ref.current) resize.observe(child)
      schedule()
    }
    const mutation = new MutationObserver(observeTabs)
    mutation.observe(list, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-selected', 'class']
    })
    observeTabs()
    measure()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutation.disconnect()
    }
  }, [selector])
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className="wt-tab-indicator"
      hidden={!bounds}
      style={
        bounds
          ? {
              transform: `translate(${bounds.x}px, ${bounds.y}px)`,
              width: bounds.width,
              height: bounds.height
            }
          : undefined
      }
    />
  )
}
