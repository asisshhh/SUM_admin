import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/client'

export default function ReportsPage(){
  const { data } = useQuery({ queryKey:['overview'], queryFn: async ()=> (await api.get('/reports/overview')).data })
  return (
    <div className="space-y-4">
      <div className="card p-6">
        <div className="text-xl font-semibold mb-2">Overview</div>
        <pre className="text-sm bg-slate-50 p-3 rounded-lg overflow-auto">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  )
}
