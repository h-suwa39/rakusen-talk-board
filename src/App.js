
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Talk from './Talk';
import Clock from './Clock';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Talk />} />
        <Route path="/clock" element={<Clock />} />
      </Routes>
    </Router>
  );
}

export default App;
