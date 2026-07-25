import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import DashboardNBA from './pages/DashboardNBA'
import DashboardNFL from './pages/DashboardNFL'
import LiveGames from './pages/LiveGames'
import Standings from './pages/Standings'
import AdminPanel from './pages/AdminPanel'

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/nba" element={<DashboardNBA />} />
          <Route path="/nfl" element={<DashboardNFL />} />
          <Route path="/live" element={<LiveGames />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
