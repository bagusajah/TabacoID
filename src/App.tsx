import { useEffect } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'

import ErrorBoundary from '@/components/ErrorBoundary'
import SiteLayout from '@/components/SiteLayout'
import AboutPage from '@/pages/About'
import HomePage from '@/pages/Home'
import NotFoundPage from '@/pages/NotFound'
import ReportsPage from '@/pages/Reports'
import ReportDetailPage from '@/pages/ReportDetail'
import TrendingPage from '@/pages/Trending'
import TrendingDashboard from '@/pages/TrendingDashboard'
import WorkflowPage from '@/pages/Workflow'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return null
}

// Pathless layout route: a render error in a page keeps the site chrome and resets on navigation.
function PageBoundary() {
  const { pathname } = useLocation()

  return (
    <ErrorBoundary key={pathname}>
      <Outlet />
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />} path="/">
          <Route element={<PageBoundary />}>
            <Route element={<HomePage />} index />
            <Route element={<ReportsPage />} path="reports" />
            <Route element={<ReportDetailPage />} path="reports/:slug" />
            <Route element={<TrendingPage />} path="trending" />
            <Route element={<TrendingDashboard />} path="trending/dashboard" />
            <Route element={<ReportDetailPage source="trending" />} path="trending/:slug" />
            <Route element={<WorkflowPage />} path="workflow" />
            <Route element={<AboutPage />} path="about" />
            <Route element={<NotFoundPage />} path="*" />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
