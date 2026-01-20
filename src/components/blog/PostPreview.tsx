import Link from "next/link"
import Avatar from "./Avatar"
import CoverImage from "./CoverImage"
import DateFormatter from "./DateFormatter"
import { Badge } from "@/components/ui/badge"

type Props = {
  title: string
  coverImage: string
  date: string
  excerpt: string
  author: {
    name: string
    picture: string
  }
  slug: string
  category: string
}

export default function PostPreview({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  category,
}: Props) {
  return (
    <article className="group">
      <div className="mb-5">
        <CoverImage slug={slug} title={title} src={coverImage} />
      </div>
      <Badge variant="outline" className="mb-3">
        {category}
      </Badge>
      <h3 className="text-2xl font-serif mb-3 leading-snug">
        <Link
          href={`/blog/${slug}`}
          className="text-dark-bg hover:text-mint transition-colors"
        >
          {title}
        </Link>
      </h3>
      <div className="text-sm text-gray-600 mb-3">
        <DateFormatter dateString={date} />
      </div>
      <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">{excerpt}</p>
      <Avatar name={author.name} picture={author.picture} />
    </article>
  )
}
