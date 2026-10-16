import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { STORE_NAME } from "./config";
import { ToastProvider } from "./components/ui/Toast";
import Footer from "./components/Footer";
import NotFound from "./pages/NotFound";
import Checkout from "./pages/Checkout";
import TrackingSearch from "./pages/TrackingSearch";
import TrackingResult from "./pages/TrackingResult";
import RequireAuth from "./components/RequireAuth";
import NavBar from "./components/NavBar";
import Catalog from "./pages/Catalog";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import OrderConfirmation from "./pages/OrderConfirmation";
import Orders from "./pages/Orders";
import ProtectedRoute from "./components/ProtectedRoute";
import Panel from "./pages/admin/Panel";
import ProductManager from "./pages/admin/ProductManager";
import Dashboard from "./pages/admin/Dashboard";
import Users from "./pages/admin/Users";

function App() {
  useEffect(() => {
    document.title = STORE_NAME;
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
      <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />
        <Route path="/seguimiento" element={<TrackingSearch />} />
        <Route path="/seguimiento/:trackingId" element={<TrackingResult />} />
        <Route path="/order/:id" element={<OrderConfirmation />} />
        <Route path="/orders" element={<Orders />} />
        <Route
          path="/panel"
          element={
            <ProtectedRoute allowedRoles={["support", "admin"]}>
              <Panel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/panel/products"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <ProductManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/panel/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/panel/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </main>
      <Footer />
      </div>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
