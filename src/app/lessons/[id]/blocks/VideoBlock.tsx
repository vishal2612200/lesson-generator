import { VideoBlock as VideoBlockType } from '../types/blocks'

export default function VideoBlock({ url, title, description, platform = 'youtube' }: VideoBlockType) {
  const embedUrl = getEmbedUrl(url, platform)

  return (
    <div className="my-8">
      {title && (
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-gray-600 mb-4">{description}</p>
      )}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-900">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}

function getEmbedUrl(url: string, platform: string): string {
  if (platform === 'youtube') {
    // Extract video ID from various YouTube URL formats
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?]+)/)
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`
    }
  } else if (platform === 'vimeo') {
    const match = url.match(/vimeo\.com\/(\d+)/)
    if (match) {
      return `https://player.vimeo.com/video/${match[1]}`
    }
  }
  return url
}


