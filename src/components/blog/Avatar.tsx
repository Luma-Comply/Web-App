import Image from "next/image"

type Props = {
  name: string
  picture: string
}

export default function Avatar({ name, picture }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-sage-light">
        <Image
          src={picture}
          alt={name}
          fill
          className="object-cover"
        />
      </div>
      <span className="text-gray-700 font-medium">{name}</span>
    </div>
  )
}
