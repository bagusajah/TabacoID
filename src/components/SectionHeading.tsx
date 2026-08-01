type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description: string
  align?: 'left' | 'center'
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: SectionHeadingProps) {
  const centered = align === 'center'

  return (
    <div
      className={[
        'max-w-3xl space-y-4',
        centered ? 'mx-auto text-center' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>
      <p className="text-base leading-7 text-slate-600 sm:text-lg">{description}</p>
    </div>
  )
}
