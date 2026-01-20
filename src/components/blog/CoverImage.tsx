import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  src: string
  slug?: string
  priority?: boolean
}

export default function CoverImage({ title, src, slug, priority = false }: Props) {
  const image = (
    <Image
      src={src}
      alt={`Cover Image for ${title}`}
      className={cn(
        "w-full h-full object-cover",
        slug && "hover:scale-105 transition-transform duration-300"
      )}
      width={1300}
      height={630}
      priority={priority}
    />
  )

  return (
    <div className="relative overflow-hidden rounded-xl bg-sage-light/30">
      {slug ? (
        <Link href={`/blog/${slug}`} aria-label={title}>
          {image}
        </Link>
      ) : (
        image
      )}
    </div>
  )
}
