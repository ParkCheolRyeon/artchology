import icon from '../assets/brand/header-icon.svg'

export function BrandIcon({
  size = 26,
  className = ''
}: {
  size?: number
  className?: string
}): React.JSX.Element {
  return (
    <img
      src={icon}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      draggable={false}
    />
  )
}
