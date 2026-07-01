import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import { lazy, Suspense } from "react";

import Index from "./pages/Index";
import FloatingContact from "./components/FloatingContact";

const NotFound = lazy(() => import("./pages/NotFound"));
const ApartmentCleaning = lazy(() => import("./pages/ApartmentCleaning"));
const HouseCleaning = lazy(() => import("./pages/HouseCleaning"));
const AfterRepairCleaning = lazy(() => import("./pages/AfterRepairCleaning"));
const FurnitureCleaning = lazy(() => import("./pages/FurnitureCleaning"));
const OfficeCleaning = lazy(() => import("./pages/OfficeCleaning"));
const WindowsCleaning = lazy(() => import("./pages/WindowsCleaning"));
const InternalCalc = lazy(() => import("./pages/InternalCalc"));

const queryClient = new QueryClient();

const App = () => (
<HelmetProvider>
<QueryClientProvider client={queryClient}>
<TooltipProvider>
<Toaster />
<Sonner />

<BrowserRouter basename="/">
<Suspense fallback={null}>
<Routes>
<Route path="/" element={<Index />} />
<Route path="/uborka-kvartir-sochi" element={<ApartmentCleaning />} />
<Route path="/uborka-domov-sochi" element={<HouseCleaning />} />
<Route path="/uborka-posle-remonta-sochi" element={<AfterRepairCleaning />} />
<Route path="/himchistka-mebeli-sochi" element={<FurnitureCleaning />} />
<Route path="/uborka-oficov" element={<OfficeCleaning />} />
<Route path="/moyka-okon-sochi" element={<WindowsCleaning />} />

{/* internal, noindex */}
<Route path="/calc" element={<InternalCalc />} />

{/* catch-all */}
<Route path="*" element={<NotFound />} />
</Routes>
</Suspense>
<FloatingContact />
</BrowserRouter>

</TooltipProvider>
</QueryClientProvider>
</HelmetProvider>
);

export default App;
