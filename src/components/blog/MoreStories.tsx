import PostPreview from "./PostPreview"
import { Post } from "@/interfaces/post"

type Props = {
  posts: Post[]
}

export default function MoreStories({ posts }: Props) {
  return (
    <section>
      <h2 className="text-3xl md:text-4xl font-sans font-semibold mb-8 text-dark-bg">
        More Articles
      </h2>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-12 md:gap-y-16">
        {posts.map((post) => (
          <PostPreview
            key={post.slug}
            title={post.title}
            coverImage={post.coverImage}
            date={post.date}
            author={post.author}
            slug={post.slug}
            excerpt={post.excerpt}
            category={post.category}
          />
        ))}
      </div>
    </section>
  )
}
