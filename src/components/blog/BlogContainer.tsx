type Props = {
  children?: React.ReactNode
}

export default function BlogContainer({ children }: Props) {
  return <div className="container mx-auto px-4 max-w-7xl">{children}</div>
}
