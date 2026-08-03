import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import SiteLayout from '@/components/SiteLayout'
import AboutPage from '@/pages/About'
import ContactPage from '@/pages/Contact'
import HomePage from '@/pages/Home'
import NotFoundPage from '@/pages/NotFound'
import ReportsPage from '@/pages/Reports'
import ServicesPage from '@/pages/Services'
import WorkPage from '@/pages/Work'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />} path="/">
          <Route element={<HomePage />} index />
          <Route element={<ReportsPage />} path="reports" />
          <Route element={<ServicesPage />} path="services" />
          <Route element={<WorkPage />} path="work" />
          <Route element={<AboutPage />} path="about" />
          <Route element={<ContactPage />} path="contact" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Routes>
    </>
  )
}
