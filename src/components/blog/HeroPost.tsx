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

export default function HeroPost({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
  category,
}: Props) {
  return (
    <section className="mb-16 md:mb-24">
      <div className="mb-8">
        <CoverImage title={title} src={coverImage} slug={slug} priority />
      </div>
      <div className="md:grid md:grid-cols-2 md:gap-x-12 lg:gap-x-16">
        <div>
          <Badge variant="secondary" className="mb-4">
            {category}
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-sans font-semibold mb-4 leading-tight">
            <Link
              href={`/blog/${slug}`}
              className="text-dark-bg hover:text-mint transition-colors"
            >
              {title}
            </Link>
          </h2>
          <div className="text-gray-600 mb-4 md:mb-0">
            <DateFormatter dateString={date} />
          </div>
        </div>
        <div>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">{excerpt}</p>
          <Avatar name={author.name} picture={author.picture} />
        </div>
      </div>
    </section>
  )
}
