import React, { useEffect, useState } from 'react'

function Admin(){
  const [orders, setOrders] = useState([])
  useEffect(()=>{
    fetch('/api/admin/orders', {credentials:'include'}).then(r=>r.json()).then(setOrders).catch(()=>{});
  },[])

  async function updateStatus(id, status){
    const res = await fetch(`/api/admin/orders/${id}/status`, { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
    const data = await res.json();
    setOrders(o=>o.map(x=> x._id===data._id?data:x));
  }

  return (
    <div className="container">
      <header className="header"><h2>Painel Admin</h2></header>
      <div>
        {orders.map(o=> (
          <div key={o._id} style={{padding:12,background:'#0b0b0b',marginBottom:8}}>
            <div><strong>Pedido</strong> {o._id}</div>
            <div>Cliente: {o.user?.name} — {o.totalCents/100} R$</div>
            <div>Status: {o.status}</div>
            <div style={{marginTop:8}}>
              <button className="btn" onClick={()=>updateStatus(o._id,'em separação')}>Em separação</button>{' '}
              <button className="btn" onClick={()=>updateStatus(o._id,'enviado')}>Enviar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Admin
