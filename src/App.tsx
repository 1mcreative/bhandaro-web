import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import Items from "./pages/Items";
import Locations from "./pages/Locations";
import Login from "./pages/Login";
import Stock from "./pages/Stock";
import Users from "./pages/Users";

export default function App() {
  const { me, can } = useAuth();
  if (!me) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/stock" element={<Stock />} />
        <Route path="/items" element={<Items />} />
        <Route path="/locations" element={<Locations />} />
        {can("users.manage") && <Route path="/users" element={<Users />} />}
        <Route path="*" element={<Navigate to="/stock" replace />} />
      </Routes>
    </Layout>
  );
}
