import Sidebar from "../components/Sidebar";
import { useAuthStore } from "../store/useAuthStore";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuthStore();

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Admin Panel</h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </header>
        <main className="p-6 overflow-auto flex-1">{children}</main>
      </div>
    </div>
  );
}
