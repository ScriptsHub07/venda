import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Cart(){
  const [cart, setCart] = useState([])
  const nav = useNavigate()
  useEffect(()=> setCart(JSON.parse(localStorage.getItem('cart')||'[]')),[])

  function update(i, patch){
    const copy = [...cart]; copy[i] = {...copy[i], ...patch}; setCart(copy); localStorage.setItem('cart', JSON.stringify(copy));
  }

  function goCheckout(){ nav('/checkout') }

  return (
    <div className="container">
      <header className="header"><h2>Carrinho</h2></header>
      {cart.length===0 ? <p>Seu carrinho está vazio</p> : (
        <div>
          {cart.map((it,i)=> (
            <div key={i} style={{display:'flex',gap:12,alignItems:'center',padding:12,background:'#0b0b0b',marginBottom:8}}>
              <input type="checkbox" checked={it.checked!==false} onChange={e=>update(i,{checked:e.target.checked})}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700}}>{it.title}</div>
                <div className="small-muted">Qtd: <input type="number" value={it.quantity} min={1} onChange={e=>update(i,{quantity:Math.max(1,parseInt(e.target.value||1))})} style={{width:60}}/></div>
              </div>
            </div>
          ))}
          <div style={{marginTop:12}}>
            <button className="btn" onClick={goCheckout}>Ir para pagamento (apenas itens marcados)</button>
          </div>
        </div>
      )}
    </div>
  )
}
export default Cart
