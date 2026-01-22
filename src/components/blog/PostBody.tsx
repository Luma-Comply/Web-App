type Props = {
  content: string
}

export default function PostBody({ content }: Props) {
  return (
    <div className="max-w-3xl mx-auto">
      <div
        className="prose prose-lg prose-gray max-w-none
          prose-headings:font-sans prose-headings:font-semibold prose-headings:text-dark-bg
          prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
          prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-gray-700 prose-p:leading-relaxed
          prose-a:text-mint prose-a:no-underline hover:prose-a:underline
          prose-strong:text-dark-bg
          prose-ul:text-gray-700 prose-ol:text-gray-700
          prose-li:marker:text-mint
          prose-blockquote:border-l-mint prose-blockquote:text-gray-600 prose-blockquote:italic
          prose-code:bg-sage-light/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-dark-bg prose-pre:text-light-gray
          prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  )
}
