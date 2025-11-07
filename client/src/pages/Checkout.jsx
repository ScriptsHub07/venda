import React, { useEffect, useState } from 'react'

function Checkout(){
  const [cart, setCart] = useState([])
  const [address, setAddress] = useState({ street:'', city:'', postalCode:'', state:'' })
  const [pix, setPix] = useState(null)

  useEffect(()=> setCart(JSON.parse(localStorage.getItem('cart')||'[]')) ,[])

  async function submit(){
    const checked = cart.filter(i => i.checked !== false);
    if (!checked.length) return alert('Marque ao menos um item');
    const res = await fetch('/api/checkout/create', { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ items: checked, address }) });
    const data = await res.json();
    if (!data.ok) return alert(data.error || 'Erro');
    setPix(data.pix);
  }

  return (
    <div className="container">
      <header className="header"><h2>Checkout</h2></header>
      <section>
        <h3>Endereço</h3>
        <div style={{display:'grid',gap:8,maxWidth:480}}>
          <input placeholder="Rua, número" value={address.street} onChange={e=>setAddress({...address,street:e.target.value})}/>
          <input placeholder="Cidade" value={address.city} onChange={e=>setAddress({...address,city:e.target.value})}/>
          <input placeholder="Estado" value={address.state} onChange={e=>setAddress({...address,state:e.target.value})}/>
          <input placeholder="CEP" value={address.postalCode} onChange={e=>setAddress({...address,postalCode:e.target.value})}/>
        </div>
      </section>

      <section style={{marginTop:16}}>
        <h3>Itens</h3>
        {cart.filter(i=>i.checked!==false).map((it,idx)=> (
          <div key={idx} style={{padding:8,background:'#0b0b0b',marginBottom:8}}>{it.title} — {it.quantity}</div>
        ))}
      </section>

      <div style={{marginTop:12}}>
        <button className="btn" onClick={submit}>Pagar via PIX</button>
      </div>

      {pix && (
        <div style={{marginTop:24,padding:12,background:'#111'}}>
          <h4>PIX criado</h4>
          <p>PIX ID: {pix.pixId}</p>
          <p>Valor: {(pix.amount/100).toFixed(2)} R$</p>
          <div style={{marginTop:8}}>
            <div style={{background:'#000',padding:12}}>
              <div style={{color:'#aaa'}}>QR Code:</div>
              <pre style={{color:'#fff'}}>{pix.qr}</pre>
            </div>
            <p className="small-muted">Após pagamento o sistema confirmará automaticamente (webhook)</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Checkout
