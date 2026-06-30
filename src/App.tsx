import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ApartmentCleaning from "./pages/ApartmentCleaning";
import HouseCleaning from "./pages/HouseCleaning";
import AfterRepairCleaning from "./pages/AfterRepairCleaning";
import FurnitureCleaning from "./pages/FurnitureCleaning";
import OfficeCleaning from "./pages/OfficeCleaning";
import WindowsCleaning from "./pages/WindowsCleaning";
import InternalCalc from "./pages/InternalCalc";

const queryClient = new QueryClient();

const App = () => (
<HelmetProvider>
<QueryClientProvider client={queryClient}>
<TooltipProvider>
<Toaster />
<Sonner />

<BrowserRouter basename="/">
<Routes>
<Route path="/" element={<Index />} />
<Route path="/uborka-kvartir-sochi" element={<ApartmentCleaning />} />
<Route path="/uborka-domov-sochi" element={<HouseCleaning />} />
<Route path="/uborka-posle-remonta-sochi" element={<AfterRepairCleaning />} />
<Route path="/himchistka-mebeli-sochi" element={<FurnitureCleaning />} />
<Route path="/uborka-oficov" element={<OfficeCleaning />} />

{/* internal, noindex */}
<Route path="/calc" element={<InternalCalc />} />

{/* catch-all */}
<Route path="*" element={<NotFound />} />
</Routes>
</BrowserRouter>

</TooltipProvider>
</QueryClientProvider>
</HelmetProvider>
);

export default App;
