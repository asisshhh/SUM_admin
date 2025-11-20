import React, { useState } from 'react'
import api from '../api/client'

export default function LoginPage(){
  const [phone, setPhone] = useState('9999999999')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try{
      const { data } = await api.post('/auth/login', { phone, password })
      localStorage.setItem('token', data.token)
      window.location.href = '/'
    }catch(e){
      setError(e?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <form onSubmit={submit} className="card p-8 w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-slate-500 text-sm">Use the seeded admin: 9999999999 / admin123</p>
        {!!error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="text-sm">Phone</label>
          <input className="input mt-1" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <input type="password" className="input mt-1" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="btn bg-slate-900 text-white w-full justify-center">Sign In</button>
      </form>
    </div>
  )
}
