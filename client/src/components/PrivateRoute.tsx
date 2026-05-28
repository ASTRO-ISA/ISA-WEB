import { useAuth } from "@/context/AuthContext";
import Login from "@/pages/authentication/Login";
import { Outlet, useLocation } from "react-router-dom";

const PrivateRoute = () => {
  const { userInfo, isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn || !userInfo?.user) {
    // Pass the current intended path so Login can redirect back after auth
    return <Login redirectTo={location.pathname + location.search} />;
  }

  return <Outlet />;
};

export default PrivateRoute;
