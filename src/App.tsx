import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'

import SiteLayout from '@/components/SiteLayout'
import AboutPage from '@/pages/About'
import HomePage from '@/pages/Home'
import NotFoundPage from '@/pages/NotFound'
import ReportsPage from '@/pages/Reports'
import ReportDetailPage from '@/pages/ReportDetail'
import WorkflowPage from '@/pages/Workflow'

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
          <Route element={<ReportDetailPage />} path="reports/:slug" />
          <Route element={<WorkflowPage />} path="workflow" />
          <Route element={<AboutPage />} path="about" />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Routes>
    </>
  )
}
