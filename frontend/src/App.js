import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import Workspace from "@/pages/Workspace";

export default function App() {
  return <ThemeProvider><BrowserRouter>
    <Routes>
      <Route path="/" element={<Workspace />} />
      <Route path="/app" element={<Workspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Toaster position="top-center" richColors />
  </BrowserRouter></ThemeProvider>;
}