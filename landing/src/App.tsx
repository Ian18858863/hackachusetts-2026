import React from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import ProblemSection from './components/ProblemSection'
import HowItWorks from './components/HowItWorks'
import TrustSection from './components/TrustSection'
import Footer from './components/Footer'

function App() {
  return (
    <div className="App">
      <Header />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <TrustSection />
      <Footer />
    </div>
  )
}

export default App