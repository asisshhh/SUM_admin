import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import AdminLayout from "../layouts/AdminLayout";

interface DashboardStats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  totalInvoices: number;
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get("/dashboard");
      return res.data;
    },
  });

  if (isLoading) return <AdminLayout>Loading...</AdminLayout>;
  if (error) return <AdminLayout>Error loading dashboard.</AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card title="Patients" value={data?.totalPatients} />
        <Card title="Doctors" value={data?.totalDoctors} />
        <Card title="Appointments" value={data?.totalAppointments} />
        <Card title="Invoices" value={data?.totalInvoices} />
      </div>
    </AdminLayout>
  );
}

function Card({ title, value }: { title: string; value?: number }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow hover:shadow-md transition">
      <p className="text-gray-500">{title}</p>
      <h2 className="text-3xl font-bold text-gray-800">{value ?? 0}</h2>
    </div>
  );
}
