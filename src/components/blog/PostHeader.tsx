import Avatar from "./Avatar"
import CoverImage from "./CoverImage"
import DateFormatter from "./DateFormatter"
import { Badge } from "@/components/ui/badge"

type Props = {
  title: string
  coverImage: string
  date: string
  author: {
    name: string
    picture: string
  }
  category: string
}

export default function PostHeader({
  title,
  coverImage,
  date,
  author,
  category,
}: Props) {
  return (
    <>
      <div className="max-w-3xl mx-auto mb-8">
        <Badge variant="secondary" className="mb-4">
          {category}
        </Badge>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-semibold leading-tight text-dark-bg mb-6">
          {title}
        </h1>
        <div className="flex items-center gap-6 text-gray-600">
          <Avatar name={author.name} picture={author.picture} />
          <span className="text-gray-400">|</span>
          <DateFormatter dateString={date} />
        </div>
      </div>
      <div className="mb-12 md:mb-16">
        <CoverImage title={title} src={coverImage} priority />
      </div>
    </>
  )
}
