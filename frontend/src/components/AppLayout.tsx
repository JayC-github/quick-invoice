import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

  return (
    <div className={styles.layout}>
      {/* Hamburger button (mobile only) */}
      <button
        className={styles.hamburger}
        onClick={() => setSidebarOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        <span className={styles.hamburgerBar} />
        <span className={styles.hamburgerBar} />
        <span className={styles.hamburgerBar} />
      </button>

      {/* Overlay (mobile only) */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}
      >
        <div className={styles.logo}>QuickInvoice</div>

        <nav className={styles.nav}>
          <NavLink to="/dashboard" className={navLinkClass} onClick={closeSidebar}>
            Dashboard
          </NavLink>
          <NavLink to="/clients" className={navLinkClass} onClick={closeSidebar}>
            Clients
          </NavLink>
          <NavLink to="/invoices" className={navLinkClass} onClick={closeSidebar}>
            Invoices
          </NavLink>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
