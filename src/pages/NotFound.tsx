import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="layout-grid flex min-h-[70vh] items-center py-16">
      <div className="panel-surface panel-accent mx-auto max-w-2xl text-center">
        <span className="eyebrow">404</span>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          This page does not exist.
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
          The route may have changed as part of the new TabacoID site structure.
        </p>
        <div className="mt-8 flex justify-center">
          <Link className="button-primary" to="/">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    </section>
  )
}
