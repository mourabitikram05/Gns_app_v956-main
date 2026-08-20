import { useState } from 'react'

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string
}

export function ImageWithFallback({ src, alt = '', fallback, ...props }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false)
  if (errored || !src) {
    return (
      <div
        className="flex items-center justify-center bg-gray-200 text-gray-400 text-xs"
        style={{ width: props.width, height: props.height, ...props.style as React.CSSProperties }}
      >
        {alt?.[0] ?? '?'}
      </div>
    )
  }
  return <img src={src as string} alt={alt} onError={() => setErrored(true)} {...props} />
}
