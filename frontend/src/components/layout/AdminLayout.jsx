import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from './AdminSidebar';
import TopNavbar from './TopNavbar';

const AdminLayout = () => {
  const location = useLocation();
  return (
    <div className="app-container">
      <AdminSidebar />
      <div className="main-content">
        <TopNavbar />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 10, scale: 0.99, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.99, filter: 'blur(10px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="page-container"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminLayout;
