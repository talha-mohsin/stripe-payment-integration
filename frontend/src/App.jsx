import { Link, Route, Routes } from "react-router-dom";

import HomePage from "./pages/HomePage";
import SuccessPage from "./pages/SuccessPage";
import CancelPage from "./pages/CancelPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          Stripe Classroom
        </Link>
        <span className="mode-badge">Test Mode</span>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/cancel" element={<CancelPage />} />
        </Routes>
      </main>
    </div>
  );
}
